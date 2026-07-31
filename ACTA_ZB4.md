# ACTA ZB4 — Sprint ZONAB-1 (rama `zonab-1`)

**Sub-entregable**: ZB4 — Seguridad chica.
**Rama**: `zonab-1`.
**SHA final**: `f4d6e2f` (mismo del sprint completo, ZB4 último commit).
**Fecha ejecución**: 2026-07-31.
**Estado**: **CERRADO**. Sub-entregables ZB4-a (diferido con trigger) + ZB4-b (fix + instrumentación aplicado).

---

## 1. Alcance (revisado post-dimensionamiento)

Del brief inicial ZONAB-1: (a) advisory lock capacidad_estadia > 1 (dimensionar primero); (b) instrumentación liviana drift marcas cron.

## 2. ZB4-a — Advisory lock capacidad_estadia > 1 → DIFERIDO con trigger

### 2.1 Dimensionamiento (MCP staging)

```sql
SELECT
  COUNT(*) FILTER (WHERE capacidad_estadia > 1) AS servicios_multi_cap,
  COUNT(*) FILTER (WHERE capacidad_estadia = 1) AS servicios_cap_1,
  COUNT(*) FILTER (WHERE capacidad_estadia IS NULL) AS servicios_sin_estadia,
  MAX(capacidad_estadia) AS max_cap
FROM servicios_publicados;
```

Resultado:
```
[{ "servicios_multi_cap": 0, "servicios_cap_1": 1, "servicios_sin_estadia": 14, "max_cap": 1 }]
```

**Cero servicios con capacidad > 1 en staging** (equivalente esperado en prod — mismo schema, mismo modelo de proveedor). El escenario race multi-capacidad **no está en uso**. Implementar advisory lock ahora es ingeniería especulativa sin usuario concreto que lo justifique.

### 2.2 Decisión: bajar a sprint dedicado con trigger de activación

Documentado en `BACKLOG.md` con:
- **Trigger claro**: monitor SQL `SELECT COUNT(*) FROM servicios_publicados WHERE capacidad_estadia > 1` — cuando pase de 0 → sprint dedicado.
- **Fix cuando toque**: `pg_advisory_xact_lock(hashtext(servicio_id::text))` al inicio de la transacción del INSERT del picker F2. Serializa INSERTs por servicio sin afectar otros.
- **Contenido del sprint futuro**: (a) advisory lock, (b) test de carga con 2 clientes concurrentes, (c) contador de rebotes por lock timeout.

**Aprobación PO explícita registrada**: "diferimiento CORRECTO — cero instancias reales verificadas > ingeniería especulativa; trigger en BACKLOG conforme".

## 3. ZB4-b — Instrumentación drift cron → FIX + INSTRUMENTACIÓN

**Re-framing (aprobación PO 2026-07-31)**: no es solo medición — el `UPDATE ... .is('recordatorio_*_enviado_at', null)` **endurece la idempotencia a nivel row** contra races concurrentes. Antes, dos ejecuciones simultáneas del cron (edge case de reintento post-timeout Vercel) podrían haber sobrescrito una marca ya poblada; ahora el segundo UPDATE matcheará 0 rows y no escribirá basura. El log grepable es la prueba de que el gate funcionó, no solo un observador pasivo.

### 3.1 Cambios en `pages/api/cron/recordatorio-reserva.ts`

**Fix idempotencia row-level**: los dos UPDATE del cron ahora tienen filtro NULL explícito + `.select('id')` para saber si matchearon:
```ts
const { data: updData, error: updErr } = await supabaseAdmin
    .from('agendamientos')
    .update({ recordatorio_tutor_enviado_at: new Date().toISOString() })
    .eq('id', e.agendamientoId)
    .is('recordatorio_tutor_enviado_at', null)   // ← FIX: gate a nivel row
    .select('id');
if (updErr) throw updErr;
if (!updData || updData.length === 0) {
    driftTutor++;
    console.warn('[cron-drift] tutor mark ya poblado antes del UPDATE', { ... });
}
```
- Antes: el filter `.or('recordatorio_tutor_enviado_at.is.null,recordatorio_proveedor_enviado_at.is.null')` gate a nivel query — pero entre el SELECT y el UPDATE hay una ventana temporal (~ms) donde otra ejecución podría escribir. Ahora el UPDATE mismo verifica NULL en el momento del write.
- Sin este gate: dos crons simultáneos podrían escribir el mismo timestamp; el segundo silently sobrescribe al primero. La marca queda "correcta" (ambos apuntan al mismo email enviado), pero el email se envió DOS veces al mismo destinatario. **Ese era el vector de spam potencial que el fix cierra**.

