# AUTH-MAIL-PHISH · Cómo aplicar las plantillas en Supabase

Guía operativa para el PO. **Aplicar primero en staging, verificar, luego en prod.**

## Ruta del Dashboard

`https://supabase.com/dashboard/project/<PROJECT_REF>/auth/templates`

- **Staging**: `jmtadvdkicyylcwjcmcl`
  → `https://supabase.com/dashboard/project/jmtadvdkicyylcwjcmcl/auth/templates`
- **Prod**: `ouezpeeiwjwawauidrqq`
  → `https://supabase.com/dashboard/project/ouezpeeiwjwawauidrqq/auth/templates`

## Orden recomendado de pegado

Priorizado por urgencia: Reset password primero (cierra el hallazgo del
banner Gmail), luego Confirm signup (superficie más probable de futuros
flows), luego las 4 restantes.

| # | Template en Dashboard | Archivo con asunto + HTML | Estado hoy prod |
|---|---|---|:---:|
| 1 | Reset password | [reset-password.md](reset-password.md) | ACTIVA |
| 2 | Confirm signup | [confirm-signup.md](confirm-signup.md) | inactiva (preventivo) |
| 3 | Magic link | [magic-link.md](magic-link.md) | inactiva (preventivo) |
| 4 | Change email address | [change-email.md](change-email.md) | inactiva (preventivo) |
| 5 | Invite user | [invite-user.md](invite-user.md) | inactiva (preventivo) |
| 6 | Reauthentication | [reauthentication.md](reauthentication.md) | inactiva (preventivo) |

## Pasos por plantilla (repetir 6 veces)

1. En el Dashboard del proyecto (staging primero), abre
   `Authentication → Emails` y selecciona el tab con el nombre exacto
   del template (columna "Template en Dashboard" arriba).
2. En el campo **Subject heading** pega el asunto del archivo (bloque
   fenced ` ``` ` bajo `## Asunto`).
3. En el campo **Message body** pega el HTML completo (bloque fenced
   ` ```html ` bajo `## HTML`). **No modificar** las variables
   `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`,
   `{{ .NewEmail }}` — Supabase las sustituye al enviar.
4. Toca **Save** al pie del formulario.
5. Verifica que el campo "Updated at" refleje la fecha de hoy
   (mismo patrón que P4 de env vars en Vercel — el Save a veces no
   persiste al primer intento; recargar y re-guardar si dice fecha
   vieja).

## Verificación P8 tras pegar en staging

Antes de pegar en prod, el auditor dispara cada plantilla contra
staging y confirma en Mailtrap (inbox 4922101) que llega con el HTML
nuevo y las variables resueltas.

Mecánica de disparo:

- **Reset password** — auditor navega `/forgot-password` en preview
  staging con email de test o corre
  `scripts/smoke-auth-templates.ts reset` (ver archivo).
- **Otras 5** — auditor corre `scripts/smoke-auth-templates.ts <slug>`
  desde local con `E2E_SUPABASE_URL` + `E2E_SUPABASE_SERVICE_KEY` de
  staging seteadas. El script llama la superficie de admin apropiada
  (`inviteUserByEmail`, `updateUser({ email })`, etc.) sin agregar
  código productivo.

## Verificación P8 tras pegar en prod

El PO dispara Reset password desde Gmail real con su cuenta tutor.
Criterio de éxito:

- Correo llega con el HTML nuevo (asunto en español, marca Pawnecta,
  botón + enlace visible, vigencia, "si no lo pediste").
- **Sin banner rojo de Gmail** ("Este mensaje puede ser peligroso").
- Cabeceras verificadas siguen en PASS: SPF, DKIM (selector `resend`),
  DMARC (`p=quarantine`).

Si Gmail sigue marcando phishing pese al fix de copy: **no rebajar
criterios**. Anotar y evaluar dominio personalizado
(`AUTH-CUSTOM-DOMAIN` en BACKLOG, disparador "plan Pro activo").

## Reply-To — verificación paralela del PO

El PO debe abrir `Dashboard → Project Settings → Authentication →
SMTP Settings` (staging + prod) y verificar el valor del campo
`Reply-To` si existe la sección. Si vacío → OK (cae al `From`
= `hola@pawnecta.com` que ya recibe). Si tiene valor distinto de
`hola@pawnecta.com` / `contacto@pawnecta.com` → reportar al auditor
antes de ejecutar el pegado en prod.

## Rollback

Si un correo llega mal (HTML roto, variables sin resolver, banner
sigue), volver a la plantilla en Dashboard y presionar
**Reset to default** — restaura la versión inglesa default de Supabase
(la que estaba antes de este sprint). Sin migración destructiva, cero
efecto lateral en la BD.
