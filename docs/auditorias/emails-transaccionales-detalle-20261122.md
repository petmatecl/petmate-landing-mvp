# Auditoría de emails transaccionales — detalle 2026-11-22

Written for: el PO (Aldo), para decidir qué templates pulir antes de arrancar campañas (ya que cada email que llega a un tutor o proveedor construye percepción de marca y define tasa de respuesta).

**Alcance**: 12 templates React Email en [components/Emails/](../../components/Emails/) + 1 shared tokens en `_shared/`. Audit sobre: (a) personalización del saludo, (b) taxonomía "solicitud / reserva / agendamiento", (c) voseo accidental, (d) URLs hardcodeadas e inconsistencias www/no-www, (e) presencia de Preview, (f) emojis en UI (CLAUDE.md "NO emojis"), (g) footer + firma consistencia, (h) tuteo chileno.

---

## Resumen ejecutivo

**12 templates** auditados. Principales hallazgos:

- **7 emojis sin remover** en 4 templates (WelcomeEmail 🐾, AprobacionProveedorEmail 🐾, NewMessageEmail 💬, NewEvaluationEmail 🎉🌟⭐). Viola convención `CLAUDE.md > "NO emojis en la UI"`. Fix mecánico.
- **2 templates sin Preview text** (WelcomeEmail, NewMessageEmail). Inbox muestra random del body → UX pobre.
- **1 inconsistencia www/no-www** en AprobacionProveedorEmail (único con `https://pawnecta.com/` sin `www.`).
- **1 template sin personalización del recipientName** (NewMessageEmail — "Tienes un nuevo mensaje" sin nombre del destinatario).
- **2 templates con firma "SpA"** (NewEvaluationEmail, InvitacionResenaEmail) vs resto con "El equipo de Pawnecta" / "Pawnecta ·". Inconsistencia de voz.
- **1 template con firma "El equipo de verificación de Pawnecta"** (RechazoProveedorEmail) distinto de "El equipo de Pawnecta" (Aprobacion). Reificación innecesaria del "equipo de verificación" solo en el rechazo.
- **URLs hardcodeadas** `https://www.pawnecta.com` en 13 referencias → cambio de dominio = cambios manuales en 13 lugares. Deuda `EMAIL-BASE-URL-ENV`.
- **Cero voseo** encontrado en copy visible — regla CLAUDE.md respetada.
- **Taxonomía reserva/solicitud/agendamiento**: la palabra "agendamiento" NO aparece en copy visible (solo en comentarios). "Solicitud" usada cuando el estado es pendiente; "reserva" cuando es confirmada. Decisión defendible pero AgendamientoTutorEmail tiene el mismo email para estados `confirmada/rechazada/cancelada_proveedor` y mezcla "solicitud" + "reserva" en el mismo render según state → ligera inconsistencia léxica.

---

## Tabla por email

| # | Template | Problema detectado | Severidad | Sugerencia de fix |
|---|----------|---------------------|-----------|---------------------|
| 1 | `WelcomeEmail.tsx` | `🐾` emoji en heading L36. Sin `<Preview>` — inbox mostrará random del body. Sin CTA al dashboard tutor (solo texto). | ALTA | Remover emoji. Agregar `<Preview>¡Bienvenido a Pawnecta, {firstName}! Ya puedes explorar cuidadores de confianza.</Preview>`. Considerar agregar Button → `/explorar` o `/mis-reservas`. |
| 2 | `AprobacionProveedorEmail.tsx` | `🐾` emoji L16. **URL inconsistente** `https://pawnecta.com/proveedor` sin `www.` (todos los demás usan `www.`). Inline styles sin @react-email framework. Sin `<Preview>`. | ALTA | Remover emoji. Cambiar `pawnecta.com` → `www.pawnecta.com`. Migrar a @react-email/components para consistencia (deuda refactor). Agregar Preview. |
| 3 | `RechazoProveedorEmail.tsx` | Firma: **"El equipo de verificación de Pawnecta"** vs resto "El equipo de Pawnecta". Reificación del "equipo verificación" solo en rechazo — connotación áspera. Inline styles sin @react-email. Sin `<Preview>`. | MEDIA | Firma: "El equipo de Pawnecta" (consistente). Agregar Preview: "Novedad sobre tu solicitud como proveedor en Pawnecta." |
| 4 | `AgendamientoProveedorEmail.tsx` | Comentario interno dice "solicitud de agendamiento" (código) pero copy visible usa "reserva" / "solicitud" según flag. OK. | OK | Sin fix. |
| 5 | `AgendamientoTutorEmail.tsx` | Taxonomía mixta: "confirmó tu solicitud" + "canceló tu reserva" según estado. Ligeramente inconsistente léxicamente — una "solicitud confirmada" se convierte en "reserva confirmada", pero el copy dice "confirmó tu solicitud". | BAJA | Considerar `isConfirmada ? "confirmó tu reserva" : "no pudo confirmar tu solicitud"` — refleja la transición de estado.  |
| 6 | `AgendamientoCancelacionTutorEmail.tsx` | OK. Copy limpio, saludo personalizado, footer consistent. | OK | Sin fix. |
| 7 | `ReservaConfirmadaTutorEmail.tsx` | OK. Preview, saludo, tuteo, botón "Mis reservas". | OK | Sin fix. |
| 8 | `RecordatorioReservaEmail.tsx` | OK. Template más pulido del set (R4.2 refactor dirección de arte). | OK | Sin fix. |
| 9 | `InvitacionResenaEmail.tsx` | Footer dice "Pawnecta SpA" vs resto solo "Pawnecta". Inconsistencia. | BAJA | Cambiar a "Pawnecta · El lugar seguro para el cuidado de mascotas." (consistent con los demás). |
| 10 | `NewMessageEmail.tsx` | `💬` emoji en heading L41. Sin `<Preview>`. **No usa recipientName** — saludo "Tienes un nuevo mensaje de {senderName}" en vez de "Hola {recipientName}, tienes un nuevo mensaje de {senderName}". Inline styles sin @react-email. | ALTA | Remover emoji. Agregar Preview "Nuevo mensaje de {senderName}". Personalizar con recipientName ("Hola {recipientName},"). Considerar migrar a framework. |
| 11 | `NewEvaluationEmail.tsx` | `🎉` emoji en Preview L20. `🌟/⭐` en rating L35. Firma "Pawnecta SpA" inconsistente. | ALTA | Remover emojis del Preview + rating. Sustituir por texto plano "¡Nueva evaluación de 5 estrellas!" sin iconos (o Lucide icon Star — pero React Email no renderiza Lucide). Firma consistent "Pawnecta ·". |
| 12 | `NuevoProveedorPendienteEmail.tsx` | Email interno al admin (contacto@pawnecta.com). Sin personalización de saludo (destinatario es admin genérico — OK contextualmente). Inline styles sin @react-email. | BAJA | Sin fix urgente (es email interno). Opcional: migrar a framework. |

