# Plan sprint RESEND-STAGING-SPLIT — investigación 2026-11-24 PM

Written for: el PO (Aldo). Documento de investigación de 4 opciones de arquitectura para separar la cuota Resend de staging vs producción. Cierra el loop del upgrade a Pro ($20/mes 50k emails) ejecutado el 2026-11-24 12:40 CLT.

## 1. Motivación

Pre-upgrade: plan Free 100 emails/día compartido entre prod + previews + staging. Los runs CI (Playwright + smokes manuales) consumían cuota de prod → spike de signups en campañas agotaba quota + rebotaba emails productivos.

Post-upgrade: Pro 50k/mes. Cubre amplio margen para los 2 ambientes mezclados. **El riesgo inmediato desapareció**; la deuda `RESEND-STAGING-SPLIT` existe por 2 motivos:

- **Observabilidad**: el dashboard Resend muestra mezclados tanto los "e2e-fixture-F1" como los "real-user@gmail.com". Dificulta métricas reales de entregabilidad / bounce rate productivos.
- **Future-proof**: si en campañas pagadas una sola alta tasa de signup consume >20k emails/mes productivos + los runs CI + manuales de staging aportan ~2-5k, acercarnos al 70% tempranamente obliga a decisión bajo presión.

Objetivo del sprint: separar quota staging de prod **sin costo adicional significativo** y con observabilidad limpia por entorno.

## 2. Las 4 opciones

### Opción A — API key Resend separada por entorno (Pro prod + Free staging paralelo)

**Arquitectura**: dos cuentas Resend distintas. Account 1 (prod existing, Pro $20/mes) + Account 2 nueva (Free 100/día). Env var `RESEND_API_KEY` scoped por environment en Vercel Dashboard: Production = Account 1, Preview + Development = Account 2.

**Pros**:
- Cero cambio de código (lib/resend.ts ya usa `process.env.RESEND_API_KEY`).
- Quota prod 100% pura. Dashboard Resend separado por cuenta → observability clean.
- Costo adicional: $0 (Free tier 100/día absorbe staging si respetamos quota).
- Posibilidad futura: re-apuntar Account 2 a Pro si CI vuela 100 emails/día.

**Cons**:
- Cuenta Resend separada requiere email distinto (Resend bloquea segundo registro con el mismo email). Soluciones: usar `+staging@` del PO, o crear cuenta `pawnecta-staging@` dedicada.
- 2 dashboards para auditar en vez de 1. Obliga a disciplina: mirar `Account 2` para debugging staging.
- Si CI explota (bug con retry loop), puede quemar la quota Free y generar 429 en staging. Impacto limitado — cero efecto productivo, pero específicas suites e2e podrían fallar hasta reset diario.

**Esfuerzo**: ~15 min (crear cuenta + API key + agregarla a Vercel env vars Preview + Dev, quitar de Production).

**Impacto observability staging**: positivo — dashboard limpio, historial propio.

**Costo**: $0.

### Opción B — Mailtrap sandbox en non-prod

**Arquitectura**: Mailtrap (servicio de email testing). Preview/staging apuntan a SMTP de Mailtrap → cero envío real. Mailtrap expone inbox virtual donde ver cada email generado durante tests + previews, con HTML preview, headers, attachments.

**Pros**:
- Cero quota consumida en Resend. Disponibilidad ilimitada en staging.
- Inbox de inspección nativo para QA: cada email es inspeccionable visualmente sin configuraciones (Mailtrap UI).
- Elimina riesgo de enviar email real a usuario externo desde staging por confusión de env vars.
- Free tier Mailtrap (100 emails/mes en el inbox virtual) suficiente para smokes manuales + e2e básicos. Paid tiers desde $9.99/mes.

**Cons**:
- Requiere configurar SMTP settings (diferente al API HTTP de Resend). Hay que adaptar `lib/resend.ts` para soportar ambos modos o crear un wrapper nuevo.
- Cambia el shape del response (Mailtrap no tiene `messageId` compatible con Resend). Smokes que validan `response.data.id` necesitan branch por env.
- Dependencia extra de servicio externo.
- Free tier 100/mes es limitante — si las e2e crecen, se consume rápido. Paid tier es costo adicional no justificable.

**Esfuerzo**: ~2-3h (nuevo wrapper + config SMTP + test de smoke + actualizar documentación).

**Impacto observability staging**: positivo pero diferente (Mailtrap inbox vs Resend dashboard). Rompe la paridad con prod — diagnosticar un bounce en prod requiere mindset distinto que en staging.

**Costo**: $0 (Free tier) o $9.99-29.99/mes (paid).

### Opción C — Resend sandbox feature (si existe en Pro plan)

**Arquitectura**: Resend expone "Test Mode" o "Sandbox" nativo (si lo tiene en Pro). Emails marcados como test no cuentan a quota ni se envían realmente, pero aparecen en dashboard con flag distinto.

**Pros** (hipotético, pending verificación):
- Cero cambio de cuenta ni de wrapper.
- Observability unificada con flag — quizás útil para distinguir en dashboard.

**Cons**:
- **Verificación pendiente**: Resend NO expone sandbox mode canónico en Pro plan al 2026-11-24. Lo más cercano es el "test email" del dashboard (manual, no automatable por API). Opción no viable hasta que Resend lance la feature.

**Esfuerzo**: N/A (opción no disponible).

**Recomendación**: descartar hoy. Reevaluar en 3-6 meses si Resend agrega la feature.

### Opción D — Filtro by env hardcoded (lib/resend.ts return early si env !== prod)

