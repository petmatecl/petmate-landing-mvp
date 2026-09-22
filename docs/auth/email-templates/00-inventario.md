# AUTH-MAIL-PHISH · Inventario de plantillas Auth Supabase (prod)

**Fecha**: 2026-09-21.
**Método**: grep del código productivo por callers de la superficie de Auth
que dispara envío de correo desde Supabase + lectura de
`pages/api/auth/signup.ts` + `pages/api/auth/welcome.ts` para descartar
duplicación con el correo de bienvenida Resend.
**Alcance**: prod `ouezpeeiwjwawauidrqq` (mismo código deployado que
staging).

## Superficie Auth de Supabase — qué template se envía cuándo

Documentación oficial (Supabase Auth Email Templates, verificada
2026-09-21):

| Template Dashboard | Trigger que dispara envío |
|---|---|
| Confirm signup | `supabase.auth.signUp(email, password)` client-side |
| Invite user | `supabase.auth.admin.inviteUserByEmail(...)` |
| Magic link | `supabase.auth.signInWithOtp({ email })` |
| Change email address | `supabase.auth.updateUser({ email: nuevo })` |
| Reset password | `supabase.auth.resetPasswordForEmail(email, {...})` |
| Reauthentication | `supabase.auth.reauthenticate()` |

`supabase.auth.admin.createUser({ email_confirm: false })` **NO** envía
correo. `supabase.auth.admin.generateLink({ type: 'X' })` **NO** envía
correo — solo genera el `action_link`. Verificado empíricamente en el
sprint LINK-CONFIRM-EMAIL (2026-09-21, run
[35672321804](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/35672321804),
POSITIVO test P8).

## Callers en el código productivo — grep exhaustivo

Grep de callers activos (`git grep` sobre `**/*.{ts,tsx}` del repo,
2026-09-21):

| Superficie Auth | Callers en código | Se envía en prod? |
|---|---|---|
| `signUp(email, password)` client-side | **0** — el signup público va por `/api/auth/signup` (server) | **NO** |
| `admin.inviteUserByEmail` | **0** | **NO** |
| `signInWithOtp` | **0** | **NO** |
| `updateUser({ email })` (cambio de email) | **0** — solo un `updateUser({ password })` en `pages/reset-password.tsx:64` (setea contraseña, no email) | **NO** |
| `resetPasswordForEmail` | **1** — `pages/forgot-password.tsx:31` | **SÍ** |
| `reauthenticate` | **0** | **NO** |
| `admin.createUser({ email_confirm: false })` | **1** — `pages/api/auth/signup.ts:58-62` | **NO** (`email_confirm: false` inhibe) |
| `admin.generateLink({ type: 'signup' })` | **1** — `pages/api/auth/signup.ts:95-102` | **NO** (`generateLink` no envía, solo genera) |

## Matriz de plantillas ACTIVAS EN PROD hoy

Solo **una** plantilla Auth de Supabase se dispara hoy en prod:

| Template | Activa | Flujo del usuario | Trigger productivo | Destino |
|---|:---:|---|---|---|
| **Reset password** | ✅ SÍ | Tutor/proveedor pincha "¿Olvidaste tu contraseña?" en `/login` → `/forgot-password` → completa email → recibe correo | `pages/forgot-password.tsx:31` `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })` | Aterriza en `${SITE_URL}/reset-password` con `#access_token` fragment, donde el user setea password nueva |
| Confirm signup | ❌ NO | (n/a) | `admin.createUser` usa `email_confirm: false` + `generateLink` solo genera link → el correo real lo manda Resend welcome con `confirmationUrl` embebido | (via Resend, plantilla propia — fuera de este sprint) |
| Invite user | ❌ NO | (n/a — no hay flujo de invitación por email) | cero callers | — |
| Magic link | ❌ NO | (n/a — el proyecto no ofrece login sin contraseña) | cero callers | — |
| Change email address | ❌ NO | (n/a — no hay UI de cambio de correo) | cero callers | — |
| Reauthentication | ❌ NO | (n/a) | cero callers | — |

## Aclaración del dilema "Confirm signup vs Resend welcome"

El PO planteó explícitamente: "si Auth también manda la suya, tenemos
correo doble y eso es otro hallazgo".

**Resultado del grep**: cero correo doble hoy en prod.

**Cómo funciona el signup**:

1. `pages/api/auth/signup.ts:58-62` — `supabase.auth.admin.createUser({ email, password, email_confirm: false })`.
   - `email_confirm: false` significa "usuario queda con `email_confirmed_at = null`" y **Supabase NO manda correo de confirmación automático**.
2. `pages/api/auth/signup.ts:95-102` — `supabase.auth.admin.generateLink({ type: 'signup', email, password, options: { redirectTo: ${SITE_URL}/email-confirmado } })`.
   - `generateLink` **solo genera** el `action_link` (URL con `?token=...&type=signup`). **No envía correo**. Devuelve `data.properties.action_link` que el código captura en la variable `confirmationUrl`.
