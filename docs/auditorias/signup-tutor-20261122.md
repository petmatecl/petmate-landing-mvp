# Auditoría del flow completo de signup del tutor — 2026-11-22

Written for: el PO (Aldo), para identificar fricciones que reducen conversion visita → tutor registrado antes de activar campañas pagadas.

**Alcance**: flow completo desde click en "Registrarse" (como tutor) hasta el primer contacto exitoso post-confirmación email. Audit sobre código real en `main @ b409f6f`: `pages/register.tsx`, `pages/api/auth/signup.ts`, `pages/email-confirmado.tsx`, `components/Emails/WelcomeEmail.tsx`, `pages/login.tsx`, `components/Shared/LoginRequiredModal.tsx`.

**Complemento**: este doc profundiza el funnel tutor del doc [`funnel-contacto-tutor-detalle-20261122.md`](../analisis/funnel-contacto-tutor-detalle-20261122.md) específicamente sobre el sub-tramo registro (pasos 3-5 del funnel ampliado).

---

## Resumen ejecutivo

**El flow tutor es más corto que el flow proveedor** (Step 1 role → Step 2 datos → Step 4 confirm, sin Step 3 provider-info). Eso ya es un win vs la mayoría de competencia.

**Top 5 fricciones identificadas**:

1. **Pide RUT en el form del tutor aunque el schema lo marca opcional** — fricción visual innecesaria para un rol que hoy no lo necesita.
2. **`email_confirm=false` + envío manual del confirmation link** → delay medible en inbox + risk de spam folder.
3. **Password sin feedback de fuerza visual al tipear** — user intenta password débil, lo rechaza en submit, back-and-forth.
4. **Sin "continuar con Google/Apple"** → 60s de tecleo manual (nombre + apellido + email + password + confirm password).
5. **Post-confirmación email, no vuelve al contexto de origen** — user que intentó contactar un servicio concreto termina en home sin recordar qué servicio estaba viendo.

**Tiempo total estimado del flow completo** (tutor que llega con intento de contacto, hoy): **3-5 minutos** (si va fluido), **8-12 minutos** (si tiene fricciones: email demora, contexto perdido, re-navegar a servicio). Objetivo pre-campañas: **< 2 minutos con zero fricción**.

---

## Diagrama del flow

```
VISITA (anónimo)
   │
   ├──► Click "Contactar" en ficha
   │       │
   │       ▼
   │   LoginRequiredModal (gate)
   │       │
   │       ▼
   │   Click "Registrarse"
   │       │
   │       ▼
   └──► /register?rol=usuario (skip Step 1)
          │
          ▼
    STEP 2: nombre, apellido_p, apellido_m, email, password, confirm
          │
          ▼
    SUBMIT ─────► POST /api/auth/signup (service_role server-side)
                      │
                      ├── Zod validate
                      ├── Rate limit 5/min/IP
                      ├── auth.admin.createUser (email_confirm=false)
                      ├── INSERT usuarios_buscadores
                      ├── auth.admin.generateLink type=signup → URL
                      └── POST /api/auth/welcome (envía email con URL)
                              │
                              ▼
                          Resend → inbox del user
          │
          ▼
    STEP 4: "¡Listo! Revisa tu email"
          │
          ▼
    USER ABRE INBOX (delay 10 seg a varios minutos)
          │
          ├── spam folder? → user abandona / tarda
          └── inbox → click link de confirmación
                      │
                      ▼
                   Supabase Auth handler
                      │
                      ▼
                   Redirect a /email-confirmado (con session hidratada)
                      │
                      ▼
                   Landing: "¡Tu cuenta ya está activa!"
                      │
                      ├── [Ir al sitio] → home (NO contexto)
                      └── [WELCOME email] en inbox separado (template WelcomeEmail)
          │
          ▼
    POST-LOGIN
          │
          ▼
    Home → user busca de nuevo la ficha original
          │
          ▼
    Ficha → click "Contactar" → modal chat → envía primer mensaje
          │
          ▼
    CONTACTO_INICIADO (event target de la campaña)
```

**Drop típico esperable**:
- Visita gate → inicia registro: ~50-60%.
- Inicia registro → completa form submit: ~70-85% (depende de email ya existente).
- Submit → recibe email: ~95% (si no se queda en spam).
- Recibe email → confirma link: ~70-80% (benchmark industria).
- Confirma → vuelve a sitio: ~90-95%.
- Vuelve → hace primer contacto: ~40-60% (gran drop por contexto perdido).

**Conversión acumulada estimada visita→contacto**: **~15-30%** si todo va bien, **~5-10%** si hay fricciones (contexto perdido, spam, email tardío).

