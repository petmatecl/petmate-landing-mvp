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

## Constraints explícitos del PO

- **NO** aplicar nada en prod desde el auditor.
- **NO** cambiar el flujo de bienvenida por Resend.
- **NO** tocar la suite e2e por este sprint.
- **NO** rebajar criterios de aceptación si Gmail sigue marcando —
  escalar a dominio personalizado.
- Reportar el inventario **PRIMERO**, antes de redactar plantillas.
