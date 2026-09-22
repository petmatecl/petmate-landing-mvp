# Sprint AUTH-MAIL-PHISH — kickoff

**Fecha**: 2026-09-21.
**Prioridad**: **BLOQUEA** lanzamiento.
**Estado**: en curso (paso 1 · inventario).

## Hallazgo (PO, 2026-09-21 prod)

Reset de contraseña con cuenta tutor real → Gmail muestra banner rojo
"Este mensaje puede ser peligroso" en el correo entregado.

- Cabeceras verificadas: SPF PASS, DKIM PASS (`pawnecta.com` selector
  `resend`), DMARC PASS con `p=quarantine`. **Autenticación OK — el
  problema es contenido.**
- Correo: plantilla Supabase Auth por defecto ("Reset Your Password",
  "Follow this link to reset the password for your user", inglés, sin
  marca) con enlace a `ouezpeeiwjwawauidrqq.supabase.co` desde
  remitente `hola@pawnecta.com`. Los signals combinados
  (asunto inglés genérico + link cross-domain a `supabase.co` + cero
  marca) reproducen el patrón visual del phishing.
- Correo de bienvenida por Resend (plantilla propia, marca Pawnecta,
  español): **cero problema**. Ese flujo NO se toca.

## Alcance

Plantillas de **Supabase Auth** — configuración de Dashboard, no
código de la app. El auditor redacta; el PO pega en Dashboard, primero
staging y luego prod (mismo patrón que SQL de prod).

**Fuera de alcance**:
- Código productivo de la app (signup.ts, welcome.ts, resend.ts).
- Suite e2e (no requiere cambio por este sprint).
- Flujo de bienvenida por Resend con `confirmationUrl` embebido.

## Plan

### Paso 1 — Inventario (en curso)

Determinar qué plantillas Auth se envían HOY en prod y qué flujo dispara
cada una. Foco especial: aclarar Confirm signup dado que la bienvenida
sale por Resend con `confirmationUrl` — si Auth también manda la suya,
tenemos **correo doble** y eso es un segundo hallazgo separado.

Fuentes:
- Código productivo — grep de `resetPasswordForEmail`,
  `signInWithOtp`, `updateUser({email})`, `admin.inviteUserByEmail`,
  `admin.createUser` con `email_confirm`, `admin.generateLink`,
  `reauthenticate`.
- MCP staging-rw — leer config Auth staging donde sea accesible.
- MCP prod-ro — solo lectura para verificar Reply-To de SMTP prod.

**Entregable**: `docs/auth/email-templates/00-inventario.md` con
matriz `plantilla · flujo · trigger · destino usuario · estado prod
(activa/inactiva/duplicada)`.

### Paso 2 — Reporte al PO para aprobación (encolado)

Antes de redactar plantillas, el auditor reporta el inventario al PO.
El PO aprueba **cuáles plantillas entran al sprint** (foco anti-phishing
del hallazgo — probablemente todas las que hoy están activas + el fix
de correo doble si aplica).

### Paso 3 — Redacción (encolado, tras aprobación)

Por cada plantilla aprobada, entregar en `docs/auth/email-templates/`:

- Asunto.
- HTML completo listo para pegar en Dashboard, con variables Supabase
  intactas (`{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`,
  `{{ .Token }}`, etc.).
- Versión texto plano si Supabase la admite.

**Criterios anti-phishing** (checklist per plantilla):
- [ ] Español chileno, tuteo (tú, no vos).
- [ ] Marca Pawnecta visible (logo + tono + tipografía análoga a
      welcome de Resend).
