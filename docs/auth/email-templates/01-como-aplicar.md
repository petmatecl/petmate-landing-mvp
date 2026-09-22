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

## Antes de pegar en prod — checklist obligatoria

Aprendizaje operativo de la ronda staging (2026-09-22): pueden existir
plantillas personalizadas antiguas ya pegadas en el Dashboard prod que se
desconocen. La ronda staging encontró una plantilla de 2024 con emoji
❤️ + copy "Enviado con ❤️ para las mascotas" — nadie recordaba haberla
pegado. Antes de pisar cualquier plantilla en prod, hacer inventario del
estado actual.

**Paso 1 — Snapshot del estado prod actual** (`https://supabase.com/dashboard/project/ouezpeeiwjwawauidrqq/auth/templates`):

Por cada una de las 6 plantillas, anotar:

| # | Template | Subject actual (prod) | Updated at (prod) | ¿Personalizada previa? |
|---|---|---|---|---|
| 1 | Reset password |   |   |   |
| 2 | Confirm signup |   |   |   |
| 3 | Magic link |   |   |   |
| 4 | Change email address |   |   |   |
| 5 | Invite user |   |   |   |
| 6 | Reauthentication |   |   |   |

Criterio para marcar "¿Personalizada previa?":
- **SÍ** si el Subject NO empieza con el default inglés de Supabase
  ("Confirm Your Signup", "Reset Your Password", "Your Magic Link",
  etc.) **O** si el Updated at es distinto de la fecha original del
  proyecto Supabase (probable 2024 o antes).
- **NO** si Subject es el default inglés y Updated at coincide con la
  creación del proyecto.

Para las "SÍ", copiar el HTML actual a un archivo local
`docs/auth/email-templates/prod-pre-sprint/<template>-actual-YYYYMMDD.html`
antes de pisarla — evidencia de rollback si algo del pegado nuevo no lee
bien y hay que restaurar la versión previa.

**Paso 2 — Site URL de Auth prod**

Verificar en `Dashboard → Auth → URL Configuration → Site URL` de prod:
debe ser `https://www.pawnecta.com` (no `localhost`, no la URL de un
preview). Si no coincide, corregir **antes** de pegar las plantillas —
los CTAs de los correos dependen del Site URL para el fallback de
`redirect_to`.

(Contexto: en la ronda staging el Site URL apuntaba a `localhost:3000` y
el redirect_to de Confirm signup salió con localhost hasta que se
corrigió a la URL del preview staging).

**Paso 2b — Email OTP Expiration del ambiente**

Leer `Dashboard → Auth → Settings → Email → Email OTP Expiration` (o donde
esté vigente el label en la versión actual del Dashboard) y **confirmar que
las plantillas declaran esa vigencia**.

Un único parámetro `Email OTP Expiration` gobierna la vigencia de TODOS
los enlaces + códigos de Auth (Confirm signup, Reset password, Magic
link, Change email, Invite user, Reauthentication OTP). No hay TTL
independiente por template.

Valor efectivo verificado por PO 2026-09-22 en prod: **3600 segundos (1
hora)** + Email OTP Length = 6. Las 6 plantillas del sprint declaran esa
vigencia. Si el valor del Dashboard difiere del declarado en las
plantillas, actualizar la plantilla puntual antes de pegar — no dejar
"vigencia declarada ≠ vigencia real". Es misinformación al usuario y cae
en el mismo antipatrón que la pantalla que afirma una causa sin verificar
(`CLAUDE.md > "Una pantalla de estado no debe afirmar una causa que no
verificó"`).

Verificar también `Email OTP Length` (default 6). Si difiere, actualizar
la plantilla `reauthentication.md` — hoy dice "código de 6 dígitos".

**Paso 3 — Sender del SMTP Auth prod**

Verificar `Dashboard → Auth → SMTP Settings` de prod: Sender email debe
ser `hola@pawnecta.com` (según PO 2026-09-22). Si dice otra cosa,
reportar antes de pegar.

En staging el Sender es `noreply@pawnecta.com` (deliberado); en prod
debe ser `hola@`. No confundir.

**Paso 4 — Orden de pegado en prod** (idéntico a staging):

1. Reset password (ÚNICA activa hoy; cierra el hallazgo Gmail phish).
2. Confirm signup.
3. Magic link.
4. Change email address.
5. Invite user.
6. Reauthentication.

**Paso 5 — Verificación P8 en prod**

- PO ejecuta reset desde Gmail real con cuenta tutor.
- Criterio de éxito: **sin banner rojo de Gmail** + SPF/DKIM/DMARC PASS.
- Si Gmail sigue marcando: NO rebajar criterios. Escalar a
  AUTH-CUSTOM-DOMAIN (BACKLOG con disparador "plan Pro activo").

## Rollback

Si un correo llega mal (HTML roto, variables sin resolver, banner
sigue), volver a la plantilla en Dashboard y presionar
**Reset to default** — restaura la versión inglesa default de Supabase
(la que estaba antes de este sprint). Sin migración destructiva, cero
efecto lateral en la BD.