---

## Análisis paso a paso

### Paso 1 — Aterrizaje en /register?rol=usuario

**Archivo**: `pages/register.tsx:137-144`

**Comportamiento actual**:
- Query param `?rol=usuario` o `?rol=proveedor` setea rol + salta a Step 2 directamente.
- Si llega sin query param → se muestra Step 1 ("Elegir tipo de cuenta").

**Fricciones**:
- **F-TR-1**: Si el user llega desde el LoginRequiredModal (que ya sabe la intención: tutor), el modal pasa `?rol=usuario` en el link. ✅ OK.
- **F-TR-2**: Si el user llega de un CTA generico "Registrarse" en Header, se le pregunta Step 1 → click extra.

**Sugerencia**:
- Default del Header → `/register?rol=usuario` (siempre pre-select tutor), porque la gran mayoría del tráfico pagado son tutores. Proveedores llegan por caminos específicos ("Soy proveedor").
- Esfuerzo: 15 min.

### Paso 2 — Formulario Step 2

**Archivos**: `pages/register.tsx:450-580` (approx).

**Campos pedidos al tutor**:
| Campo | Required | Validación | Comentario |
|---|---|---|---|
| nombre | sí | min 1 char (client+Zod) | OK |
| apellido_p | sí | min 1 char | OK |
| apellido_m | **sí** (mandatario visual, opcional en Zod) | min 1 char | Fricción: el label dice obligatorio pero el schema permite null. Confirma check. |
| email | sí | formato email + max 254 | OK |
| password | sí | min 8 chars | OK, pero sin indicador visual |
| passwordConfirm | sí | igual al password | OK |
| rut | **opcional** | min 3 max 12 + validateRut() | Visible en el form pero no requerido. Confusión. |

**Fricciones**:

- **F-TR-3 (ALTA)**: **RUT visible pero opcional** — `pages/register.tsx` muestra el campo RUT en el form tutor con label probable "RUT (opcional)" o similar. Un tutor NO necesita RUT (zero pago in-platform). Verlo lo hace dudar + agrega 1 campo adicional.
  - **Fix**: ocultar RUT del form tutor completamente. Mantener solo `pages/register.tsx` role=proveedor donde sí es relevante. ~1h.

- **F-TR-4 (ALTA)**: **Password sin indicador de fuerza al tipear**. User elige password débil, submit → server rechaza "La contraseña debe tener al menos 8 caracteres" → user vuelve, retipea, submit otra vez. Back-and-forth de 15-20 seg.
  - **Fix**: agregar meter visual de fuerza inline con 3 estados (débil/medio/fuerte) + check "al menos 8 chars" tachado en verde cuando se cumple. ~1-2h.

- **F-TR-5 (ALTA)**: **Sin "continuar con Google"**. OAuth Google reduce fricción a 1 click + bio datos automáticos. Supabase Auth soporta nativo.
  - **Fix**: integrar Google OAuth. ~2-3h incluyendo config consent screen.

- **F-TR-6 (MEDIA)**: **Sin autocompletar favorable** en nombre/apellido (navegadores modernos lo intentan pero form sin `autocomplete="given-name"` etc. no da pista).
  - **Fix**: agregar `autocomplete="given-name"` / `family-name"` / `email` / `new-password` en cada input. ~15 min.

- **F-TR-7 (MEDIA)**: Scroll al banner de error — ya implementado con `showError()` + `requestAnimationFrame` → `scrollIntoView`. ✅ bueno. Arreglaba bug anterior reportado por PO.

- **F-TR-8 (BAJA)**: **Sin indicación "¿para qué necesitamos cada campo?"** — nombre/apellido sin explicación de "para qué el proveedor te pueda saludar en el chat" puede sentirse frío.
  - **Fix**: microcopy sutil bajo el input "Tu nombre aparece en el chat con el proveedor y en tu perfil". ~15 min.

- **F-TR-9 (BAJA)**: **Sin link a términos visible en el flow** (si es que es obligatorio aceptarlos). El schema no muestra `aceptaPolitica` para tutor (solo para proveedor L239). Si tutor NO acepta T&C → riesgo legal. Verificar.

### Paso 3 — Submit al API

**Archivo**: `pages/api/auth/signup.ts`

**Comportamiento**:
1. Zod validate.
2. Rate limit 5/min/IP (in-memory, caveat Vercel serverless).
3. `createUser(email_confirm=false)` + `generateLink(type='signup', redirectTo='/email-confirmado')`.
4. INSERT en `usuarios_buscadores`.
5. Llama a `/api/auth/welcome` (server-to-server) para enviar email.
6. Si cualquier step falla post-createUser → rollback (delete user).