- [ ] Explicar por qué recibe el correo ("Alguien pidió restablecer
      la contraseña de tu cuenta en Pawnecta").
- [ ] Botón con texto claro ("Restablecer contraseña") + enlace
      visible debajo en texto ("Si el botón no funciona, copia y pega
      este enlace...").
- [ ] Aviso de vigencia ("Este enlace vale por N minutos").
- [ ] Frase "Si no lo pediste, ignora este correo".
- [ ] Pie con `hola@pawnecta.com` como contacto.
- [ ] Cero enlaces a dominios de terceros salvo el de Supabase (hoy
      inevitable — anotado en punto 5 del backlog como AUTH-CUSTOM-DOMAIN).

### Paso 4 — Verificación de Reply-To (encolado)

Con MCP prod-ro y el envío por Resend:
- Confirmar Reply-To del SMTP Auth prod.
- Confirmar Reply-To del envío por Resend.

Si es distinto de `hola@pawnecta.com` o `contacto@pawnecta.com`, reportar
al PO (hoy ambas casillas reciben — confirmado por PO 2026-09-21).

### Paso 5 — Plan de verificación P8

**A. Staging** (auditor dispara / verifica):
- PO pega plantillas nuevas en Supabase Auth Dashboard staging.
- Auditor dispara `resetPasswordForEmail` + `signInWithOtp` +
  `updateUser({email})` contra staging.
- Revisa Mailtrap (inbox 4922101) que:
  - Cada correo llega con el HTML nuevo.
  - Variables Supabase (`{{ .ConfirmationURL }}` etc) se resuelven.
  - Cero raw `{{ .X }}` sin sustituir.

**B. Prod** (PO ejecuta / auditor observa):
- PO pega plantillas nuevas en Supabase Auth Dashboard prod.
- PO dispara reset con cuenta real desde Gmail.
- Criterio de éxito: **sin banner de phishing en Gmail** + SPF/DKIM/DMARC
  siguen en PASS.
- Si Gmail sigue marcando: NO se rebajan criterios. Se registra y se
  evalúa dominio personalizado (AUTH-CUSTOM-DOMAIN — add-on de plan
  Pro, entra al BACKLOG como CONVIENE con disparador "plan Pro activo").

## Entregables

- `docs/auth/email-templates/00-inventario.md` — matriz de plantillas
  activas en prod hoy.
- `docs/auth/email-templates/<slug>.md` — un archivo por plantilla
  aprobada (asunto + HTML + texto plano).
- PR con:
  - `BACKLOG.md > PEDIDOS DIRECTOS`: `AUTH-MAIL-PHISH` como BLOQUEA.
  - `BACKLOG.md`: `AUTH-CUSTOM-DOMAIN` como CONVIENE, disparador
    "plan Pro activo".
- Este archivo (`docs/sprints/auth-mail-phish.md`) actualizado con
  las secciones ejecutadas y los resultados.

## Hallazgos secundarios (reportados por PO 2026-09-22)

Durante la ejecución del sprint aparecieron hallazgos operativos que no
son parte del alcance principal (contenido de plantillas) pero quedan
anotados acá para trazabilidad:

- **NOTIF-FROM-HARDCODE — respuestas al canal de notificaciones de
  mensajes rebotaban hasta 2026-09-22.** El endpoint
  `pages/api/notifications/new-message.ts:100` hardcodeaba
  `Pawnecta <notificaciones@pawnecta.com>` como remitente. Sin código
  que setee `reply_to`, Resend usa `From` de fallback → cualquier
  respuesta del usuario al correo de notificación aterrizaba en
  `notificaciones@pawnecta.com`. **Esa casilla no existía en Zoho**;
  las respuestas rebotaban con "dirección no encontrada". El PO creó
  el alias en Zoho sobre el buzón `contacto@` el 2026-09-22 y verificó
  entrega desde Gmail (OK). El fix de código va en este mismo sprint
  (ítem NOTIF-FROM-HARDCODE del BACKLOG) para retirar el hardcode y
  cerrar la superficie a futuro — usa `EMAIL_NOTIFICATIONS_FROM` con
  fallback a `EMAIL_FROM`.
- **Reply-To del Custom SMTP Auth prod — sin campo en Dashboard.** PO
  verificó 2026-09-22 en `Dashboard → Auth → SMTP Settings` de prod:
  no expone campo Reply-To. Sender email = `hola@pawnecta.com`, Sender
  name = `Pawnecta`. Reply-To efectivo cae al From (`hola@`) y esa
  casilla ya recibe (alias creado por PO el 2026-09-21). **Sin
  acción requerida** para SMTP Auth.
- **Registro DNS complementario — DMARC + alias.** El 2026-09-21 el PO
  creó `hola@pawnecta.com` (rebotaba antes) y `dmarc-reports@pawnecta.com`.
  El registro TXT `_dmarc.pawnecta.com` quedó con `rua`/`ruf` apuntando
  a `dmarc-reports@pawnecta.com` y política `p=quarantine`. Verificado
  con mxtoolbox + cabeceras Gmail (SPF/DKIM/DMARC PASS). **Anotado en
  BACKLOG.md como DMARC cerrado + DMARC-2 (subir a `p=reject`)
  disparador "un mes de reportes limpios".**

## Diferencia entre From de staging y prod (aclarada 2026-09-22)

- **Staging** — Sender email del SMTP Auth staging (que apunta a Mailtrap
  Sandbox) es `noreply@pawnecta.com`. Es **configuración deliberada de
  staging en Supabase Dashboard**, no reescritura de Mailtrap. Todos los
  correos Auth staging llegan con `from='noreply@pawnecta.com'` — así
  aparece en el inbox 4922101.
- **Prod** — Custom SMTP Auth prod apunta a Resend con Sender email
  `hola@pawnecta.com` (confirmado por PO 2026-09-21, `Dashboard → Auth →
  SMTP Settings`).

**No confundir en actas futuras**: si aparece `noreply@` en un correo Auth
prod, es un problema; si aparece `noreply@` en un correo Auth staging via
Mailtrap, es esperado.

## Regla operativa nueva (2026-09-22, tras incidente confirm-signup 2024)

**No se dispara ninguna verificación de plantillas hasta recibir
confirmación explícita del PO de que el pegado está completo y guardado.**

Historia: la primera ronda de smoke del sprint (2026-09-22 12:20) disparó
el helper contra staging apenas 4 minutos después de que el PO dijera "las
6 plantillas están pegadas y guardadas". El Save del Dashboard aún no
había persistido para al menos una plantilla (Confirm signup) → el
disparo agarró la plantilla previa de 2024 (default anterior con emoji
❤️ en el footer y copyright viejo). Costo: falsa alarma "el HTML pegado
no coincide con la rama", investigación de 15 minutos por el auditor,
turno extra del PO explicando el timing.

Antídoto operativo: cuando el PO diga "pegado", el auditor **pide
confirmación explícita** del tipo "confirmado, save persistido, dashboard
muestra Updated at con fecha de hoy en las N plantillas modificadas"
antes de disparar el smoke.

## Hallazgo prod (reportado por PO 2026-09-22)

Prod TAMBIÉN tenía la plantilla residual de 2024 en **[Confirm sign up]** —
misma que apareció en staging durante el primer smoke (HTML con
`<title>Bienvenido a Pawnecta</title>` + tabla presentation +
`background-color: #10B981` header + emoji ❤️ en el footer + copyright
`© 2024`). Nadie recordaba haberla pegado.

**HTML previo respaldado por el PO** como
`docs/auth/email-templates/prod-pre-sprint/prod-pre-confirm-signup.html`
antes de pisarla con la plantilla nueva del sprint. Rollback disponible
en caso de necesidad.

Refuerza la utilidad de la checklist "Antes de pegar en prod" agregada
al `01-como-aplicar.md`: **cualquier plantilla del Dashboard puede tener
una versión personalizada antigua olvidada; snapshot antes de pisar
es evidencia de rollback**.

## Corrección de copy (2026-09-22, ronda staging cerrada)

Chile: "vale por X horas" tiene connotación de cupón/promoción. Uso
natural = "es válido por X horas". Cambio en las 6 plantillas de
`docs/auth/email-templates/*.md`. Cero cambio de estructura, semántica ni
variables. Frase final:

- Confirm signup: "Este enlace es válido por 24 horas."
- Reset password: "Este enlace es válido por 1 hora."
- Magic link: "Este enlace es válido por 1 hora y se puede usar una sola vez."
- Change email address: "... Este enlace es válido por 24 horas."
- Invite user: "Este enlace es válido por 7 días."
- Reauthentication: "Este código es válido por 10 minutos y se puede usar una sola vez."

**Hallazgo 2026-09-22 (post-copy fix)**: los "defaults canónicos" que
declaré (24 h signup/change-email, 7 días invite, 10 min reauth OTP) **no
existen** en Supabase Auth. Un único parámetro `Email OTP Expiration`
gobierna TODAS las vigencias (Confirm signup, Reset password, Magic link,
Change email, Invite user, Reauthentication OTP). El PO verificó en
prod: `Email OTP Expiration = 3600 segundos (1 hora)` + `Email OTP
Length = 6`.

Corrección aplicada — las 6 plantillas declaran "1 hora":
- Reset password: ya decía 1 hora, sin cambio.
- Magic link: ya decía 1 hora, sin cambio.
- Confirm signup: 24 h → 1 hora.
- Change email address: 24 h → 1 hora.
- Invite user: 7 días → 1 hora.
- Reauthentication OTP: 10 min → 1 hora + agregado "código de 6 dígitos"
  (Email OTP Length = 6, verificado en Dashboard).

**Lección** (aterriza como caso canónico en `01-como-aplicar.md > Paso 2b`):
**las vigencias declaradas en correos se leen de la config real, nunca se
asumen** — ni siquiera cuando "el default está documentado" en fuentes de
terceros. El único mecanismo válido es Dashboard del ambiente
(`Auth → Settings → Email → Email OTP Expiration`). Es el corolario P8
11ª aplicado a copy: no afirmar sin verificar; la fuente autoritativa es
el sistema, no la memoria ni las docs.

## Constraints explícitos del PO

- **NO** aplicar nada en prod desde el auditor.
- **NO** cambiar el flujo de bienvenida por Resend.
- **NO** tocar la suite e2e por este sprint.
- **NO** rebajar criterios de aceptación si Gmail sigue marcando —
  escalar a dominio personalizado.
- Reportar el inventario **PRIMERO**, antes de redactar plantillas.
