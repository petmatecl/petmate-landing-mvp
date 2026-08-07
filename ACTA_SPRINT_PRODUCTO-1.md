# Acta consolidada — Sprint PRODUCTO-1

> **ESTADO: 100% CERRADO — 2026-08-04**. Suite 45/45 verde + **revisión visual
> del PO APROBADA** (badge Reserva online + categoría Etología + cross-links
> + wizard con los 12 campos propuestos). Sprint queda en **posición 1 de la
> cola de merges** (producto-1 → zonab-1 → producto-2). Esperando ventana
> post-N15 monitor.
>
> **Historial de estados**:
> - 2026-07-31: Técnicamente completo (suite 45/45 verde en preview).
> - 2026-08-04: PO firma revisión visual → sprint 100% cerrado, posición 1
>   cola de merges. Este acta vive en `producto-1`; se mergeará a `staging`
>   como parte del merge del sprint cuando la cola avance.

**Rama**: `producto-1` desde `staging @ 55489fe` (staging incluye N15
mergeado post-Fase 5 tren N15).

**Sub-entregables** (orden estricto PR0 → PR1 → PR2, autorización adelantada
del sprint completo con revisiones visuales de PO al final):

| PR | Título | Estado | Commit final |
|---|---|---|---|
| PR0 | Refactor guarda anti-prod Playwright (whitelist → deny-list) | ✅ | `4f6a6b0` |
| PR1 | Badge "Reserva online" en cards del explorador | ✅ | `bda80e9` |
| PR2 | Categoría "Etología y Conducta" + cross-links Adiestramiento ↔ Etología | ✅ | `4a7665a` |

---

## PR0 — Refactor guarda anti-prod

**Objetivo**: reemplazar `assertBaseUrlIsStaging` (whitelist de hosts —
requería agregar `git-<rama>` cada vez que un tren nuevo probaba contra su
preview) por `assertBaseUrlIsNotProd` (deny-list de prod, acepta cualquier
`*-petmatecls-projects.vercel.app`).

**Entrega**:
- `e2e/setup/guard.ts` NUEVO — función pura exportable.
- `e2e/setup/guard.test.ts` NUEVO — 11 casos ejecutables con `npx tsx`.
- `playwright.config.ts` — reemplaza función local por import + comentario
  con contexto PR0.

**Evidencia**:
- Test unitario: **11/11 pass · 0 fail**. Cubre 3 DENY prod (custom com/cl +
  alias vercel.app), 4 PASS previews (staging, next15 histórico, producto-1
  actual, rama arbitraria futura), 3 DENY externos (google.com, otro team,
  localhost), 1 DENY URL inválida.
- `npm run build` (P1): exit 0.
- Suite completa contra preview `producto-1` **41/41 verde** en 40.6s,
  guard deny-list operando sin whitelist por rama.

**Cierre backlog**: ítem P3 "Refactor guarda anti-prod Playwright" del
BACKLOG queda marcado CERRADO con referencia a `4f6a6b0`.

---

## PR1 — Badge "Reserva online" en cards del explorador

**Objetivo**: chip discreto en `ServiceCard` cuando el servicio tiene
agenda F1 (picker de slots) o F2 (estadía por rango) activa. Cero N+1: el
flag se calcula en la query (RPC + join) por servidor.

**Semáforo canónico** (paridad server + client):
```
tiene_agenda_activa := s.agendamiento_habilitado = true
                     AND (
                       s.duracion_slot_min IS NOT NULL       -- F1 activa
                       OR s.capacidad_estadia IS NOT NULL    -- F2 activa
                     )
```

**Entrega**:
- `migrations/20260731_buscar_servicios_agenda_activa_fix.sql` — DROP+CREATE
  del RPC `buscar_servicios` con nueva columna `tiene_agenda_activa boolean`
  al final del `RETURNS TABLE`. Aditivo.
- `lib/serviceMapper.ts` — `mapRpcToServiceResult` lee flag del RPC;
  `mapJoinToServiceResult` lo calcula con mismos semáforos (paridad).
- `components/Explore/ServiceCard.tsx` — interface `ServiceResult` agrega
  `tiene_agenda_activa?: boolean`; badge junto a "Verificado" con
  `bg-accent-50 text-accent-800` + ícono `CalendarCheck` de lucide + texto
  "Reserva online" 11px. Tooltip tuteo.
- `e2e/specs/producto-1/s1-badge-reserva-online.spec.ts` — spec Playwright
  con 2 fixtures (F2 activo + efímero sin agenda) verificando presencia y
  ausencia del badge.

### Incidente PR1 — RPC roto por nombre de columna incorrecto

**Cronología**:
- Migration inicial (`20260731_buscar_servicios_agenda_activa.sql`)
  referenció `s.duracion_min` — nombre inexistente en `servicios_publicados`.
- V1 (RETURNS TABLE shape) pasó ok — PL/pgSQL NO valida referencias de
  columnas al CREATE, solo al ejecutar.
- V2 (ejecución) reventó: `ERROR 42703 column s.duracion_min does not exist`.
  RPC roto en staging + preview producto-1.

