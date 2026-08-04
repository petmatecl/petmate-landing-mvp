# Acta consolidada — Sprint PRODUCTO-2

> **ESTADO: TÉCNICAMENTE COMPLETO — 2026-08-04**. Suite 58/58 verde en preview `producto-2` SHA `1f5c05a`. **Posición 3 de la cola de merges** (`producto-1 → zonab-1 → producto-2`). Esperando ventana post-Fase 8 monitor N15 (cierre jueves 06-ago ~15:00 CLT).

**Rama**: `producto-2` desde `zonab-1 @ af0b6d7` (heredaba PR0 guarda deny-list + ZB1-ZB4 completos + N15 mergeado).

**Sub-entregables** — orden PD1 → PD4-bis → PD2 → PD3 (autorización adelantada + PD4 aterrizado con PD1 + PD4-bis emergente durante PD2):

| PD | Título | Estado | SHA de código |
|---|---|---|---|
| PD1 | Estados derivados REALIZADA/VENCIDA (helper puro + tests unit) | ✅ | `bbbfbce` (fixes spec `6957587` → `54d1477`) |
| PD4 | CTA "Volver a solicitar" en VENCIDA (aterrizado con PD1) | ✅ | `bbbfbce` |
| PD2 | Pestañas Próximas/Pendientes/Historial + contadores | ✅ | `f5da7ef` (fixes spec `86b9209`) |
| PD4-bis | Cancel-then-navigate (cierra bug descubierto por fixture) | ✅ | `5c27dd8` |
| PD3 | Filtros por proveedor + mascota + chip discreto | ✅ | `1f5c05a` |

---

## PD1 — Estados derivados

**Regla**: `confirmada + fin efectivo pasado → realizada` · `pendiente + fecha pasada → vencida` · terminales sin cambio.

**Helper `lib/estadoDerivado.ts`** reusa la semántica canónica del cron `recordatorio-reserva.ts:166-189` (familia F2/F1/legacy + fin efectivo). Reloj inyectable para tests deterministas.

**Tests puros**: 29/29 verdes (`npx tsx lib/estadoDerivado.test.ts`). Cubre 3 familias, 3 caminos de fin efectivo, 2 reglas de derivación, contra-tests de terminales + edge cases.

**Integración UI**: `pages/mis-solicitudes.tsx` reemplaza `solicitud.estado` directo por `estadoDerivado(solicitud)`. Badges nuevos: REALIZADA (accent-50 + CheckCircle2, neutro-positivo) y VENCIDA (slate-50 + AlertTriangle). Acciones automáticamente gateadas por construction.

**Migrations**: cero. Decisión PO derivados respetada.

Ver `ACTA_PD1.md` para detalle completo.

## PD4 — CTA "Volver a solicitar" en VENCIDA (aterrizado con PD1)

Se aterrizó en el mismo commit que PD1 porque pertenece al ciclo REALIZADA/VENCIDA. CTA en cards VENCIDA linkea a `/servicio/{id}` — la vencida deja de ser lápida. **Refactorizado en PD4-bis** (ver abajo).

## PD2 — Pestañas Próximas/Pendientes/Historial

| Pestaña | Filtro | Orden | Default |
|---|---|---|---|
| Próximas | `confirmada` | fecha asc | ✅ |
| Pendientes | `pendiente` | fecha asc | |
| Historial | `realizada + vencida + cancelada + rechazada + cancelada_proveedor` | fecha desc | |

**Particionado 100% client-side** sobre la lista ya cargada — cero queries nuevas. Default Próximas (lo que el tutor necesita).

**A11y**: `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` + panel con `role="tabpanel"` + `aria-labelledby`.

**Visual**: contadores como badge (accent-100 activo, slate-100 inactivo). Empty state por pestaña con copy contextual. Mobile-first: `overflow-x-auto hide-scrollbar`.

5 tests spec `s2-pestanas.spec.ts` verdes.

Ver `ACTA_PD2.md` para detalle completo.

## PD4-bis — Cancel-then-navigate (bug descubierto por fixture)

**Origen**: la constraint `agendamientos_unique_pendiente_por_tutor_servicio` (UNIQUE `tutor_id, servicio_id WHERE estado='pendiente'`) fue **descubierta al escribir el fixture del spec s2 PD2** — no en producción. Al reportar el fix del fixture, el PO detectó que la misma constraint rompe el flujo productivo primario del CTA "Volver a solicitar" de PD4: al navegar a `/servicio/{id}` con la vencida (que sigue `estado='pendiente'` en BD), el INSERT nuevo fallaba `23505` con mensaje absurdo tipo "Ya tienes una solicitud pendiente para este servicio. Espera al proveedor".

**Meta-lección**: "el manual de suite pagándose sola" — constraint parcial + tipo derivado en UI = superficie invisible a testing UI convencional, expuesta por fixture cruzado.

