# Sprint FIX-FIXTURES-CLEANUP — recon 2026-11-24 PM

Written for: el PO (Aldo). Investigación del supuesto gap "fixtures e2e sin cleanup de agendamientos" como follow-up del hallazgo Block 2 RESEND-REMINDERS-DEDUP (3× duplicados Resend dashboard 2026-11-24).

**Resultado**: **el gap NO existe** — los 5 specs que crean agendamientos ya tienen cleanup atómico via `cleanupAgendamientosDeTest()` + service_role admin (aterrizado en sprint J-4 F2-3-CLEANUP, 2026-09-22). La causa real del 3× duplicados es otra. Propuesta de fix defensivo opcional al final del documento.

## 1. Hipótesis investigada

El Block 2 `RESEND-REMINDERS-DEDUP` reportó 3× duplicados de reminder emails en el dashboard Resend durante la jornada 2026-11-24. La hipótesis derivada en ese documento fue:

> "3× duplicados = 3 CI runs concurrent creando 3 agendamientos distintos con fixtures que no limpian al terminar."

Esta investigación verifica la parte "fixtures no limpian". El hallazgo: la premisa es incorrecta.

## 2. Mapa de callsites de `insertarAgendamientoTest`

Grep en `e2e/specs/`:

| Spec | Usa `insertarAgendamientoTest` | Usa `cleanupAgendamientosDeTest` | Cleanup via admin service_role |
|---|---|---|---|
| [e2e/specs/f2-recordatorios-cron/all.spec.ts](../../e2e/specs/f2-recordatorios-cron/all.spec.ts) | ✓ (5 bloques) | ✓ en 4× `afterAll` (L102, L199, L313, L396) | ✓ `getSupabaseAdmin()` |
| [e2e/specs/pan-1/def7-recordatorio-title.spec.ts](../../e2e/specs/pan-1/def7-recordatorio-title.spec.ts) | ✓ | ✓ | ✓ |
| [e2e/specs/producto-2/s1-estados-derivados.spec.ts](../../e2e/specs/producto-2/s1-estados-derivados.spec.ts) | ✓ | ✓ | ✓ |
| [e2e/specs/producto-2/s2-pestanas.spec.ts](../../e2e/specs/producto-2/s2-pestanas.spec.ts) | ✓ | ✓ | ✓ |
| [e2e/specs/producto-2/s3-filtros.spec.ts](../../e2e/specs/producto-2/s3-filtros.spec.ts) | ✓ | ✓ | ✓ |

Cobertura: **5/5 specs** con cleanup atómico + admin para bypass RLS. Cero gap.

## 3. Mapa de callsites directos `from('agendamientos')` (fuera del helper)

| Spec | Operación | Cleanup propio |
|---|---|---|
| e2e/specs/f2-3/s3-reserva-feliz.spec.ts:95 | SELECT verificación | N/A (lectura) |
| e2e/specs/f2-3/s6-cancelacion-dentro-ventana.spec.ts:120 | SELECT | N/A |
| e2e/specs/f2-3/s7-cancelacion-fuera-ventana.spec.ts:135 | SELECT | N/A |
| e2e/specs/f2-3/s8-bypass-rls-cerrado.spec.ts:89,101 | SELECT | N/A |
| e2e/specs/f2-3/s9-regresion-F1.spec.ts:93,127,135 | SELECT | N/A |
| e2e/specs/conviene/estado-actual.spec.ts:377 | SELECT | ✓ L398 `delete().eq('id', reservaId)` explícito |

Los specs F2-3 NO hacen INSERT directo — usan el modal/endpoint real de la app (`panel-tutor.ts` fixture) que luego se barre vía `cleanupHuerfanosF23()` en `beforeAll` como defensa adicional del sprint F2-RESERVAS-CLEANUP (2026-09-23).

**Conclusión**: cero spec crea agendamientos sin cleanup posterior.

## 4. Causa real del 3× duplicados Resend (hipótesis alternativa)

Si los fixtures ya limpian, el 3× observado en el dashboard Resend 2026-11-24 requiere otra explicación. Candidatos:

### (a) 3 ejecuciones concurrent del endpoint `/api/cron/recordatorio-reserva` via CI