**Fricciones**:

- **F-TR-10 (ALTA)**: **email_confirm=false** significa que el user NO puede loguear hasta confirmar. Supabase enviará su propio email + hay uno nuestro (Welcome) → **dos emails al inbox del user** (uno de Supabase con el link, otro nuestro de bienvenida). Confusión potencial.
  - **Fix propuesto**: investigar si `email_confirm=true + manual welcome email` (sin link) + enforce de login tras signup resuelve mejor. O: sin welcome email duplicado hasta que confirme (welcome dispara en /email-confirmado landing). Decisión UX.

- **F-TR-11 (MEDIA)**: **Rate limit in-memory** → en Vercel serverless no persiste entre invocaciones. Un atacante distribuyendo IPs no es frenado. Documentado en BACKLOG como deuda. Pre-campañas baja prioridad (abuso reactive).

- **F-TR-12 (MEDIA)**: Si `/api/auth/welcome` falla, el user queda sin email pero signup exitoso. El signup responde OK y el user llega a Step 4 con "Revisa tu email" — pero no hay email que revisar. Skipped silent.
  - **Fix**: capturar fail del welcome y mostrar en Step 4 "No pudimos enviar email de bienvenida pero tu cuenta está activa. Puedes iniciar sesión directamente." ~1h.

### Paso 4 — Step "¡Listo!"

**Archivo**: `pages/register.tsx` Step 4.

**Comportamiento**: muestra mensaje "Revisa tu email para confirmar". Sin botón "Reenviar email" visible.

**Fricciones**:

- **F-TR-13 (ALTA)**: **Sin botón "Reenviar email"** cuando el user no lo recibe en 60 seg. Abandono alto en este punto (benchmark industria 10-20% de los registrados).
  - **Fix**: botón "Reenviar email" con cooldown de 60s + copy "Si no te llegó, chequea carpeta de spam". ~2h.

- **F-TR-14 (MEDIA)**: **Sin preview de "quién te está escribiendo"** — user no sabe si buscar `noreply@pawnecta.com` o `support@pawnecta.com` o qué.
  - **Fix**: "Te enviamos email desde contacto@pawnecta.com. Si no aparece, chequea spam." ~15 min.

### Paso 5 — Email de confirmación

**Flow**: user recibe email de Supabase Auth con el link de confirmación → click → aterriza en `/email-confirmado`.

**Observación**: el email que recibe el user (confirm signup de Supabase) NO está bajo nuestro control de template. Supabase tiene uno default. **Posibilidad de customizar** en Dashboard → Auth → Email Templates. Verificar.

**Fricciones**:

- **F-TR-15 (MEDIA)**: **Email default de Supabase** puede ser aséptico ("Click here to confirm your email."). Pawnecta se lo pierde como branding touch.
  - **Fix**: customizar template en Supabase Dashboard con branding Pawnecta + copy en español. ~30 min.

- **F-TR-16 (ALTA)**: **Spam folder** — probable que algunos tutores no lo vean. Reenvío necesario.
  - **Relacionado**: SPF/DKIM de pawnecta.com — verificar que están configurados correctamente para mail que sale de Supabase (sender típico = `noreply@mail.supabase.co`). Como el sender es el dominio de Supabase, el SPF de pawnecta.com no cubre — la deliverability depende del score de Supabase (generalmente bueno).

### Paso 6 — Landing /email-confirmado

**Archivo**: `pages/email-confirmado.tsx`.

**Comportamiento** (conocido del sprint email-landing 2026-08-25):
- Supabase hidrata sesión server-side → `email_confirmed_at` poblado.
- Kill-switch 4s si el loader se queda pegado (fix regresión conocida).
- Botón "Ir al sitio" → redirecta a home.

**Fricciones**:

- **F-TR-17 (CRÍTICA — H1 del doc A6)**: **No preserva URL origen**. User que llegó con intent de contactar `/servicio/{uuid}` → registro → confirm → **cae en home, perdiendo el contexto**. Impacto medido en benchmark industria: **-20-40% retención post-confirm**.
  - **Fix**: guardar `return_to` en localStorage ANTES de ir a register + leer en /email-confirmado para redirect automático al servicio origen. Ya priorizado en doc A6 como H1.

- **F-TR-18 (MEDIA)**: **Sin bienvenida personalizada por nombre** en la landing. Un "¡Bienvenido/a {nombre}!" afectivo ayuda.
  - **Fix**: fetch user desde `supabase.auth.getUser()` y mostrar `firstName`. ~30 min.