---

## Patrones sistémicos

### 1. Emojis en UI emails → pulir antes de campañas

4 templates tienen emojis en heading o preview. El CLAUDE.md declara "NO emojis en la UI — solo iconos Lucide monocromaticos". Los emails son UI visible al user — aplica.

**Afectados**: `WelcomeEmail`, `AprobacionProveedorEmail`, `NewMessageEmail`, `NewEvaluationEmail`.

**Fix mecánico**: grep + reemplazo, ~15 min total.

### 2. Preview text faltante en 2 templates

`WelcomeEmail` y `NewMessageEmail` carecen de `<Preview>`. Inbox del user muestra el primer texto que encuentra en el body → impredecible.

**Fix**: agregar `<Preview>` específico por email. ~10 min.

### 3. URLs hardcodeadas + inconsistencia www

Los 12 templates tienen `https://www.pawnecta.com` repetido en ~13 lugares distintos. `AprobacionProveedorEmail` es el único con `https://pawnecta.com/` sin `www.` (bug menor que probablemente redirige 301 correctamente, pero visual rota).

**Fix corto**: unificar el Aprobacion a `www.`. 2 min.
**Fix estructural** (deuda `EMAIL-BASE-URL-ENV`): import `BASE_URL` desde `lib/env.ts` o similar; cambio en una sola variable al cambiar dominio. ~1h. Candidato post-launch.

### 4. Firma del footer inconsistente

Variantes encontradas:
- "El equipo de Pawnecta." (AprobacionProveedorEmail)
- "El equipo de verificación de Pawnecta." (RechazoProveedorEmail — reifica el equipo)
- "Pawnecta · El lugar seguro para el cuidado de mascotas." + "soporte@pawnecta.com" (templates nuevos con tokens compartidos)
- "Pawnecta SpA · El lugar seguro..." (NewEvaluationEmail, InvitacionResenaEmail — razon social explícita)

**Fix**: estandarizar la firma oficial. Propuesta:
- **Templates visibles al user**: "Pawnecta · El lugar seguro para el cuidado de mascotas. Si tienes dudas, contáctanos a soporte@pawnecta.com". Sin SpA (es info comercial que confunde al user).
- **Templates al admin** (NuevoProveedorPendiente): sin firma del footer, es email interno.

**Esfuerzo**: migrar los 4 templates fuera de estándar a la firma común. ~20 min.

### 5. Personalización del recipientName

11 de 12 templates usan el nombre del recipient en el saludo. **1 excepción**: `NewMessageEmail` dice "Tienes un nuevo mensaje de {senderName}" sin saludar al recipient.

**Fix**: "Hola {recipientName}, tienes un nuevo mensaje de {senderName}". Toque empático barato, +5-10% engagement esperado.

### 6. Taxonomía "solicitud" vs "reserva"