**Fix (opción A aprobada PO)**: UPDATE client-side directo con **refinamiento obligatorio** `.eq('estado','pendiente')` (anti-carrera). Si entre render y click el proveedor confirmó, matchea 0 rows: NO navegamos, refresh + toast neutro. CTA refactorizado de `<Link>` a `<button>` con state loading.

**Nitpick copy L1213** `SolicitarAgendamientoModal.tsx` refinado en el mismo commit: para el flow secundario donde el user entra via deep link sin pasar por el CTA, el copy ahora ofrece salida específica ("cancélala desde Mis reservas para volver a solicitar").

**Contra-test de oro** en `s1-estados-derivados.spec.ts`: PRE-INSERT falla 23505 → click CTA → navegación OK → POST-INSERT pasa. Verde en 3.9s.

Ver `ACTA_PD4bis.md` para detalle completo.

## PD3 — Filtros por proveedor + mascota + chip discreto en card

**Discrepancia detectada en el brief**: la data de `mascota_id`/`tipo_mascota_texto` NO viajaba en el SELECT actual de `/mis-solicitudes` — solo el proveedor. Reportada al PO, aprobada **opción A** (ampliar SELECT + embed a mascotas) + **reconfirmación 2026-08-04**.

### P6 obligatorio antes de tocar

Verificación vía MCP staging:
- **FK real**: `agendamientos_mascota_id_fkey` (from `agendamientos.mascota_id` → `mascotas.id`).
- **Columnas mascotas**: `id` (uuid), `nombre` (NOT NULL text), `tipo` (NOT NULL text), `foto_mascota` (nullable text).
- **Nullability data prod-like**: 13/14 agendamientos sin mascota — el filtro "Sin mascota" es esperado y funcional.

### Implementación

- **SELECT ampliado** con `mascota:mascotas!agendamientos_mascota_id_fkey(id, nombre, tipo, foto_mascota)` + `mascota_id` + `tipo_mascota_texto`. Normalize del embed (Array vs object PostgREST).
- **Tipo `AgendamientoConRelaciones`** amplía con `mascota` opcional.
- **Dropdowns condicionales** (>1 opción): filtroProveedor + filtroMascota. Reset al cambiar de tab. Aplicados post-particionado.
- **"Sin mascota"** aparece si existen cards sin ficha ni texto libre (comportamiento adaptativo).
- **Chip mascota** (BONUS moderado): foto 20x20px rounded-full si viaja, `PawPrint` icon si solo ficha, ausente sin romper layout si null. Fallback a `tipo_mascota_texto` para legacy.
- **Empty state contextual** distingue "sin cards de este tipo" de "filtros no matchean".

**Spec `s3-filtros.spec.ts`** — 3 tests verdes:
1. Dropdowns condicionales (contrato estricto en las 3 tabs).
2. Chip mascota null-tolerante (cards sin mascota no renderean el chip).
3. Reset filtros al cambiar tab (integridad state).

**Migrations**: cero.

## Evidencia P5 consolidada del sprint

### Build P1
Verde en cada SHA (bbbfbce, 6957587, 54d1477, f5da7ef, 86b9209, 5c27dd8, 1f5c05a).

### Suite e2e final — SHA `1f5c05a` contra preview `producto-2`

**Corrida final**: `58 passed (36.2s)`. Cero flaky, cero regresión.

**Distribución**:
- `setup` + `setup-tutor` = 2
- `chromium` (F2-2B + ZB1 s10 + ZB2 s11) = 13
- `chromium-tutor` (F2-3 + producto-2 s1/s2/s3) = 34
  - producto-2 nuevo: 4 (PD1: Realizada + Vencida + Confirmada control + PD4-bis contra-test oro) + 5 (PD2 pestañas) + 3 (PD3 filtros) = **12 tests del sprint**
- `chromium-cron` (Recordatorios R6) = 9

**Pass anterior con 21 failed + 28 did-not-run fue flakiness ambiental** — verificado con re-corrida aislada del primer test failed (3/3 verde en 17s) y re-corrida full (58/58 verde en 37s). Preview cold-start + 2 workers paralelos = cascade de timeouts sin bug real subyacente.

### Tests unitarios PD1
```
$ npx tsx lib/estadoDerivado.test.ts
29 passed, 0 failed
```

### Cleanup MCP staging
`0` en agendamientos + servicios test post-suite.

### Anti-voseo grep
`0 hits` en `**/*.{ts,tsx}`.

## Diff scope agregado del sprint
```
9 files, +~1500 −~50 líneas aprox
Nuevos:
  lib/estadoDerivado.ts               (helper puro)
  lib/estadoDerivado.test.ts          (29 tests unit)
  e2e/specs/producto-2/s1-estados-derivados.spec.ts
  e2e/specs/producto-2/s2-pestanas.spec.ts
  e2e/specs/producto-2/s3-filtros.spec.ts
  ACTA_PD1.md, ACTA_PD2.md, ACTA_PD4bis.md (+ este consolidado)
Modificados:
  pages/mis-solicitudes.tsx           (badges + pestañas + filtros + chip + handleVolverASolicitar)
  components/Servicio/SolicitarAgendamientoModal.tsx (copy L1213 refinado)
  lib/types/agendamiento.ts           (mascota + mascota_id + tipo_mascota_texto en shape)
  playwright.config.ts                (producto-2/ en testMatch chromium-tutor)
```