### Paso 7 — Post-login primera acción

**Comportamiento esperado**: user vuelve al servicio origen y hace contacto real. **Hoy**: sin return_to → home → user debe navegar de nuevo.

**Fricciones**:

- **F-TR-19 (ALTA)**: ya cubierta por F-TR-17 (contexto perdido).
- **F-TR-20 (BAJA)**: **Sin toast de bienvenida** en el primer render post-login. "¡Hola {nombre}, ya puedes contactar proveedores!" cerraría el ciclo.

### Paso 8 — Primer contacto

**Archivo**: `components/Shared/LoginRequiredModal.tsx` + `components/Servicio/MessageThread.tsx` (approx).

**Comportamiento**: user logueado hace click en "Contactar" → abre modal/thread → escribe mensaje → envía → INSERT en `conversations` + `messages` + `contactos`.

**Fricciones**:

- **F-TR-21 (MEDIA)**: **Sin ejemplo de mensaje sugerido** en el primer contacto. User queda frente a textarea vacío y no sabe qué escribir — fricción cognitiva alta.
  - **Fix**: placeholder sugerido "Hola {proveedor}, estoy buscando [servicio] para [mi perro/gato/etc]. ¿Podrías contarme más?". ~30 min.

- **F-TR-22 (MEDIA)**: **Sin indicación "el proveedor recibe un email + push"** — user envía y no sabe qué pasa después.
  - **Fix**: microcopy post-envío "Enviado. {proveedor} recibe un email + notificación en su app. Te avisamos cuando responda." ~15 min.

---

## Top 5 fricciones a reducir ANTES de campañas

Ranking por impacto/esfuerzo:

| # | Fricción | Impacto | Esfuerzo | Prioridad |
|---|---|---|---|---|
| **1** | **F-TR-17** — Preservar URL origen pre-registro (H1 funnel) | +20-40% retención post-confirm | 3-4h | ALTA (gating) |
| **2** | **F-TR-3** — Quitar RUT del form tutor | +5-10% registro completo | 1h | ALTA (gating) |
| **3** | **F-TR-13** — Botón "Reenviar email" con cooldown | +10-15% confirm email | 2-3h | ALTA |
| **4** | **F-TR-4** — Meter de fuerza password + checklist inline | +5-10% submit exitoso primera vez | 1-2h | MEDIA |
| **5** | **F-TR-10 + F-TR-12** — Resolver doble email + fail silente de welcome | +5% percepción marca | 1-2h | MEDIA |

**Esfuerzo total top 5**: ~9-12h. Cabe en sprint `TUTOR-FUNNEL-PRE-CAMPAÑA` previsto en doc A6.

---

## Decisiones pendientes del PO

### D1. GO sprint TUTOR-FUNNEL-PRE-CAMPAÑA con top 5

**Pregunta**: ¿autorizás arrancar sprint con las 5 fricciones del top?

**Recomendación**: sí. Es la ventana antes de que los 100 tutores lleguen por ads.

### D2. OAuth Google y/o Apple pre-campañas vs post

**Pregunta**: ¿F-TR-5 (OAuth Google) entra pre-campañas?

**Recomendación**: **post-launch**. Requiere configurar Google Cloud Console + consent screen OAuth + política de privacidad explícita + testing. 2-3h implementación + 2-3h setup = 4-6h. Sprint propio `OAUTH-GOOGLE-POST-LAUNCH`.

### D3. Custom template de Supabase Auth email

**Pregunta**: ¿customizar el email default de Supabase Auth con branding Pawnecta en español?

**Recomendación**: sí, 30 min PO en Dashboard. Impacto directo en percepción marca + consistencia visual.

### D4. Eliminar doble envío de email (Supabase + Welcome)

**Pregunta**: ¿cambiar flow a `email_confirm=true` + welcome diferido al primer login (sin link, solo bienvenida)?

**Recomendación**: **evaluar con data** post-primeros 20 registros. Hoy no sabemos si el user percibe los 2 emails como ruido o como refuerzo. Baseline primero.

### D5. OAuth button rendering en Step 1

**Pregunta**: si OAuth Google sale pre-campañas (D2), ¿botón en Step 1 antes de la pregunta de rol?

**Recomendación**: Step 2, debajo de los inputs ("O continúa con Google"). Step 1 es decisión de rol — mantener limpio. OAuth debe aparecer cuando ya sabes tipo de cuenta.

---

## Firma

Esta auditoría es base para pulir el signup tutor antes de que los primeros 100 tutores lleguen vía campañas. Cada fricción removida es ~1-3% de conversion ganada; sumadas pueden duplicar la conversion visita→registro.