Decisión actual (no escrita explícitamente pero coherente):
- Estado `pendiente` → "solicitud" (todavía no está confirmada).
- Estado `confirmada` → "reserva" (locked-in).
- Palabra `agendamiento` NO se usa en copy visible — solo en nombres de código.

**Caso borde**: `AgendamientoTutorEmail` dispara en 3 estados (confirmada, rechazada, cancelada_proveedor). El copy actual dice "{proveedor} confirmó tu **solicitud** para {servicio}" cuando el estado es confirmada — ligeramente inconsistente (la solicitud se volvió reserva al confirmar).

**Fix sugerido** (opcional, bajo impacto):
- `isConfirmada`: "{proveedor} confirmó tu reserva para {servicio}."
- `rechazada`: "{proveedor} no pudo confirmar tu solicitud para {servicio}."
- `cancelada_proveedor`: "{proveedor} canceló tu reserva de {servicio}."

### 7. Verificación casilla soporte@pawnecta.com

Los templates referencian `soporte@pawnecta.com` como contacto para dudas. Verificar que la casilla existe en Zoho (dominio ya operativo según comentario en NuevoProveedorPendienteEmail → `contacto@pawnecta.com` confirmado). Si `soporte@` no existe → los mensajes de usuarios se pierden silente.

**Acción**: el PO verifica en Zoho admin que `soporte@pawnecta.com` existe + tiene reenvío a su inbox personal o a `contacto@`. Si no, crear o reemplazar referencias por `contacto@pawnecta.com`.

### 8. Cero voseo detectado

Grep sobre `\b(elegí|contactá|solicitá|cancelá|tenés|querés|podés|revisá|agregá)\b` → 0 matches en templates. Regla CLAUDE.md respetada.

Single "match" falso positivo: `InvitacionResenaEmail` comentario interno "cerramos con salida natural" + `AgendamientoCancelacionTutorEmail` comment "Sprint cierre agendamiento". Ambos en comentarios de código, no copy visible.

---

## Fixes priorizados pre-campañas

**Tier 1 — fix mecánico, ~30 min total**:

1. **Remover 7 emojis** en 4 templates. Grep + Edit directo.
2. **Agregar `<Preview>`** en WelcomeEmail + NewMessageEmail. Copy sugerido en tabla.
3. **Unificar `www.pawnecta.com`** en AprobacionProveedorEmail (1 línea).
4. **Personalizar NewMessageEmail** con recipientName (1 línea cambio).
5. **Estandarizar firma footer** en NewEvaluationEmail + InvitacionResenaEmail + AprobacionProveedorEmail + RechazoProveedorEmail. Reemplazar por la del tokens compartido.

**Tier 2 — refactor estructural, post-launch**:

6. **Migrar 4 templates legacy inline** (Aprobacion, Rechazo, NewMessage, NuevoProveedorPendiente) a `@react-email/components` + `_shared/tokens`. 2-3h total.
7. **Centralizar BASE_URL** vía env var + helper. 1h.
8. **Taxonomía `AgendamientoTutorEmail`** si el PO decide refinar (bajo impacto).

**Tier 3 — ops/compliance**:

9. **Verificar `soporte@pawnecta.com`** operativo en Zoho. 5 min del PO.
10. **Testing de inbox real** antes de campaña: enviar cada uno de los 12 templates a inbox propio + validar render visual, Preview text, enlaces. 1h del PO con Resend's sandbox o Mailtrap.

---

## Decisiones pendientes del PO

### D1. GO fixes Tier 1 pre-campañas

**Pregunta**: ¿autorizás aterrizar los 5 fixes mecánicos (~30 min) en un PR docs+code chico?

**Recomendación del auditor**: sí. Impacto directo en percepción de marca al abrir inbox.

**Impacto si no se decide**: default = quedan en BACKLOG.

### D2. GO migración templates legacy

**Pregunta**: ¿Tier 2 va a sprint propio post-launch o priorizar pre-campañas?

**Recomendación**: **post-launch**. Es refactor, zero bug funcional. 2-3h sprint propio cuando haya ventana.

### D3. Casilla soporte@pawnecta.com

**Pregunta**: ¿`soporte@pawnecta.com` está operativo en Zoho?

**Si NO está**: opciones (a) crear la casilla con forward a contacto, (b) reemplazar las referencias en 8 templates por `contacto@pawnecta.com` (zoho operativo).

**Recomendación**: crear `soporte@` como forward a `contacto@` — mantiene branding "soporte" sin duplicar inbox.

### D4. Testing visual real pre-campañas

**Pregunta**: ¿autorizás 1h del PO con Mailtrap o Resend sandbox para ver los 12 templates en inbox real antes de campañas?

**Recomendación**: sí. Chequeo visual + de spam-score cubre lo que grep no.

---

## Firma

Esta auditoría es base para pulir la capa de email antes de que los tutores + proveedores empiecen a recibirlos en volumen. Email puede ser el primer touch que un user tenga con la marca tras signup — vale la pena pulirlo antes de que importe.