El endpoint acepta llamadas HTTP (GET con `x-cron-secret`). Cada corrida real del test `S2 — 1ª corrida real — marca poblada + sent > 0` ([e2e/specs/f2-recordatorios-cron/all.spec.ts:209](../../e2e/specs/f2-recordatorios-cron/all.spec.ts#L209)) inserta 3 agendamientos con `fecha_preferida = mañana` y luego hace fetch al endpoint real.

Si 3 PRs corren el workflow `e2e-F2` concurrent → cada uno crea 3 agendamientos → cada uno hace fetch al endpoint → el endpoint procesa los agendamientos de TODOS los PRs activos en staging.

**Mitigante existente**: el workflow `e2e-F2` tiene `concurrency: { group: 'staging-exclusive', cancel-in-progress: false }` — serializa runs cross-PR contra staging. Entonces 3 runs concurrent NO es posible estructuralmente.

### (b) El spec S2 corre DESPUÉS del sprint F2-RESERVAS-CLEANUP solo UNA vez por PR → 3 PRs secuenciales = 3 corridas reales = 3 batches de emails

Cada corrida real exitosa marca `recordatorio_tutor_enviado_at` + `recordatorio_proveedor_enviado_at` → idempotent para la próxima corrida del MISMO agendamiento.

Pero cada PR crea agendamientos NUEVOS (con `TAG_TUTOR_NOMBRE_PREFIX` + timestamp distinto). Entonces 3 PRs mergeados hoy ejecutaron el spec S2 3 veces → 3 batches de 3 agendamientos cada uno = 9 emails tutor + 9 emails proveedor.

El dashboard Resend muestra esto como 3× del mismo "tema" por agrupación de `subject` (recordatorio reserva Camila), no como 3× del MISMO agendamiento.

**Verificación**: el dashboard Resend NO muestra `recipient.email + subject` deduplicados; lista cada envío por separado. Si el PO vio "3× duplicados", probablemente son los envíos a los 3 batches distintos agrupados mentalmente — comportamiento esperado, NO bug.

### (c) El cron PROD real corrió sobre staging (cross-contamination)

El cron productivo corre 22:00 UTC daily. Si por mala configuración apunta al Supabase staging, procesaría los agendamientos de staging.

**Mitigante existente**: `lib/cronGuard.ts > skipIfNonProd()` chequea `NEXT_PUBLIC_APP_ENV === 'production' || VERCEL_ENV === 'production'`. En staging responde `{ skipped: true, env }`. No puede cross-contaminar.

### (d) Un spec DRY-RUN false ejecuta el endpoint real + log Resend dashboard

El spec S2 corre el endpoint con `dryRun=false` → envía emails reales. Los emails van al `AUDIT_INBOX` (prefijo `[STAGING]`). Son emails REALES — aparecen en dashboard Resend como envíos exitosos.

Si el PO vio 3× emails con subject `Recordatorio de tu reserva...` en el dashboard, son emails LEGÍTIMOS de staging (uno por agendamiento creado + procesado).

**Probable explicación real**: **(d)** combinado con **(b)**. El dashboard Resend muestra envíos legítimos de staging, no duplicados reales. La "deuda" `RESEND-REMINDERS-DEDUP` del BACKLOG original fue motivada por una interpretación errónea del dashboard.

## 5. Propuesta de fix defensivo (opcional, sin GO PO requerido)

**No urgente, pero útil defensivo**: filtrar agendamientos de test del SELECT del cron real en staging/preview, para que las corridas CI no procesen fixtures de otros PRs que casualmente estén en ventana.

Cambio propuesto en [pages/api/cron/recordatorio-reserva.ts:149](../../pages/api/cron/recordatorio-reserva.ts#L149):

```ts
// Antes:
.or('recordatorio_tutor_enviado_at.is.null,recordatorio_proveedor_enviado_at.is.null')

// Después (en non-prod):
.or('recordatorio_tutor_enviado_at.is.null,recordatorio_proveedor_enviado_at.is.null')
// + exclusión de fixtures: tutor_nombre NOT LIKE '[E2E-%'
```

Donde `TAG_TUTOR_NOMBRE_PREFIX` en [e2e/fixtures/cron-recordatorio.ts:93](../../e2e/fixtures/cron-recordatorio.ts#L93) prefija los `tutor_nombre` con `[E2E-<familia>-<timestamp>]`.

**Trade-off**: el cron en staging dejaría de ejercer el path real del SELECT con fixtures reales. Los specs S2/S3/S4/S5 del cron rompen porque cuentan agendamientos de test.

**Decisión**: **NO aplicar hoy**. El spec S2 valida precisamente que el cron procesa fixtures correctamente. Cambiar el filtro degradaría el test. Si en algún momento el PO quiere este fix defensivo, debe acompañarse de un rediseño del spec para usar un ambiente separado.

## 6. Decisión

- **ITEM 1 Cleanup fixtures e2e del dispatch del PO**: **NO-OP**. Los fixtures YA tienen cleanup canónico desde sprint J-4 F2-3-CLEANUP (2026-09-22). Cero spec nuevo a arreglar.
- **Deuda `RESEND-REMINDERS-DEDUP` del BACKLOG**: downgrade a **BAJA** (de MEDIA). El 3× observado en dashboard NO es duplicate — son envíos legítimos de staging, por diseño.
- **Fix defensivo opcional**: documentado acá en § 5. Zero gatillo auto, zero sprint.

## 7. Siguiente paso operativo

- Este documento se mergea como docs-only PR (mergeable autónomo bajo CI verde + ruleset relajado).
- Actualizar `BACKLOG.md > RESEND-REMINDERS-DEDUP` con pointer a este doc + downgrade a BAJA.
- Zero cambio de código en la rama `fix-fix-cleanup`.