**Arquitectura**: wrapper `lib/resend.ts` returns `{ data: null, error: null }` silencioso cuando `VERCEL_ENV !== 'production'`. Los endpoints siguen llamando `resend.emails.send()` sin saber del filtro. Los smokes e2e que validan response pueden adaptar aserciones.

**Pros**:
- Cambio de código mínimo (~10 líneas en `lib/resend.ts` + guard en `isProd()` helper).
- Cero cuenta adicional, cero servicio externo. Cuota prod 100% para prod.
- Previews totalmente silenciosos — cero accidente de envío a usuarios reales desde staging.

**Cons**:
- **Observability eliminada en staging**: cero visibilidad de qué emails SE HABRÍAN enviado. Smokes e2e del template visual (snapshot HTML) rompen si confían en el send real.
- **Testing de email flow endpoints degradado**: endpoints como `/api/auth/welcome` siempre retornan 200 con `{data:null, error:null}`, no probamos el path real.
- **Patrón `redirect to AUDIT_INBOX` ya cubierto parcialmente** (ver `lib/resend.ts` actual comportamiento con `AUDIT_INBOX` env var redirect en preview/staging con subject prefix `[STAGING]`): esta opción lo reemplaza con silencio total. Regresión respecto al setup actual que SÍ permite auditar emails de staging en una inbox real.

**Esfuerzo**: ~30 min.

**Impacto observability staging**: NEGATIVO — ocultamos información útil.

**Costo**: $0.

## 3. Comparación consolidada

| Opción | Esfuerzo | Costo adicional | Observability staging | Riesgo cross-env | Status |
|---|---|---|---|---|---|
| A · cuentas Resend separadas | ~15 min | $0 (Free 100/día) | Clean, dashboard separado | Bajo | **Recomendada** |
| B · Mailtrap sandbox | ~2-3h | $0 Free / $9.99+ paid | Clean, inbox de inspección | Muy bajo (cero envío real) | Fallback si A llena quota |
| C · Resend sandbox | N/A | — | — | — | No disponible hoy |
| D · Filtro env hardcoded | ~30 min | $0 | **Negativa** (cero visibilidad) | Muy bajo (cero envío real) | Descartada (regresión observability) |

## 4. Recomendación técnica

**Opción A** como primera elección, con fallback a **Opción B** si la Free tier (100/día) resulta estrecha para el ritmo de CI real.

Argumento:
1. Costo marginal $0 + esfuerzo marginal 15 min (vs ~2-3h de Mailtrap wrapper).
2. Cero cambio de código — Vercel env vars cambia API key por scope, el resto sigue idéntico.
3. Observability mejorada sin perder el patrón `AUDIT_INBOX` redirect (puede migrarse a la cuenta 2 también).
4. Si la quota 100/día en Free tier se queda chica (ej. una suite e2e full dispara 150 emails en una tarde), el upgrade de la Account 2 a Pro $20/mes es trivial.

## 5. Plan de implementación (Opción A — aterrizable sin PO blocker)

### Fase 1 — provisioning cuenta Resend 2 (manual del PO)

Requiere cuenta email distinta. Sugerencia: `<PO-email>+staging@...` (alias nativo de Gmail/Outlook) para evitar registrar nuevo email real.

1. Registrar cuenta en resend.com con el alias.
2. Verificar dominio de envío. Reutilizar `send.pawnecta.com` del dominio prod (Resend permite el mismo domain en múltiples cuentas con diferentes API keys).
3. Generar API key `pawnecta-staging` con permisos `Sending access`. Copiar el secret (empieza con `re_`).

Acción del PO: 5-10 min manual en dashboard Resend.

### Fase 2 — rotación de env var (manual del PO)

En Vercel Dashboard → Settings → Environment Variables:

1. `RESEND_API_KEY` actualmente está en Production + Preview + Development → debe quedar en **Production SOLO**.
2. Agregar `RESEND_API_KEY` nuevo en **Preview + Development** con el valor de la cuenta 2.
3. Verificar timestamp "Updated" en ambas filas.
4. Redeploy del último commit de main (necesario — env vars nuevas solo afectan builds posteriores).

Acción del PO: 5-10 min.

### Fase 3 — smoke validation

1. Smoke staging: signup proveedor en preview URL → verificar email arriba en inbox Account 2 (no en Account 1).
2. Smoke prod: signup proveedor en www.pawnecta.com → verificar email arriba en inbox Account 1 (no en Account 2).
3. Verificar dashboards Resend separados por cuenta.

Acción del PO: 10 min.

### Fase 4 — actualizar docs

- `CLAUDE.md > Emails`: nota sobre cuenta Resend separada por entorno.
- `BACKLOG.md`: cerrar ítem `RESEND-STAGING-SPLIT` con fecha + evidencia.

Acción del auditor: ~15 min, PR docs-only mergeable autónomo.

## 6. Decisión de roll-out

**Sin urgencia inmediata**. La quota Pro 50k/mes absorbe staging + prod con amplio margen hoy. El PO decide cuándo activar Fase 1-3 en función de:

- Señales del monitoreo D1.4 (post-launch-week1-plan.md): si quota mensual llega a 70% antes de fin de mes → trigger inmediato.
- Preparación campañas pagadas: si campaña nueva proyecta >10k signups/mes extras → trigger preventivo pre-campaña.

**Cero gatillo automático del auditor**. Pedido explícito del PO para ejecutar.

## 7. Siguiente paso operativo

Backlog item `RESEND-STAGING-SPLIT` se mueve a estado **asignado a Opción A, gatillo manual del PO** post-monitoreo D1.4 de la primera semana de campañas. Cero acción productiva sin GO explícito.
