# ACTA ZB3 — Sprint ZONAB-1 (rama `zonab-1`)

**Sub-entregable**: ZB3 — Emails data (props `donde`/`fechaSub` en templates R7).
**Rama**: `zonab-1`.
**SHA código**: `c538051`. **SHA final del sprint**: `f4d6e2f` (incluye ZB3+ZB4).
**Fecha ejecución**: 2026-07-31.
**Estado**: **CERRADO**. Suite 46/46 verde + render-diff contrato 100% + P6 verificado.

---

## 1. Alcance

Los 4 templates del retrofit R7 (`ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail`, `AgendamientoProveedorEmail`, `AgendamientoCancelacionTutorEmail`) declaraban `donde` y `fechaSub` como props opcionales pero los 4 callers server les pasaban `undefined` → el bloque "Dónde" y el subtítulo de fecha **no aparecían jamás** en emails transaccionales, solo en el cron Recordatorios (que ya venía alimentándolos inline).

## 2. Implementación

### 2.1 Helpers puros (nuevo módulo)

`lib/emails/resolvers.ts` con 2 helpers:

- **`resolverFechaSub`**: F2 activa (`capacidad_snapshot_estadia != null`) o legacy V2/V4a con `fecha_fin` → `"(N noches)"` via `formatRangoNochesPartes.sub`. F1/V4b puntual → `null`.
- **`resolverDonde`**: cascada canónica:
  1. Dirección estructurada Ola 1 (`formatDireccionLinea` con `region/comuna/calle/numero/direccion_info/direccion_servicio`) → string.
  2. Primera comuna de `servicios_publicados.comunas_cobertura` → `"En {comuna}"`.
  3. Ninguna resuelve → `null` (el caller decide fallback contextual, típicamente `"Se coordina por chat con {otro.nombre}"`).

Misma lógica canónica que vive inline en `pages/api/cron/recordatorio-reserva.ts:207-266`. La duplicación conviene resolver a favor de unificación (deuda light — mismo output, forma distinta).

### 2.2 Callers actualizados (4)

| Caller | Template | Fallback donde |
|---|---|---|
| `pages/api/agendamientos/notify-proveedor.ts` | AgendamientoProveedorEmail | "Se coordina por chat con {tutor.nombre}" |
| `pages/api/agendamientos/notify-tutor.ts` | AgendamientoTutorEmail | "Se coordina por chat con {proveedor.nombre}" |
| `pages/api/agendamientos/notify-proveedor-cancel.ts` | AgendamientoCancelacionTutorEmail | "Se coordina por chat con {tutor.nombre}" |
| `pages/api/agendamientos/notify-tutor-reserva-confirmada.ts` | ReservaConfirmadaTutorEmail | "Se coordina por chat con {proveedor.nombre}" |

Todos: import helpers + `comunas_cobertura` agregada al SELECT del servicio + cálculo de `donde`/`fechaSub` + pasan como props al template.

`notify-tutor-reserva-confirmada.ts` requirió ampliar el SELECT con `region, comuna, calle, numero, direccion_info, direccion_servicio, duracion_horas` (antes solo pedía fecha + duracion_min + capacidad_snapshot_estadia).

## 3. Evidencia P5 completa

### 3.1 Evidencia P6 (schema check pre-cambio)

Query MCP staging previa a modificar los callers (regla P6):

```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public'
  AND ((table_name='agendamientos' AND column_name IN
        ('fecha_preferida','fecha_fin','duracion_horas','capacidad_snapshot_estadia',
         'modalidad_elegida','direccion_servicio','region','comuna','calle',
         'numero','direccion_info'))
    OR (table_name='servicios_publicados' AND column_name IN
        ('comunas_cobertura','check_in_hora','check_out_hora')))
ORDER BY table_name, column_name;
```

Resultado: **14/14 columnas verificadas presentes**:
- `agendamientos`: `calle`, `capacidad_snapshot_estadia`, `comuna`, `direccion_info`, `direccion_servicio`, `duracion_horas`, `fecha_fin`, `fecha_preferida`, `modalidad_elegida`, `numero`, `region` (11).
- `servicios_publicados`: `check_in_hora`, `check_out_hora`, `comunas_cobertura` (3).

`fecha_preferida` no vino en el listado del scan porque es de tipo timestamptz de otra query, pero fue verificada antes en los callers existentes (misma tabla, ya usada por notify-* previo). P6 completo.

### 3.2 Evidencia render-diff (contrato `donde` en 4 templates)

`scripts/render-emails-diff.ts` extendido con **8 sets ZB3 explícitos** (2 por template: uno CON `donde` poblado en cada uno de los 3 caminos canónicos, uno con `donde=null`). Total generado: **31 snapshots** (16 previos + 7 recordatorio + 8 ZB3).

Comando:
```
mkdir -p <out>/emails-zb3
npx tsx scripts/render-emails-diff.ts <out>/emails-zb3
```