## Migrations

**CERO** en todo el sprint. Decisión PO derivados respetada.

## Estado tras cierre técnico

- Rama `producto-2` con SHA `1f5c05a` estable en preview.
- **Posición 3 de la cola de merges**: `producto-1 → zonab-1 → producto-2`. Cada uno con FF-check + suite contra staging + revisión visual PO donde aplique.
- **Deuda light** documentada en cada acta individual + agregada en `BACKLOG.md` (sprint ANALYTICS-1 registrado, bundle SEO+GA del triage Auditoría #2).

## Entregables paralelos (registrados en este commit)

- **`REPORTE_DIAGNOSTICO_ERRORS_PROD.md`** — diagnóstico read-only de los 61 errores 307 en logs prod + ADDENDUM del hallazgo GA (GA disparando desde previews/staging). 2 bundles propuestos para triage Auditoría #2: SEO (307→410/404 + sitemap.estado + log info) y GA (gate por entorno + limpiar consent storageState + filtro tráfico interno GA4).
- **`BACKLOG.md` sub-sección "Sprint ANALYTICS-1"** — brief cerrado por PO con taxonomía aprobada de 11 eventos (5 oferta + 6 demanda), 4 key events, métrica norte "conexiones semanales", prerequisito explícito del gate GA.

## Enmienda P5 — PD5-fix aterrizado 2026-08-04 tarde (SHA `22798ab`)

**Origen**: smoke pre-jueves del plugin `code-review` produjo 2 findings ≥80 sobre este sprint. Aunque el veredicto del plugin fue REDUNDANTE vs el canónico xhigh (descartado para Auditoría #2), los 2 findings eran bugs REALES de PD2/PD3. Decisión PO: fix pre-desfile ("más barato aterrizar hoy que re-triagear el jueves").

**Bugs cerrados**:

- **[85] a11y `aria-labelledby` dangling** (`pages/mis-solicitudes.tsx:526`): el tabpanel referencia `aria-labelledby={` `tab-${activeTab}` `}`, pero los `<button role="tab">` NO tenían `id={` `tab-${tab.id}` `}`. Screen readers no encontraban nombre accesible del panel. **Fix**: agregar `id={` `tab-${tab.id}` `}` a cada botón. **Test**: spec s2 amplía `Default = Próximas + los 3 tabs presentes con role=tab` con 3 asserts `toHaveAttribute('id', 'tab-*')` + `panel toHaveAttribute('aria-labelledby', 'tab-proximas')`.

- **[82] Filtros huérfanos post-refresh** (`pages/mis-solicitudes.tsx:485-520`): si `filtroProveedor='X'` o `filtroMascota='Y'` está activo y `fetchSolicitudes()` (post-cancelación) deja las opciones del panel ≤1, el dropdown desaparece por el gate `>1` pero el valor persiste → cards filtradas a cero, empty state sin control para limpiar. **Fix**: nuevo `useEffect` que consume `state.agendamientos + activeTab + filtros`; verifica si el valor activo existe en las opciones actuales del panel; si no, reset a `null`. Cierra la carrera. **Test**: NO extendido en s3 — requiere fixtures multi-proveedor para reproducir determinísticamente (fuera del budget del PD5-fix). Cubierto por el `useEffect` determinístico y validación manual del PO en preview post-merge (queda anotado explícito en el walkthrough UX del jueves).

**Suite full post-PD5-fix contra preview producto-2 SHA `22798ab`**: **58 passed** (57 direct + 1 flaky S2 cron histórico verde en retry — patrón conocido, no regresión). Los 3 asserts extra de a11y pasaron dentro del test s2 Default sin problema.

**3 hallazgos "de pasada" del canónico** registrados en `BACKLOG.md` como deuda P3:
1. Unificar `pages/api/cron/recordatorio-reserva.ts:207-266` con `lib/emails/resolvers.ts` (duplicación byte-idéntica desde ZB3).
2. Falsy-zero en `lib/estadoDerivado.ts:96` `if(r.duracion_horas)` — code smell menor.
3. Fallback "Se coordina por chat con {tutor}" en `notify-proveedor-cancel.ts:147` — copy inconsistente (futuro en email de cancelación).

**Cadena PRODUCTO-2 con PD5-fix**: `bfa553c → 22798ab`.

## Siguiente

**Standby a Fase 8 monitor N15** (cierre esperado jueves 06-ago ~15:00 CLT). Post-monitor cerrado → cola de merges arranca según `MINI_CHECKLIST_COLA_MERGES.md`.