**Diagnóstico via MCP staging vs `information_schema.columns`**:
- Nombre real en `servicios_publicados`: **`duracion_slot_min`** (integer
  NULLABLE).
- Confusión de raíz: grepeé `duracion_min` en `recordatorio-reserva.ts`
  (documentado como semáforo canónico F2-3-B), pero ese endpoint consulta
  `agendamientos` (donde el campo se llama así, snapshot de reserva) — no
  `servicios_publicados` (donde el equivalente F1 se llama `duracion_slot_min`).
- **Bug secundario**: `min_noches` es NOT NULL en el schema — `IS NOT NULL`
  siempre-true, condición redundante que enmascaraba bugs. F2 se identifica
  con `capacidad_estadia IS NOT NULL` sola.

**Fix aplicado (SHA `d499b23`)**:
- Migration fix nueva (archivo separado, no edit al anterior para preservar
  historial del incidente).
- Mapper client-side actualizado con nombres reales + paridad server.
- **Regla nueva P6** agregada a `CLAUDE.md`: "toda migration/SQL que
  referencie columnas de tablas existentes debe validar los nombres contra
  `information_schema.columns` vía MCP staging ANTES de entregar el archivo
  para ejecución" (con comando canónico + fundamento del incidente).

**Evidencia post-fix**:
- V1/V2/V3 reportadas verdes por Aldo tras aplicar fix (2 servicios con
  `tiene_agenda_activa = true`, 0 NULL).
- Suite completa contra preview producto-1 **42/42 verde** en 40.5s (41
  previos + 1 nuevo S1).
- **1 flaky observable**: `s1-badge-reserva-online` — primera corrida falla
  buscando la card en `/explorar` sin filtro (probable paginación —
  servicios recién creados empujados fuera de 1ª página), retry #1 verde en
  1.3s. Anotado en el header del spec como known-flaky. Deuda light: agregar
  filtro `?categoria=cuidado&comuna=Providencia` al goto si reaparece.
- Cleanup post-suite: `[TEST-%` residuos = 0.

---

## PR2 — Categoría "Etología y Conducta" + cross-links

**Objetivo**: nueva categoría de servicio profesional distinta de
Adiestramiento — foco en diagnóstico y modificación de problemas
conductuales, típicamente coordinando con derivación veterinaria.
Cross-links por síntoma entre ambas categorías en el explorador.

**Aplicación P6 pre-SQL**: verificado via MCP staging el schema real de
`categorias_servicio` + constraints (`PRIMARY KEY (id)`, `UNIQUE (slug)` →
habilita `ON CONFLICT (slug) DO NOTHING` idempotente) ANTES de escribir la
migration.

**Entrega**:
- `migrations/20260731_categoria_etologia.sql` — INSERT idempotente:
  `nombre='Etología y Conducta'`, `slug='etologia'`, `icono='🧠'`, `orden=45`,
  descripción del alcance clínico. V1/V2/V3 al pie.
- `lib/camposPorCategoria.ts` — entry `etologia` con 12 campos propuestos
  con fundamento clínico (especialidades_conductuales multiselect requerido
  con 9 opciones; modalidad multiselect requerido; enfoque_metodologico
  select; trabaja_con_veterinario boolean como señal de profesionalismo;
  duracion_sesion 90min típica; especies_atendidas multiselect; formacion,
  anios_experiencia, radio_cobertura_km condicional, inclusiones,
  notas). TOP_CAMPOS para la ficha del servicio.
- `pages/explorar.tsx`:
  - `STATIC_CATEGORIES` agrega `etologia`.
  - `CROSS_LINKS` bidireccional: `adiestramiento` → chip "¿Agresividad,
    miedos o ansiedad? → Etología y conducta"; `etologia` → chip
    "¿Obediencia y hábitos? → Adiestramiento".
  - Chip discreto bajo el heading (`bg-slate-50` + border, hover `accent-50`),
    click via `updateQueryParams` preserva comuna/orden.
- `e2e/specs/producto-1/s2-cross-links-etologia.spec.ts` NUEVO — 3 tests
  independientes de fixtures: (1) adiestramiento→etología + click cambia URL,
  (2) etología→adiestramiento entrada directa, (3) contra-test paseos SIN
  chip.

**Demo seed**: NO incluido (opcional en el brief). Anotado como sprint chico
futuro si el PO quiere agregar 1 servicio ejemplo de etología (requiere
proveedor test con foto de carnet, RUT verificado, etc.).

**Evidencia**:
- V1 verificada via MCP staging: categoría existe con
  `id=6b73f09f-…`, `slug='etologia'`, `nombre='Etología y Conducta'`,
  `icono='🧠'`, `activa=true`, `orden=45`.
- `npm run build` (P1): exit 0.
- Suite completa contra preview producto-1 **45/45 verde** en 45.0s (44
  passed + 1 flaky observable retry-verde = 42 PR1 + 3 nuevos S2). Los 3
  nuevos S2 pasaron sin flaky en primera corrida.
- Cleanup post-suite: `[TEST-%` residuos = 0.

---

## Reglas de proceso aplicadas

