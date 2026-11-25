# Plan sprint RESEND-REMINDERS-DEDUP — investigación 2026-11-24 PM

Written for: el PO (Aldo). Documento de investigación del hallazgo "3× duplicados en Resend dashboard" reportado el 2026-11-24. El backlog item [`RESEND-REMINDERS-DEDUP`](../../BACKLOG.md) documentaba hipótesis "idempotency marker ausente"; esta investigación la **REFUTA** con evidencia de código y propone el fix real (que es distinto).

## 1. Corrección del diagnóstico preliminar del BACKLOG

### Lo que el BACKLOG original decía

> "Cero idempotency marker en el handler: grep del handler [pages/api/cron/recordatorio-reserva.ts](../../pages/api/cron/recordatorio-reserva.ts) (638 líneas) por `already_sent|ya_enviado|sent_at|idempoten|dedup|recordatorio_enviado|reminded_at` → **0 matches**. El handler fetch reservas elegibles + envía sin marcar 'ya envié este reminder para X reserva'. Cualquier re-invocación re-envía los mismos emails."

### Lo que el código REALMENTE hace (verificado 2026-11-24)

**El handler SÍ tiene idempotency robusto a nivel BD via claim-and-send pattern**. Las columnas reales son:

- `agendamientos.recordatorio_tutor_enviado_at` (timestamptz)
- `agendamientos.recordatorio_proveedor_enviado_at` (timestamptz)

El grep original falló porque buscaba nombres genéricos (`sent_at`, `reminded_at`) y no las columnas reales con prefijo `recordatorio_*`. **Falso negativo del grep del auditor**, no falso positivo del handler.