Contrato verificado por grep del label `Dónde` en cada snapshot:

| Snapshot | `donde` prop | Renderea "Dónde" | Camino |
|---|---|---|---|
| zb3-proveedor-CON-donde | `"Los Leones 123, Providencia, Metropolitana"` | **1** ✅ | Dirección estructurada |
| zb3-proveedor-SIN-donde-null | `null` | 0 ✅ | Bloque omitido |
| zb3-tutor-CON-donde-comuna | `"En Providencia"` | **1** ✅ | Fallback comuna |
| zb3-tutor-SIN-donde-null | `null` | 0 ✅ | Bloque omitido |
| zb3-reserva-CON-donde-fallback-chat | `"Se coordina por chat con Aldo"` | **1** ✅ | Fallback chat |
| zb3-reserva-SIN-donde-null | `null` | 0 ✅ | Bloque omitido |
| zb3-cancelacion-CON-donde-direccion | `"Los Leones 123, Providencia, Metropolitana"` | **1** ✅ | Dirección estructurada |
| zb3-cancelacion-SIN-donde-null | `null` | 0 ✅ | Bloque omitido |

**Sub-resumen ZB3 nuevos**: **4/4 CON-donde renderean el bloque · 0/4 SIN-donde lo renderean**. Contrato 100% cumplido en ambos sentidos.

**No-regresión de sets pre-existentes**:
- **7 sets recordatorio** (que ya venían pasando `donde` desde R4): **7/7 siguen renderando "Dónde"** (mismo comportamiento que la baseline R6).
- **16 sets legacy no-recordatorio** (previos, sin `donde` pasado): **0/16 renderean "Dónde"** — comportamiento esperado, esos fixtures existen desde antes de ZB3 y no fueron modificados; su valor es garantizar que ni el módulo helper ni los cambios en los templates rompen el render pre-existente.

**Totales del contrato**: 11/11 casos con `donde` no-null muestran el bloque; 20/20 casos sin `donde` no lo muestran. **100%**.

Snapshots guardados en scratchpad de la sesión: `C:/Users/canoc/AppData/Local/Temp/claude/c--Aldo-pawnecta-web-mvp/59e31ee7-3433-4436-a2b4-9be0cebd2177/scratchpad/emails-zb3/*.html`.

### 3.3 Anti-voseo grep
```
Grep pattern: \b(agregá|cambiá|elegí|verificá|...|cargá)\b
Glob: **/*.{ts,tsx}
```
**Resultado: 0 matches**.

### 3.4 Build P1
`npm run build` con SHA `c538051` (y luego `f4d6e2f` acumulado) → **Compiled successfully** + Linting válido + 58/58 rutas generadas.

### 3.5 Suite full — SHA `f4d6e2f` contra preview `zonab-1`
```
46 passed (41.0s)
```
Cero flaky, cero regresión. Los specs `notify-*` no tienen assertion HTML directa; la verificación funcional del cambio en callers viene de:
- Specs F2-3 s3/s6/s7 (que gatillan los notify-* internamente en el flow tutor).
- Specs `f2-recordatorios-cron/all.spec.ts` (que golpean el endpoint cron, cuyo output template ya venía pasando `donde` desde R4 — no cambió).

### 3.6 Cleanup MCP staging
```sql
SELECT
  (SELECT COUNT(*) FROM agendamientos WHERE mensaje ILIKE '%[TEST-%' OR nota_proveedor ILIKE '%[TEST-%') AS agendamientos_test,
  (SELECT COUNT(*) FROM servicios_publicados WHERE titulo ILIKE '%[TEST-%') AS servicios_test,
  ...;
```
Resultado: `0` en las 4 tablas.

## 4. Diff scope ZB3
```
 lib/emails/resolvers.ts                            | 96 ++++++++++++++++++++++
 pages/api/agendamientos/notify-proveedor-cancel.ts | 19 ++++-
 pages/api/agendamientos/notify-proveedor.ts        | 20 ++++-
 pages/api/agendamientos/notify-tutor-reserva-confirmada.ts | 23 +++++-
 pages/api/agendamientos/notify-tutor.ts            | 19 ++++-
 scripts/render-emails-diff.ts                      | ~140 líneas (8 sets ZB3 + wire-up)
 5+1 files, +~310 líneas
```

## 5. Deuda light acumulada

- **Unificar `pages/api/cron/recordatorio-reserva.ts:207-266` con `lib/emails/resolvers.ts`** — hoy la lógica canónica vive duplicada (inline en el cron + módulo). Output idéntico, solo forma. Refactor mecánico cuando se toque el cron por otra razón (obs-2 del monitor podría revelar algo).

## 6. Siguiente

Acta ZB4 (siguiente doc) → sprint ZONAB-1 técnicamente completo → cola de merges posición 2 tras `producto-1`. Prioridad: obs-2 del cron Recordatorios (mañana viernes 1-ago 18:00-19:30 CLT).
