# Pawnecta — Backlog

## PEDIDOS DIRECTOS DEL PO

**Convención**: todo pedido explícito de Aldo (verbal en chat, en actas, en instrucciones de sprint) vive acá con su fecha de pedido, estado, y referencia técnica al ítem original en secciones más profundas del backlog. Esta sección se lee **PRIMERO** al armar cualquier menú de "¿con qué seguimos?" o alcance de sprint/sweep — ver también la práctica operativa nueva en `CLAUDE.md > Workflow`.

**Estados posibles**: `abierto` · `asignado a <sprint/sweep>` · `en curso <sha>` · `cerrado <fecha> <sha>`.

**Cláusula de fidelidad del estado (agregada 2026-08-18, tras 11ª instancia del meta-patrón P8 aplicada a la gestión)**: el estado de un ítem se actualiza **en el mismo commit que lo aterriza**, no después. Si un sprint aterriza un pedido del PO, el bloque `- [abierto/asignado/...] <ítem>` de esta sección se toca en ese mismo commit — mueve a `[cerrado <fecha> <sha>]` con el SHA que aterrizó + tag prod si ya lo tiene. Un estado que dice "abierto" mientras el efecto ya existe es exactamente el patrón P8 aplicado a la gestión: un reporte diverge del sistema real. Un ítem abierto en el BACKLOG cuando el código ya lo cubre puede gatillar reimplementación innecesaria, replanning fantasma, o (peor) ola completa planeada sobre premisa falsa — caso B1 2026-08-18 con B3 y notif-admin arrastrados igual.

**Verificación simétrica (agregada mismo día)**: antes de asignar un ítem de esta sección a un sprint, confirmar contra el código que sigue abierto. Grep exacto por el símbolo, endpoint, componente o feature que el ítem menciona — 5-30 segundos por ítem. Si el efecto ya existe, marcar `[cerrado]` con evidencia y saltar la reimplementación. La sección no reemplaza a la verificación: la ordena.