Evidencia (ver [pages/api/cron/recordatorio-reserva.ts:366-396](../../pages/api/cron/recordatorio-reserva.ts#L366-L396)):

```ts
const reclamarEnvio = async (agendamientoId, markColumn): Promise<boolean> => {
    const { data, error } = await supabaseAdmin
        .from('agendamientos')
        .update({ [markColumn]: new Date().toISOString() })
        .eq('id', agendamientoId)
        .is(markColumn, null)   // ← guard atómico: solo UPDATE si marca aún NULL
        .select('id');
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;   // ← true si claim ganó
};
```

**Flow por agendamiento**:
1. SELECT candidatos con `recordatorio_*_enviado_at IS NULL` + ventana [now+12h, now+36h] + estado 'confirmada'.
2. Por candidato: `reclamarEnvio()` hace UPDATE atómico. **Si otro run ya marcó la columna, claim pierde → NO envía**.
3. Claim ganado → `enviarRecordatorio()` dispara Resend. Si Resend falla → `rollbackClaim()` setea marca a null para que el próximo run reintente.

Zero posibilidad de doble-send del mismo `(agendamiento_id, destinatario)` en ejecuciones concurrentes del cron ni cross-run.

### Impacto de la corrección

El backlog original proponía:
- Opción A: nueva tabla `recordatorios_enviados (agendamiento_id, target_date) UNIQUE`.
- Opción B: columna `agendamientos.recordatorio_24h_enviado_at`.

**Ninguna aplica**: la Opción B ya existe (×2, una por destinatario). Opción A sería duplicación redundante.

## 2. Re-explicación del hallazgo del PO

**Finding observado**: Resend dashboard mostró reminder emails del cron de reservas duplicados 3× mismo timestamp (subjects `[STAGING] (orig: acanocts+tutor@gmail.com) Mañana: tu reserva con Admin` ×3 + `Mañana: reserva de Camila Figueroa Mendoza` ×3).

### Hipótesis candidatas (revisitadas)

1. **Concurrent CI runs sobre staging** — **PROBABLE** (hipótesis más fuerte).
   - 3 runs de la suite `f2-recordatorios-cron` en ventana corta (minutos de distancia).
   - Cada run invoca el endpoint con fixtures FRESCAS (3 agendamientos nuevos distintos en BD, cada uno con `recordatorio_*_enviado_at = NULL`).
   - El claim-and-send gana para cada agendamiento (porque son distintos IDs) → **3 emails distintos al mismo recipient `audit_inbox@mail.tm`** (prefix `[STAGING]`).
   - Resend dashboard los muestra como 3 entries idénticas en subject/recipient/timestamp → **SE LEE** como "3× duplicados del mismo email" cuando en realidad son **3 emails distintos con metadata idéntica** (diferentes `messageId`).

2. **Loop interno del handler con duplicate fetch** — **DESCARTADA**.
   - Handler itera sobre `elegibles` (dedup via `Set` implícito del SELECT unique por `id`). Zero `for × for` sobre el mismo agendamiento.
   - El claim-and-send previene re-envío por `agendamiento_id` incluso si por bug el array tiene duplicados.

3. **Retry serverless post-timeout no-idempotente** — **DESCARTADA**.
   - El handler Vercel tiene timeout 300s (cron). Resend send es sub-segundo.
   - Si Vercel reintenta el cron: candidatos ya marcados → `.is(markColumn, null)` filter los excluye del SELECT → 0 envíos duplicados.

4. **Fixture persist cross-runs sin cleanup** — **DESCARTADA parcialmente**.
   - E2E fixtures insertan agendamientos con `tutor_nombre = '[TEST-cron-*]'` matcheable para cleanup.
   - `afterAll` de la suite debe limpiar tanto el agendamiento como marcar las columnas usadas. Si NO limpia, los agendamientos quedan en BD con `recordatorio_*_enviado_at` poblado. Próxima corrida inserta FRESCOS (nuevos IDs) + el claim gana. Zero re-envío sobre agendamientos viejos.

### Conclusión de root cause

**3 runs CI concurrentes sobre staging** creando 3 reservas distintas pero con mismo tutor / nombre / servicio → 3 emails distintos con metadata idéntica. El Resend dashboard los muestra como "duplicados" pero son emails separados (distintos `messageId` + distintas rows en Resend audit log).

## 3. Opciones de fix (si el PO decide)

### Opción 1 — Rate-limit de callers e2e en staging (prioridad real)

**Scope**: modificar `lib/cronGuard.ts` o el handler `recordatorio-reserva` para rechazar más de N invokes/hora cuando `bypassEnv=1` (ruta de e2e). Ej. `max 5 invokes/hora` para el endpoint via Redis o memoria (con fallback graceful).

**Pro**:
- Previene drenaje de quota Resend por batch CI runs.
- Protege el canal productivo cuando múltiples PRs corren en paralelo.
- Zero cambio al pattern claim-and-send actual.

**Contra**:
- Suite e2e puede fallar legítimamente si el dev corre `f2-recordatorios-cron` en loop durante debugging.
- Requiere decisión sobre backend rate-limit (Upstash? memoria?).

**Esfuerzo estimado**: 2-3h.

### Opción 2 — Cleanup de marcas en afterAll de las fixtures e2e

**Scope**: asegurar que el `afterAll` de `e2e/specs/f2-recordatorios-cron/all.spec.ts` + `e2e/specs/pan-1/def7-recordatorio-title.spec.ts` + fixtures `e2e/fixtures/cron-recordatorio.ts` DELETEN los agendamientos creados (no solo los marquen como enviados). Zero cambio al handler productivo.

**Pro**:
- Sin cambio a código productivo. Zero riesgo.
- Si las fixtures ya hacen DELETE (verificar), zero código nuevo — solo documentación del hallazgo.
- El patrón de "insert fresh + delete after" es estándar e2e.

**Contra**:
- NO previene el 3× observado si los runs son concurrentes (cada run inserta su propio set, todos se envían antes del cleanup del primero).
- Necesita verificación: ¿realmente las fixtures DELETEan al final? (grep `afterAll` + `.delete` sobre fixtures).

**Esfuerzo estimado**: 30 min verificación + 1-2h si hay que agregar cleanup faltante.

### Opción 3 — Combinar 1+2

Rate-limit server-side + cleanup fixtures e2e. Defense-in-depth.

**Esfuerzo estimado**: 3-4h.

## 4. Recomendación del auditor

**Opción 2 primero** (verificar + agregar cleanup si falta). Cero riesgo + probable cause-root de reducido el 3× observado post-fix de fixtures.

**Opción 1** en una iteración posterior si el patrón 3× reaparece tras fix 2 (señal que el problema NO era falta de cleanup sino concurrency real).

## 5. Fix test plan (si se implementa Opción 2)

1. Localizar `afterAll` de las 2 specs + fixtures helper → verificar DELETE de `agendamientos` por tutor_nombre LIKE `'%[TEST-cron-%'`.
2. Si falta: agregarlo + commit.
3. Correr suite `f2-recordatorios-cron` localmente 3× secuencial + verificar que la BD queda limpia (`SELECT count FROM agendamientos WHERE tutor_nombre LIKE '%[TEST-cron-%' → 0`).
4. Observar Resend Delivered log al día siguiente: zero reaparición del 3× patrón con los 2 nombres específicos del hallazgo original (acanocts+tutor + Camila Figueroa Mendoza).
5. Si reaparece → escalar a Opción 1 (rate-limit).

## 6. Impact del BACKLOG

Entrada `RESEND-REMINDERS-DEDUP` debe actualizarse con el diagnóstico correcto:
- Downgrade de prioridad MEDIA → **BAJA** (no hay silent-fail productivo; el 3× es ruido de CI en staging, zero impacto usuarios reales).
- Reemplazar hipótesis "idempotency ausente" con "fixtures e2e sin cleanup".
- Agregar referencia a este documento como spec canónico.
- Fix recomendado: Opción 2 (cleanup fixtures), Opción 1 fallback.

Al implementar Opción 2 (si el PO da GO): aterrizar en un PR separado con modificación a `e2e/fixtures/cron-recordatorio.ts` + specs correspondientes.

## 7. Trazabilidad

- Hallazgo original PO: 2026-11-24 ~14:30 CLT durante smoke #149 (dashboard Resend post-upgrade Pro).
- BACKLOG item original (hipótesis incorrecta): [`BACKLOG.md § RESEND-REMINDERS-DEDUP`](../../BACKLOG.md).
- Evidencia idempotency real: [pages/api/cron/recordatorio-reserva.ts:366-444](../../pages/api/cron/recordatorio-reserva.ts#L366).
- Vercel schedule: [vercel.json](../../vercel.json) `{ path: "/api/cron/recordatorio-reserva", schedule: "0 22 * * *" }` (1×/día).
- Callers e2e: `e2e/fixtures/cron-recordatorio.ts:278`, `e2e/specs/f2-recordatorios-cron/all.spec.ts`, `e2e/specs/pan-1/def7-recordatorio-title.spec.ts`.

Anotado por el auditor 2026-11-24 PM durante cola nocturna autónoma. Zero implementación hasta GO del PO.