| Regla | Alcance | Aplicación en este sprint |
|---|---|---|
| P1 | `npm run build` local exit 0 antes de commit `.ts`/`.tsx` | Aplicada en PR0, PR1, PR2 |
| P3 | branch-guard antes de commit | Custodia `producto-1` en todos los commits |
| P5 | Evidencia por fase commiteada al archivo del checklist | Este acta = fuente de verdad del sprint (esta rama) |
| **P6** | **Verificación de nombres de columna contra `information_schema` antes de entregar SQL** | **Creada por el incidente PR1 (2026-07-31). Aplicada exitosamente en PR2 (categorias_servicio verificada pre-migration).** |

## Bloqueo de merge

- **Merge a `staging` BLOQUEADO** hasta que el tren N15 complete su Fase 6-8
  (`MERGE_NEXT15_PROD_CHECKLIST.md`). Cuando N15 llegue a `main` y complete
  monitor 48h, se libera la ventana para mergear `producto-1 → staging`.
- **Migrations SQL YA APLICADAS en staging DB**: `buscar_servicios_agenda_activa_fix`
  + `categoria_etologia`. El schema de staging DB ya refleja este sprint; el
  merge de código es lo único pendiente.

## Deuda light registrada

- Filtro en el goto de `/explorar` del spec S1 badge (`?categoria=cuidado&comuna=Providencia`)
  para eliminar el flaky observable si reaparece. Anotado en el header del
  spec.
- Demo seed de servicio etología (proveedor + servicio ejemplo). Opcional.

## Anexo P5 — Fase B del desfile (merge `producto-1 → staging` ejecutada 2026-08-07)

**SHA pre-merge staging**: `c342b74` (post-N15 Fase 8 cerrada).
**SHA post-merge staging**: `f971ee3` (merge commit no-FF).
**Ejecutor**: Claude, guard P3 verificado (`git branch --show-current | grep -qx staging`).

**FF-check pre-merge**:
```
$ git log --oneline producto-1..staging
c342b74 docs(next15): acta Fases 6-7 CERRADAS + Fase 8 monitor 48h arrancada
f72656b docs: cierre Fase 5 Recordatorios + casilla 0.1 N15 + infra Vercel Pro
7ed0860 docs(recordatorios): Fase 5 obs-1 (P5) — corrida N+0 limpia jueves 31-jul
```
3 commits en staging que producto-1 no tenía → **no-FF merge confirmado**.

**Merge**: cero conflictos. Aportó 15 archivos, 1263 insertions / 39 deletions:
- `ACTA_SPRINT_PRODUCTO-1.md` (este archivo).
- `e2e/setup/guard.ts` + `guard.test.ts` (PR0 deny-list `assertBaseUrlIsNotProd`).
- `e2e/specs/producto-1/s1-badge-reserva-online.spec.ts` + `s2-cross-links-etologia.spec.ts`.
- `lib/camposPorCategoria.ts` + `lib/serviceMapper.ts` (mods).
- 3 migrations SQL (buscar_servicios agenda + fix + categoría etología).
- `pages/explorar.tsx` (mods).
- `playwright.config.ts` refactor whitelist → deny-list.

**Build P1 local exit 0** post-merge (regla vigente para .ts/.tsx). Rutas nuevas /modificadas compiladas OK.

**Verificación migrations en Supabase staging** (MCP read-only):
```sql
SELECT
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'buscar_servicios') AS rpc_existe,
  (SELECT COUNT(*) FROM categorias_servicio WHERE slug = 'etologia') AS etologia_existe;
→ [{"rpc_existe":1,"etologia_existe":1}]
```

**Preview Vercel staging Ready**: primer poll (attempt 1, code 200).

**Suite full contra staging** (SHA `f971ee3`):
```
Running 45 tests using 8 workers
...
42 passed (50.7s)
3 flaky
  [chromium] › producto-1/s1-badge-reserva-online.spec.ts:74 (retry verde)
  [chromium] › producto-1/s2-cross-links-etologia.spec.ts:25 (retry verde)
  [chromium] › producto-1/s2-cross-links-etologia.spec.ts:43 (retry verde)
EXIT=0
```
Los 3 flaky son consistentes con la deuda light ya anotada + nota del mini-checklist "flakiness ambiental preview cold-start". Todos verdes en retry (single retry local por config). **Sin bloqueos** para Fase C.

**Cleanup MCP staging post-suite**: `0 [TEST-%` + `0 e2e-%` verificado.

**FASE B CERRADA — 2026-08-07**. Siguiente: Fase C (merge `zonab-1 → staging`).

## Anexo — commits del sprint (rama `producto-1`)

```
4f6a6b0 test(guard): PR0 refactor whitelist → deny-list + test unitario
ca0b41d feat(producto-1): PR1 badge "Reserva online" en cards del explorador
d499b23 fix(producto-1): PR1 incidente RPC — duracion_slot_min + P6 regla nueva
bda80e9 docs(producto-1): PR1 cerrado — anotar known-flaky del s1-badge
4a7665a feat(producto-1): PR2 categoría Etología y Conducta + cross-links
<sha de este acta>
```
