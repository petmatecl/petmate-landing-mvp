# Sprint plan — VISUAL-EXPLORAR-DYNAMIC (post-launch, prioridad MEDIA)

**Fecha**: 2026-11-25.
**Origen**: deuda agendada en BACKLOG tras 3er slip de "visual drift" en el día (sprint cola nocturna, PR #199 skip inmediato aterrizado).
**Scope**: solo plan técnico — cero implementación. Sprint en sí se agenda post-launch en base a este documento.

---

## Contexto

Los tests visuales de `/explorar` desktop + mobile del spec [`e2e/specs/visual/paginas-clave.spec.ts`](../../e2e/specs/visual/paginas-clave.spec.ts) fueron **skipeados** en PR #199 commit `dbf9533` porque `/explorar` tiene contenido 100% dinámico (grid `servicios_publicados` cambia entre generación baseline y ejecución test). Snapshot pixel-perfect sin fixture control ni maskPattern suficiente es inherentemente flake — el rerun del PR #199 regeneró baselines nuevas y pasaron verdes para home / login / ficha-servicio, pero `/explorar` siguió fallando porque entre el workflow `visual-update-snapshots` (00:29 UTC) y el rerun del PR (00:07 UTC siguiente iteración) la data real de staging cambió lo suficiente para romper el matching.

El spec actual ya tiene máscara (líneas 230-239) sobre:
- `barraLocator`: `div.flex.flex-col.sm:flex-row.items-start.sm:items-center.justify-between` (contador + toggle Lista/Mapa + selector orden).
- `gridLocator`: `div.grid.gap-5.grid-cols-1.sm:grid-cols-2.xl:grid-cols-3` (grid principal de cards).

El problema: el bbox del grid cambia con el número de cards visibles → pixels de borde quedan sin masking → diff aparece.

---

## Mapeo de zonas (desktop 1440x900)

### Zonas dinámicas (deben enmascararse o aislarse)

1. **Grid de cards (`servicios_publicados`)** — `pages/explorar.tsx:921` aprox.
   - Fotos de hero por servicio (cambian con cada upload del proveedor).
   - Precio, título, categoría (cambian con edición del proveedor).
   - Comunas (cambian con edición del proveedor).
   - Badge "verificado" / "primera ayuda" (cambia con moderación admin).
   - Rating y conteo de reseñas (cambia con nueva reseña).
   - Orden del grid (cambia con ranking recalculado).
2. **Contador de resultados** — `pages/explorar.tsx:615,851` ("397 resultados" / "400 resultados").
3. **Hora/timestamp "Última actualización"** (si existe en algún componente del flow).
4. **Mapa Leaflet** (si el toggle Mapa está activo — tiles cambian con zoom / viewport, markers cambian con filtros).

### Zonas estables (candidatas a cobertura visual)

1. **Header global** (logo Pawnecta, nav, CTA login) — `components/Header.tsx`. Super estable salvo por refactor explícito.
2. **Hero del explorar** (título "Explora servicios para mascotas", subtítulo, breadcrumb de categoría si aplica). Cambia solo con cambio de copy del PO.
3. **Sidebar filtros** (`components/Explore/SidebarFiltros.tsx`): categorías + comunas + rango precios + mascota target. Lista de categorías estable (10 slugs en la BD). Lista de comunas estable (~300, ordenadas alfabéticamente). Rango de precios estable.
4. **Paginación** (números de página, botones prev/next). Estable salvo por cambio del page-size.
5. **Footer global**. Super estable salvo refactor explícito.

---

## Opción A — maskPattern más agresivo

### Qué hace

Extender la máscara actual al **contenedor outer completo del área de resultados** (incluyendo count, filtros horizontales mobile, toggle, selector orden, grid, paginación). Dejar como superficie comparable solo:
- Header global.
- Hero del explorar.
- Sidebar filtros (desktop) o filter button (mobile).
- Footer global.

### Cómo

Agregar `data-testid="explorar-cuerpo-dinamico"` al `<main>` o `<div>` contenedor del cuerpo dinámico en `pages/explorar.tsx`, en el nivel justo después del hero y antes del footer. En el spec:

```ts
const cuerpoDinamico = page.locator('[data-testid="explorar-cuerpo-dinamico"]');
await expect(cuerpoDinamico, 'Cuerpo dinámico no visible — selector roto').toBeVisible({ timeout: 5_000 });
await expect(page).toHaveScreenshot(`explorar-${vp.name}.png`, {
    ...SNAPSHOT_OPTS,
    mask: [cuerpoDinamico],
});
```

### Pros

- **Zero infra adicional** — cambio puramente en frontend + spec, NO requiere seed de BD, NO requiere query param, NO requiere feature flag.
- **Trabaja con data real** — el test corre contra el mismo deploy de preview que el usuario final consume, cero fixture artificial.
- **Baselines más estables** — el ancho del contenedor outer es fijo (100% del parent), independiente del número de cards.
- **Cobertura mantenida en zonas de identidad visual**: header, hero, sidebar filtros, footer. Estos cubren el ~60% del valor del test visual (confianza en la marca, layout general, consistencia de navegación).

### Cons

- **Cobertura visual del cuerpo nula** — si un refactor del grid rompe layout (alignment, padding, gaps), el test NO lo detecta. Requiere test funcional separado.
- **data-testid nuevo en `pages/explorar.tsx`** — mínimo, pero amerita 1 línea de cambio productivo (riesgo bajo pero no cero).
- **Si el PO quiere cobertura del grid**, esta opción NO la provee — hay que cambiar a Opción B.

### Esfuerzo

**~1 hora** (en desglose):
- 15 min: agregar `data-testid` al wrapper outer de `pages/explorar.tsx` + verificar que no hay regresión funcional.
- 15 min: modificar spec para usar el nuevo locator + remover máscara granular.
- 15 min: dispatch workflow `visual-update-snapshots` para regenerar baselines con máscara nueva.
- 15 min: smoke + aprobación visual de las nuevas baselines por el PO.

---

## Opción B — Fixture DB controlado

### Qué hace

Introducir un **modo fixture** activable por query param (ej. `/explorar?__visual_fixture=1`). Cuando ese param está presente **y el request viene con header de secret interno** (ej. `X-Visual-Fixture-Secret` matching env var), la página sirve un subset fijo de servicios `servicios_publicados` precargado en staging con IDs conocidos (ej. 6 servicios seed con fotos estables en bucket, precios fijos, comunas fijas, orden alfabético por título).

### Cómo

Varios componentes:

1. **Migration Supabase staging**: seed de 6 servicios `servicios_publicados` con flag `is_visual_fixture=true` (nueva columna, default false), activos solo en staging. En prod la migration NO agrega filas, solo la columna.
2. **RPC `buscar_servicios` extendida**: nuevo param `p_only_visual_fixture boolean` (default false). Cuando true, filtra por `is_visual_fixture=true`.
3. **Página `pages/explorar.tsx` extendida**: si `router.query.__visual_fixture === '1'` AND request lleva `X-Visual-Fixture-Secret` matching `process.env.VISUAL_FIXTURE_SECRET`, llama RPC con `p_only_visual_fixture=true`. Secret solo configurado en env Preview (Vercel staging), nunca en prod.
4. **Fotos del bucket**: 6 PNGs seed en bucket `servicios-fotos/visual-fixture/*.png` con hashes estables (cero re-upload, cero reemplazo).
5. **Spec Playwright**: setear header `X-Visual-Fixture-Secret` via `page.setExtraHTTPHeaders({...})` + agregar query param al goto. Baseline regenerada contra ese modo.

### Pros

- **100% deterministic** — el seed no cambia nunca salvo migration explícita. Cero flake por contenido dinámico.
- **Cobertura visual completa del grid** — refactor de card layout, bug de alignment, cambio de badge rendering, todo se detecta.
- **Reusable** — el mismo fixture puede cubrir otros tests visuales que dependan de data (ej. ficha-servicio podría usar un seed de visual fixture en vez de UUID hardcoded).

### Cons

- **Scope grande** — 5 componentes a tocar (migration, RPC, página, bucket, spec).
- **Secret management** — `VISUAL_FIXTURE_SECRET` debe estar en Vercel Preview y en GitHub Secrets; cero riesgo de leak porque solo da acceso a un subset de data pública ya visible al scraper.
- **Mantenimiento del seed** — si cambian los campos requeridos de `servicios_publicados` (nueva columna NOT NULL, FK nueva), hay que actualizar el seed. Mitigable con un `seeds/visual-fixture.sql` versionado en el repo.
- **Risk de regresión productiva** — agregar la nueva columna `is_visual_fixture` y modificar RPC `buscar_servicios` toca código productivo caliente. Requiere smoke adicional para confirmar que prod no se degrada.
- **Setup inicial lento** — subir 6 fotos estables, crear 6 proveedores seed si no existen, correr migration, verificar RPC.

### Esfuerzo

**~3-5 horas** (en desglose conservador):
- 30 min: diseñar seed (qué servicios, qué comunas, qué precios, qué categorías para cubrir layout variantes).
- 1h: migration SQL + RPC extension + apply staging + verify.
- 1h: cambio en `pages/explorar.tsx` + wiring del header secret + guard anti-prod.
- 30 min: subir 6 fotos seed al bucket + anotar paths.
- 30 min: configurar `VISUAL_FIXTURE_SECRET` en Vercel Preview + GitHub Secrets.
- 30 min: modificar spec Playwright + regenerar baselines con el fixture + smoke manual.
- 30 min: smoke adicional prod post-aterrizaje (confirmar que `is_visual_fixture=false` no afecta buscar_servicios normal) + rollback plan documentado.

---

## Comparativa + recomendación

| Dimensión | Opción A (maskPattern) | Opción B (Fixture DB) |
|---|---|---|
| Esfuerzo | ~1h | ~3-5h |
| Cobertura visual del body | Nula | Completa |
| Cobertura visual de header/hero/sidebar/footer | Completa | Completa |
| Deterministic | Mayormente (depende de que las zonas "estables" lo sean) | 100% |
| Scope productivo | 1 línea (data-testid) | Migration + RPC + página + bucket + secret |
| Rollback | Trivial (revertir commit) | Multi-paso (revertir migration + env vars + seed) |
| Bloquea lanzamiento | No | No |

### Recomendación del auditor

**Opción A es la recomendada para el primer sprint post-launch**:

1. **Ratio costo/beneficio**: ~1h de esfuerzo cubre la pérdida crítica (el test estaba 100% roto y skipeado); el 100% de cobertura del body que Opción B agrega NO es crítico hoy (el body se verifica funcionalmente por otros tests + QA manual del PO).
2. **Riesgo cero de regresión prod**: Opción A no toca RPC ni schema, solo agrega un atributo HTML; Opción B toca RPC caliente (`buscar_servicios` llamada desde `/explorar` productiva) y requiere smoke adicional post-aterrizaje.
3. **Alineado con la decisión PO 2026-11-11** sobre otras deudas visuales: `VIS-HOME-FULLPAGE` + `VIS-MASK-DATATESTID` también priorizan simpleza + fixtures de código vs infra.
4. **Opción B queda viva como upgrade path** si post-lanzamiento con data real en prod aparecen regresiones del grid que Opción A no detecta. En ese momento, el costo del upgrade está justificado por evidencia.

**Trade-off explícito que el PO debe aprobar**: aceptar que los refactors del grid de cards `/explorar` NO se detectarán por el visual test, se detectarán por QA manual o por tests funcionales separados. Estimación del riesgo: baja — el componente `ServiceCard` se usa en múltiples otras páginas (ficha de proveedor público, mapa, favoritos), entonces cualquier refactor se detecta por el visual del ficha-servicio ya cubierto + QA manual del flow comparar-cards.

---

## Acciones concretas si se aprueba Opción A

1. Branch `vis-exp-mask` (12 chars).
2. Agregar `data-testid="explorar-cuerpo-dinamico"` al wrapper outer del cuerpo en `pages/explorar.tsx`.
3. Modificar spec `e2e/specs/visual/paginas-clave.spec.ts`:
   - Quitar `test.skip` de los 2 tests de explorar (desktop + mobile).
   - Reemplazar `barraLocator` + `gridLocator` por un único `cuerpoDinamico` locator.
   - Mantener guardia `toBeVisible` loud previa.
   - Agregar el mask en `toHaveScreenshot`.
4. Dispatch workflow `visual-update-snapshots` para regenerar baselines nuevos de `explorar-desktop.png` + `explorar-mobile.png`.
5. Smoke PO: comparar visualmente las nuevas baselines — confirmar que header/hero/sidebar/footer se ven correctos y el bloque enmascarado cubre todo lo dinámico.
6. PR → CI verde → merge → eliminar BACKLOG item VISUAL-EXPLORAR-DYNAMIC.

## Acciones concretas si se aprueba Opción B

Sprint propio documentado en acta separada. Pre-requisito: GO PO sobre el schema del seed + lista de 6 servicios + proveedores seed.

---

## Trazabilidad

- Deuda original: BACKLOG > `VISUAL-EXPLORAR-DYNAMIC` (prioridad MEDIA).
- Skip aterrizado: PR #199 commit `dbf9533`.
- Spec afectado: [`e2e/specs/visual/paginas-clave.spec.ts:206-240`](../../e2e/specs/visual/paginas-clave.spec.ts#L206-L240).
- Deudas relacionadas: `VIS-MASK-DATATESTID`, `VIS-HOME-FULLPAGE` (visuales del mismo spec, patrones similares).
- Episodio bitácora: [`docs/bitacora/incidentes-20261124.md > Episodio 5 extensión`](../bitacora/incidentes-20261124.md).