Historia de por qué existe esta sección: durante el ciclo de 2 semanas de trabajo (producto-1 + zonab-1 + producto-2 + prelaunch-1 + auditoría + sweep #1), un pedido textual del PO del 31-jul quedó enterrado en la sección técnica de deuda P3 y no llegó a ejecutarse pese a 4 sprints + auditoría + sweep intermedios. La sección es el fix estructural para que eso no vuelva a pasar — pedidos del PO son prioridad por defecto sobre deuda técnica equivalente. La cláusula + verificación simétrica de arriba se agregaron tras la auditoría del 2026-08-18 que reveló 10 ítems adicionales con estado obsoleto (además de B1) — la sección al tope no sirve si sus estados mienten.

- **[cerrado 2026-08-11] Email de contacto funcional en prod** — pedido de PO **2026-08-07** (Fase 8 monitor N15). Resuelto con Zoho Mail sobre DNS de GoDaddy (sin migrar nameservers, sin Cloudflare). Casillas `@pawnecta.com` operativas, Resend intacto en subdominio `send.`, DMARC relajado permite convivencia. Smoke: reserva real en prod → 2 emails Resend "Delivered". Detalle completo en [REPORTE_EMAIL_CONTACTO.md sección 8](REPORTE_EMAIL_CONTACTO.md#8-ejecución-real--cierre-en-prod-2026-08-11).

- **[cerrado ~2026-08-14 (Ola 1 A3) — verificado 2026-08-18]** Notificaciones a admin de solicitudes pendientes — pedido de PO **2026-08-11**. Aterrizado en Ola 1 A3: `pages/api/admin/notify-nueva-solicitud.ts` + `components/Emails/NuevoProveedorPendienteEmail.tsx` + fire-and-forget desde `pages/api/auth/signup.ts:174` post-INSERT. Destino: `contacto@pawnecta.com` (Zoho operativo). El estado "abierto" acá era obsoleto — auditoría 2026-08-18 lo detectó al pasar por los ítems del PDPO. Detalle original del pedido (para trazabilidad):
  - **Investigación del auditor 2026-08-11 (contra evidencia del repo)**:
    - **NO existe** mecanismo de notificación al admin cuando entra solicitud de alta. Confirmado por exhaustividad:
      - [pages/api/auth/signup.ts](pages/api/auth/signup.ts): crea user + perfil, llama `/api/auth/welcome` para email al **proveedor mismo** (línea 114: `to: email`). Ningún `resend.send` con destinatario admin en el flujo.
      - [components/Emails/](components/Emails/): 11 templates existentes — ninguno destinado a admin (WelcomeEmail, AprobacionProveedorEmail, RechazoProveedorEmail, Agendamiento*, Reserva*, Recordatorio*, NewMessage, NewEvaluation, InvitacionResena). Cero `Admin*`.
      - `pages/api/cron/`: 6 crons (recordatorio-onboarding, recordatorio-mensajes, reset-visitas-mes, cleanup-visitas-tracking, invitacion-resenas, recordatorio-reserva) — ninguno cubre "notify admin".
      - Grep `INSERT INTO notificaciones` desde signup + trigger BD: cero matches. Sin notificación in-app tampoco (NotificationBell/Center sin handler para "nuevo proveedor pendiente").
    - **Confirma la hipótesis del PO**: no hay mecanismo alguno. Los 8 pendientes acumulados son síntoma directo de esta ceguera operativa.
  - **Diseño propuesto** (para decisión del PO):
    - **Destino**: `contacto@pawnecta.com` (Zoho, ya operativo tras cierre 2026-08-11). Razón vs Gmail personal: (a) separa operativo de personal, (b) si mañana entra alguien más al equipo (asistente admin), no requiere migración de dirección hardcoded en el código ni del muscle memory de nadie. **Sin razón técnica para preferir otra dirección** — cualquier @pawnecta.com sirve, `contacto@` es la más natural para "cosas a resolver por el equipo".
    - **Frecuencia**: **email inmediato por solicitud** (recomendación). Volumen actual bajo (8 en 6 semanas ≈ 1-2/semana) — inmediato no satura y da urgencia real al admin. Digest diario sería válido si el volumen se dispara en lanzamiento; agregar como flag futuro si hace falta. Empezar con inmediato es de menor esfuerzo y mejor UX (proveedor no espera 24h más de lo necesario).
    - **Infraestructura**: reusa Resend existente (`lib/resend.ts`), respeta gate `[STAGING]` automáticamente (redirect a AUDIT_INBOX cuando no es prod). Nuevo template `NuevoProveedorPendienteEmail.tsx` en `components/Emails/`. Trigger desde `pages/api/auth/signup.ts` post-INSERT exitoso, patrón fire-and-forget (no bloquear el flow del proveedor si el email falla — mismo patrón que notify-tutor/notify-proveedor).
    - **Cobertura ampliada opcional**: mismo mecanismo puede cubrir "verificación de ID pendiente" (segundo estado bloqueante). Estimarlo como una variante del template + otro trigger en el endpoint de subir carnet.
  - **Esfuerzo grueso estimado**: **2-3 horas** — (i) template `NuevoProveedorPendienteEmail.tsx` con link deep a `/admin?tab=aprobaciones` (~30 min), (ii) endpoint `pages/api/admin/notify-nueva-solicitud.ts` con verifyInternalSecret o inline en signup (~45 min), (iii) hook desde signup.ts fire-and-forget (~15 min), (iv) smoke: signup de proveedor en staging → verificar email a `contacto@pawnecta.com` (~30 min), (v) opcional variante verificación ID (~1 hora extra).
  - **Decisión**: pre-launch, prioriza Aldo contra el resto del roadmap.

- **[abierto — decisión pendiente, DATO NUEVO 2026-08-14] Fotografía vs Retratos — coexistencia o consolidación** — pedido de PO **2026-08-11** (Ola 1 B5). Ambas categorías existen en BD como distintas técnicamente (`fotografia`="Fotografía de Mascotas" = sesión de fotos, `retratos`="Retratos de Mascotas" = pintura/dibujo artístico). Duda de UX: un tutor buscando "fotos para mi mascota" puede ver 2 categorías y confundirse. **Actualización 2026-08-14**: con `ficha_vista` marcado como key event en GA4 (sprint ga4-revert / ANALYTICS-1 cerrado), en 1-2 semanas de tráfico real vamos a poder ver **cuántas ficha_vista recibe cada categoría por separado**. La decisión de consolidar vs mantener se resuelve con dato empírico:
  - Si `fotografia` >> `retratos` en visitas → mantener ambas, `retratos` es nicho.
  - Si `retratos` >> `fotografia` → mantener ambas, invertir el énfasis marketing.
  - Si ambas similar (~50/50) → indica confusión de tutores, consolidar en 1 sola con sub-tipo.
  - Si ambas ~0 → problema es de oferta, no categoría; deferir la decisión.
  - **Trigger**: revisar métrica GA4 después de 1-2 semanas post-launch tutores. Antes de eso, mantener ambas por default.
  - **Cambio del plan Ola 2**: B5 pasa de "decidir en el sprint" a "diferir con criterio explícito de datos". Cero riesgo — ambas coexisten hoy sin bug, decisión con dato es mejor que con criterio.

- **[abierto — asignado a Ola 2 B4, Toaster duplicado ya arreglado 2026-08-18, hallazgo empírico ampliado 2026-08-27]** Homologar look-and-feel de toasts/popups/dialogs — pedido de PO **2026-08-11** (walkthrough post-batch REMATE-1). **Actualización 2026-08-18**: el sub-ítem "Toaster duplicado `ServiceFormModal:2578`" **CERRADO** en rama `ola2-b3` (bug funcional, fix independiente del preview de estilos). **Actualización 2026-08-27** (smoke S6 email-landing por Aldo sobre prod, modo edición ServiceFormModal): la evidencia empírica confirma que el problema estético NO es sólo el rojo — el toast **verde de éxito** también tiene el mismo issue de paleta/tipografía. Ambas variantes (success/error) leen como Sonner richColors defaults (verde flat / rojo flat) vs paleta Pawnecta (redondeado, tipografía consistente, bordes con acento). El caso rojo se destapó con el copy causa-neutral del hotfix panel-prov-fixes; el caso verde se destapó al guardar exitoso desde modo edición. El resto — 4 variantes canónicas success/info/warn/error con paleta Pawnecta — sigue abierto, esperando aprobación del preview visual por parte del PO antes de aplicar `toastOptions.classNames` al provider global. Contexto original detectado por PO: el toast de "Reserva confirmada" en la ficha de servicio tiene un estilo que no calza con el resto de los avisos (posiblemente los `richColors` default de sonner vs paleta Pawnecta). **Inventario del auditor 2026-08-11**:
  - **Lib global**: `sonner` con `<Toaster position="top-center" richColors />` en [pages/_app.tsx:48](pages/_app.tsx#L48). **154 invocaciones `toast()`** distribuidas en toda la app (8 componentes importan explícitamente `toast` de sonner; el resto consume vía el provider global).
  - **Toaster duplicado (bug menor a limpiar)**: [components/Proveedor/ServiceFormModal.tsx:2578](components/Proveedor/ServiceFormModal.tsx#L2578) monta un `<Toaster />` propio con la misma config que el global — redundante, se puede eliminar.
  - **Ad-hoc convivientes**: `ModalAlert.tsx` (modal de aviso), `ConfirmDialog.tsx` (confirmación con botones), `LoginRequiredModal.tsx`, `ReportModal.tsx`, `FeedbackWidget.tsx`, `CookieBanner.tsx` (banner sticky bottom), `NotificationBell.tsx`/`NotificationCenter.tsx` (notificaciones in-app persistentes vs toast efímero). Cada uno con su propio look.
  - **Variantes de estilo detectadas**: (a) toasts sonner default con paleta emerald/rose de richColors (no paleta Pawnecta naranja/azul); (b) modals con paleta Pawnecta custom; (c) banners tipo cookies con tercer estilo; (d) notificaciones persistentes con cuarto estilo (NotificationBell/Center).
  - **Esfuerzo grueso estimado**: **medio día – 1 día** para (i) definir 4 variantes canónicas (success/info/warn/error) con paleta Pawnecta vía `toastOptions.classNames` en el provider global, (ii) eliminar el Toaster duplicado en ServiceFormModal, (iii) auditar si algunos casos que hoy usan `toast()` deberían ser `ModalAlert`/`ConfirmDialog` o viceversa (decisión UX, no técnica), (iv) opcional: unificar tokens de color/tipografía entre las 4 familias (toast/modal/banner/notif) para que se lean como un solo sistema.
  - **Decisión**: pre-launch, prioriza Aldo. Sin implementar aún.

- **[abierto — PRIORIDAD MEDIA, deuda estructural detectada 2026-08-27, sprint email-landing]** **No poder obtener el link de confirmación de correo en preview sin código temporal es deuda que se cobra cada sprint que toque el flujo de auth**. El sprint email-landing lo resolvió agregando un `console.log('[signup-debug] confirmationUrl:', ...)` en `pages/api/auth/signup.ts` que se removió pre-merge — pero requerió acordarse de sacarlo, y quedó como riesgo latente de leak de JWT en logs prod si alguien futuro olvida el step. Sin resolver la deuda estructural, cada sprint futuro que toque auth va a repetir el patrón "agrego log temporal → hago smoke → me acuerdo de removerlo → verifico grep". Es exactamente el tipo de flow frágil que causa incidentes.
  - **Contexto**: en preview Vercel, Supabase Auth intenta mandar el email de confirmación por su SMTP interno que está rate-limited y tiene reputación pobre → correos no llegan al inbox real. En prod, Aldo configuró Custom SMTP hacia Resend/`hola@pawnecta.com` — los correos llegan bien. En staging, cero Custom SMTP configurado → cero llegada.
  - **Opción (a) — Custom SMTP staging apuntado a Mailtrap sandbox** (mi voto): cuenta Mailtrap free (500 correos/mes de sandbox), Supabase Dashboard staging → Auth → SMTP Settings → credenciales SMTP Mailtrap → save. **Cubre TODOS los emails Auth Supabase** (confirm signup + reset password + magic link + invite user + change email) — no solo signup. Emails aterrizan en inbox virtual del panel Mailtrap, cero entrega real, cero riesgo cross-environment. **Costo**: ~30 min config Dashboard + cuenta Mailtrap. **Mensualidad**: cero. **Ya anotado en backlog** en el item `[cerrado 2026-08-20] Auth Emails Supabase con dominio propio` como "hallazgo B" — retomarlo como sprint propio.
  - **Opción (b) — Exponer `action_link` en response de `/api/auth/signup` solo cuando no es producción**: envolver el response con `if (!IS_PROD) response.debug_action_link = confirmationUrl`. Link visible en Network tab del browser durante smoke. **Costo**: ~10 min código + build + push. **Cubre**: SOLO signup (el resto de flows requieren gate similar en cada endpoint). **Riesgo**: (i) expone JWT en Network log de cualquier smoke; (ii) leak inmediato si el gate se rompe (env var cambia, alguien mueve IS_PROD); (iii) scope pequeño; (iv) requiere código nuevo en cada endpoint de auth futuro.
  - **Voto auditor: (a)**. Razones: cobertura completa vs signup-only, cero código en el repo, cero riesgo de leak accidental (Mailtrap no reenvía a real), cero "acordarse de remover" — es infraestructura permanente. (b) es más rápido de ejecutar pero peor por scope y risk profile.
  - **Decisión pendiente PO**. No implementar todavía — anotado para próximo sprint que toque auth o cuando aparezca ventana.

- **[cerrado 2026-08-27, pre-merge `email-landing`] Remover log temporal `[signup-debug] confirmationUrl:`** — agregado 2026-08-20 en [pages/api/auth/signup.ts](pages/api/auth/signup.ts) para desbloqueo de smokes con Deployment Protection Vercel. Removido antes del merge de `email-landing` a main. Verificación empírica: `grep -n 'signup-debug' pages/api/auth/` → 0 matches; `grep -rn 'signup-debug' --include="*.ts" --include="*.tsx"` → 0 matches. Cero residuo en prod.

- **[abierto — PRIORIDAD ALTA, preexistente descubierto 2026-08-27 durante smoke email-landing] Timeout de inactividad por check-al-mount está roto desde su primer commit** — el path "F5 tras 10+ min sin actividad → expulsión a `/security-logout`" NUNCA funcionó en la práctica. Detectado por Aldo con smoke positivo-conocido (seteo marker a hace 20 min, F5 en `/proveedor`, verificar expulsión); resultado: no expulsó, marker se pisó a NOW post-recarga. Bug preexistente, no del sprint email-landing.
  - **Diagnóstico técnico** ([components/SessionTimeout.tsx](components/SessionTimeout.tsx) desde commit `840ef3e`, meses):
    - useEffect L~140-145 registra 5 event listeners de interacción (`mousedown, mousemove, keydown, scroll, touchstart`) **INMEDIATAMENTE** al mount, síncrono.
    - Después llama `init()` async L~132 → `await checkInactivityOnMount()` → `await handleLogout()` (que a su vez hace `await supabase.auth.getSession()` — network).
    - **Race**: entre el registro sync de listeners y el getItem del check async, pasan milisegundos. Cualquier `mousemove` del cursor del user (que se movió para presionar F5 o mirar la pantalla) dispara `resetTimer` → `setItem(STORAGE_KEY, NOW)` sync inmediato → marker pisado.
    - `checkInactivityOnMount` llega a `getItem` L76 → **lee el marker ya reseteado a NOW**, no el viejo. `timeSinceLastActivity ≈ 0` → NO detecta expiración → cero `handleLogout` → cero redirect.
    - `mousemove` listener es hipersensible: 1 píxel de movimiento del cursor dispara. En uso real, un user haciendo F5 siempre mueve el mouse.
  - **Path que SÍ funciona (no romper con el fix)**: el `setTimeout(handleLogout, INACTIVITY_LIMIT_MS)` L~127 registrado dentro de `resetTimer` NO es susceptible al race del mount. Si el user está en una tab abierta activamente 10+ min sin interacción, el setTimeout expira → `handleLogout()` → redirect. Este path SÍ pudo haber expulsado en producción — verificable en GA4 prod con `Reports → Realtime → Page path contains /security-logout` filtrado por últimos 90 días.
  - **Fix propuesto** (sprint dedicado, ~20 min): **reordenar registro de listeners** — moverlos DENTRO de `init()`, DESPUÉS de que `checkInactivityOnMount` complete. Si expiró → `init` retorna, cero listeners registrados, `handleLogout` sigue su curso (redirect con sesión o silencio con catch no-expulsivo). Si NO expiró → registrar listeners + `resetTimer()` inicial. Cero race: el marker no se puede pisar antes de la verificación. Trade-off: ~200ms al inicio sin tracking de interacción (durante `getSession` interno) — cero problema práctico, es literalmente el mount.
  - **Sprint dedicado**: rama `session-timeout-fix` creada 2026-08-27 con fix listo (sin mergear), esperando retomarlo con cabeza fresca post-`email-landing` en prod. Ver commit inicial de esa rama con el diseño exacto propuesto.
  - **Compatibilidad con `email-landing`**: el fix 1 del SessionTimeout (exclusión de rutas auth transit) que SÍ aterriza en `email-landing` NO afecta el path del setTimeout que funciona — en las rutas excluidas (`/login`, `/register`, `/email-confirmado`, etc) el useEffect entero no corre, entonces cero setTimeout registrado ahí, comportamiento intencional (users en flow de auth no deben ser expulsados por inactividad de sesión anterior). En el resto de rutas (`/proveedor`, `/mis-reservas`, etc), el useEffect corre y el setTimeout se registra normal.

- **[abierto — PRIORIDAD ALTA, sprint propio, pedido PO 2026-08-27] Feedback con adjunto de imagen** — hoy el widget `components/Shared/FeedbackWidget.tsx` es solo texto. Los usuarios no pueden reportar un problema con evidencia visual, que es justo lo que hace falta cuando algo se ve mal en pantalla. **Orden**: después de session-timeout, antes de "Duplicaciones campo-específico vs formulario base en `camposPorCategoria.ts`".

  **Decisiones de producto YA TOMADAS por el PO (no re-abrir en el sprint)**:
  1. **Solo usuarios con sesión activa** pueden adjuntar imagen. Anónimos siguen enviando feedback de texto, sin adjunto.
  2. **Una imagen por envío**. No múltiples.
  3. **Máximo 3 MB antes de comprimir**. Reusar el compresor de fotos que ya existe en fichas de mascotas.
  4. **Formatos permitidos: JPG y PNG únicamente**. NO PDF, NO HEIC, **NO SVG** (SVG queda excluido explícitamente por riesgo de contenido activo).
  5. **Bucket PRIVADO en Supabase Storage**. El admin ve la imagen vía **URL firmada de vida corta**. NO bucket público.
  6. **Si la subida falla, el feedback se envía igual sin la imagen**. El texto nunca se pierde por un error de storage.

  **Razón del bucket privado, punto no negociable del PO**: una captura de bug suele traer datos personales en pantalla — teléfono, dirección, correo de terceros, sesión abierta. Un bucket público expone eso a cualquiera con el link.

  **Pendiente de diseño cuando se abra el sprint (NO diseñar ahora)**:
  - Políticas RLS del bucket.
  - Retención: cuánto tiempo se guarda la imagen y qué pasa al resolver el feedback.
  - Rate limiting de subida (ya hay Upstash en el proyecto).
  - Render en la vista `/admin` de Feedback (`components/Admin/FeedbackList.tsx` — sprint `admin-visibilidad`).
  - Qué hacer con envíos históricos sin adjunto.

  **Nota auditor**: entrada solo anotada por instrucción explícita del PO ("NO la implementes, no la diseñes en detalle, no toques código"). Prioridad y decisiones producto fijas — reabrir con el PO en el momento del sprint.

- **[abierto — sprint dedicado post email-landing]** Fix estructural: self-calls server-side rotos en Vercel Preview con Deployment Protection. Detectado 2026-08-20 durante smoke email-landing. **Alcance**: 5 llamadas `fetch('${NEXT_PUBLIC_SITE_URL}/api/...')` desde otras Functions del proyecto, todas silentes en preview protegido:
  - [pages/api/auth/signup.ts:201](pages/api/auth/signup.ts#L201) → `/api/auth/welcome`.
  - [pages/api/auth/signup.ts:229](pages/api/auth/signup.ts#L229) → `/api/admin/notify-nueva-solicitud`.
  - [pages/api/cron/recordatorio-reserva.ts:120](pages/api/cron/recordatorio-reserva.ts#L120).
  - [pages/api/cron/recordatorio-onboarding.ts:34](pages/api/cron/recordatorio-onboarding.ts#L34).
  - [pages/api/cron/invitacion-resenas.ts:72](pages/api/cron/invitacion-resenas.ts#L72).
  - [pages/api/cron/recordatorio-mensajes.ts:81](pages/api/cron/recordatorio-mensajes.ts#L81) — mismo patrón inline.
  Los 4 crons no importan tanto porque solo se disparan en prod real (skipIfNonProd los cortocircuita en preview). Pero **signup → welcome y signup → notify-admin** sí importan: signup en preview no dispara welcome ni notif admin **jamás**. En prod funcionan porque prod nunca tuvo Deployment Protection habilitada.

  **Dos opciones de fix, ordenadas por preferencia auditor**:

  **Opción A — helper importado in-process (elimina el self-fetch)**. Refactorizar `welcome.ts` y `notify-nueva-solicitud.ts` a helpers puros (`sendWelcomeEmail`, `notifyAdminNuevaSolicitud`) importados directo en `signup.ts` y llamados como funciones normales. Los endpoints HTTP se mantienen para backward-compat (por si algún cron o servicio externo los usa) pero delegan al mismo helper. **Ventajas**: cero HTTP overhead entre Functions (más rápido, menos costo Vercel), cero dependencia de Deployment Protection, cero header de bypass, cero surface. **Desventajas**: los checks `verifyInternalSecret` + `emailLimiter` que hoy protegen los endpoints se pierden en la ruta helper — hay que decidir si mantener esos guards a nivel del helper mismo (rate limit ok, secret innecesario porque ya estamos en la Function autenticada). **Esfuerzo estimado**: **~2-3 horas** (extraer 2 helpers + reescribir 2 callers + tests unit + smoke preview). El sprint aterriza los 2 caminos críticos; los 4 crons quedan igual porque no importan.

  **Opción B — header `x-vercel-protection-bypass` condicional**. Vercel provee `VERCEL_AUTOMATION_BYPASS_SECRET` env var: cuando se setea + se envía en el header `x-vercel-protection-bypass: <secret>` del request, bypasa el gate de Protection. Agregar helper `withProtectionBypass(headers)` en `lib/apiAuth.ts` que agregue el header si `process.env.VERCEL_AUTOMATION_BYPASS_SECRET` existe. Aplicar en los 6 lugares del self-fetch. **Ventajas**: cambio quirúrgico, cero refactor de endpoints. Preserva `verifyInternalSecret` y `emailLimiter`. **Desventajas**: dependencia de env var Vercel-specific (funciona solo en previews que tengan la env), suma header que puede leakearse si el `siteUrl` fallback apunta a un origen distinto (revisar el fallback host-injection ya cerrado por Sweep #1 finding 88), mantiene el overhead HTTP de Function-a-Function. **Esfuerzo estimado**: **~1 hora** (helper + 6 call-sites + verificar env var seteada en Preview).

  **Voto auditor**: **A**. Es más limpio arquitectónicamente, elimina la deuda para siempre (no depende de config Vercel-specific), reduce costo de invocaciones Function-to-Function (~50% menos requests billables en el flow signup). Pero B es válido si el sprint quiere ser mínimo. Decisión pendiente PO.

- **[abierto — ESTADO REAL DE PROD, actualizado 2026-08-27 post-cleanup smokes email-landing]** **Snapshot verificado empírico prod**:
  - **8 proveedores no-ejemplo**: admin (canocortes) + 7 personas reales.
  - **3 pueden entrar hoy**: Eduardo Cano, Verónica González, Nicole Novion (con su cuenta nueva del 27-ago).
  - **5 NO pueden entrar** — todos con `email_confirmed_at = NULL` en `auth.users`. Están aprobados en `proveedores` desde 2026-08-18 (migration del sprint badge-f1) pero nunca confirmaron el correo, así que el login los rebota antes de llegar a cualquier pantalla: **Fernanda Hamasaki, Laura Marlenet Criado, Francisca Polette Orellana, Isidora Maciel, Ignacia Mellado**. Este es el estado exacto que el email de recuperación H4 (backlog previo) atendería si se dispara.
  - **DECISIÓN PO 2026-08-27**: **NO contactar todavía**. Prioridad es terminar la web para lanzamiento primero; invitar a las 5 ahora las expone a bugs recién cerrados. El PO avisará explícitamente cuándo arrancar el flow de recuperación. No tratar como pendiente urgente.
  - **3 servicios activos en catálogo**: los mismos que se venían reportando (Eduardo Cano, 3 categorías distintas del 12-mayo). Contra umbral apertura tutores = 25 con mínimo 3 por categoría → **cobertura real 3/25 = 12%, ninguna categoría cumple el mínimo**.
  - Registros previos que decían 9 proveedores dormidos o 3/25 concentrado (items previos del backlog) se ajustan con este snapshot: son 5 dormidos por falta de confirm email + 2 sin publicar aunque confirmaron. Actualización de números, no de conclusión.

- **[abierto — DUPLICADO, detectado 2026-08-27 post-cleanup smokes]** **Nicole Novion aparece con dos cuentas en prod**:
  - `auracaninaspa@gmail.com`, creada 2026-08-16, `email_confirmed_at = NULL` (una de las 5 dormidas del item anterior).
  - `anicolenovion@gmail.com`, creada 2026-08-27, confirmada.
  - Volvió sola 11 días después con otro correo. Cero mecanismo del sistema causó el duplicado — decisión propia de la usuaria de registrarse de nuevo en vez de recuperar la cuenta vieja.
  - **Pendiente de resolver**: decidir si consolidar (borrar la vieja + preservar solo la nueva confirmada) o dejar ambas hasta que Nicole lo pida. Sin urgencia — la vieja no molesta operativamente porque no puede entrar. Cuando el flow de recuperación H4 se dispare (según decisión PO arriba), Nicole probablemente ignora el correo de recuperación de la cuenta vieja porque ya tiene la nueva. Se puede limpiar en batch post-launch.

- **[abierto — OBSERVADO UNA VEZ, sin causa establecida, 2026-08-27 durante smoke S4 prod]** `/explorar` colgado 60+ segundos post-navegación desde landing `/email-confirmado`, requirió Ctrl+Shift+R. Detectado por Aldo tras click "Explorar servicios" del CTA tutor. **NO reproducido en 4 reintentos** (logueado normal / deslogueado / logueado incógnito / deslogueado incógnito). Única diferencia contextual entre la ocurrencia y los reintentos: **cuando pasó, la sesión estaba recién hidratada por confirmación de correo (primer aterrizaje de esa cuenta)**; los reintentos fueron con sesiones ya establecidas.
  - **Anotado como dato observable, cero mecanismo inferido**. Si vuelve a aparecer con Network tab abierto, capturar (requests pending, timing, JS errors) y anexar acá. Sin evidencia adicional no es diagnosticable — proponer mecanismo sin datos es exactamente el corolario P8 11ª (atribución causal sin verificar) que ya cayó dos veces este mes.
  - **Priorización**: baja. Cero reproducciones activas, único incidente aislado. Reactivar si se acumula evidencia.

- **[cerrado 2026-08-27 por Aldo durante cleanup smokes]** **Registro fantasma "Admin Pawnecta" en prod**: había 2 filas "Admin Pawnecta" creadas con 15 segundos de diferencia el 2026-02-25. Una con `auth_user_id = NULL` (sin user asociado), `roles=["admin"]` — basura histórica del setup inicial del admin. Aldo la borró usando `SET LOCAL role='service_role'` (aplica acá porque `proveedores` sí tiene trigger `_guard_fn` — al revés que el DELETE sobre `auth.users` que requiere `postgres` por privileges). Cero riesgo de seguridad (sin auth_user_id nadie puede autenticarse contra esa fila), pero contaminaba conteos de oferta. Cerrado.

- **[abierto — PRIORIDAD ALTA, detectado 2026-08-25 durante revisión BACKLOG mascotas]** **Oferta real prod = 3/25 concentrada en 1 proveedor + 9 proveedores aprobados sin publicar**. Verificado por Aldo 2026-08-25 con query directa a prod tras el diagnóstico del bug mascotas duplicadas:
  ```
  titulo                                       | activo | n_fotos | sin_comunas | created_at
  Cuidado tu mascota                           | false  | 0       | true        | 2026-03-03
  Fotografía profesional de mascotas...        | true   | 2       | false       | 2026-05-12
  Visitas a domicilio...                       | true   | 2       | false       | 2026-05-12
  Paseos en grupos pequeños...                 | true   | 2       | false       | 2026-05-12
  ```
  - **Servicios activos en el catálogo público**: **3** (no 4 como venía diciendo el auditor por count crudo sobre `servicios_publicados` sin filtrar `activo`). Umbral apertura tutores = 25 → **cobertura real 3/25 = 12%**.
  - **Los 3 activos son TODOS de Eduardo Cano**, creados en el mismo minuto (2026-05-12). Categorías distintas (fotografía + visitas domicilio + paseos), pero cero cumplimiento del "mínimo 3 por categoría" en NINGUNA — están en 3 categorías distintas.
  - **9 proveedores aprobados sin publicar nada** (11 proveedores no-ejemplo + 2 admin pawnecta − 3 servicios/1 proveedor − 1 servicio inactivo cuenta admin auditor = 9 vacíos). Los 7 legacy que Aldo desatascó con la migration 2026-08-18 (Veronica, Nicole, Ignacia, Isidora, Fernanda, Laura, Francisca) están dentro de esos 9.
  - **El "1 PUBLICADOS" vs "no tiene servicios activos" que Aldo reportó**: NO es dato corrupto — el servicio existe pero está `activo=false`. Sigue siendo UI ambigua (dos superficies leen `count(servicios)` vs `count(servicios WHERE activo)`) — deuda de copy/UI para arreglar. Baja de severidad.
  - **Implicaciones para el plan**:
    - Objetivo apertura a tutores (25 servicios activos) requiere activar los 9 proveedores dormidos o traer proveedores nuevos que publiquen.
    - H4 email honesto a las 92 huérfanas históricas ya está previsto y ayuda por el lado de la puerta de entrada.
    - La sala de espera (pantalla `pendiente`) que descubrimos que ocluía el panel de los 7 explica retrospectivamente por qué esos 7 siguen sin publicar aunque F1 + migration los desbloqueó: al desbloquearse dejaron de ver la sala de espera pero **no volvieron al panel** — la fricción histórica ya los sacó del funnel. Necesitan email de reactivación explícito, no solo desbloqueo silencioso. **Refuerza la prioridad de H4** post-email-landing.
    - PANEL-PROV-1 (reescribir sala de espera como "estado especial + contactanos") sigue siendo P0 para casos futuros aunque hoy no aplique.
  - **Sin fix inmediato de código**. Es dato operativo que ajusta el plan de próximas fases (H4 sube en prioridad, PANEL-PROV-1 mantiene P0).

- **[abierto — PRIORIDAD ALTA, detectado 2026-08-25 durante smoke email-landing]** `ServiceFormModal` pide MASCOTAS DOS VECES en categoría Etología, genera datos inconsistentes. Detección de Aldo: el formulario tiene el campo base "Mascotas aceptadas" (Perros/Gatos/Otras, marcado obligatorio) + el campo específico de la categoría Etología "Especies que atiendes" (mismas 3 opciones). Usuario puede marcar Gatos en uno y Perros en otro; el sistema guarda dos respuestas contradictorias en columnas distintas. **Más grave que la validación de descripción y la race del select de Categoría**.
  - **Diagnóstico técnico** (auditor 2026-08-25):
    - Campo base [components/Proveedor/ServiceFormModal.tsx:2199-2213](components/Proveedor/ServiceFormModal.tsx#L2199-L2213) "Mascotas aceptadas" → guarda en **columnas escalares** `servicios_publicados.acepta_perros`, `acepta_gatos`, `acepta_otras`.
    - Campo por categoría [lib/camposPorCategoria.ts:368-372](lib/camposPorCategoria.ts#L368-L372) "Especies que atiendes" `especies_atendidas` multiselect → guarda en **`servicios_publicados.detalles` JSONB**.
    - **Filtro del RPC `buscar_servicios`** ([migrations/20260529_modalidad_multivalor.sql:244-247](migrations/20260529_modalidad_multivalor.sql#L244-L247)): lee **solo las columnas escalares** (`s.acepta_perros = true` etc). **NUNCA consulta `detalles.especies_atendidas`**. Consecuencia: proveedor etólogo marca "Gatos" en base + "Perros + Otras" en específico → filtro `p_mascota=perro` NO devuelve su servicio, pero al abrir la ficha el tutor lee "Especies que atiendo: Perros, Otras". Divergencia visible al usuario final.
  - **(a) ¿Otras categorías con campos duplicados con el formulario base?** Grep exhaustivo sobre `camposPorCategoria.ts`: **solo Etología** con `especies_atendidas`. El resto de "mascotas" en el archivo son distintos semánticamente: `mascotas_propias` (cuidado, se refiere a mascotas DEL cuidador), `tipo_mascotas_propias` (cuidado, texto libre), `mascotas_grandes` (cuidado, es opción de "inclusiones"). Cero duplicado adicional detectado con el filtro base "Mascotas aceptadas". **Nota lateral no incluida en el pedido**: campo base `comunas_cobertura[]` tiene duplicado semántico parcial con `radio_cobertura_km` + `zona_paseo` + `comunas_adicionales` en categoría Paseos (L191-193) — distinta clase de duplicación (radio numérico + texto libre vs multiselect de comunas), menos automatizable, no genera divergencia leída por filtro público. Anotar como deuda separada si aplica.
  - **(b) Qué columna lee el filtro `/explorar`**: **columnas escalares `acepta_perros`/`gatos`/`otras`**. `detalles.especies_atendidas` es solo storage sin lector funcional en el RPC. El filtro es correcto — la fuente de verdad canónica es el campo base.
  - **(c) ¿Hay servicios prod con los dos campos divergentes?** **CONFIRMADO EMPÍRICAMENTE POR ALDO 2026-08-25**: cero servicios prod actuales en categoría Etología. Query correcta (auditor había escrito `categoria_slug` que no existe — la columna real es `categoria_id` uuid FK a `categorias_servicio`; P6 slip): `SELECT COUNT(*) FROM servicios_publicados s JOIN categorias_servicio c ON c.id = s.categoria_id WHERE c.nombre ILIKE '%etolog%'` → **0**. Divergencia real hoy = 0. Vector abierto para futuras altas.
  - **Fix propuesto (sprint chico, ~1 h)**:
    - Opción 1 (recomendada): eliminar `especies_atendidas` de `camposPorCategoria.ts` para Etología. El campo base ya cubre la respuesta. Cero migration BD — `detalles.especies_atendidas` de servicios existentes queda como dato huérfano que nadie lee.
    - Opción 2: mantener `especies_atendidas` como campo con detalle adicional ("razas especializadas") pero NO como duplicado de la pregunta binaria — reetiquetar + cambiar shape. Más trabajo, mismo problema si no se elimina la duplicación del preset.
    - Voto auditor: **Opción 1**.

- **[abierto — investigado 2026-08-20, sin acción código requerida]** GET 404 sobre proveedor seed `b1000001-0000-4000-8000-...` en prod (16:29:52 CLT). Investigación read-only:
  - **Grep del patrón UUID en `.tsx/.ts`**: cero matches en código. Solo aparece en `migrations/20260506_seed_demos_y_es_ejemplo.sql` (definición seed) y en actas históricas.
  - **Sitemap**: [pages/sitemap.xml.tsx:11-23](pages/sitemap.xml.tsx#L11-L23) filtra por vista `proveedores_publicos` que solo expone aprobados. Post-sweep 14-ago (borrado de `es_ejemplo=true` en prod), estos IDs ya no aparecen en el sitemap.
  - **Diagnóstico**: click desde cache SEO viejo (Google indexó antes del sweep, sigue crawleando y da 404) o link compartido externamente (redes sociales, WhatsApp, bookmark). Cero bug del sistema. Google reindexa cuando el crawl vuelva a pasar por el sitemap sin esos IDs — típicamente semanas.
  - **Acción sugerida (opcional, post-launch, si el volumen de 404s crece)**: agregar `next.config.js` redirects 301 para el patrón `/proveedor/b1000001-*` → `/explorar` (o a categoría relevante). Convierte los 404s en tráfico útil hasta que Google reindexe. Sprint chico (~15 min) si querés hacerlo, no urgente.
  - **Monitoreo**: revisar en 7-14 días si el 404 sigue apareciendo con frecuencia en Vercel Analytics / Runtime Logs. Si desaparece → Google reindexó, cerrado natural. Si persiste → hay una fuente externa (email, red social) que mantiene el link vivo — investigar aparte.

- **[cerrado 2026-08-20, hallazgo lateral badge-f1 en prod] Auth Emails Supabase con dominio propio** — pedido implícito del PO **2026-08-18** (AUTH-EMAIL-1 propuesto tras smoke H3, remitente "Supabase Auth" + asunto en inglés). Aterrizado antes de que el sprint ejecutara: **verificado por Aldo durante smoke S4 F1 prod 2026-08-20**, el correo de confirmación llega desde `hola@pawnecta.com` con template propio en español y copy alineado a F1 ("Tu cuenta ya está activa", "Sube tu carnet cuando quieras"). Custom SMTP debe estar configurado en Supabase Dashboard prod contra Resend (o Zoho). Cerrado sin sprint dedicado — se pasó por otro camino. Ver [ACTA_BADGE_F1.md sección 5](ACTA_BADGE_F1.md#5-hallazgos-no-bloqueantes-detectados-durante-smokes). **Pendientes menores anotados**:
  - **Display name del remitente aparece como "hola"** en vez de "Pawnecta". Fix: Supabase Dashboard prod → Auth → SMTP Settings → cambiar "Sender name" a `Pawnecta`. ~2 min.
  - **Asunto del correo dice "Recibimos tu solicitud"** (lenguaje de postulación, residuo del modelo pre-F1 donde había revisión) mientras el cuerpo dice que la cuenta ya está activa. Fix: Supabase Dashboard prod → Auth → Email Templates → Confirm signup → editar subject a algo alineado con F1 ("Confirma tu correo — Pawnecta" o "Activa tu cuenta en Pawnecta"). ~3 min. **Total: ~5 min config Dashboard, sin código, sin deploy**.

- **[abierto — deuda menor detectada 2026-08-20 en smoke F1 badge-f1]** Bugs preexistentes en `ServiceFormModal.tsx` (verificados con `git log main..badge-f1 -- components/Proveedor/ServiceFormModal.tsx` → cero commits del sprint, no son regresión de F1):
  - **Campo `descripcion` del servicio sin validación de largo mínimo** — permite publicar con menos de 50 caracteres. La validación 50 chars que aterrizó en orphan-fix vive en [pages/register.tsx:232-236](pages/register.tsx#L232-L236) y aplica al campo `descripcion` del **wizard de signup**, no al del **servicio**. Fix: replicar la validación condicional en el submit del `ServiceFormModal` — si `descripcion.trim().length > 0 && < 50`, bloquear con mensaje accionable. ~15 min.
  - **Race en select de Categoría del `ServiceFormModal`** — [components/Proveedor/ServiceFormModal.tsx:209-217, 282-287](components/Proveedor/ServiceFormModal.tsx#L282-L287) hace fetch al abrir el modal; el select renderiza inmediatamente con `categorias=[]` durante los ~100-300 ms del round-trip a Supabase. Sin loading state ni skeleton, cero placeholder — user ve select vacío sin explicación. Segunda apertura funciona por state preservation (React no desmonta con `return null` en L1345). Fix: agregar estado `loadingCategorias` que renderice `<option disabled>Cargando...</option>` durante el fetch. ~15 min.
  - **Total sprint chico**: ~30 min ambos fixes juntos + build P1.1 + push.

- **[abierto — PRIORIDAD MEDIA, inventario del sprint panel-prov-fixes 2026-08-27]** **`error.message` crudo filtrado al user en `ServiceFormModal` — mismo patrón del select de Categoría cerrado por hotfix `dfcab37`, pendiente en 2 flujos más críticos + 9 acumuladores de agenda**. Prioridad media porque son error paths (no ruta feliz), pero es el mismo patrón que sí se corrigió en el select — en algún momento un proveedor va a ver un mensaje de Postgres o un `TypeError` en pantalla, en inglés, sin contexto.
  - **[components/Proveedor/ServiceFormModal.tsx:922](components/Proveedor/ServiceFormModal.tsx#L922)**: `toast.error('Error al actualizar: ' + error.message)` — UPDATE de servicio existente. Ruta crítica: es lo que Aldo o cualquier proveedor ve si el save de una edición falla (constraint violation, RLS, network transient). Fix: mismo patrón que catalogoCategorias — `Sentry.captureException(error, {tags: {component: 'ServiceFormModal', phase: 'update'}})` + toast con copy causa-neutral tipo "No pudimos guardar los cambios. Revisa tu conexión y vuelve a intentar."
  - **[components/Proveedor/ServiceFormModal.tsx:932](components/Proveedor/ServiceFormModal.tsx#L932)**: `toast.error('Error al publicar: ' + error.message)` — INSERT de servicio nuevo. Ruta crítica idéntica a la anterior. Mismo fix con copy "No pudimos publicar el servicio. Revisa tu conexión y vuelve a intentar."
  - **Acumuladores agenda F1/F2**: [L990](components/Proveedor/ServiceFormModal.tsx#L990), [L1001](components/Proveedor/ServiceFormModal.tsx#L1001), [L1013](components/Proveedor/ServiceFormModal.tsx#L1013) (`franjasErr`), [L1050](components/Proveedor/ServiceFormModal.tsx#L1050), [L1062](components/Proveedor/ServiceFormModal.tsx#L1062), [L1075](components/Proveedor/ServiceFormModal.tsx#L1075) (`excErr`), [L1117](components/Proveedor/ServiceFormModal.tsx#L1117), [L1132](components/Proveedor/ServiceFormModal.tsx#L1132), [L1144](components/Proveedor/ServiceFormModal.tsx#L1144) (`blkErr`) — acumulan `error.message` en variables locales que pueden llegar a `toast.error(...)` posteriores. Verificar caso por caso qué path los muestra y si el `.message` llega al user o queda solo en console. Alcance más grande: pueden ser errores de INSERT sobre `disponibilidad_semanal`, `excepciones_agenda`, `bloqueos_estadia` — cada uno con su copy accionable propio ("No pudimos guardar tu disponibilidad", "No pudimos registrar la excepción", etc). Fix estructural: helper compartido `lib/errorTelemetry.ts` que hace `captureException + return sentinel` similar a `catalogoCategorias`, consumido desde los 3 flujos.
  - **Esfuerzo estimado**: ~1 h para los 2 saves críticos (L922, L932) + ~2 h para los 9 acumuladores de agenda con helper compartido. Sprint chico dedicado (`error-copy-svcform` o similar) cuando haya ventana.

- **[abierto — deuda cosmética, inventario del sprint panel-prov-fixes 2026-08-27]** Entry huérfana `especies_atendidas: Stethoscope` en el icon map de [lib/camposPorCategoria.ts:722](lib/camposPorCategoria.ts#L722). Sprint panel-prov-fixes removió el preset `especies_atendidas` de Etología (commit `83d9312`) pero dejó el icon map intacto por decisión PO 2026-08-27 (ampliar la superficie del cambio requería tocar un archivo más — restricción de alcance estricta del sprint). Cero uso funcional (no hay caller para esa key después del remove), cero impacto en render (el consumer `ICONO_POR_CAMPO_KEY` es un lookup por key, keys sin uso no molestan). Limpieza cosmética. **Esfuerzo**: 30 segundos (1 línea a eliminar + verificar grep 0 references) — combinable con cualquier sprint futuro que toque `camposPorCategoria.ts`.

- **[abierto — deuda menor, detectado 2026-08-27 en Runtime Logs prod]** Escaneo automatizado de vulnerabilidades WordPress contra `www.pawnecta.com` — `POST /xmlrpc.php` registrado 27-ago 10:16:39. Rutina en cualquier sitio público, cero riesgo real porque el stack no incluye WordPress (Next.js + Supabase). El request cae en el catch-all 404 de Next después de pasar por el middleware (que ya filtra patterns tipo `wp-*`, `*.php` según [middleware.ts](middleware.ts) del batch REMATE-1 R2a). **Anotable como confirmación de que ya nos están escaneando** — comportamiento esperado post-lanzamiento público. Revisar si conviene:
  - **(a) Verificar que el middleware R2a de REMATE-1 ya cubre `xmlrpc.php` explícito** — grep del middleware; si no está, agregarlo al pattern list para responder 404 en edge, cero cómputo del renderer Next. Costo: 2 min.
  - **(b) Considerar log de estos eventos a Sentry** con severity=info para tracking de intensidad de escaneos (útil como señal si el volumen se dispara — puede indicar targeting activo). Costo: 15 min si el middleware ya bloquea.
  - Sin urgencia. El escaneo es un dato ambiental, no una amenaza. Post-launch cuando haya ventana.

- **[abierto — deuda menor]** DMARC `rua` propio — pedido de PO **2026-08-11**. Hoy el `rua` del registro `_dmarc.pawnecta.com` apunta a `dmarc_rua@onsecureserver.net` (default de GoDaddy). Los reportes agregados diarios/semanales que envían los mailbox providers (Google, Microsoft, Yahoo) sobre alineación DMARC de nuestro dominio se están yendo a esa dirección de GoDaddy, no la vemos. Fix: cambiar el `rua=mailto:...` por (a) una casilla propia en Zoho (ej. `dmarc@pawnecta.com`) para procesarlos manualmente, o (b) un servicio dedicado (dmarcian, Postmark DMARC, Valimail Monitor) que parsee los XML y muestre dashboards. Esfuerzo: 5 min DNS + decisión de destinatario. Post-launch.

- **[cerrado 2026-08-11 `917e4eb` — verificado prod 2026-08-14] Íconos específicos por campo en "Información del servicio"** — pedido de PO **2026-07-31**. Aterrizó en Sweep #2 (`917e4eb feat(sweep-2): pedido PO + 10 mediums quirúrgicos (íconos + email diag + M1-M9/11/12)`), promovido a prod en tag `remate-1-prod-20260811` (2026-08-11). **Verificación prod 2026-08-14** (durante planning Ola 2): ficha real prod `/servicio/52a6e060-14f2-491d-900e-76240318aadc` sirve **34 SVGs con clase `lucide` y cero placeholders `···`** (grep sobre HTML server-rendered). El pedido lleva 3 días cerrado — el estado "abierto" acá era obsoleto, no reflejaba el aterrizaje. Estado técnico: `ICONO_POR_CAMPO_KEY` mapa 30+ keys → íconos Lucide (`lib/camposPorCategoria.ts:660-750`), consumido por `renderCampoCard` de `ServiceDetailView.tsx:1156`, fallback `FALLBACK_ICONO_CAMPO = MoreHorizontal` para keys futuros sin entry. Boolean sigue con checkmark accent en verde. **Mapa original propuesto (ejecutado)**:
  - **Duración** (`duracion_min`, `duracion_horas`) → `Clock`
  - **Razas** (`razas_grandes`, `razas_especiales`, `razas_fuerza`) → `PawPrint` (o `Bone` si existe)
  - **Radio / cobertura / zona** → `MapPin`
  - **Parque / lugar** → `Trees` (o `TreePine`)
  - **Peso** → `Scale`
  - **Edad** → `Cake`
  - **Capacidad** → `Users`
  - **Cámara / vigilancia** → `Video` (o `Camera`)
  - **GPS** → `Navigation`
  - **Fotos / reporte visual** → `Camera` (o `ImagePlus`)
  - **Vehículo** → `Car`
  - **Certificación / diploma** → `Award`
  - **Especialidad médica** → `Stethoscope`
  - **Modalidad** → `Home` / `Monitor` / `Building` según valor
  - **Fallback** → `MoreHorizontal` (Lucide) — coherente con el set del proyecto.

  **Criterio de cierre**: cero `···` visibles en las fichas de las categorías actuales con sus campos estándar. Verificable con smoke visual en `/servicio/{id}` por cada categoría (hospedaje, guardería, paseos, peluquería, adiestramiento, veterinario, traslado, cuidado, etología, retratos). Referencia técnica: sección `## Deuda técnica / pulido` (línea original que se mantiene con puntero → esta sección).

- **[abierto — PRIORIDAD MEDIA, sprint propio, detectado 2026-08-27 durante smoke S6 del hotfix panel-prov-fixes]** **Duplicaciones campo-específico vs formulario base en `lib/camposPorCategoria.ts` — inventario completo** — pedido de PO **2026-08-27**. Contexto: el hallazgo empírico de Aldo en modo edición sobre Guardería reveló que el bloque "Disponibilidad" del formulario base (Lun a Dom con hora inicio/fin — dato estructurado que alimenta agenda F1/F2) convive con un campo `horario` texto libre en el preset de Guardería (`camposPorCategoria.ts:396`, requerido, placeholder "Ej: Lunes a viernes 8:00-18:00"). Peor que el caso `especies_atendidas` de Etología cerrado previamente porque acá uno es dato estructurado filtrable que el producto USA (agenda, slots, ficha) y el otro es texto libre sin validación — un proveedor puede marcar Mar/Jue/Sáb en el bloque estructurado y escribir "lunes a viernes" en el texto libre, y el tutor ve una contradicción visible en la ficha. Regla operativa nueva: cero descubrimiento de-a-uno cada vez que se abre el modal en categoría distinta — inventario completo antes del sprint dedicado.

  **Inventario auditor 2026-08-27** (grep `lib/camposPorCategoria.ts` completo, cruzado contra campos del formulario base `title, descripcion, precio_desde/hasta, unidad_precio, categoria_id, mascotas_aceptadas, comunas_cobertura[], fotos[], disponibilidad{lun..dom, hora_inicio, hora_fin}, detalles`):

  **A. Duplicados claros (dato estructurado del base + campo específico duplica misma información)**:
  1. **`guarderia.horario`** (`camposPorCategoria.ts:396`, `tipo: 'text'`, `requerido: true`) vs bloque **Disponibilidad Lun-Dom estructurada** del formulario base. Placeholder "Ej: Lunes a viernes 8:00-18:00" solapa 100% con lo que ya se captura en 7 selectores hora inicio/fin. **Grave** porque es requerido → cada Guardería nueva llena AMBOS.
  2. **`veterinario.comunas_cobertura`** (`camposPorCategoria.ts:211`, `tipo: 'text'` texto libre "Ej: Providencia, Las Condes, Vitacura") vs **`comunas_cobertura[]`** (multiselect estructurado del formulario base). **Doble confusión** porque comparte NOMBRE exacto con el campo del base pero es texto libre en vez de multiselect. El proveedor no distingue cuál es cuál.
  3. **`traslado.comunas_cobertura`** (`camposPorCategoria.ts:234`, `tipo: 'text'` texto libre "Ej: Todo Santiago, Región Metropolitana") vs **`comunas_cobertura[]`** (multiselect base). Mismo bug estructural que veterinario — mismo nombre, tipo divergente.
  4. **`paseos.comunas_adicionales`** (`camposPorCategoria.ts:193`, `tipo: 'text'` "Ej: Ñuñoa, Macul") vs **`comunas_cobertura[]`** (multiselect base). Nombre distinto ("adicionales") pero información redundante — el proveedor puede listar acá comunas que ya están en el multiselect base.

  **B. Duplicados parciales (campo específico complementa el base con dimensión numérica — decisión conceptual)**:
  5. **`radio_cobertura_km`** presente en 7 categorías (`cuidado:156`, `paseos:191`, `peluqueria:262`, `adiestramiento:302`, `veterinario:210`, `traslado:233`, `etologia:381`). NO son duplicados directos porque son cuantitativos (km) mientras `comunas_cobertura[]` es cualitativo (nombres) — se complementan. Pero el patrón se repite en 7 de 10 categorías → conviene decidir si `radio_cobertura_km` debe promoverse al formulario base como campo canónico único, con derivación cruzada (radio ↔ comunas cubiertas) o mantenerse como campo específico duplicado. Baja prioridad si `comunas_cobertura[]` sigue siendo la fuente autoritativa de filtro en `/explorar`.
  6. **`paseos.zona_paseo`** (`camposPorCategoria.ts:192`, texto libre "Parque O'Higgins, Parque Forestal"). NO duplica base directamente porque son sub-locaciones (parques específicos, no comunas). Pero está en el mismo bloque conceptual "dónde presta" — evaluar si mueve a campo geográfico separado o queda como notas.

  **C. Ya resueltos previamente**:
  7. ~~`etologia.especies_atendidas`~~ — cerrado en commit `83d9312` (sprint panel-prov-fixes, 2026-08-27). Ya duplicaba `mascotas_aceptadas` del base.

  **D. Otros específicos que NO duplican pero conviene documentar (no bloquean el sprint)**:
  - `cuidado.mascotas_propias` + `tipo_mascotas_propias` (L147-148) → mascotas del CUIDADOR, semántica opuesta al `mascotas_aceptadas` del base (que son las del TUTOR que el proveedor acepta). Nombres cercanos, semántica distinta — riesgo de confusión de proveedor. Documentar el par en placeholder o label ampliado.
  - `cuidado.modalidad` (multiselect: casa_cuidador/casa_tutor/recinto), `peluqueria.modalidad`, `adiestramiento.modalidad`, `etologia.modalidad`, `retratos.modalidad_entrega`. NO existe `modalidad` en el formulario base. Legítimamente específicos, no duplican.

  **Esfuerzo grueso estimado del sprint dedicado**: **medio día – 1 día** distribuido en (i) Decisión sobre A.1 `guarderia.horario` — remover del preset y usar sólo Disponibilidad base (~30 min + smoke); (ii) Renombrar/tipar A.2 `veterinario.comunas_cobertura` (colisión de nombre + tipo con el multiselect base) — opciones: eliminar y confiar en base, o renombrar a `comunas_cobertura_notas` con placeholder aclaratorio "detalle adicional sobre cobertura si aplica" (~45 min); (iii) mismo A.3 con `traslado.comunas_cobertura` (~45 min); (iv) A.4 `paseos.comunas_adicionales` — decisión eliminar-o-renombrar-a-notas (~30 min); (v) B.5 `radio_cobertura_km` — decisión de PO sobre promover a base o mantener por categoría (~15 min discusión); (vi) Migración de datos existentes en `servicios_publicados.detalles` si se eliminan keys (sanitizer + smoke fichas) (~1-2 horas); (vii) Smokes visuales cobertura fichas 10 categorías (~1 hora).

  **Impacto UX si NO se aterriza**: contradicciones visibles al tutor en fichas Guardería/Veterinario/Traslado/Paseos donde el proveedor llena ambos campos con info incompatible. Filtro `/explorar` sigue funcionando (usa siempre el estructurado del base), pero copy inconsistente reduce confianza.

  **Decisión**: sprint propio post-launch, después de que el volumen de servicios reales suba y el hallazgo de contradicciones tenga muestra empírica.

- **[abierto — PRIORIDAD BAJA, pregunta abierta anotada 2026-08-27]** **Asimetría de `e.preventDefault()` en el submit de `ServiceFormModal` entre camino de éxito vs camino de error** — pregunta de PO **2026-08-27** post-smoke Escenario B. Contexto: el smoke empírico de Aldo en staging (SELECT COUNT servicios_publicados antes/después = delta 1 con UN solo click en "Publicar Servicio") descartó doble INSERT/UPDATE en el camino de éxito. El hotfix `type="button"` cierra el vector estructural. Pero queda pregunta abierta sin explicación completa: si `handleSubmit` ejecutaba dos veces (por `onClick` + por submit del `<form>` default), el `e.preventDefault()` que Aldo verificó como funcional en el camino de éxito debería haber sido igualmente funcional en el camino de error donde SÍ se vieron dos toasts consecutivos. La asimetría no está explicada — hay algo distinto entre ambos paths que hace que un preventDefault intercepte y el otro no. Hipótesis a NO adoptar sin evidencia (P8 11ª — cero atribución causal sin verificar): puede ser reentrada async, orden de listeners, error thrown que bypassa el bubble, o algo del ciclo React synthetic event. **Sin resolver, no bloquea nada** (el vector estructural quedó cerrado por el fix del `type="button"`). Se anota para dejar constancia y no fabricar mecanismo. Retomable como diagnóstico frío si algún bug futuro relacionado con submits duplicados vuelve a aparecer.

- **[abierto — PRIORIDAD ALTA, revisar ANTES del lanzamiento, detectado durante apply prod del sprint admin-visibilidad 2026-08-27]** **Default privileges divergentes entre staging y prod: en prod, toda función nueva del schema public nace con EXECUTE otorgado a `anon`** — hallazgo empírico del PO durante apply de la migration `20260827_admin_listar_proveedores_rpc.sql` en prod.

  **Contexto**: la migration se aplicó en staging con `REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated` y quedó con `anon_can_call = false` con un solo Run. En prod, el mismo bloque idéntico dejó `anon_can_call = TRUE`. Investigación empírica del PO reveló que el mecanismo real NO era ni "REVOKE no toma junto al CREATE" (mi hipótesis inicial) ni "bloque entero funciona" (mi hipótesis correctiva) — ambas eran incorrectas.

  **7 evidencias del diagnóstico (PO 2026-08-27, orden cronológico)**:
  1. Bloque completo con un solo Run → `anon_can_call = TRUE`.
  2. `REVOKE ALL ... FROM PUBLIC` aparte → sigue en `TRUE`.
  3. `SELECT proacl FROM pg_proc WHERE proname='admin_listar_proveedores'` → el privilegio estaba como `anon=X/postgres` **DIRECTO en la función**, no via `PUBLIC`. `proacl = {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres, anon=X/postgres}`.
  4. `SELECT * FROM pg_auth_members WHERE member = (SELECT oid FROM pg_roles WHERE rolname='anon')` → CERO filas. **`anon` NO es miembro de `authenticated`** — descartada esa hipótesis alternativa.
  5. `SELECT * FROM pg_default_acl WHERE defaclnamespace = 'public'::regnamespace` → el schema `public` en prod tiene **DEFAULT PRIVILEGES que otorgan EXECUTE a `anon` sobre toda función nueva**. Se aplican en el momento del `CREATE FUNCTION`, entonces ni un REVOKE anterior al CREATE ni un REVOKE FROM PUBLIC posterior lo tocan (apuntan al lugar equivocado).
  6. **Control positivo (P8)**: `has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')` → también `TRUE` en prod. `is_admin()` es función preexistente que este sprint NO toca — confirma que el hallazgo es sistémico del schema, no del RPC nuevo.
  7. **Fix inmediato**: `REVOKE ALL ON FUNCTION public.admin_listar_proveedores() FROM anon;` — corrió limpio, `anon_can_call = FALSE`.

  **Divergencia staging vs prod**: staging NO tiene esos default privileges (verificable con la misma query paso 5 contra `jmtadvdkicyylcwjcmcl`), por eso el mismo bloque idéntico funciona sin `REVOKE FROM anon` en staging pero no en prod. **Fuentes probables de la divergencia**: (i) migración legacy manual en prod que agregó los defaults sin trackear; (ii) Supabase init template distinto entre proyectos según cuándo se crearon; (iii) alguna acción admin manual en Supabase Studio que otorgó defaults sin dejar rastro en `migrations/`. Ninguna hipótesis verificada — requiere auditoría de `pg_default_acl` completa en ambos entornos + trazado con SUPABASE MIGRATION HISTORY.

  **Consecuencia operativa hasta que se resuelva la deuda**:
  - **Cualquier RPC nuevo en prod hereda EXECUTE a anon por default**. `REVOKE FROM anon` explícito es OBLIGATORIO en la migration, no basta con `REVOKE FROM PUBLIC`.
  - **Otras funciones preexistentes** pueden tener el mismo hueco (control positivo `is_admin()` lo confirma). Requiere auditoría cross-schema: `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND has_function_privilege('anon', p.oid, 'EXECUTE')`. Cada match es un vector potencial — evaluar gate propio de la función (si tiene `is_admin()` inline, sigue seguro aunque anon pueda llamarla; si no, es fuga).

  **Fix estructural propuesto (sprint dedicado ANTES del lanzamiento)**:
  1. Auditar `pg_default_acl` en prod: identificar qué GRANT default está activo, quién lo puso, cuándo.
  2. `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;` — remover el default. Cero impacto en funciones existentes (solo afecta futuras).
  3. Auditar funciones preexistentes que hoy tienen `anon EXECUTE`: para cada una, evaluar si tiene gate interno (`is_admin()` o similar). Si sí, dejar como está. Si no, `REVOKE FROM anon` explícito.
  4. Alinear staging con prod (o al revés, según decisión de qué config es la correcta a mantener).

  **Costo grueso**: ~2-3 horas (auditoría + bloque de REVOKEs + verificación). Sprint chico dedicado, bloqueante para lanzamiento porque cualquier RPC futuro que se olvide del `REVOKE FROM anon` explícito abre superficie.

  **Regla operativa candidata para CLAUDE.md** (redacción cierra PO): verificar un privilegio con `has_function_privilege` no alcanza para saber DE DÓNDE viene ese privilegio. Ante un resultado inesperado, leer `pg_proc.proacl` + `pg_auth_members` + `pg_default_acl` **antes** de proponer un fix. Dos REVOKE al rol equivocado se hicieron antes de mirar el ACL — pérdida de tiempo evitable con la query correcta al principio.

- **[abierto — PRIORIDAD MEDIA, detectado + repro-verificado durante smokes staging admin-visibilidad 2026-08-27]** **Copy "sesión expiró" mostrado a personas que NUNCA tuvieron sesión** — pedido PO **2026-08-27**, PARADO durante el sprint `admin-visibilidad` porque el fix NO es trivial ("cambio de string" es engañoso — toca lógica de routing en 2+ archivos).

  **Repro empírico completo del PO 2026-08-27** (refuta la hipótesis inicial del auditor que decía "es rebote de no-admin"):
  1. **Sin sesión**, entrar a `/admin` → redirige a `/login?reason=expired&redirect=%2Fadmin` con copy "Tu sesión expiró. Vuelve a ingresar y te llevamos de nuevo a donde estabas." **← Este es el disparador real**.
  2. Desde ese login, autenticar con proveedor no-admin (`petmatecl+el1@gmail.com`) → vuelve a `/admin` y muestra login form inline "Acceso restringido". Sin loop, sin fuga de datos.
  3. Logout desde `/admin` como admin → cae al home limpio, sin mensaje.

  **Diagnóstico correcto**: el rebote de no-admin funciona bien y no dispara el copy incorrecto — [pages/admin.tsx:227](pages/admin.tsx#L227) muestra login form inline con heading "Acceso restringido" (cero redirect, cero flag `expired`). El bug real es distinto: **cualquier guest deslogueado que entre directo a una ruta protegida recibe `?reason=expired`**, y el copy afirma que "tu sesión expiró" cuando la persona nunca tuvo una para expirar. Misma familia del patrón "sala de espera / pantalla afirma causa no verificada" que llevamos toda la semana desarmando (CLAUDE.md → "Una pantalla de estado no debe afirmar una causa que no verificó").

  **Superficies involucradas** (a validar en el sprint del fix):
  - Handler `SIGNED_OUT` de [contexts/UserContext.tsx:328-333](contexts/UserContext.tsx#L328-L333) dispara `?reason=expired` en protected paths — correcto cuando la sesión efectivamente existió y se cerró; **incorrecto cuando el guest nunca tuvo sesión y aterriza directo**.
  - [components/Shared/RoleGuard.tsx:20-23](components/Shared/RoleGuard.tsx#L20-L23) cuando `!isAuthenticated` hace `router.replace("/login")` sin flag — este path también termina mostrando el copy incorrecto si algún caller (o el mismo UserContext concurrente) inyectó `?reason=expired` antes.
  - Banner en [pages/login.tsx:167-171](pages/login.tsx#L167-L171) que renderiza el copy solo cuando `router.query.reason === 'expired'`.

  **Fix propuesto** (~30-45 min, más chico que la propuesta anterior porque no requiere separar 2 flags nuevos — solo distinguir "hubo sesión que se cerró" vs "nunca hubo sesión"):
  1. Extender UserContext L328-333 para NO agregar `?reason=expired` cuando la sesión previa era null desde el mount (guest puro que aterrizó directo). Solo dispararlo cuando hubo un `user` poblado que se cerró.
  2. RoleGuard: agregar rama explícita para caso "sin sesión previa" que redirija a `/login?redirect=...` sin `?reason`, así el banner de login pasa al context banner de `redirect` ("Ingresa para continuar donde estabas" o el mapeado por path — ya existe la lógica en `getRedirectMessage`).
  3. Copy actual "Tu sesión expiró..." queda intacto para los 5 sitios de submit que sí capturan expiración genuina.

  **Hallazgo menor del mismo flow (PO 2026-08-27)** — en la pantalla inline "Acceso restringido" de [pages/admin.tsx:227](pages/admin.tsx#L227), el header sigue mostrando la sesión activa (nombre + avatar del usuario logueado) mientras el card pide correo y contraseña de nuevo. Confuso, no bloqueante. Fix candidato: ocultar el Header o mostrar copy que reconozca la sesión activa ("Estás logueado como X pero no tienes acceso a esta sección"). Piggyback natural del sprint que arregle el copy principal, o standalone ~15 min.

  **Restricción**: dejado en BACKLOG por instrucción explícita del PO durante el sprint (`admin-visibilidad`, "Si separar los dos casos NO es un cambio trivial de string y toca lógica de routing/guards, PARÁ y avisame antes de tocar nada — en ese caso va al backlog y aplicamos sin este punto"). Sprint chico dedicado. Prioridad media — el copy es misleading pero no bloquea a usuarios reales; el smoke de seguridad quedó verde y cerrado (petmatecl+el1@gmail.com rebota correctamente sin fuga de datos, admin `acanocts@gmail.com` entra sin problema, gate discrimina por rol).

- **[abierto — detectado durante smokes staging admin-visibilidad 2026-08-27]** **Scroll no vuelve al tope al cambiar de pestaña en `/admin`** — hallazgo del PO durante smokes del sprint. Al alternar entre tabs del panel admin (Métricas / Proveedores / Feedback / etc.), el scroll queda en la posición donde estaba en el tab anterior en vez de subir al tope del contenido del tab nuevo. UX: fricción moderada cuando el tab anterior tenía scroll largo (ej. lista completa de proveedores) y el nuevo tab tiene contenido corto (ej. header + primera fila). Fix: `useEffect` con dependencia `[activeTab]` que haga `window.scrollTo(0, 0)` o scroll a la cabecera del content-area en cada cambio. Cero migración BD, ~10 min de código + smoke visual. Prioridad baja — no bloquea funcionalidad, es solo pulido. Sprint chico o incluido como sub-item del próximo touch al panel.

- **[abierto — PRIORIDAD ALTA, preferencia PO explícita 2026-08-27]** **Vista unificada de personas en /admin (proveedores + tutores en un solo lugar con filtro por rol)** — pedido del PO **2026-08-27** durante el sprint `admin-visibilidad`. Contexto: hoy el panel `/admin` solo lista proveedores (`ProveedorManagementList` como tab, más `pages/admin/proveedores.tsx` que es fork). Los **6 tutores registrados** no tienen ninguna superficie de visibilidad — el PO no sabe quiénes son, cuándo llegaron, ni si confirmaron su correo. Preferencia de diseño **explícita**: **una sola vista de personas con filtro por rol**, no dos listas separadas. Los campos comunes son casi todos (nombre, correo, comuna, fecha registro, estado de confirmación); lo específico por rol es poco (proveedor → count de servicios, tutor → count de mascotas + count de solicitudes). Dos vistas obligan a mirar en dos lados para responder preguntas naturales tipo "¿quién llegó esta semana?" o "¿cuántas cuentas dormidas tengo en total?".

  **Extensibilidad del RPC nuevo** (evaluación auditor 2026-08-27, respuesta directa al pedido del PO): el `admin_listar_proveedores()` que aterrizó en este sprint **NO se puede extender trivialmente a tutores** — retorna `RETURNS TABLE(...)` con columnas específicas del perfil proveedor (rut, verificacion_estado, es_placeholder, es_ejemplo, n_servicios, n_servicios_activos, etc.) que no aplican a tutores. Extender con más columnas nullables mezclaría dos entidades diferentes en un mismo shape → deuda de tipos y confusión en el caller.

  **Camino recomendado** (más limpio y barato en el largo plazo):
  1. **RPC nuevo `admin_listar_personas()`** con shape unión pequeña de campos comunes (id, nombre, apellido_p, email_auth, email_confirmado, comuna, created_at, roles[], last_sign_in_at) + `tipo_perfil enum('proveedor','tutor','ambos','solo_auth')`.
  2. **Dos RPCs secundarios para el detalle específico**: reusar `admin_listar_proveedores()` cuando el PO filtra "solo proveedores" o abre el detail drawer de uno; agregar `admin_detalle_tutor(tutor_id)` para el drawer de tutor (mascotas + solicitudes). Los detalles caros no se cargan en la lista principal → renderiza rápido incluso con 200+ personas.
  3. **UI**: reemplaza el tab "Proveedores" por tab "Personas". Filtro dropdown con opciones "Todos / Proveedores / Tutores / Solo cuenta auth (sin perfil)". Row click abre drawer contextual (proveedor o tutor).

  **Costo estimado**: sprint propio **~4-6 horas** (RPC nuevo + segundo RPC detalle tutor + refactor de tab + drawer contextual). El sprint no es barato pero es menor que "mantener dos listas separadas + rehacer email/badge/copiar en la lista de tutores desde cero cuando aparezca".

  **Contexto de valor**: **primer proveedor real orgánico llegó hoy** (Juan Bou, ver item propio abajo). En breve va a haber tutores orgánicos también — la vista unificada es prerequisito para operar sanamente al escalar. No urgente hoy con 6 tutores, urgente en el momento que sean 60. Ventana natural post-launch, antes del primer sprint de campañas de activación.

- **[abierto — PRIORIDAD BAJA, note-only 2026-08-27]** **Paginación en `FeedbackList` cuando supere ~50 filas** — deuda anotada durante el sprint `admin-visibilidad`. Hoy cero filas de feedback en prod; el componente renderiza toda la lista con orden `created_at DESC`. Umbral operativo para agregar paginación server-side (`.range(from, to)` de supabase-js): **~50 filas visibles simultáneas**. Debajo de eso, filtro + scroll basta. Encima de eso, el DOM se pone lento en cell renders + el scroll a los envíos viejos se vuelve fricción. Cuando el volumen suba, agregar botones "Cargar más" o paginación por páginas de 25. Cero cambio de RLS, cero cambio de RPC (no hay RPC, es query directa). Sprint chico ~1 hora cuando corresponda.

- **[abierto — deuda de arquitectura light 2026-08-27]** **Dos listas de proveedores en rutas distintas del admin** — detectado durante el sprint `admin-visibilidad`. Hoy conviven:
  - **`components/Admin/ProveedorManagementList.tsx`** ← montado desde [pages/admin.tsx:12,376](pages/admin.tsx#L12) como tab del panel principal `/admin?tab=proveedores`. Columnas: Proveedor / Contacto / Servicios / Estado / Acciones. **Esta es la lista canónica** — el PO la usa al hacer clic "Proveedores" en la sidebar de `/admin`. El sprint `admin-visibilidad` modificó ESTA (email real + badge confirmado + copiar).
  - **`pages/admin/proveedores.tsx`** ← página independiente en ruta `/admin/proveedores`. Componente `GestionProveedores` inline (652 líneas). Columnas: Proveedor / Ubicación / Registro / Estado / Acciones. **Distinta** — comparte lógica del componente anterior pero es fork, con features levemente distintas (modales inline, filtro placeholder incluido, sin tab de count).
  - **Deuda**: cualquier fix (agregar email confirmado, badge, comuna nueva) hay que hacerlo 2 veces si se quiere consistencia. El sprint `admin-visibilidad` NO tocó `pages/admin/proveedores.tsx` — quedó desfasado con la vista canónica.
  - **Fix propuesto**: redirect 308 permanente de `/admin/proveedores` → `/admin?tab=proveedores` + eliminar `pages/admin/proveedores.tsx` (652 líneas menos). Verificar que no hay links internos apuntando a la ruta (grep `href="/admin/proveedores"` retorna 0 matches actualmente si no me equivoco — verificar antes del sprint). Prioridad media, sprint chico ~30 min + smoke. **Se resuelve solo si se aterriza también** el pedido de vista unificada de personas arriba — ese sprint ya toca el mismo componente y puede consolidar todo.

- **[abierto — DATO DE VALOR, cero acción, 2026-08-27]** **Primer proveedor real orgánico**: **Juan Bou** completó signup en prod el **2026-08-27 a las 15:18** (sin campaña previa, llegada orgánica), confirmó correo **17 segundos después**, aprobado automático (sprint badge-f1). Todavía no publica ningún servicio. **Primera evidencia empírica** de la ruta signup → confirmación → aprobación funcionando para un tercero real (no proveedor ejemplo, no cuenta de test del equipo). Anotado como referencia para futuro flow de "monitoreo de proveedores nuevos que no publican" — Juan es candidato natural. **Sin urgencia hoy**; cuando el PO decida arrancar campañas de activación o el flow de recuperación de dormidos (H4), incluir a Juan como monitored en el primer batch.

- **[patrón reconocido, anotado en CLAUDE.md pendiente 2026-08-27]** **"Infraestructura sin superficie" — anti-patrón recurrente en el proyecto**. Aterrizado durante el sprint `admin-visibilidad` (P2 feedback admin) pero confirmado como patrón que apareció múltiples veces esta semana:
  - **`feedback_submissions`** — tabla completa desde 20260508: schema + RLS con `feedback_submissions_select_admin USING (is_admin())` + `feedback_submissions_update_admin` + trigger updated_at. **Cero superficie UI que la lea** hasta este sprint. La policy dice "es para el admin" pero el admin no tenía dónde ver los feedback. Aldo tenía que ir a Supabase Studio a hacer SELECT manual.
  - Patrones equivalentes de la semana: `email_publico` como columna opcional que nadie llena porque no está en el signup obligatorio (P1 del mismo sprint), `direcciones` como tabla FK usuario pero sin superficie que la consuma en el flow tutor, `notas_admin` de proveedores sin control de edición en el panel, etc.
  - **Lección operativa**: cuando se diseña una tabla + RLS + trigger con intención admin, agendar en el mismo sprint (o el inmediato siguiente) la superficie UI que la consume. Sin superficie, la infraestructura es un compromiso de mantenimiento sin retorno de valor — la deuda queda invisible hasta que aparece una necesidad ("necesito ver los feedbacks") y descubrimos que faltó lo último.
  - **Regla candidata para CLAUDE.md**: cualquier `migrations/*.sql` que cree tabla + policy admin-only debe acompañarse (mismo commit o siguiente sprint documentado) con el componente/tab admin que la lee. Si el sprint aterriza infra pero pospone la UI, dejarlo **explícito en el commit** ("infra + policies aterrizados; UI de consumo pendiente sprint X") para no perder la deuda. Este patrón vale sumarlo a los corolarios P8 como 12ª instancia — no es exactamente P8 (output/efecto), es la variante "compromiso silente sin efecto". Pendiente decisión del PO de si vale la regla formal o solo memoria operativa.

- **[abierto — PRIORIDAD BAJA, nota de diseño 2026-08-27]** **Servicios existentes con `descripcion` < 100 caracteres quedan bloqueados para edición** — nota post-fix 3 del sprint panel-prov-fixes. Contexto: FIX 3 de panel-prov-fixes (`ab82c86`) agregó el guard `if (descripcion.trim().length < 100) return toast.error(...)` en `handleSubmit` de `ServiceFormModal.tsx:625` para forzar descripciones útiles en servicios nuevos. Efecto colateral: cualquier servicio ya publicado con descripción corta (< 100 chars) queda bloqueado en el modal de edición hasta que el proveedor amplíe la descripción — no puede guardar cambios en OTROS campos (fotos, precios, disponibilidad) sin primero cumplir el mínimo. Hoy afecta a **1 sólo caso conocido en prod**: servicio "Cuidado tu mascota" del auditor/Aldo (descripción de 19 chars, inactivo desde marzo — cero impacto operativo). **Riesgos futuros**: (a) si en algún momento se importan servicios legacy vía migration o CSV con descripciones cortas, todos quedan bloqueados para edición hasta ampliar; (b) si el mínimo se cambia a futuro (500 chars, etc.), la deuda se repite. **Fix posible cuando lo justifique el volumen**: aplicar el guard SOLO en creación (no en edición), o aplicar en edición con un modo "sólo puedes editar otros campos si aceptas ampliar la descripción en próximo guardado" (más complejo). Sin implementar todavía — anotar como consideración para migrations/imports futuros.

## Producto (features nuevas)

### Retratos de Mascotas — CERRADA EN PROD
- Categoría "Retratos de Mascotas" (slug `retratos`, ícono Lucide `Palette`) publicada en prod.
- Entrada en `lib/camposPorCategoria.ts` con campos de encargo (tecnica, plazo_entrega, formatos, desde_foto, modalidad_entrega, portfolio_url, inclusiones artísticas). CHECK constraint de `unidad_precio` ampliado con `'por obra'`. Demo servicio colgado del proveedor Patricia.
- Consumo actualizado: SearchBar, SidebarFiltros (icono), register wizard, [categoria] getStaticPaths (SEO `/retratos`).

### Fichas de mascotas del tutor — IMPLEMENTADA (parcial)
- El tutor crea perfiles de sus mascotas (nombre, especie, raza, edad, tamaño, condiciones) y los adjunta a solicitudes de servicio.
- Objetivo: apropiación (engagement del tutor) + comunicación (el proveedor tiene contexto sin preguntar).
- ✅ **Hecho**:
  - Selector opcional de mascota en `SolicitarAgendamientoModal` (Forma B: asocia `mascota_id` real, fallback a texto libre cuando el tutor no tiene ficha o eligió "Otra").
  - Persistencia del `mascota_id` en `agendamientos` (migration `20260707_agendamientos_mascota.sql` — agrega `mascota_id` FK a `mascotas` + `tipo_mascota_texto` fallback, ambos NULLABLE).
  - Ficha completa visible al proveedor en su panel de solicitudes (`/proveedor` tab Solicitudes), con join a `mascotas` (nombre, tipo, raza, sexo, edad calculada, foto, condiciones médicas, trato especial).
  - Cero regresión en solicitudes sin ficha (retrocompat total: si `mascota_id` y `tipo_mascota_texto` son null, la tarjeta no se renderiza).
  - **CRUD de mascotas en panel tutor — CERRADO** (verificado 2026-08-18): `pages/usuario/mascotas/index.tsx` implementa list + create + edit + delete + upload foto (`foto_mascota` en formulario líneas 550, 566, 675). El estado previo "hoy es placeholder que va a 404" era obsoleto.
- ⏳ **Pendiente**:
  - Referencia compacta de la mascota en el chat — **bloqueada**: las conversaciones no se vinculan a agendamientos, así que no se puede inferir con certeza cuál mascota corresponde a un hilo (ver proyecto "Vincular conversaciones a agendamientos" abajo).
  - Decisión pendiente: ficha obligatoria u opcional al solicitar servicio (hoy es opcional).
  - **Procesamiento de imagen al subir foto de mascota**:
    - (a) **Cropper interactivo** estilo LinkedIn / Instagram al subir foto principal (y opcionalmente cada foto de galería). `react-easy-crop` o similar — el usuario ajusta el encuadre al marco (aspect fijo `4/5`) antes de que la imagen llegue al bucket. Hoy el crop lo hace CSS con `object-cover object-center` — funciona para most cases pero si el sujeto no está centrado en la foto original queda mal encuadrado.
    - (b) **Compresión client-side pre-upload**: hoy las fotos suben sin compresión hasta el cap de 5 MB. Resize a ~1600px lado mayor + calidad JPEG ~80% via canvas API antes de llamar a `subirFotoAStorage` reduce transferencia + storage sin pérdida visible. Bibliotecas candidatas: `browser-image-compression` (~14 kB) o inline con `<canvas>`.
    - Ambos aplican a foto principal y galería de mascotas. Extender también al patrón vivo de upload de fotos de proveedores (`avatars` y `servicios-fotos`) es el mismo esfuerzo — si se hace, ideal extraerlo a un helper compartido.

### Categoría: Etología
- Etólogo / especialista en conducta animal, distinta de adiestramiento.
- Mismo camino de categoría nueva (`camposPorCategoria.ts` + tabla + ícono + demo).
- Decisión pendiente: cómo diferenciarla de adiestramiento.

### Catálogo de categorías futuras (roadmap producto)
Orden por prioridad estimada; cada una entra por el mismo camino (`camposPorCategoria.ts` + INSERT en `categorias_servicio` + ícono + demo + opcionalmente flag de modalidad).
1. **Asesoría veterinaria online** — PRIORITARIA. Consulta remota por video/chat, sin desplazamiento. Habilitada por el proyecto "categorías por modalidad" (remota pura).
2. **Nutrición animal** — planes alimenticios personalizados. Puede ser presencial o remota (mixta).
3. **Fisioterapia veterinaria** — rehabilitación motora, generalmente presencial.
4. **Hotel felino** — hospedaje especializado en gatos, presencial (recinto).
5. **Visitas de medicación** — administración de tratamientos a domicilio, presencial.
6. **Entrenamiento deportivo** — agility, canicross, deportes caninos, presencial.
7. **Servicios funerarios** — cremación, entierro, memoriales para mascotas. Presencial o mixto según proveedor.

## Proyectos estructurales

### Categorías por modalidad (presencial / remoto / mixto)
- Descubierto en el sprint de Retratos: la ficha + wizard asumen presencialidad (comunas de cobertura obligatorias, disponibilidad horaria, "fotos del espacio"). Retratos es asincrónico y remoto → varias secciones no aplicaban. Fix mínimo interino: ocultar secciones sin contenido (aplicado). Fix estructural: modelar modalidad.
- **Diseño esbozado**:
  - Flag `modalidad_default: 'presencial' | 'remoto' | 'mixto'` a nivel categoría en `lib/camposPorCategoria.ts` (record hermano de `CAMPOS_POR_CATEGORIA`).
  - Categorías **mixtas** (ej. peluquería que ofrece local + domicilio, nutrición presencial + online): refinamiento per-servicio en `servicios_publicados` (columna `modalidad_efectiva` o similar). El proveedor elige al publicar; overrides el default de la categoría solo dentro del rango permitido.
  - Categorías **presenciales puras** (paseos, hotel felino): sin override, wizard pide comunas/disponibilidad como hoy.
  - Categorías **remotas puras** (retratos, asesoría veterinaria online, ilustración digital): sin comunas obligatorias, sin disponibilidad horaria en wizard, ficha oculta secciones de cobertura y "fotos del espacio", CTA de agendamiento cambia de fecha+hora a "solicitar encargo" (sin V1 puntual).
  - **Habilita categorías remotas futuras** — bloqueante para asesoría veterinaria online, nutrición remota, cualquier servicio de consulta digital.
- **Fricción concreta que resuelve** (documentada al descubrir Retratos):
  - Wizard: `comunas_cobertura` es required (`if (comunasCobertura.length === 0) return toast.error(...)`) — bloquea publicar servicio remoto.
  - Wizard: sección "Disponibilidad" semanal L-D con 7 switches + 14 inputs — ruido visual para servicios asincrónicos.
  - Ficha: "Zona de cobertura", "Disponibilidad", "Fotos del espacio" son genéricas, sin condicional por categoría (el fix interino solo oculta cuando la data está vacía, no cuando la categoría no aplica).
- **Alternativa considerada** (descartada por deuda a mediano plazo): Set explícito `CATEGORIAS_ASINCRONICAS` paralelo a `CATEGORIAS_MULTI_DIA`. Simple pero no modela categorías mixtas. Bien como stepping stone si urge — migrar Set → record es mecánico.

### Modo request-to-book en la agenda (F1.5+ candidato, condicional)
- **Solo implementar si proveedores reales lo piden — no especulativo.** Hoy los servicios F1 tienen dos modos: (a) sin agenda (`duracion_slot_min` NULL, flujo viejo pedir-fecha-a-ciegas), (b) instant-book (agenda activa, la reserva nace `confirmada` desde el picker). Faltaría un tercer modo intermedio estilo Airbnb: el tutor VE los slots reales de la agenda pero la reserva nace `pendiente` y requiere aprobación del proveedor. Da control total al proveedor sin perder visibilidad de horarios reales.
- **Requeriría**:
  - Tercer valor del toggle en el editor: `off / agenda-con-aprobación / agenda-automática`. Nueva columna `modo_reserva text` en `servicios_publicados` (o boolean `requiere_aprobacion`) — el toggle actual es solo `duracion_slot_min IS NULL/NOT NULL`.
  - Picker del tutor: mismo strip días + grid slots, pero al elegir slot el INSERT nace `estado='pendiente'` con `duracion_min` y `capacidad_snapshot` poblados. Copy: "Solicitar reserva" en vez de "Confirmar reserva". Toast: "Solicitud enviada. El proveedor responde en X horas".
  - **Decisión de producto pendiente — ¿hold del slot?** Dos alternativas:
    - **Hold optimista** (más simple): el slot NO se retiene mientras espera; otros tutores pueden solicitarlo o reservarlo mientras la primera está `pendiente`. Si el proveedor confirma dos simultáneas, hay conflicto — el EXCLUDE constraint las rechaza al confirmar (una gana). Rechazo natural, pero UX rota para la que pierde.
    - **Hold pesimista** (más complejo): el slot se retiene mientras la solicitud está `pendiente` (durante N horas), otros tutores lo ven ocupado. Necesita ampliar el `WHERE` del EXCLUDE constraint (o segundo EXCLUDE con `estado='pendiente'`) y una expiración automática del hold via cron si el proveedor no responde. Más justo para el tutor pero agrega complejidad de expiración.
- **Coexistencia con instant-book**: el mismo proveedor podría tener servicios con distinto modo (paseo grupal instant-book, sesión de peluquería con aprobación). Un servicio se compromete a un solo modo — no mezclar en la misma reserva.
- **Notificaciones**: reusar `notify-proveedor` con nuevo branching (subject "Nueva solicitud con horario elegido"), y `notify-tutor` al confirmar/rechazar. Emails ya diferencian estado — extensión menor.
- **Trigger para implementar**: dos o más proveedores lo piden explícitamente (no una impresión general), o Aldo detecta que la fricción del instant-book está frenando adopción del sistema de agenda.

### Roadmap producto (Doctoralia-style)
Camino largo hacia una experiencia tipo Doctoralia (o Booksy, Wag!). Secuencia sugerida por dependencias:
1. **Reseñas automáticas post-servicio** — email + push al tutor N horas/días después del agendamiento marcado como completado. Boost del social proof + señal para el ranking.
2. **Agenda con disponibilidad real** — construcción propia (no Calendly/Google embed). El proveedor bloquea rangos, la disponibilidad publicada refleja slots reales. Bloquea el hardcode actual de disponibilidad JSONB.
3. **Recordatorios** — 24h + 1h antes del servicio, al tutor y al proveedor. Push + email + SMS opcional. Reduce no-shows. **Status 2026-08-04**: la mitad "24h antes" está EN PROD desde 2026-07-30 (tren Recordatorios, `/api/cron/recordatorio-reserva`). La mitad "1h antes" está en item propio abajo (habilitada por upgrade a Vercel Pro).

#### Recordatorio "1h antes del servicio" (habilitado por Vercel Pro)
- **Estado**: candidato para implementar; **no ejecutar aún** — el tren "24h antes" está bajo monitor 48h en prod (Fase 5), pagar deuda tras el cierre y una vez validado el patrón operativo.
- **Contexto**: la mejora estaba en el roadmap original (punto 3 de esta sección, "24h + 1h antes") pero se **descartó al implementar el tren Recordatorios** por la restricción Hobby de un cron por día. El upgrade a Pro (2026-08-04, ver CLAUDE.md sección "Plan Vercel") habilita cron horario + refino aritmético en JS — patrón viable ahora.
- **Diseño esbozado**:
  - Cron nuevo `/api/cron/recordatorio-1h-antes` schedulado `0 * * * *` (cada hora en punto) o `*/30 * * * *` (cada 30 min si necesitamos margen ante ~4-minute drift en Pro).
  - Filter raw: `estado='confirmada' AND fecha_preferida BETWEEN now()+30min AND now()+90min` (más ancho que la ventana para tolerar drift).
  - Refino JS por `familia`: F1 y legacy F2 puntual → dispara si `fecha_preferida` cae en la hora siguiente; F2 rango → dispara si `fecha_preferida` (check-in) cae en la hora siguiente (no el `fecha_fin`).
  - Marcas nuevas en `agendamientos`: `recordatorio_1h_tutor_enviado_at` + `recordatorio_1h_proveedor_enviado_at` — migration pequeña aditiva, mismo patrón que R1.
  - Template `Recordatorio1hAntesEmail.tsx` — copy más breve que el de 24h ("Tu servicio empieza en menos de 1 hora"), quizás sin bloque "Dónde" (ya lo saben).
- **Trigger para arrancar**: (a) Fase 5 Recordatorios cerrada limpia + tag emitido, (b) al menos 1 semana de prod sin issues del cron de 24h, (c) señal explícita de PO / o un usuario reportando "olvidé el servicio de esta tarde".
4. **Pagos** — Transbank Webpay para tarjetas locales, opcional Stripe para internacional. Habilita comisión de plataforma. Cambia la propuesta de valor (hoy "directorio" → mañana "marketplace").
5. **Video-consulta** — habilita categorías remotas puras (asesoría veterinaria online, nutrición remota). Depende de "categorías por modalidad" para modelar el servicio como remoto.

### Vincular conversaciones a agendamientos

### Hero rotativo del home
- El hero de `pages/index.tsx` es estático (un mensaje + un CTA + una imagen). Rotar mensajes/CTAs para probar variantes de copy, destacar categorías nuevas (retratos, futuras) o promociones estacionales.
- Camino corto: componente `HeroRotator` con array de slides + auto-rotate cada N segundos + indicadores dot navegables. Sin dependencias externas.
- Camino largo: variantes A/B con tracking en `contactos` o tabla nueva para medir CTR por copy.

### Vincular conversaciones a agendamientos
- Hoy las conversaciones del chat son genéricas (tutor↔proveedor), sin atarse a una solicitud puntual. Eso bloquea mostrar la mascota correcta en el chat (un tutor con varias solicitudes → no se sabe cuál mascota va en el hilo).
- Cambio: agregar `agendamiento_id` a la tabla `conversations`.
- Habilita: chip de mascota en el chat (cierra la feature de mascotas) + modelo de chat más rico (poder mostrar contexto del agendamiento en el header del hilo).
- Decisiones pendientes:
  - **Modelo**: ¿un hilo por agendamiento (múltiples chats entre el mismo par tutor↔proveedor si hay varias solicitudes), o una conversación con "agendamiento activo" (un hilo persistente por par, el `agendamiento_id` apunta al más reciente)?
  - **Migración de datos**: las conversaciones existentes en prod → ¿quedan huérfanas (`agendamiento_id = null`), se migran por heurística (el agendamiento más reciente del mismo par tutor+servicio), o se archivan?
- Es un proyecto con schema + migración de datos + refactor del flujo de creación de conversation en `ServiceDetailView`, NO un ajuste menor.

### Sprint ANALYTICS-1 — taxonomía GA aprobada (launch-readiness, post-desfile)

**Estado 2026-08-18 — CERRADO EN PROD, verificado por auditoría**: los 11 eventos aprobados están instrumentados. Grep con `trackEvent(` retorna las 11 llamadas cubriendo `registro_proveedor_iniciado`/`_completado` (`pages/register.tsx`), `verificacion_enviada` (`pages/proveedor/index.tsx`), `servicio_publicado` + `agenda_activada` (`ServiceFormModal.tsx`), `busqueda_realizada` (`SearchBar.tsx`), `ficha_vista` (`pages/servicio/[id].tsx`), `contacto_iniciado` (`ServiceDetailView.tsx`), `reserva_confirmada` con branches F1/F2 (`SolicitarAgendamientoModal.tsx`), `solicitud_enviada` (idem), `resena_publicada` (`pages/admin/evaluaciones.tsx`). El gate por entorno (`IS_PROD`) también aterrizó en `lib/gtag.ts`. Key events marcados en dashboard GA4. El estado previo "Listo para ejecutar" era obsoleto. **Brief histórico** (para trazabilidad de decisiones):

**Alcance**: ~medio día de implementación.

**PREREQUISITO EXPLÍCITO — orden en el sprint**:
1. **Primero**: aterrizar el **gate GA por entorno** (ítem E del ADDENDUM del reporte diagnóstico — 15 min). Sin ese gate, instrumentar eventos sobre data contaminada (previews + suites Playwright disparando al ID prod) no sirve — inflaría métricas antes de siquiera empezar.
2. **Después**: helper único de tracking + llamadas a los eventos + guía a Aldo para marcar los 4 key events en el dashboard GA4.

**Taxonomía aprobada** (snake_case español, decisión PO):

**Funnel Oferta (proveedor)**:
| Evento | Trigger |
|---|---|
| `registro_proveedor_iniciado` | Click en "Publica gratis" / "Soy proveedor" (CTAs del hero + cards) |
| `registro_proveedor_completado` | ✅ **KEY EVENT** — Success del POST `/api/auth/signup` con rol=proveedor |
| `verificacion_enviada` | Upload de foto carnet frontal+dorso + submit |
| `servicio_publicado` | ✅ **KEY EVENT** — INSERT success sobre `servicios_publicados` |
| `agenda_activada` | Toggle F1 (`duracion_slot_min IS NOT NULL`) o F2 (`capacidad_estadia IS NOT NULL`) guardado |

**Funnel Demanda (tutor)**:
| Evento | Params |
|---|---|
| `busqueda_realizada` | `{categoria, comuna}` |
| `ficha_vista` | `{servicio_id, categoria}` |
| `contacto_iniciado` | ✅ **KEY EVENT** — `{canal: 'chat' \| 'whatsapp' \| 'telefono'}` |
| `reserva_confirmada` | ✅ **KEY EVENT** — `{familia: 'F1' \| 'F2' \| 'legacy'}` |
| `solicitud_enviada` | (flujo viejo pendiente-pending) |
| `resena_publicada` | (post-servicio, evaluaciones.estado='aprobado') |

**4 Key Events (conversiones GA4 — Aldo los marca en dashboard)**:
1. `registro_proveedor_completado`
2. `servicio_publicado`
3. `contacto_iniciado`
4. `reserva_confirmada`

**Métrica norte**: **"conexiones semanales" = `contacto_iniciado` + `reserva_confirmada`** — indicador combinado del valor de mercado que Pawnecta genera. Los 2 lados del funnel demanda que efectivamente concretan interacción.

**Implementación esperada**:
- **Helper único de tracking** en `lib/gtag.ts` (extender el `event()` existente): wrappers tipados por evento del funnel, gate por entorno IS_PROD ya integrado desde el fix del prerequisito, cero-op en preview/staging.
- **Llamadas en puntos de UI/flujo correspondientes**:
  - `registro_proveedor_iniciado`: click handlers de CTAs hero + cards del home.
  - `registro_proveedor_completado`: post-success del POST `/api/auth/signup` (con `rol=proveedor`).
  - `verificacion_enviada`: submit del wizard de verificación en `pages/proveedor/index.tsx`.
  - `servicio_publicado`: post-INSERT de `ServiceFormModal` (nuevo, no edición).
  - `agenda_activada`: toggle F1/F2 guardado en `ServiceFormModal` (semáforos canónicos).
  - `busqueda_realizada`: submit de `SearchBar` (hero) + apply de `SidebarFiltros`.
  - `ficha_vista`: gSSp exitoso de `/servicio/[id]` (via `useEffect` en la page).
  - `contacto_iniciado`: hooks al POST `/api/contactos/track` (ya existe el endpoint — se agrega evento en cada canal).
  - `reserva_confirmada`: post-INSERT de `SolicitarAgendamientoModal` cuando `estado=confirmada` (F1/F2 picker).
  - `solicitud_enviada`: post-INSERT cuando `estado=pendiente` (flujo viejo).
  - `resena_publicada`: post-approval en `pages/admin/evaluaciones.tsx`, o post-INSERT si simplificamos.
- **Marcado de key events en GA4**: guía escrita a Aldo (5 pasos en el dashboard, sin código): GA4 → Admin → Events → seleccionar evento → Mark as key event.
- **Convención de naming**: `snake_case` en español (ya arriba). Consistencia con la convención declarada por PO.

**Estimación**: helper + gate + 11 llamadas + guía = ~medio día.

**Trigger de ejecución**: post-desfile (`producto-1 → zonab-1 → producto-2` mergeadas + Fase 8 monitor N15 cerrada) y priorizado en el triage de la Auditoría #2 junto al bundle SEO (307/410).

**Pre-condición no-negociable**: fix del gate GA (ítem E del reporte diagnóstico) va PRIMERO en el mismo sprint. Nada de instrumentar eventos antes.

### Sprint SENTRY-1 — error tracking (batch pre-launch, ~1-2h)

**Estado 2026-08-18 — CERRADO EN PROD** con 4 iteraciones (SENTRY-1 inicial + sentry-csp + sentry-flush + instrumentation.ts). Ver `CLAUDE.md > Estado del roadmap` y `ACTA_SENTRY_1.md`. Tags prod `sentry-1-prod-20260811` + `sentry-csp-prod-20260811` + `sentry-flush-prod-20260811`. Gate `VERCEL_ENV==='production'` activo, `beforeSend` scrub PII operativo, `flushSentryEvents()` helper en `lib/sentryServer.ts`. **Brief histórico** (para trazabilidad):

**Alcance**:
- **Setup**: `npx @sentry/wizard -i nextjs` sobre rama propia (`sentry-1` o similar).
- **Gate A PRODUCCIÓN Únicamente** — patrón de la casa (misma lección del hallazgo GA 2026-08-04: staging + suites Playwright no contaminan el tracking prod):
  - `environment: process.env.VERCEL_ENV` — tag distintivo por ambiente.
  - `enabled: process.env.VERCEL_ENV === 'production'` — cero eventos desde preview/staging/dev.
  - Sample rates conservadores (`tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0` — capturar solo errores, no toda la sesión).
- **2 env vars a Vercel** (ritual P4 obligatorio — verificar timestamp Updated + redeploy explícito post-cambio):
  - `NEXT_PUBLIC_SENTRY_DSN` (público, expone en client bundle — DSN no es secreto).
  - `SENTRY_AUTH_TOKEN` (Sensitive scope Production, para upload de sourcemaps durante build).
- **Verificar wrapper de `next.config.js`**: el `withSentryConfig` no debe colisionar con el `withPWA` del tren N3 (fork `@ducanh2912/next-pwa@10.2.9`). Orden de wrappers: `withSentryConfig(withPWA(nextConfig))` es el patrón esperado — verificar en el fixture generado por el wizard y ajustar si el orden fuera inverso.
- **Aldo crea la cuenta**: `sentry.io` free tier "Developer" (5k errors/mes) → project Next.js → aporta el DSN al ritual P4.

**Trigger de ejecución**: post-Auditoría #2 del jueves 06-ago, junto a `Sprint ANALYTICS-1` en el batch pre-lanzamiento. Ambos comparten patrón "gate por entorno" (spirit-of-IS_PROD) y ambos se benefician de estar aterrizados antes del primer día de marketing real.

**Impacto en el catálogo de plugins**: la entry "Sentry" del radar de plugins (sección más abajo) cambia su gatillo — antes "decisión post-F2", ahora "instalar cuando SENTRY-1 esté en prod" (para que Claude pueda consultar issues de Sentry directamente desde el plugin cuando aparezcan). Ver actualización en Radar de plugins.

**Deuda light**: post-lanzamiento evaluar bump a tier Team ($26/mes, 50k errors/mes) si el free se satura — Sentry alerta automáticamente al llegar a límite.

### Sprint EMAIL-CONTACTO-1 — canal de soporte visible al usuario (batch pre-launch, ≤1h)

**Estado 2026-08-18 — CERRADO EN PROD** (verificado por auditoría). El pedido del PO en PDPO también dice "cerrado 2026-08-11" — este sprint es su implementación. `contacto@pawnecta.com` operativo vía Zoho sobre DNS GoDaddy. Aparece en `pages/faq.tsx`, `pages/privacidad.tsx` (2 lugares), `pages/terminos.tsx` (2 lugares). Ver `REPORTE_EMAIL_CONTACTO.md § 8`. **Brief histórico**:

**Alcance**:

- **(a) Diagnóstico (~10-15 min)** cuando haya hueco post-desfile:
  - `grep -rn "contacto@" pages/ components/ lib/` — todas las apariciones en código, footer, headers.
  - `grep -rn "mailto:" pages/ components/` — todos los `mailto:` visibles (link footer, FAQ, legales).
  - `grep -rn "@pawnecta.com" pages/ components/ lib/emails/` — auditoría global de emails visibles al usuario (footer, FAQ, T&C, templates transaccionales, headers de Resend).
  - Reporte: qué dirección ve hoy el usuario en cada superficie + estado real del email (existe/no existe/quién lo lee).

- **(b) Fix pre-launch (~30-45 min)**:
  1. **Crear `contacto@pawnecta.com` como forward/alias a `petmatecl@gmail.com`**. Vías gratis:
     - Registrar del dominio (si soporta email forwarding — depende del provider actual del dominio).
     - **Cloudflare Email Routing** (gratis, requiere cambiar DNS a Cloudflare nameservers si no está ya). Setup ~10 min.
     - Alternativa: Google Workspace ($6/mes por casilla real) — descartar por defecto, evaluar solo si el volumen del día 1 lo justifica.
  2. **Actualizar superficies donde corresponda** (post-diagnóstico (a)):
     - Footer (link "Contacto").
     - FAQ / Ayuda / Términos / Privacidad.
     - Templates de email transaccional (headers "responder a").
  3. **Registrar `hola@pawnecta.com` en la ecuación**: es el remitente que hoy usan los emails transaccionales (Resend). **Los usuarios RESPONDEN a esos emails** — verificar que ese `reply-to` NO caiga al vacío. Opciones:
     - Configurar `hola@pawnecta.com` también como forward → `petmatecl@gmail.com`.
     - O redirigir todos los `reply-to` de transaccionales a `contacto@pawnecta.com` (patrón más limpio: un solo canal público).

**Prioridad**: **alta para día 1** — un usuario con problema y sin canal es un usuario perdido.

**Slot**: batch pre-launch (junto a ANALYTICS-1 + SENTRY-1 + phase-out ejemplos).

**Esfuerzo total estimado**: ≤ 1h (diagnóstico + config Cloudflare + updates de copy).

### Sprint PERF-1 — optimizaciones performance (candidato, gatillo PO)

**Origen**: baseline registrado en `REPORTE_PERFORMANCE_BASELINE.md` (2026-08-07, post-Fase E). 12 mediciones Chrome DevTools + Lighthouse contra `www.pawnecta.com` SHA `917e4eb`. 9 hallazgos H1-H9 identificados; Cold Start Prevention Pro verificado empíricamente (~1184ms LCP diferencia cold vs warm en ficha).

**Referencia canónica**: `REPORTE_PERFORMANCE_BASELINE.md` (secciones 2, 3, 4). La baseline queda para comparar cualquier optimización futura — mismo test suite → si mejora, se ve numéricamente.

**Gatillo de ejecución**: **PO decide** (post-launch o pre-launch si Aldo lo prioriza; los buckets están priorizados por impacto/esfuerzo abajo para elegir por rebanadas).

**Buckets priorizados** (ordenados por impacto/esfuerzo):

**Bucket A — impacto directo LCP ficha (~1h, quick win)**:
- **H1** (orange) — `pages/servicio/[id].tsx`: agregar `<Head><link rel="preload" as="image" href={fotos[0]}/></Head>` con la primera foto del servicio. **Estimated saving ~1-2s** en LCP cold de la ficha (borderline hoy a 2420ms desktop).
- Preconnect a Supabase Storage: `<link rel="preconnect" href="https://vubmjguwzpesxcgenkxo.supabase.co">` en `_document.tsx`. Ahorra ~200-300ms del handshake TCP+TLS de la primera request a Supabase por sesión.

**Bucket B — Agentic Browsing mobile (~2h)**:
- **H3** (yellow) — mobile `/explorar` + ficha bajan a AB=50 (desktop 100). Auditar `MobileActionSheet` + drawer de filtros mobile + sticky action bar de fichas: aria-labels completos + verificar que no haya duplicación de targets entre desktop y mobile (mismo botón visible en ambos con IDs distintos confunde al scraper AI). No blocker de UX humano, sí SEO/AI-friendliness.

**Bucket C — image optimization (~30 min)**:
- **H5** (yellow) — home desktop wasted image bytes 835 KB. Auditar uso de `next/image` en home + cards de `/explorar`: confirmar `sizes` prop por breakpoint + verificar que hero + cards usen el componente `<Image />` (no `<img>` directo). Vercel image opt ya provee AVIF/WebP por default.

**Bucket D — monitoring en real users (post-launch, ~15 min setup)**:
- Instalar Vercel Analytics (Speed Insights) — gratis en Pro, mide Core Web Vitals con real users vs esta baseline (Chrome DevTools MCP en máquina de dev). Comparación baseline vs real revelará si mobile users con 4G/3G están en el "verde" (<2.5s LCP) o necesitan más optimización agresiva. Alternativa: Sentry perf tracing (ya en radar SENTRY-1) cubre lo mismo si se activa post-instalación.

**Hallazgos verdes/notas (H2/H4/H6/H7/H8/H9)**: NO requieren acción — están en verde o son observaciones informativas. H2 en particular (Cold Start Prevention Pro observable) es la métrica para el user story del PO en la conversación de velocidad ("con Pro, primera visita a ficha ~2× más rápido — de ~2.4s cold a ~1.2s warm").

**Slot recomendado**: **post-launch** por default (baseline ya es sana; H1 borderline es el único caso de "posible frustración user"). Si PO decide pre-launch, arrancar por Bucket A (~1h, quick win, alto ROI).

**Estado post-Fase E2 (2026-08-07)**: **PERF-1 CERRADO — Buckets A + C en producción** (`main = 6ecd2b3`). Ver `ACTA_SPRINT_PERF-1.md` sección 10 con tabla comparativa canónica prod-vs-prod. Buckets B (mobile Agentic Browsing) + D (Vercel Speed Insights monitoring) siguen candidatos, gatillo PO.

### ~~Sprint PERF-2 — micro-candidato CLS ficha~~ · **CERRADO 2026-08-11 `7c8859b` (`remate-1-prod-20260811`) — verificado 2026-08-18**

Aterrizado en batch REMATE-1 (`7c8859b feat(remate-1): R1 CLS width/height + R2a middleware bots 404 + R2b rename mis-reservas`). `components/Servicio/ServiceDetailView.tsx:727-728` tiene `width={1200} height={800}` en el hero `<img>` con comentario inline explícito "Sprint PERF-2 Ítem R1 (2026-08-11) — width/height intrínsecos para reservar aspect ratio ANTES del image decode". Verificación 2026-08-18 durante Tanda 6 (13ª instancia de estado obsoleto en BACKLOG). Detalle histórico:

### Sprint PERF-2 — micro-candidato CLS ficha (~5 min, gatillo PO)

**Origen**: en las mediciones post-Fase E2 del Sprint PERF-1 (2026-08-07), la ficha desktop mostró CLS `0.00 → 0.01-0.02` (leve, verde — umbral good ≤0.10). El resto de páginas preservó CLS 0.00 ✅.

**Causa probable**: el preload + `fetchpriority="high"` del hero de ficha (Bucket A del PERF-1) acelera la descarga de la image, y las **intrinsic dimensions** de la image se aplican en un frame diferente al container. Cuando el image decode termina, hay un shift mínimo si el container reserva height por CSS pero no comunica aspect ratio al browser desde el HTML.

**Fix propuesto**: agregar `width` y `height` attributes al `<img>` del hero en `components/Servicio/ServiceDetailView.tsx:682`:

```tsx
<img
    src={service.fotos?.[fotoActiva] || proveedor.foto_perfil || coverImage}
    alt={...}
    width={800}   // aspect ratio de la galería típica (ver dimensiones reales que uses)
    height={600}  // (ratio ~4:3 aprox; ajustar al que renderea con object-cover)
    className="w-full h-full object-cover ..."
    ...
/>
```

El browser usa `width/height` para calcular aspect ratio ANTES del decode → reserva el espacio correcto desde el HTML → cero shift. Combinado con `object-cover` del CSS, el visual no cambia (el image sigue llenando el container).

**Verificación**: re-correr las 12 mediciones perf post-fix → esperado CLS ficha desktop `0.02 → 0.00`.

**Esfuerzo**: ~5 min código + ~10 min verificación = **~15 min total**.

**Slot recomendado**: siguiente vez que se toque la ficha por otro motivo, o cuando el PO gatille un mini-sweep de "afinado de CLS". No urgente (verde ≤ 0.10).

### Lanzamiento — decisiones operativas

#### Phase-out de servicios "Ejemplo" (decisión PO 2026-08-04)

**Decisión**: los servicios marcados `es_ejemplo=true` (proveedores demo — hoy Aldo/staging tienen algunos) se **quedan como vitrina en el lanzamiento**, marcados visualmente "Ejemplo" como hoy. Retiro **gradual, no en batch pre-launch**.

**Criterio operable de retiro**: cuando una **categoría** alcance **≥2 proveedores reales activos** (`activo=true AND es_ejemplo=false` en `proveedores` con al menos 1 servicio `activo=true` en `servicios_publicados` de esa categoría), se **desactivan los servicios Ejemplo de ESA categoría** vía admin (`/admin/servicios` toggle `activo`). **Sin código nuevo** — el mecanismo actual del admin cubre el flow.

**Query de dimensionamiento** (Aldo corre en prod cuando quiera):

```sql
-- Categorías con ≥2 proveedores reales activos (candidatas a phase-out ejemplos)
WITH proveedores_reales_por_categoria AS (
    SELECT
        c.slug AS categoria_slug,
        c.nombre AS categoria_nombre,
        COUNT(DISTINCT s.proveedor_id) FILTER (
            WHERE p.es_ejemplo = false AND p.estado = 'aprobado'
        ) AS proveedores_reales
    FROM categorias_servicio c
    LEFT JOIN servicios_publicados s
        ON s.categoria_id = c.id AND s.activo = true
    LEFT JOIN proveedores p ON p.id = s.proveedor_id
    GROUP BY c.slug, c.nombre
)
SELECT categoria_slug, categoria_nombre, proveedores_reales,
       CASE WHEN proveedores_reales >= 2 THEN 'READY_PHASE_OUT'
            ELSE 'MANTENER_EJEMPLOS'
       END AS accion
FROM proveedores_reales_por_categoria
ORDER BY proveedores_reales DESC, categoria_slug;
```

**Revisión del criterio**: mensual, o cuando Aldo lo gatille explícitamente (ej. una categoría específica satura con reales rápido y quiere adelantar el retiro).

**Nota operativa**: los servicios Ejemplo tienen ID estable — al desactivarlos NO se borran (retención del histórico) → si un ejemplo era el único servicio de una categoría rara, el sitemap deja de emitirlo (filtro `activo=true` ya presente) sin necesidad de tocar código.

**Impacto SEO**: cero — el fix del bundle SEO de Auditoría #2 (307→404/410) cubre igual el caso de un ejemplo desactivado que un crawler encontró indexado.

## Deuda técnica / pulido

**⚠️ Actualización 2026-08-18 — Barrido deuda técnica ejecutado (6 tandas)**: ver [ACTA_BARRIDO_DEUDA.md](ACTA_BARRIDO_DEUDA.md) para el consolidado. Ítems de abajo cerrados por el barrido (referencia técnica preservada por trazabilidad; estado real vive en el ACTA):
- `10 templates React.FC` — CERRADO (verificado grep 2026-08-18 = cero React.FC como tipo; los "otros 6" nunca tuvieron el problema, TS infiere `JSX.Element` sin declaración explícita).
- `Instrumentar recordatorio-reserva ligero` — CERRADO en ZB4-b previo; `?verbose=1` deferido explícito (defer con criterio, ver ACTA).
- `Unificar cron/resolvers` — CERRADO en Tanda 5 T5-1 (`f3ae657`).
- `estadoDerivado.ts:96 falsy-zero` — CERRADO en Tanda 2 (`97084fc`) + test unit.
- `Endurecer images.remotePatterns` — CERRADO en Tanda 2 (defensa en profundidad, cero regresión).
- `Upload foto mascota` — CERRADO (verificado prod — CRUD completo en `pages/usuario/mascotas/index.tsx:550,566,675`, aterrizó pre-2026-08-18).
- `Watchdog cross-tab F2` — CERRADO en Tanda 3 (extendido a F1 + F2 + legacy submits).
- `Higiene pickers F1+F2` — CERRADO en Tanda 3 (3 sub-items: AbortController + skeleton overlay + isDiaDisabledEst).
- `Nitpicks picker F2` — CERRADO en Tanda 3 (2 sub-items restantes: skeleton loading + chileMidnightUtc TZ).
- `Descartes F2-3-D (8 restantes)` — CERRADO en Tanda 4 (7 nitpicks aterrizados, 2 previamente cerrados verificados).
- `Revisar frecuencias crons Pro` — CERRADO en Tanda 5 T5-3 (informativo — verificado 6 crons diarios, ninguno pide bump, cero cambio de código).
- `Migrar endpoints API a wrapApiHandlerWithSentry` — piloto en `recordatorio-reserva` (Tanda 5 T5-4 `859ce9a`). Los otros 31 endpoints anotados como candidatos si aparece caso concreto (26/32 usan try/catch como diseño — masivo generaría flood).

- **[abierto, opcional — disparador explícito] Cambiar `authLimiter` a `slidingWindow` si se necesita precisión "60s reales desde la primera falla"** — sprint A4 (2026-08-14). El limiter actual usa `Ratelimit.fixedWindow(5, "60 s")`, que alinea al minuto absoluto del reloj UNIX (line 1181 del source SDK: `reset = (bucket + 1) * windowDuration`). Consecuencia: la ventana efectiva puede ser tan corta como 1s en el peor caso — un usuario que se banea a las 12:34:59.5 puede reintentar 0.5s después a las 12:35:00.0. Para `authLimiter=5/60s` en signup, el "peor caso" habilita ~10 intentos consecutivos en 2 segundos si el timing es afortunado (5 al final del minuto + 5 al inicio del siguiente). Detectado durante smoke A4 con `Retry-After: 5` y `Retry-After: 4` observados en las requests #6 y #7 — comportamiento correcto del algoritmo, no bug. **Disparador para el cambio**: si algún día aparece un patrón de abuso donde attacker/bot explota el clock-aligned boundary (evidencia en Sentry / dashboard Upstash / picos anómalos), migrar a `Ratelimit.slidingWindow(5, "60 s")`. Costo: 2× comandos Upstash por check (script Lua consulta bucket actual + bucket previo). Con free tier 500k comandos/mes, sigue siendo holgura amplia. Sprint chico (~10 min: cambiar 3 líneas en `lib/rateLimit.ts` + smoke con `curl` en preview + validar `Retry-After` >= 55s). No implementar preventivo — solo cuando aparezca la señal.

- **[abierto, deuda tooling PRIORIDAD BAJA — supuesto no verificado A4] Sentry.flush() en el path missing-credentials del rate limiter** — sprint A4 (2026-08-14). `lib/rateLimit.ts:getRedis()` emite `Sentry.captureMessage()` cuando faltan las credenciales Upstash en VERCEL_ENV=production|preview, pero SIN `await Sentry.flush()` en el punto de captura. El argumento es "el próximo endpoint que llame `flushSentryEvents()` drena la cola compartida del proceso". Ese supuesto **asume que la cola sobrevive entre invocaciones del mismo contenedor** en Vercel Fluid Compute — el mismo supuesto que nos costó una iteración completa en R3 SENTRY-1 (P8 falla B: ingest async buffered, sin flush el envelope se pierde al terminar el proceso). En Fluid Compute las instancias se reusan durante warmth, así que en la práctica la cola puede o no sobrevivir dependiendo de si otro handler llega antes del shutdown. Observación del PO al cerrar A4: "No lo cambies ahora, pero anótalo como supuesto no verificado". **Verificación pendiente**: (i) rotar el token Upstash del scope Preview a valor inválido para forzar el path missing-credentials, (ii) hit 1 request al preview → verificar que aparece 1 evento en Sentry con tag `reason:missing-credentials`, (iii) esperar cold-start (~30 min sin tráfico), hit otra request → verificar que el segundo evento también aparece (retry post cold-start es la red de seguridad diseñada). Si NO aparecen → aplicar `await flushSentryEvents(500)` en el captureMessage aunque agregue ~50ms al primer request del contenedor con config rota. Path raro (config error operacional que solo dispara cuando alguien rompe env vars); mitigación diseñada existe vía retry en cold-start; deuda de validación sin urgencia hasta post-launch.

- **[abierto, post-lanzamiento cuando aparezca la señal] Rate limit resistente a rotación de IP (captcha / Vercel BotID)** — anotado 2026-08-14 al cerrar sprint A4 rate limit con Upstash. El limiter actual (Upstash Redis, `authLimiter=5/60s`, `emailLimiter=3/60s`, `apiLimiter=30/60s`) es por IP + por endpoint. Un attacker que rota IP (VPN pool, botnet, proxies residenciales) sortea trivialmente. **Formulación PO al cerrar A4**: con tráfico pagado, el riesgo real no es un atacante sofisticado, es un bot barato de scraping o registro masivo, y esos casi nunca rotan IP. A4 es suficiente por ahora. **Ruta cuando aparezca la señal** (spike de signups sospechosos + patrón de IPs residuales similares o mismas huellas de user-agent + evidencia en Sentry / GA4 / dashboard Upstash): agregar segunda capa — (i) captcha invisible tipo Cloudflare Turnstile en el submit de `/register` (el vector más costoso); o (ii) **Vercel BotID** que ya está en plan Pro nuestro (GA desde junio 2025, integración nativa Next 15). BotID es preferible porque no requiere UI extra ni fricción legítima. Estimación: 30 min integración BotID en middleware.ts + gate por rutas sensibles. Sprint chico. Trigger para arrancar: primer patrón de abuso real detectado, NO preventivo. Si nunca aparece la señal, no se implementa.

- **[abierto — DISPARADOR LEGAL diciembre 2026] Flow eliminación cuenta tutor (Ley 21.719 Chile)** — anotado 2026-08-14 durante sprint FKs habilitantes al decidir `agendamientos.tutor_id ON DELETE RESTRICT`. La Ley 21.719 de Protección de Datos Personales entra en vigencia **diciembre 2026** e incorpora derecho de supresión — Pawnecta va a estar operando para entonces. Con RESTRICT actual, un tutor que solicite eliminar su cuenta NO puede hacerlo si tiene reservas históricas.
  - **Ruta correcta cuando se construya el flow** (NO cambiar RESTRICT por CASCADE — borrar cuenta destruiría el historial del proveedor + evidencia de facturación):
    - **Alternativa (a) — Anonimización in-place**: mantener la fila `usuarios_buscadores` con datos personales removidos (`nombre='(usuario eliminado)'`, `email=''`, `rut=NULL`). El `tutor_id` sigue apuntando pero sin PII. Sin cambios de FK constraints ni schema.
    - **Alternativa (b) — Migrar a SET NULL con snapshot**: al INSERT del agendamiento, congelar el nombre del tutor como `tutor_nombre_snapshot text` en la fila del agendamiento. FK `tutor_id` pasa a nullable + SET NULL. Cambio de schema adicional pero decouple total. Preserva UX del proveedor (ve nombre del tutor histórico) sin depender de la fila `usuarios_buscadores`.
  - **Alcance mínimo del sprint**: UI de "eliminar cuenta" en `/usuario`, endpoint API que ejecuta la anonimización (a) o el snapshot (b), template email confirmación, período de gracia opcional 30 días con reversión posible. Estimación gruesa: **~1 semana** (schema + endpoint + UI + testing legal).
  - **Trigger para arrancar**: (i) fecha límite 2026-12-01 (30 días de gracia antes de la vigencia), o (ii) primer usuario solicitando eliminación (por email a `contacto@pawnecta.com`), o (iii) recomendación explícita de asesor legal. Cualquiera venga primero.

- **~~[SEVERIDAD ALTA — sistémico BD] Foreign keys ausentes en TODAS las tablas~~ — CANCELADO 2026-08-14 (era FALSO)**: el hallazgo original se apoyó en una query MCP a `information_schema.table_constraints` que retornó cero filas. Verificado post-mortem: el rol `supabase_read_only_user` del MCP tiene SELECT + BYPASSRLS pero **NO REFERENCES privilege**, y `information_schema.table_constraints` filtra por privileges del rol consultante (comportamiento documentado PostgreSQL 34.29). Query paralela via `pg_constraint` (catálogo de sistema sin filter de permisos) muestra **41 FKs en el schema public** (verificado por PO con `SELECT COUNT(*)` desde SQL Editor + verificación auditor con `pg_constraint`). La base SIEMPRE tuvo integridad referencial. Consecuencias del hallazgo falso: (a) C1 diagnóstico de 400 ConversionMetrics apuntaba a "FKs missing", causa real era FK mismatch en embed `!sitter_id(proveedores)` que apunta a `auth.users`, no `proveedores` — fix cliente-side funciona pero por razón distinta; (b) migration `20260814_fks_habilitantes.sql` fue NO-OP completo (las 10 FKs preexistían con esos nombres exactos); (c) el único trabajo real pendiente es la correctiva `20260814b` que cambia 3 CASCADE preexistentes → RESTRICT (deuda legítima independiente de este hallazgo).

- **[abierto, deuda latente] 10 templates de email usan `React.FC` que en React 19 types devuelve `ReactNode | Promise<ReactNode>`** — funcionan **por accidente** en el `react:` de `resend.emails.send`. Detectado 2026-08-14 en Ola 1 A3: `NuevoProveedorPendienteEmail` con `React.FC` reventó el build. Fix aplicado a ESE template solamente: cambiar signature a `(props): React.ReactElement`. Los otros 10 templates (`AgendamientoCancelacionTutorEmail`, `AgendamientoProveedorEmail`, `AgendamientoTutorEmail`, `AprobacionProveedorEmail`, `InvitacionResenaEmail`, `NewEvaluationEmail`, `NewMessageEmail`, `RechazoProveedorEmail`, `RecordatorioReservaEmail`, `ReservaConfirmadaTutorEmail`, `WelcomeEmail`) siguen usando `React.FC`. Latentes al mismo bug — cualquier bump menor de `@types/react`, `@react-email/*` o `resend` puede romper el build sin cambios en nuestro código. **Fix mecánico**: sweep de find-and-replace `React.FC<Readonly<...>> = (...) =>` → `(...): React.ReactElement =>` en los 11 archivos. ~30 min + render-diff no-regresión. Sprint chico post-launch.

- **[abierto, deuda tooling PRIORIDAD BAJA] DebugView de GA4 no muestra eventos custom aunque lleguen** — hallazgo 2026-08-14 durante sprint `ga4-revert`. Reports → Realtime → "Número de eventos por Nombre del evento" muestra correctamente 5 hits de `registro_proveedor_iniciado` + los 3 tests manuales (`test_con_bypass`, `test_manual_v2`, `test_no_sw`) llegando y siendo procesados. **DebugView del mismo period NO los muestra** — solo `page_view` y `user_engagement` automáticos del enhanced measurement. Los eventos SÍ llegan a GA4 con status 204 en `/g/collect`. Es una divergencia entre DebugView (tooling real-time para debug) y Realtime/Reports (superficie del producto). Sin bloqueo funcional — Realtime + Reports funcionan perfecto para medición de campañas, key events marcados. Deuda tooling con prioridad baja: si post-launch aparece necesidad frecuente de ver events custom en real-time durante debug, investigar si es filtro DebugView por device, config del data stream, o comportamiento default de GA4 para custom events (algunas versiones requieren `debug_mode: true` explícito en cada evento para aparecer en DebugView). Fix estimado: 30 min investigación + posible 5 min config. NO bloquea nada porque Realtime cubre el mismo caso de uso con 30s de delay adicional.

- **[abierto, deuda light] Helper `git-commit-verify` que valide `git status --short` post-commit contra lista esperada** — durante sprint sentry-init (2026-08-11) un `git add pathspec-inexistente` post-`git mv` emitió `fatal:` pero NO retornó exit no-cero al shell script; el `git commit` siguió con solo lo detectado en index pre-fallo, creando un commit parcial invisible (1 archivo, 0 insertions, 0 deletions — solo el rename). Detectado por `git status --short` post-commit + segundo commit reparador. Es el mismo patrón de bug que P8 codifica: "la interfaz reportó éxito, el efecto no ocurrió". Fix propuesto: pequeño helper bash/node que tome una lista de rutas esperadas + verifique con `git diff --cached --name-only` que están todas + falle loud si no. Alternativamente: adoptar `git commit -a` como default en flows donde no hay staging selectivo, con precheck de `git status`. Post-launch, sin urgencia — es dev tooling, no runtime.

- **[abierto, condicionado] Migrar endpoints API a `wrapApiHandlerWithSentry()` de v10 automático** — sprint sentry-flush (2026-08-11) instaló `lib/sentryServer.ts:flushSentryEvents()` como helper compartido para drenar la cola antes de `res.json()`. Hoy solo hay 1 caller server-side (`pages/api/admin/sentry-smoke.ts`) — el helper queda listo para el próximo. Alternativa más robusta: usar el wrapper oficial `wrapApiHandlerWithSentry(handler, routePattern)` de `@sentry/nextjs` que auto-flushea + agrega parametrized route + captura throws no manejados del handler. **Condición explícita del PO 2026-08-11 para arrancar este ítem**: primero verificar end-to-end que el helper actual funciona en prod (evento con tag `smoke=true` aparece en dashboard Sentry <30s tras el fetch del PO en consola). Si el efecto observable se confirma, este ítem se prioriza para aplicar el wrapper a todos los endpoints como middleware Next 15. Si NO se confirma, primero se investiga por qué el helper no drena y ese hallazgo redefine el alcance del wrapper.

- **[cerrado 2026-07-30 `42c151e` — verificado 2026-08-18] Copy de emails de confirmación de reserva por horas — retrofit visual COMPLETO** (pedido de PO 2026-07-28). **Aterrizado en commit `42c151e feat(recordatorios): R7 retrofit templates confirmacion/cancelacion + diagnostico drift`**. Verificado durante tanda 1 deuda emails (2026-08-18): los 4 templates de reserva (`ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail`, `AgendamientoProveedorEmail`, `AgendamientoCancelacionTutorEmail`) tienen la banda de fecha con paleta semántica correcta (`accent-50` para confirmación, `slate-100` para cancelación) según el mapa aprobado en la spec. `AgendamientoTutorEmail` branch pendiente NO usa banda por diseño (fecha no es protagonista cuando el estado es incierto). Estado previo "retrofit visual COMPLETO" era descriptivo, no un estado real — clarificado ahora como `[cerrado <sha>]`. 12ª instancia del meta-patrón "estado obsoleto en BACKLOG" (contando desde la auditoría del 2026-08-18 que detectó 10 + B1 previa + este). Spec original mantenida para trazabilidad de decisiones:
  1. **Formato horario**: bloque legible tipo `"de 14:00 a 15:00 · 1 hora"`. Helpers ya existentes en `lib/formatFecha.ts`: `formatBloqueHorario`, `formatBloqueHorarioSinFecha`, `formatHoraCorta`, `formatFechaSinHora`, `formatRangoNochesPartes` (probados con 66 casos verdes en `lib/formatFecha.test.ts`).
  2. **Layout de listado etiqueta/valor**: orden fijo — Proveedor (tutor) / Cliente (proveedor) · Servicio · Hora/Horario (u bloque check-in/out F2) · Dónde. Etiquetas 11px uppercase slate-500 letter-spacing 0.5px; valores 15-16px slate-900 con peso 600 en Hora y Dónde. Separadores hairline `#E2E8F0`. Sin fondo gris — card blanca. La fila "Dónde" usa la cascada canónica: `formatDireccionLinea` → primera comuna → fallback `"Se coordina por chat con {nombre}"`.
  3. **Dirección de arte (R4.2)**: card con borde IZQUIERDO 4px accent-600 + border 1px slate-200 + radius 10px. **Fecha protagonista**: fila "Fecha" sale del listado y va como banda full-width `accent-50` al tope, fecha 20px bold deep-900 centrada, sub-línea "(N noches)" 13px slate-600 para rango. **Pill "MAÑANA"** sobre la banda (accent-600 bg, blanco, 11px uppercase letter-spacing 0.12em). Todo email-safe: tablas + inline styles, sin flex/SVG/fuentes custom.

  **Mapa semántico de la banda de fecha por tipo de email (decisión PO 2026-07-28)**: la banda y su pill son parte del lenguaje visual y comunican intención, no adorno.
  - **RECORDATORIO** (`RecordatorioReservaEmail`): banda `accent-50` + pill `MAÑANA` (accent-600 bg, blanco). Urgencia positiva — "es mañana, prepárate".
  - **CONFIRMACIÓN** (`ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail` branch confirmada, `AgendamientoProveedorEmail` branch `esConfirmadaAuto`): banda `accent-50` **sin pill**. Celebración — "quedó agendada".
  - **CANCELACIÓN** (`AgendamientoCancelacionTutorEmail` + equivalente proveedor si existe): banda **neutra `slate-100`**, sin pill, fecha como dato histórico. Pintar de verde una fecha cancelada sería contradictorio con el mensaje.

  Templates afectados: `ReservaConfirmadaTutorEmail`, `AgendamientoTutorEmail` (branch `estado='confirmada'`), `AgendamientoProveedorEmail` (branch `esConfirmadaAuto`), `AgendamientoCancelacionTutorEmail`, y el equivalente proveedor si existe. `RecordatorioReservaEmail` (R4.2) es la referencia canónica del layout + tipografía + card + border-left; el mapa semántico de banda/pill se aplica por template según su tipo. Testing: render-diff no-regresión F1/F2 con `scripts/render-emails-diff.ts` (23 sets: 16 previos + 7 recordatorio). Sprint chico post-launch.
- **Instrumentar `/api/cron/recordatorio-reserva` para diagnóstico de drift de idempotencia** (observado en R6). La suite R6 originalmente ejecutaba la 2ª corrida como `real` (no dryRun) y verificaba con un ancla temporal `preRun2Ms` que ninguna marca fuera reescrita durante esa 2ª corrida. Observación consistente: la marca `recordatorio_tutor_enviado_at` del agendamiento F1 test aparece con timestamp ~200-400ms tras `preRun2Ms` — solo la del tutor, solo del F1, en ambos intentos (retry #1 también falla). Serialización cross-describe descartó race intra-suite.

  **Diagnóstico 5-min (2026-07-30)**: hipótesis principal "await faltante / res.json prematuro" **DESCARTADA** tras lectura estructural + verificación BD via MCP staging:
  1. Cada task del batch tiene `await resend.emails.send`, `await supabaseAdmin.from('notifications').insert`, `await supabaseAdmin.from('agendamientos').update({...}).eq(...)` — todos awaited en secuencia dentro del try.
  2. `await Promise.allSettled(tasks)` awaited al final de cada sub-batch (línea 400).
  3. El loop `for (let i = 0; i < elegibles.length; i += SUB_BATCH)` es secuencial — cada sub-batch se resuelve antes del siguiente.
  4. `return res.status(200).json(...)` sale tras el loop entero, no dentro.
  5. Supabase-js `.update().eq()` awaited espera respuesta HTTP de PostgREST, que retorna post-COMMIT (PostgREST usa transaction sync). No hay fire-and-forget.
  6. MCP staging: `SELECT ... FROM information_schema.triggers WHERE event_object_table='agendamientos'` = `[]` (cero triggers). Descarta trigger invisible.
  7. MCP staging: `recordatorio_tutor_enviado_at` y `recordatorio_proveedor_enviado_at` sin column_default (`NULL`). Solo cambian por UPDATE explícito.

  Todos los updates están estructuralmente correctos. El código NO tiene el bug hipotetizado. La drift observada requiere otro mecanismo.

  **Siguientes sospechosos, en orden de probabilidad**:
  1. **Lag entre `await update()` y visibilidad del COMMIT en un SELECT posterior via connection pooler distinta** — improbable en Supabase managed (PostgREST + PgBouncer transaction mode debería ser read-after-write consistent, pero podría haber cases raros).
  2. **`.or('tutor.is.null,proveedor.is.null')` de PostgREST parseando distinto de lo esperado bajo alguna condición** — improbable, sintaxis estándar.
  3. **Race que aún no visto entre el mismo endpoint call procesando la misma fila dos veces** (bug de refino) — improbable, `for (const c of candidatos)` es serial.
  4. **Timestamp del UPDATE evaluado dos veces por algún artifact de Supabase-js retry lógica** — improbable, tests no muestran retry logs.

  **Deuda de instrumentación**: agregar `?verbose=1` al endpoint que retorne `elegibles[].id`, `necesitaTutor`, `necesitaProveedor` + timestamps de cada UPDATE ejecutado. Correr contra los 3 ids test en la 2ª corrida. Si el elegibles.length > 0 con nuestros ids → confirmar mecanismo #2 o #3. Si elegibles.length = 0 pero marca sigue moviéndose → confirmar mecanismo #1. Sprint chico post-launch — no bloqueante (el core de idempotencia sí se prueba vía dryRun; la drift real solo se manifiesta con `real` en el intervalo entre corridas del test — no en producción, donde las corridas están separadas por 24h).

  **ZB4-b (2026-07-31, rama `zonab-1` commit pendiente)**: instrumentación **ligera** aterrizada en el endpoint sin esperar `?verbose=1`. Cambios:
  1. UPDATE condicional NULL en ambas marcas: `.update({...}).eq('id', ...).is('recordatorio_tutor_enviado_at', null).select('id')` — si el filter matchea 0 rows, la marca ya estaba poblada por otra ejecución concurrente (drift detectado a nivel row).
  2. Contadores `driftTutor` / `driftProveedor` incrementados por cada 0-row UPDATE detectado.
  3. Log `[cron-drift]` por evento (con `agendamientoId` + `servicioId`) y `[cron-drift-summary]` al fin del handler con conteos + timestamp. Grepable en Vercel Logs.

  Beneficio inmediato: la primera evidencia de drift en prod ahora se ve en logs sin código nuevo. El item `?verbose=1` original queda como upgrade cuando haga falta trazabilidad por-id (para diagnosticar el mecanismo si el drift real aparece).

- **[P3, refactor] Unificar `pages/api/cron/recordatorio-reserva.ts:207-266` con `lib/emails/resolvers.ts`** — hoy la lógica canónica de `resolverFechaSub` + `resolverDonde` vive DUPLICADA (inline en el cron + módulo en `lib/emails/resolvers.ts` desde ZB3 sprint ZONAB-1). Output byte-idéntico (verificado por render-diff en acta ZB3), solo forma distinta. Detectado por canónico xhigh en el smoke pre-jueves 2026-08-04 (ángulo cross-file tracer). Fix: reemplazar el bloque inline del cron por `import { resolverDonde, resolverFechaSub } from '../../lib/emails/resolvers'` + adaptar la variable `donde` para el placeholder `__CHAT_CON_OTRO__` (que el cron resuelve post-hoc con el nombre del destinatario opuesto). Refactor mecánico, sin cambio de comportamiento. Sprint chico cuando toque el cron por otra razón.

- **[P3, code smell menor] `lib/estadoDerivado.ts:96` — falsy-zero en `if (r.duracion_horas)`**. Si un legacy V4b tuviera `duracion_horas === 0` (no debería por wizard, pero no hay CHECK constraint en BD), el `if` evalúa false y cae al fallback puntual (fin = `fecha_preferida`). Semánticamente correcto (un servicio "0 horas" no tiene sentido → mismo fin que fecha), pero es code smell. Fix: `r.duracion_horas != null && r.duracion_horas > 0` para explicitar la intención. Sin bug real de runtime. Cierro con test unit adicional cubriendo `duracion_horas: 0 → estadoDerivado === 'realizada'` para lock-in del comportamiento. Detectado por canónico xhigh (ángulo language-pitfall) en smoke pre-jueves 2026-08-04.

- **[cerrado ~2026-08-07 Sweep #2 M9 — verificado 2026-08-18] Fallback "Se coordina por chat con {tutor}" en email de cancelación**. Aterrizado en Sweep #2 M9. `pages/api/agendamientos/notify-proveedor-cancel.ts` línea ~152 ahora usa `const donde = dondeResuelto ?? 'Sin dirección registrada';` con comentario inline explicando la razón (el destinatario es el TUTOR, un tutor leyendo "chat con Camila" — su propio nombre — es nonsense). Ripple (los 3 templates hermanos) sigue pendiente si aplica.

- **[P3 UX producto] Íconos específicos por campo en "Información del servicio" (`camposPorCategoria`)** — **MIGRADO a `## PEDIDOS DIRECTOS DEL PO` al tope del backlog** (2026-08-07). Es pedido explícito del PO desde 2026-07-31 con mapa direccional aprobado; asignado a Sweep #2 como PRIMER ítem antes de los 10 mediums. Detalle técnico original: los campos dinámicos del `/servicio/[id]` renderean todos con el mismo placeholder `···` — ver [components/Servicio/ServiceDetailView.tsx:1094-1103](components/Servicio/ServiceDetailView.tsx#L1094-L1103) el `renderCampoCard` con SVG genérico para no-boolean; fix es agregar `icon?: LucideIcon` a cada entrada de `lib/camposPorCategoria.ts` + consumirlo con fallback `MoreHorizontal`.

- **[P3, refactor guarda anti-prod Playwright] Migrar `assertBaseUrlIsStaging` de whitelist de hosts (`git-staging` / `staging` / `git-next15`) a deny-list de hosts prod (`pawnecta.com` / `www.pawnecta.com`)**. ✅ **CERRADO 2026-07-31 en PR0 sprint PRODUCTO-1** (rama `producto-1`, commit `4f6a6b0`). Extraída a `e2e/setup/guard.ts` con función renombrada `assertBaseUrlIsNotProd`; deny-list contra `www.pawnecta.com`, `pawnecta.com`, `pawnecta-landing-mvp.vercel.app`; whitelist de forma que acepta cualquier `*-petmatecls-projects.vercel.app`. Test unitario en `e2e/setup/guard.test.ts` (11 casos, 11/11 verde). Suite completa 41/41 verde contra preview `producto-1` sin whitelist por rama. Beneficio: cero mantenimiento por-rama para trenes futuros.

- **[P3, post-tren N15] Endurecer `images.remotePatterns` — scopear hosts Supabase a `/storage/v1/**`**. En N2 del tren N15 (2026-07-30) migramos `images.domains` → `images.remotePatterns` manteniendo paridad exacta (`pathname: '/**'`) para no romper nada. La mejora incremental es acotar `pathname` en los 2 hosts Supabase (`vubmjguwzpesxcgenkxo.supabase.co`, `pwhplhjkmmbgnphcoibh.supabase.co`) a `/storage/v1/object/public/**` (o el prefijo real que usa `getPublicUrl()`), impidiendo que el `next/image` proxy sirva rutas arbitrarias de Supabase Storage aunque un attacker las conociera. Cero impacto en runtime si el scope es correcto — verificar con smoke antes de mergear. Sprint chico post-tren N15.

- **[cerrado 2026-08-07 `a659eec` (`desfile-prod-20260807`) — verificado 2026-08-18] Errores de formulario fuera de viewport (UX)**. Ola 2 B3 aterrizó ANTES de que Ola 2 arrancara nominalmente — fix `a659eec fix(forms): errores visibles - scroll al error + mensajes junto al campo`. `pages/register.tsx` implementa `errorRef` + `scrollIntoView` en `showError()` (línea 97) + errores inline por campo (líneas 479, 515). `ServiceFormModal` línea 586 aplica el mismo patrón + `role="alert"` en múltiples campos. `pages/proveedor/index.tsx` línea 251 idem. Los 3 forms largos que menciona el pedido original tienen el patrón aterrizado. El estado "abierto" acá era obsoleto — auditoría 2026-08-18 lo detectó al arrancar B3 de Ola 2 (mismo caso que B1).
- **[cerrado 2026-08-18 Tanda 6 T6-4] ProveedorCard paridad con ServiceCard** — `<h3>` de `ProveedorCard.tsx:73` ahora tiene `min-h-[2.5em]` (paridad con `ServiceCard.tsx:141`). Reserva altura fija para 2 líneas aunque el `nombre_publico` sea corto, evitando misalignment vertical en grids mixtos. Aspect ratio de la foto NO se unifica por diseño (`aspect-square` en Proveedor vs `aspect-[4/3]` en Service — foto de perfil vs foto de servicio son diferentes). Rating overlay no aplica a ProveedorCard (los ratings son por servicio).
- **[cerrado 2026-08-18 Tanda 6 T6-3] Typography del blog — clases `prose-*` muertas borradas, plugin NO instalado**. Decisión con render real (verificado prod): (a) `@tailwindcss/typography` NUNCA estuvo instalado → cero rules `.prose` en el CSS bundle prod → las ~14 clases `prose-*` del div wrapper eran 100% no-op; (b) el contenido HTML del post viene via `dangerouslySetInnerHTML` con classNames explícitos por tag desde el backend/CMS (h3 con `text-xl font-bold text-slate-800 mt-8 mb-4`, etc.) → el plugin sería redundante incluso si se instalara. **Fix**: borrar el bloque de clases muertas, mantener solo el `dangerouslySetInnerHTML`. Sin cambio visual al usuario en prod. Evita agregar ~35KB de CSS bundle innecesario (medido contra baseline PERF-1) — coherente con la decisión de "no dejar código que finge hacer algo".
- **[deferido — deuda documentación interna, NO toca usuario] Styleguide rewrite**: `pages/styleguide.tsx` documenta el sistema viejo (emerald). Verificado 2026-08-18: `/styleguide` accesible en prod pero **cero enlaces desde el producto** (grep pages/ + components/ sin matches), **cero menciones en nav/header/footer**, **cero entradas en sitemap.xml**. Página de referencia solo para desarrollador/auditor — deuda de documentación, NO deuda que toque usuarios. Reescribir cuando la sección tenga que actualizarse por otra razón (rediseño identidad visual, onboarding de nuevo dev) — no invertir 1.5-2h en algo que nadie ve. Referencia técnica original mantenida para trazabilidad: capa marca (accent/deep) + capa estado (success/danger/warning/info).
- **UI_STANDARDS.md**: línea stale con `ring-emerald-500`, actualizar a accent/success.
- **[cerrado 2026-08-18 Tanda 6 T6-2] Token `notification` (alias de `red`) — separación semántica del rojo de error**. Aterrizado en `tailwind.config.js:143` (`notification: colors.red`). `NotificationBell.tsx:129` migrado de `bg-danger-500` a `bg-notification-500`. Cero cambio visual HOY (ambos apuntan al mismo hex red-500). Cuando aparezca criterio de diseño para separar visualmente notif de error (ej. rotar a naranja/amber), un cambio de 1 línea en `tailwind.config` alcanza sin tocar componentes. `NotificationCenter.tsx` no tenía `bg-danger` en el DOM del dot no-leído (verificado con grep) — cero migración adicional.
- **Upload de foto de mascota**: la columna `mascotas.foto_mascota` existe en el schema, y el CRUD ya muestra la foto en la card del listado + en el modal (read-only) + en la ficha rica del proveedor. Falta implementar el componente de UPLOAD desde el CRUD del tutor (input file + upload al bucket `avatars` con path `mascotas/{user_id}/{timestamp}.{ext}` + persistencia en `foto_mascota`). Patrón a reusar: [pages/proveedor/index.tsx `uploadAvatar` L560-565](pages/proveedor/index.tsx#L560-L565). `PhotoUploader` fue borrado como dead code — no rehacer, hacer inline (~25 líneas) o extraer si se agrega también upload de galería (`fotos_galeria text[]` también existe en schema, no explotada).
- **Drift de nombres de políticas RLS en tabla `mascotas` — no puramente cosmético** (re-verificado 2026-08-18 tanda 2 deuda BD): staging actual tiene 10 policies (verificado vía MCP con `pg_policies`) — 4 en español "Usuarios pueden ..." + 4 slugs `tutor_*_own_mascotas` + `proveedor_select_mascotas_de_solicitudes` + `Admins can view ALL pets`. Los 8 primeros son **duplicados semánticos** (mismos predicate `auth.uid() = user_id`) con nombres distintos — probable residuo de re-aplicar migrations en staging. **Sin impacto funcional** (los duplicates evalúan idénticamente vía OR permissive) **pero SÍ tiene costo real** (observación PO 2026-08-18): cada policy duplicada se evalúa en cada query contra la tabla — con volumen de mascotas + queries frecuentes (list, single, join desde agendamientos), el multiplicador se nota. Estimación de orden: cada SELECT sobre `mascotas` ejecuta hoy 3× las policies necesarias (originales + dos duplicados en algunos casos). No urgente para volumen actual, pero no puramente cosmético. **Prod probablemente tiene un set diferente** (verificación pendiente sin acceso MCP prod). **Decisión operativa**: unificar vía re-sync **manual** cuando toque migrar/limpiar; el drop de los 4 duplicados en español mantiene los slugs canónicos + Admins + proveedor. Query canónica para verificar prod desde SQL Editor: `SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='mascotas' ORDER BY policyname;`.
- **Columna huérfana `proveedores.datos_especificos`**: legado del modelo un-proveedor-una-categoría (pre Sprint 4 Fase 1). Los datos categoria-específicos viven ahora en `servicios_publicados.detalles` per-servicio. La columna quedó viva en el schema desde el rename `DatosEspecificosForm → ServicioDetallesForm` (commit `8d8ded8`), esperando decisión. Pendiente:
  1. Verificar que NADA la lee — grep exhaustivo del código + inventario de RPCs en Supabase (`buscar_servicios`, etc.). Si el resultado es cero lecturas, `ALTER TABLE proveedores DROP COLUMN datos_especificos`.
  2. Si hay lecturas residuales pero cero writes desde el frontend (ya se sacaron), evaluar migrar los residuos por proveedor a alguno de sus servicios (heurística: si el proveedor tiene un solo servicio, mergear el blob viejo en `servicios_publicados.detalles` sin sobrescribir keys ya presentes) o descartar los residuos si son irrelevantes.

- **Watchdog cross-tab en submit F2 (SolicitarAgendamientoModal)**: hoy el submit del picker F2 llama `supabase.auth.getSession()` como primer paso — esa llamada toma el lock cross-tab de gotrue-js. Si otra pestaña del mismo usuario está en medio de un `refreshSession()` (token por expirar), el segundo `getSession()` se queda esperando el lock sin timeout. Observado en el smoke S4 de F2-3-C: pestaña 2 colgada pre-INSERT, nunca llegó a disparar el EXCLUDE — el POST no se emitió. El EXCLUDE server sigue siendo la red final (si dos INSERTs concurrentes SÍ llegaran, uno rebota 23P01), pero la UX de la pestaña colgada es horrible: sin indicación de por qué el submit se congeló. Fix: `Promise.race` contra timeout 15s en el submit F2, mismo patrón que `ServiceFormModal:747` (post-smoke Aldo del wizard proveedor). Copy del timeout: idéntico al F1 existente ("El guardado tardó demasiado. Verifica tu conexión y vuelve a intentar."). Aplicable también al submit F1 picker (mismo flow `getSession() → INSERT`, mismo riesgo teórico aunque no observado). Cuando se pague el ítem "Higiene de pickers F1+F2" arriba, incluir ambos watchdogs.
- **Higiene de pickers F1 + F2 (SolicitarAgendamientoModal)**: paquete de 3 mejoras conjuntas a pagar cuando se toquen los pickers de nuevo (F2.5 con advisory lock o refactor de reserva).
  1. `AbortController` en refetch inline post-rebote `23P01`. Hoy el `fetch(...)` que refetche `/slots` (F1) o `/disponibilidad-noches` (F2) tras la exclusion_violation no tiene signal — puede setState en componente desmontado + race con el fetch del effect si el usuario navega meses en la ventana. Impacto real: React warning + posible sobrescritura de mapa por milésimas. F1 tampoco lo tiene (patrón consistente); se paga junto.
  2. Limpieza de map stale al reopen del modal. `reset()` preserva `pickerEstDiasMap` + `pickerEstConfig` intencionalmente (evita re-fetch entre reopens rápidos), pero el primer render post-reopen muestra el mapa de la sesión anterior por 200-500ms hasta que el fetch responde. Si otro tutor reservó entre cierre y reapertura, el usuario ve un día como libre que ya no lo está. F1 lo maneja igual (resetea `pickerSlots` implícitamente al setear `pickerDesde`); alinear ambos con skeleton mientras `loading && (mapa previo || vacío)`.
  3. Días fuera de la ventana de fetch tratados como disponibles al completar rango. `isDiaDisabledEst` y la iteración `excludeDisabled` manual retornan `false` cuando la fecha no está en `pickerEstDiasMap` (mes visible + siguiente). Un tutor que arranca rango en julio, navega a septiembre y cierra el rango allí tiene días intermedios (agosto) no gateados client-side — el server EXCLUDE los rechaza con `23P01` + copy amable ("acaba de ocuparse"), pero es engañoso porque no fue una race real, fue una validación fría. Opciones: tratar `undefined` como disabled al completar rango (fuerza al usuario a navegar a las fechas intermedias antes de seleccionar), o refetchar la ventana completa `[from, to]` antes de validar. Detectado en code-review de F2-3-C (score 70, bajo threshold, deuda consciente).
- **Nitpicks picker F2 (SolicitarAgendamientoModal, F2-3-C)**: 3 issues menores del mismo tren, a pagar cuando toque el picker.
  1. ~~Comentario dice `numberOfMonths=2` pero el render usa `1`.~~ **CERRADO por ZB2 Dim 6 (sprint ZONAB-1, commit `4dcf176`)**: `numberOfMonths` es responsive vía `matchMedia('(min-width: 640px)')` — desktop 2 meses (aprovecha el fetch prefetch), mobile 1 mes.
  2. Sin hint visual de carga al cambiar de mes. F1 muestra skeleton durante `pickerLoading`; F2 mantiene los días previos visibles (continuidad visual pero sin señal de "cargando"). Alinear con F1 o mostrar un spinner discreto.
  3. `fromDate={new Date()}` usa TZ del browser. Un tutor en TZ occidental (ej. viaje) podría ver "hoy" clickeable siendo ya "ayer" en Chile. Server lo marca `pasado` via el endpoint, pero es cosmético mejorable: usar `chileMidnightUtc(localTodayIso())`.

- **Descartes del code-review de F2-3-D (endpoint cancelar + client)**: 7 findings ≥40 pero <80 que quedan documentados. Todos ya cubiertos por defensa en profundidad (RLS post-migration + validación server autoritativa) o son nitpicks. Se pagan cuando se toque el flow de cancelación de nuevo o cuando se haga sweep de higiene de endpoints agendamientos.
  1. `pages/api/agendamientos/cancelar.ts:162` retorna `details: error.message` en 500. Supabase errors pueden incluir column names, RLS hints, constraint text — leak menor de internal detail al toast del user. Fix: dropear `details` del response, log server-only. Score 75. (Review 4)
  2. `pages/api/agendamientos/cancelar.ts:86` vs `:101` — enumeration oracle entre 404 "Reserva no encontrada" y 403 "No autorizado". Distinguibles → un caller podría probar existencia de ids ajenos. Bajo impacto real (UUIDs unguessable). Fix: unificar ambos a 404. Score 40. (Review 4)
  3. `pages/api/agendamientos/cancelar.ts:47` usa `emailLimiter` (3/60s por IP+URL) en un endpoint de mutación no-email. Bucket angosto — un household NAT'd o rage-click hitea. Fix: `apiLimiter` (30/60s) o un `mutationLimiter` nuevo. Score 55. Patrón heredado de siblings notify-* (deuda transversal). (Reviews 2, 3, 4)
  4. ~~`pages/api/agendamientos/cancelar.ts:96-100` loguea `callerUserId: userId` full sin mask~~ **CERRADO (verificado 2026-08-18)**: cancelar.ts líneas 97 y 170 usan `callerUserId: maskUid(userId)` consistentemente. Ambos logs enmascarados. Discrepancia con sibling naming (`callerId` en notify-proveedor.ts) es cosmética restante — ítem separado si valiese la pena.
  5. `pages/api/agendamientos/cancelar.ts` no tiene log "recibido" simétrico al de `notify-proveedor.ts:40-43`. Traceo peor en Vercel logs. Fix: agregar `console.log('[cancelar] recibido', { agendamientoId, callerId: userId.slice(0, 8) + '…' })` post-parse. Score 40. (Review 3)
  6. `pages/mis-solicitudes.tsx:381-387` — `puedeCancelarPorVentana` computa `Date.now()` en render y NO es reactivo al tiempo. Tab abierta a través del boundary muestra botón enabled forever; server rechaza con copy amable pero UX diverge. Fix: `useEffect` con `setInterval(60_000)` cerca del boundary, o un tick global de 1 min. Score 50. (Reviews 2, 5)
  7. `pages/mis-solicitudes.tsx` — `title` en `<button disabled>` no dispatch pointer events en Firefox y algunos Safari; el tooltip `tooltipVentanaCerrada` puede no aparecer. Fix: wrap el botón en `<span title={...}>` o usar `aria-disabled` + click-swallow. Score 60. (Review 5)
  8. `pages/mis-solicitudes.tsx:169` cierra el dialog en cualquier `!res.ok`; para 5xx (transient) el user tiene que re-localizar la row y re-abrir. Fix: cerrar solo en 4xx, dejar abierto en 5xx. Score 55. (Review 5)
  9. `pages/mis-solicitudes.tsx:532` — bloque `esConfirmadaAuto` dice "Elegiste un horario disponible" para F1 y F2. Para F2 (noches) es inconsistente con el copy F2 del dialog y del email. Fix: branch por `esReservaAgendaF2` → "Elegiste noches disponibles". Score 70. Alinear junto con el nitpick #4 del email arriba.

- **[P3, revisar frecuencias de crons habilitadas por Vercel Pro]**. Con el upgrade a Pro (2026-08-04, ver CLAUDE.md sección "Plan Vercel"), los crons pueden correr al minuto — antes limitado a 1/día por Hobby. Los crons actuales del proyecto (verificar en `vercel.json`):
    - `/api/cron/recordatorio-reserva` — diario 22:00 UTC. Frecuencia adecuada (recordatorio 24h antes). No requiere cambio.
    - `/api/cron/invitacion-resenas` — schedule actual (verificar). Con Pro, evaluar si mover a horario o cada N horas mejora tasa de respuesta.
    - Cualquier otro cron nuevo puede diseñarse desde cero para la frecuencia que el use case pide, sin restricción de plataforma.
  **Trigger para revisar**: si un use case concreto pide frecuencia > diaria (recordatorio 1h, purge cache, sync incremental). Hasta entonces, no re-tunear crons existentes que ya funcionan.
- **[P2 seguridad, diferido — trigger claro] Advisory lock para servicios con `capacidad_estadia > 1`**. Considerado en ZB4-a del sprint ZONAB-1 (2026-07-31); **bajado a sprint dedicado** porque el escenario no está en uso: staging tiene 0 servicios con `capacidad_estadia > 1` (1 con cap=1, 14 sin estadía; verificado via MCP). El schema F2-1 soporta multi-capacidad (guarderías, hospedaje simultáneo con N mascotas) pero ningún proveedor lo activó todavía. Cuando aparezca, race condition posible: dos tutores reservan la última plaza simultáneamente y ambos INSERTs pasan el pre-check `count < capacidad` porque leen el mismo snapshot. **Fix cuando toque**: `pg_advisory_xact_lock(hashtext(servicio_id::text))` al inicio de la transacción del INSERT del picker F2 (`pages/api/agendamientos/...` — o RPC dedicado). Serializa los INSERTs por servicio a nivel BD sin afectar otros servicios. **Trigger de activación**: monitor SQL `SELECT COUNT(*) FROM servicios_publicados WHERE capacidad_estadia > 1` — cuando pase de 0 → sprint dedicado con: (a) advisory lock, (b) test de carga con 2 clientes concurrentes, (c) contador de rebotes por lock timeout. Anotar deuda en el mismo sprint del primer proveedor que active capacidad > 1.

## Radar de plugins / MCPs (con gatillo definido, no instalar antes)

Herramientas que agregan valor real cuando llegue su gatillo. Instalar antes es distracción. Todos comparten la convención: cero instalación hasta que dispare la condición.

### Instalaciones aprobadas 2026-08-04 (batch de plugins de claude.com/plugins)

Reglas de uso documentadas en `CLAUDE.md` sección "MCPs con acceso a servicios (staging + Vercel)". Trigger: PO+coordinador después de detectar cuello de botella "Ready confirmado" (~30 rondas semanales) + necesidad de segundos revisores para Auditoría Integral #2.

1. **Plugin Vercel (oficial)** — resuelve el cuello de botella "Ready confirmado". Verificación de estado libre; acciones mutantes (redeploy, env vars, dominios, protection, bypass token) SIEMPRE con GO explícito del coordinador por-turno.
2. **Plugin Security Guidance (Anthropic-verified)** — segundo revisor en Auditoría #2 (jueves).
3. **Plugin Code Review (Anthropic-verified)** — segundo revisor en Auditoría #2 (jueves).
4. **Plugin Playwright (oficial)** — habilita módulo "UX Walkthrough Navegado" de Auditoría #2. Credenciales solo staging (Camila / Aldo), PROHIBIDO navegar prod loggeado.
5. **Plugin Chrome DevTools (oficial)** — complemento del walkthrough (cosecha errores consola + Network 4xx/5xx + screenshots de estados rotos).

### No instalados 2026-08-04 (razones registradas)

- **Supabase MCP oficial** — el MCP hospedado actual con disciplina read-only (documentado en CLAUDE.md) funciona. Trigger para reconsiderar: post-lanzamiento, si la superficie del oficial agrega operaciones que el actual no cubre y valen la migración. Hasta entonces, mantener el actual = menos rotación de tooling en periodo pre-lanzamiento.
- **SearchFit SEO (comunitario)** — comunitario, requiere auditoría de procedencia (autor, permisos, historial de contribuciones) antes de considerarlo. Cero urgencia dado que el bundle SEO del triage Auditoría #2 (307→410/404 + sitemap.estado + log info) se resuelve con edits directos al código, sin dependencia externa. Reconsiderar solo si el bundle se prolonga y aparecen tareas SEO recurrentes que un plugin podría automatizar.
- **Plugin `Sentry`** — **GATILLO ACTUALIZADO 2026-08-04**: instalar cuando `Sprint SENTRY-1` esté en prod (batch pre-lanzamiento, ver "Proyectos estructurales"). El plugin sirve para consultar issues de Sentry directamente desde Claude cuando aparezcan en prod — pre-instalación es distracción porque no hay data. Trigger de instalación = primer error real capturado post-`SENTRY-1`.

### Plugins con gatillo (sin instalar aún)

- **Plugin `Design`** (crítica UX + accesibilidad + UX writing) — **GATILLO**: cierre de F2-3-E. Broche de F2 ANTES del merge a prod. Auditoría objetivo: (a) accesibilidad — contraste WCAG, foco de teclado navegable en el picker de rango, labels/aria en inputs de blackouts, tab order en el modal del tutor. (b) UX crítica del flujo completo — reserva de estadía por Camila desde ficha → picker → confirmación → email → cancelación con ventana; editor de blackouts F2-2B; formularios que expusimos en F2-3-D (dialog de cancelación con copy diferenciado F1/F2). Output esperado: hallazgos priorizables, mismo formato que el code-review (score + descartes justificados).
- **Plugin `Frontend Design`** (generación de UI) — **GATILLO**: cuando se ataque alguno de los ítems visuales del backlog (`Styleguide rewrite`, bottom nav móvil si aparece, `Hero rotativo del home`). Condición de uso: domado con los tokens visuales existentes de Pawnecta (`accent` #22C55E / `deep` #134E4A + estados `success/danger/warning/info`) — no rediseña identidad, construye dentro de ella. Instrucción explícita: pasar el snapshot de `pages/styleguide.tsx` como input inicial cada vez que se lo use.
- **Stripe** — GATILLO: la pasarela elegida en el proyecto "Pagos" del roadmap Doctoralia-style resulta ser Stripe (no Transbank Webpay). Instalar recién con esa decisión.

## Sistema visual (referencia — YA COMPLETADO)

- **Rollout de color v2**: emerald → accent (marca). Completo en prod.
- **Sprint de tokens semánticos**: estados → `success` (emerald) / `danger` (red) / `warning` (amber) / `info` (blue). Completo en prod.
- **Dos capas**:
  - Marca: `accent` (#22C55E) / `deep` (#134E4A).
  - Estado: tokens semánticos.