**Instrumentación mínima**:
- Contadores `driftTutor` / `driftProveedor` incrementados por cada 0-row UPDATE.
- Log `[cron-drift]` por evento con `agendamientoId + servicioId` (grepable en Vercel Logs para diagnóstico por-row).
- Log `[cron-drift-summary]` al fin del handler con `{candidatos, elegibles, sentTutor, sentProveedor, driftTutor, driftProveedor, failures, timestamp}` — snapshot por corrida.

### 3.2 Alineación con BACKLOG

El item vivo "Instrumentar `/api/cron/recordatorio-reserva` para diagnóstico de drift de idempotencia" (observado en R6) queda actualizado con lo aterrizado en ZB4-b. El upgrade `?verbose=1` original queda como deuda para diagnóstico por-id si el drift real aparece en prod. La primera evidencia de drift ahora es visible via `grep [cron-drift]` en Vercel Logs sin código nuevo.

### 3.3 No-regresión del cron

Suite `f2-recordatorios-cron/all.spec.ts` (9 tests, project `chromium-cron`) sigue verde en la corrida contra `f4d6e2f`:
- S1 dryRun: OK (no toca marcas).
- S2 corrida real + idempotencia 2ª corrida: OK — la 2ª corrida como dryRun sigue mostrando 0 elegibles con nuestros IDs.
- S3 parcial (solo proveedor pendiente): OK — la marca del tutor intacta.
- S4 no-elegibles: OK.
- S5 auth (4 tests): OK.

El fix del UPDATE condicional no cambia semántica en el happy path (marca era NULL → se puebla, matchea 1 row). Solo blinda el edge case race.

## 4. Evidencia P5

### 4.1 Build P1
`npm run build` con SHA `f4d6e2f` → **Compiled successfully** + 58/58 rutas.

### 4.2 Suite full — SHA `f4d6e2f` contra preview `zonab-1`
```
46 passed (41.0s)
```
Cero flaky. Cero regresión. Los 9 specs de cron (incluye S2 idempotencia) pasan sin cambios — el fix del UPDATE condicional es transparente en el happy path.

### 4.3 Cleanup MCP staging
0 filas `[TEST-%` en las 4 tablas (agendamientos, servicios_publicados, proveedores, excepciones_disponibilidad).

## 5. Diff scope ZB4
```
 pages/api/cron/recordatorio-reserva.ts  |  53 +++++++++++++++++++++-----
 BACKLOG.md                              |   6 ++
 2 files, +59 −5
```

## 6. Deuda light

- **Instrumentación por-id (`?verbose=1`)**: pendiente en BACKLOG — upgrade cuando el drift real se manifieste en prod y necesite diagnóstico row-level más allá del log agregado del summary.

## 7. Estado tras cierre

Sprint **ZONAB-1 técnicamente completo**. SHA final `f4d6e2f`. Cadena en zonab-1:
```
bea9fff  acta ZB1
4dcf176  ZB2 código+spec
8745602  acta ZB2
c538051  ZB3 código
f4d6e2f  ZB4 código + BACKLOG
+ este commit: acta ZB3 + acta ZB4
```

Cola de merges (posición 2):
1. `producto-1` primero (autonomía adelantada del PO, ya cerrado técnicamente).
2. **`zonab-1` después** (no-FF esperado — merge normal, commits paralelos post-fork de staging @ `55489fe`).

Standby posterior: el evento que mueve la cola sigue siendo la **captura obs-2 del cron mañana viernes 1-ago 18:00-19:30 CLT** → si limpia, acta final Fase 5 Recordatorios + tag `recordatorios-prod-20260801` + casilla 0.1 checklist N15 → GO Fase 6 N15 → ventana de merges post-N15-monitor abre.