3. `pages/api/auth/signup.ts:230` — self-fetch a `/api/auth/welcome` pasando `confirmationUrl` en el body.
4. `pages/api/auth/welcome.ts:113-118` — `resend.emails.send({ from: EMAIL_FROM, to: email, subject, html: UserWelcomeEmail({...}) | ProviderWelcomeEmail({...}) })`.
   - El HTML embed el `confirmationUrl` en el CTA "Confirmar mi correo" (welcome.ts:21-26 y 53-58).

**Resultado**: el usuario recibe **UN correo** en el signup — el
welcome vía Resend con plantilla propia (marca Pawnecta, español,
tuteo). La confirmación de email va en ese mismo correo como CTA. La
plantilla "Confirm signup" del Dashboard de Supabase **no se
dispara** porque ningún camino productivo la trigger.

## Superficie del hallazgo

**Sprint debe cubrir 1 plantilla activa**:

- **Reset password** (español, marca Pawnecta, criterios
  anti-phishing) — la que Gmail marcó con banner rojo el 2026-09-21.

**Recomendación adicional** (a decidir por PO):

- **Confirm signup** — pese a que hoy no se dispara, cualquier
  cambio futuro que introduzca `supabase.auth.signUp` client-side (o
  cualquier flow que dispare el template Supabase de signup) haría
  aparecer en Gmail la plantilla en inglés sin marca. Redactar
  ahora la versión Pawnecta y dejarla pegada en el Dashboard cierra
  la superficie preventivamente. Bajo costo, alto valor defensivo.
- **Magic link + Change email + Invite + Reauthentication**: cuatro
  templates que hoy no se disparan y no hay roadmap de uso. Se
  pueden dejar con el copy default del Dashboard sin costo (nadie
  los va a recibir). Si el PO prefiere cerrar la superficie
  completa, redactamos todas — sale ~30 min extra en un batch.

## Config SMTP prod — confirmado por PO 2026-09-21

Supabase Auth prod tiene Custom SMTP activo hacia:
- Host: `smtp.resend.com:465`.
- From: `hola@pawnecta.com / Pawnecta`.
- Autenticación cabeceras verificadas por PO: SPF PASS, DKIM PASS
  (selector `resend`), DMARC PASS con `p=quarantine`.

## Reply-To — findings

### Envío por Resend (código app — verificable por grep)

Grep de `reply_to|replyTo|Reply-To` sobre `**/*.{ts,tsx}` → **0 matches**.
Cero código en el proyecto setea Reply-To explícito.

Comportamiento Resend cuando no se pasa `reply_to`: se usa el header
`From` como Reply-To de facto (default del proveedor SMTP).

`from` efectivo:
- 14 endpoints usan `process.env.EMAIL_FROM || 'onboarding@resend.dev'`.
- 1 endpoint (`pages/api/notifications/new-message.ts:100`) hardcodea
  `"Pawnecta <notificaciones@pawnecta.com>"`.

Consecuencia:
- Correos "notify-*", "welcome", "cron/recordatorio-*", "invitacion-resenas",
  "evaluaciones/notify" → Reply-To = valor de `EMAIL_FROM` env
  (según PO 2026-09-21 el remitente prod es `hola@pawnecta.com`, así que
  Reply-To efectivo = `hola@pawnecta.com` — coincide con casilla que
  recibe).
- Correos "new-message" → Reply-To = `notificaciones@pawnecta.com` —
  **verificar con PO si esa casilla también recibe**. Si no recibe,
  respuestas del usuario a notificaciones de mensajes se pierden.

### Custom SMTP Auth de Supabase (Dashboard — requiere lectura del PO)

El PO 2026-09-21 confirmó Custom SMTP activo en Auth prod hacia
`smtp.resend.com:465` con `from = hola@pawnecta.com / Pawnecta`.

En Supabase Auth Dashboard, la config Reply-To es un campo separado del
Sender. El auditor no tiene acceso Dashboard — el PO debe verificar en
`Dashboard → Authentication → Emails → SMTP Settings` si hay Reply-To
seteado y a qué dirección apunta.

**Predicción**: si no se seteó explícito, Supabase usa `from` como
Reply-To de facto (mismo comportamiento que Resend). En ese caso
Reply-To = `hola@pawnecta.com` — coincidiría con casilla receptora.

**A verificar por PO** (una línea):
1. `Dashboard → Auth → Emails → SMTP Settings → Sender Details`: qué
   valor tiene el campo Reply-To (si existe la sección).
2. Si está vacío → OK, cae a `from`.
3. Si tiene valor distinto de `hola@pawnecta.com` o
   `contacto@pawnecta.com` → reportar (misma casilla no recibe respuestas).

## Siguiente paso

**Reportar este inventario al PO** antes de redactar la plantilla
Reset password. PO aprueba el alcance:

- **Mínimo**: solo Reset password (cierra el hallazgo del banner de Gmail).
- **Recomendado**: Reset password + Confirm signup preventivo.
- **Máximo**: las 6 plantillas.
