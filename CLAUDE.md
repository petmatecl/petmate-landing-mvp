# Pawnecta — Claude Code Context

## Estado del roadmap

- **F2 (agenda de estadías por rango de noches) — EN PROD desde 2026-07-28** (tag `f2-prod-20260728` sobre `d2bee23`). Ver [ACTA_CIERRE_F2.md](ACTA_CIERRE_F2.md).
- **Siguiente del tren Doctoralia-style**: **recordatorios de cita** (diseño en curso). Tiempos, canales y trigger pendientes de definir. Ver `BACKLOG.md > Roadmap producto (Doctoralia-style)` punto 3 para el catálogo general.

## Qué es este proyecto

Pawnecta es un directorio/catálogo de servicios para mascotas en Chile. Conecta tutores con proveedores de servicios. NO gestiona pagos, reservas ni calendarización — el contacto es directo (chat interno, WhatsApp, teléfono).

- URL producción: https://www.pawnecta.com
- GitHub: petmatecl/petmate-landing-mvp
- Deploy: Vercel (auto-deploy en push a main)
- Base de datos: Supabase (proyecto: ouezpeeiwjwawauidrqq)
- Framework: Next.js 14 con Pages Router
- Lenguaje: TypeScript
- Estilos: Tailwind CSS
- Iconos: Lucide React (NO emojis — el usuario los detesta)
- Auth: Supabase Auth
- Storage: Supabase Storage (buckets: avatars, servicios-fotos, documents)

## Roles de usuario

**Tutor (usuario)** — explora sin registro. Necesita cuenta para contactar o evaluar. Tabla: `usuarios_buscadores` (solo tiene: id, auth_user_id, nombre, email, rut, created_at).

**Proveedor** — se registra con RUT + foto carnet (frontal + dorso), revisión manual admin 24-48h. Publica servicios con precio y disponibilidad. Tabla: `proveedores` (tiene nombre_publico para display, nombre/apellido_p/apellido_m para datos legales).

**Admin** — rol en array `proveedores.roles`, verificado por `is_admin()` function. Panel en /admin con sidebar sticky.

## Tablas principales (Supabase)

- `proveedores` — perfil del proveedor (nombre, apellido_p, apellido_m, nombre_publico, rut, foto_perfil, foto_carnet, foto_carnet_dorso, bio, comuna, tipo_entidad, genero, ocupacion, fecha_nacimiento, galeria[], estado, verificacion_estado, etc.)
- `usuarios_buscadores` — perfil del tutor (nombre, email, rut). NO tiene apellido_p ni foto_perfil.
- `servicios_publicados` — servicios del proveedor (titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos[], detalles jsonb, comunas_cobertura text[], disponibilidad, activo)
- `categorias_servicio` — categorías (hospedaje, guarderia, paseos, domicilio, peluqueria, adiestramiento, veterinario, traslado)
- `evaluaciones` — reviews (servicio_id, proveedor_id, usuario_id→auth.users.id, rating, comentario, estado, respuesta_proveedor)
- `conversations` / `messages` — chat interno
- `contactos` — tracking de contactos (canal: mensaje/whatsapp/llamada/email_copiado)
- `favoritos` — servicios favoritos del usuario

## RPCs importantes

- `buscar_servicios` — búsqueda principal en /explorar. Filtra por categoría, comuna, mascota, precio, texto. Retorna proveedor_verificado y proveedor_primera_ayuda para badges.
- `registrar_proveedor` — signup de proveedor (server-side via service role key)

## Estructura de archivos clave

```
pages/
  index.tsx          — Landing/home
  explorar.tsx       — Catálogo con filtros
  login.tsx          — Login (redirige a /proveedor o /explorar según rol)
  register.tsx       — Registro wizard multi-step
  admin.tsx          — Panel admin con sidebar
  servicio/[id].tsx  — Ficha de servicio
  proveedor/index.tsx — Dashboard del proveedor
  proveedor/[id].tsx  — Perfil público del proveedor
  api/auth/signup.ts  — API de registro (rate-limited, rollback on failure)
  api/contactos/track.ts — Tracking de contactos
components/
  Explore/ServiceCard.tsx — Card de servicio (con trust badges)
  Explore/SidebarFiltros.tsx — Filtros laterales
  Proveedor/ServiceFormModal.tsx — Crear/editar servicio
  Service/ReviewList.tsx — Lista de evaluaciones
  Service/ReviewForm.tsx — Formulario de evaluación
  Shared/ConfirmDialog.tsx — Modal de confirmación estilizado (compartido admin + proveedor)
  Home/SearchBar.tsx — Buscador del hero (dropdown custom, no select nativo)
contexts/
  UserContext.tsx — Auth state global (5s timeout, anti-race condition)
lib/
  supabaseClient.ts — Cliente Supabase
  serviceMapper.ts — Mapeo RPC → ServiceResult
  comunas.ts — Lista de comunas de Chile
```

## Convenciones de código

- NO emojis en la UI — solo iconos Lucide monocromaticos
- **Español chileno en todo el copy visible al usuario** (UI, emails, toasts, dialogs, placeholders, hints, error messages): **tú (nunca vos ni voseo)**. Imperativos en tú: `elige` (no `elegí`), `describe` (no `describí`), `agrega` (no `agregá`), `contáctalo` (no `contactalo`), `puedes` (no `podés`), `tienes` (no `tenés`), `necesitas` (no `necesitás`), `crea` (no `creá`), `verifica` (no `verificá`), `recarga` (no `recargá`), `vuelve` (no `volvé`), `explora` (no `explorá`), `solicita` (no `solicitá`). Etiquetas: "Cancelada por ti" (no "por vos"). Chilenismos suaves OK, argentinismos NO. Solo aplica a strings visibles al usuario — código/variables/comentarios pueden usar cualquier registro.

  **Verificación anti-voseo (pasada de sanity)**: dos capas complementarias:
  1. **Blacklist específica** (rápida, cero falsos positivos):
     ```
     Grep pattern: \b(agregá|cambiá|elegí|verificá|recargá|activá|publicá|hablá|contá|revisá|escribí|enviá|mostrá|guardá|querés|tenés|podés|sos|hacé|dale|vení|comé|entrá|ingresá|marcá|cargá)\b
     Glob: **/*.{ts,tsx}
     ```
     Cualquier match es voseo real. Correr después de cambios grandes de copy o durante audits.
  2. **Regex genérica** (exhaustiva, requiere filtrado manual):
     ```
     Grep pattern: \b[A-Za-záéíóúñÁÉÍÓÚÑ]+(á|é|í)\b
     Glob: **/*.tsx (limitado a components/ y pages/ — donde vive el copy)
     ```
     Barrido con lista blanca a descartar mentalmente: adverbios tildados (`aquí`, `ahí`, `allá`, `así`, `además`, `jamás`, `quizá`, `aún`), nombres propios (`José`, `María`, `René`, `Andrés`), verbos 3sg/futuro/pretérito 1sg válidos en tuteo (`está`, `será`, `verá`, `podrá`, `recibirá`, `enviará`, `notificaremos`, `agradecí`), imperativo `sé` del verbo ser (`sé el primero`), interrogativas (`qué`, `cuál`), sustantivos tildados (`café`, `día`, `país`, `Miércoles`, `Sábado`, `sí`, `té`). Si algo queda tras filtrar, es candidato — verificar contexto antes de fixear.
- NO `type="url"` en inputs — usar `type="text"` (acepta www. sin https://)
- Precios siempre con separador de miles (toLocaleString('es-CL'))
- Precios siempre dicen "Desde" antes del monto
- `getProxyImageUrl()` para URLs de Supabase Storage (bypass AdBlock)
- Autonomía total: no pedir permiso para editar, commitear o pushear
- Commits incluyen `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

## Bugs conocidos / precauciones

- `usuarios_buscadores` NO tiene `apellido_p` ni `foto_perfil` — no hacer joins o inserts con esas columnas
- `evaluaciones.usuario_id` referencia `auth.users.id`, NO `usuarios_buscadores.id`
- `buscar_servicios` RPC: p_comuna debe aceptar NULL (no solo string vacío)
- El header tiene banner "EXCLUSIVO LANZAMIENTO" que agrega altura variable — no hardcodear px para sidebars
- **Admin verificación de carnet — imagen rota en prod**. [components/Admin/ProveedorApprovalList.tsx:376,384](components/Admin/ProveedorApprovalList.tsx#L376-L384) renderiza `<img src={prov.foto_carnet}>` con URLs `/storage/v1/object/public/documents/...` guardadas en BD. El bucket `documents` es **privado** (verificado por probe: el endpoint `/object/public/` retorna 400 "Bucket not found" para buckets privados, incluso con cookie de admin — el endpoint no acepta auth). El upload en [pages/proveedor/index.tsx:771-789](pages/proveedor/index.tsx#L771-L789) usa `getPublicUrl()` que genera URLs cosméticamente "públicas" pero inválidas para bucket privado. Fix post-launch: cambiar el upload a guardar el `path` (no la URL); en el render del admin, `await supabase.storage.from('documents').createSignedUrl(path, 60)`. No es un riesgo de seguridad (los carnets NO se descargan sin auth), es un bug funcional del flujo de verificación.
- **Known-flaky: `e2e/specs/f2-2b/s1-editor-visible.spec.ts` — "editor de bloqueos hints correctos y estado vacío"** (observado 2026-07-24 en la corrida de aceptación de sweep #3). Falló primer intento con timeout buscando `getByText(/Sin bloqueos.*Pucón/i)` (10s), retry verde. Probable race condition del load del ServiceFormModal al abrir el editor — el texto vive en un empty state que se renderiza tras el fetch de blackouts del servicio. Sin bloqueo pre-merge (retry consistentemente verde). **Si reaparece en la corrida de Fase 0 del checklist de merge**, investigar (candidatos: agregar `waitForLoadState` explícito antes del assert, o esperar a que el editor termine de hidratar via un anchor específico). Si NO reaparece en 3 corridas post-merge, cerrar como known-flaky histórico.

## Lo que NO hace Pawnecta — no implementar sin confirmación

- Procesamiento de pagos
- Calendarización o reservas
- Sistema de booking/transacciones
- Monetización (será post-lanzamiento: plan destacado para proveedores)

## PWA / Service Worker

La app usa `next-pwa` (config en `next.config.js`). Resumen de la estrategia de cacheo y cache-busting — relevante porque sin entenderlo, "deploys que parecen no haber landed" se vuelven recurrentes.

**SW activo SOLO en prod real.** El gate en `next.config.js` es `IS_PROD = NEXT_PUBLIC_APP_ENV === 'production' || VERCEL_ENV === 'production'` (mismo patrón que `lib/cronGuard.ts` y `lib/resend.ts`). Consecuencias por entorno:

| Entorno | `VERCEL_ENV` | SW en el bundle | `sw.js` que se sirve |
|---|---|---|---|
| Dev local (`npm run dev`) | — | disabled | no existe |
| Vercel preview / staging | `preview` | disabled | **demoledor** (ver abajo) |
| Vercel prod (branch `main`) | `production` | enabled | workbox real |
| Build local sin `VERCEL_ENV` | — | disabled | demoledor |

Motivo del gate: en staging Aldo tenía que hard-refresh para ver cada deploy (el SW cacheado servía la versión anterior aunque `/sw.js` estuviera Cache-Control:no-cache — porque el browser NO re-chequea `/sw.js` en navegaciones SPA). Para prod real el trade-off vale (users con push notifications, offline fallback), en staging es solo fricción.

**Testear PWA localmente**: `NEXT_PUBLIC_APP_ENV=production npm run build && npm run start` — fuerza `IS_PROD=true`, next-pwa genera workbox real, se puede probar push flow y demás sin merge a prod.

### Demoledor de SW residuales (staging/preview)

Cuando `IS_PROD` es false, `next-pwa` no emite `sw.js` — pero cualquier browser que YA tenía el SW registrado de un deploy anterior sigue con él vivo, sirviendo precache stale. Sin intervención, algunos browsers retienen el SW indefinidamente.

Solución: `scripts/write-sw-demolisher.js` corre como hook `prebuild` (`package.json > scripts.prebuild`). En builds no-prod escribe un `public/sw.js` mínimo auto-destructivo:
- `install`: `skipWaiting()`.
- `activate`: purga TODOS los caches, `self.registration.unregister()`, y navega cada tab abierta (`client.navigate(client.url)`) — refresca la tab una vez, luego bootea sin SW ni cache runtime.
- `fetch`: no-op, todo va a network.

Idempotente. En prod build, el script hace early-return sin tocar nada — `next-pwa` genera el sw.js real durante `next build`, que sobreescribe cualquier archivo previo. También purga `workbox-*.js` / `worker-*.js` / `fallback-*.js` residuales del `public/` en el mismo script.

**Fenómeno de desregistración**: el `/sw.js` sigue con `Cache-Control: max-age=0, must-revalidate`, así que el browser re-fetchea rápido cuando hay chance. Al recibir el demoledor lo instala, `activate` corre, purga, unregister, navega tab → limpio para siempre. Aldo debería sentirlo en el primer deploy post-fix: al abrir staging tras el deploy, la tab se refresca sola, y de ahí en más cada push a staging se ve al instante via router.push sin hard-refresh.

### Configuración de PWA en prod (referencia)

**Activación del SW nuevo**: `skipWaiting: true` + `clientsClaim: true` (default de next-pwa).

**Runtime caching** (defaults de next-pwa 5.6):
- **NetworkFirst** para HTML/navigations y `/api/*` no-auth (10s timeout).
- **StaleWhileRevalidate** para JS chunks, CSS, imágenes, `_next/data/*.json`, `_next/image`.
- **CacheFirst** para fonts (`gstatic`, audio, video).
- `cleanupOutdatedCaches()` al activar.

**Cache-busting del SW en prod**: `/sw.js` y `/workbox-:hash` con `Cache-Control: public, max-age=0, must-revalidate` (header explícito en `next.config.js:headers`). Sin esto, Vercel CDN puede cachear el SW largo y el browser nunca re-fetchearía aunque deployemos.

**Limitación conocida (prod)**: el browser re-revisa `sw.js` en navigation events (~24h o cuando vuelve a foco). SPA client-side routing (Link, router.push) NO dispara re-check. Un user con tab abierta puede tardar en detectar el SW nuevo. Aceptado — bajo impacto en prod (users cierran tabs). En staging antes era fricción diaria, ahora resuelto por el demoledor.

## Auth flow (arquitectura)

El login y logout reales son **100% client-side via Supabase JS SDK** (`supabase.auth.signInWithPassword`, `supabase.auth.signOut`). NO hay endpoints server propios de auth — los antiguos `/api/auth/login` y `/api/auth/logout` eran no-ops legacy y se removieron. Rate limit anti-brute-force al login lo provee Supabase a nivel plataforma.

Endpoints server que SÍ participan del flujo de auth:
- `/api/auth/signup`: crea user + perfil con service_role en una transacción server-side (admin.createUser + rollback en caso de fallo del INSERT en `proveedores`/`usuarios_buscadores`). Rate-limitado con `authLimiter` (in-memory; ver caveat abajo).
- `/api/auth/welcome`: server-to-server llamado desde signup, gated por `verifyInternalSecret`. Manda email de bienvenida.

**Caveat del rate limit**: `lib/rateLimit.ts > authLimiter` es in-memory. En Vercel serverless cada invocación arranca con memoria fresca → el contador NO persiste entre invocaciones → el limit es efectivo solo en dev (single process). Documentado como deuda P1 en `staging-setup/MASTER_AUDIT_REPORT.md` (#15). Fix real requiere store distribuido (Upstash Redis u equivalente) — sprint propio post-launch.

### Testing con múltiples cuentas — cross-fire dual-cuenta

Supabase Auth persiste la sesión **por proyecto** en `localStorage` (key `sb-{ref}-auth-token`), **no** por tab. Consecuencia práctica: si en el mismo perfil de navegador alternas entre cuentas de prueba (ej. Aldo en tab A + Camila en tab B), el `signInWithPassword` de la segunda cuenta sobreescribe el token de la primera → gotrue-js dispara `SIGNED_OUT` en TODAS las tabs del proyecto (via `storage` event), y las páginas privadas del UserContext redirigen al login como si "la sesión hubiera expirado".

**No es un bug — es `persistSession: true` funcionando como está diseñado.** Un solo usuario con sesión activa por proyecto es el modelo correcto para usuarios finales; el efecto molesto sale a la luz solo en escenarios de prueba con dos identidades simultáneas.

**Mitigación operativa (para smokes manuales y desarrollo)**:
- **Perfiles de navegador separados por identidad de prueba**. En Chrome/Edge: `Menú → Perfiles → Añadir perfil`; en Firefox: `about:profiles`. Un perfil para admin/proveedor de staging (Aldo), otro para tutor puro (Camila). Cada perfil tiene su propio `localStorage` → cero contaminación cruzada.
- **Alternativa liviana**: ventanas incógnito distintas — cada ventana incógnito es un contexto aislado en algunos navegadores (no todos: Chrome comparte storage entre pestañas incógnito de la misma ventana pero no entre ventanas incógnito distintas).
- La suite e2e de Playwright evita el problema por diseño: cada `browser context` es aislado (dual-project `chromium` + `chromium-tutor` con storageStates separados en `e2e/.auth/proveedor.json` y `e2e/.auth/tutor.json`).

Cuando aparezca el síntoma "me deslogueó solo" en staging, primer checkeo: ¿tenía otra cuenta logueada en otro tab del mismo perfil? Si sí, es el fenómeno cross-fire y no requiere fix — cambiá al patrón de perfiles separados.

## Auth para endpoints internos

Dos patrones de autenticación en `pages/api/`. Elegir según QUIÉN llama:

- **`verifySession`** (Bearer token): para endpoints llamados desde el cliente (browser). El cliente pasa `Authorization: Bearer <session.access_token>` (token de Supabase Auth). El endpoint extrae `userId` con `supabase.auth.getUser(token)` y valida ownership/role específico al recurso (ej. `caller === resource.owner_id`, `isAdmin(caller)`, etc.). Helper en `lib/apiAuth.ts`.

- **`verifyInternalSecret`**: SOLO para llamadas server-to-server (Node → Node) donde el secret se setea en el header desde otro API route. NO usar para endpoints llamables desde browser — el secret no puede vivir en el bundle del cliente. Único caller legítimo actualmente: `pages/api/auth/signup.ts` → `/api/auth/welcome`. Helper en `lib/apiAuth.ts`.

**Patrón id-only para endpoints client-called**: el cliente manda solo identificadores primitivos (`agendamientoId`, `evaluacionId`, `messageId`); el server resuelve nombres, emails, contenidos via FK joins desde la BD. Defensa contra payloads manipulados — nadie puede mandar un email con contenido fabricado, ni gatillar acciones sobre recursos ajenos.

**Failure handling para emails**: los endpoints de notificación devuelven `200 { skipped: true, reason }` cuando el envío falla, no `500`. La operación de BD que dispara el email ya fue exitosa; el email es notificación, no transaccional.

Referencia canónica: `pages/api/agendamientos/notify-proveedor.ts` y `notify-tutor.ts` (Sprint 3 agendamiento). El sweep que migró 4 endpoints viejos al mismo patrón usó `notify-proveedor` como base.

### Heurística para audits de seguridad

Filtrar fixes performativos: un commit que cierra una vulnerabilidad con solo un comentario TODO + console.warn deja la vulnerabilidad abierta. Auditorías deben distinguir entre:
- Fix con código real (validation, check, rechazo) → cerrado.
- Fix con comentario / warning / logging sin lógica de gate → abierto, requiere fix real.

Referencia histórica: commit `1bc1897` (audit completo "24 vulnerabilities fixed") cerró 17/20 items con código real, pero #19 (notification spam vector — cualquier user autenticado podía spammear notificaciones a cualquier `userId` arbitrario) quedó con TODO + warn sin gate efectivo — fix performativo. Resuelto agregando relationship check (conversación / agendamiento / admin) en `/api/notifications/create`. Lección: cuando se audita un commit "X vulnerabilities fixed", verificar línea por línea que el fix tiene gate real, no solo telemetría.

## Content Security Policy

La policy en `next.config.js` (header `Content-Security-Policy`) whitelistea orígenes externos específicos que la app efectivamente usa. Cuando se integre algo nuevo que cargue desde otro origen (CDN, API, font provider, embed, analytics):

1. Identificar la categoría CSP que afecta: `img-src` (imágenes), `script-src` (scripts), `style-src` (CSS), `font-src` (fonts), `connect-src` (XHR/fetch/websocket), `media-src` (audio/video), `worker-src` (service workers / web workers), `frame-src` (iframes), `object-src` (plugins).
2. Agregar el origen específico a esa categoría en el array de directivas. Usar dominios concretos o wildcards de subdominio acotados (ej. `https://*.supabase.co`) — **nunca** wildcards sueltos (`https:` sin host) porque invalidan el propósito.
3. Re-deploy y smoke test en DevTools → Console buscando `Refused to load ... because it violates the following Content Security Policy directive`. Si aparece violation, el origen no está en la whitelist o la directiva está mal.

**Orígenes actualmente permitidos** (ver `next.config.js` para el listado vivo):
- Imágenes: Supabase storage, Unsplash, Pexels, ui-avatars, cartocdn y openstreetmap (mapas Leaflet), cdnjs (marker icons), firebasestorage (logo email).
- Scripts: Google Tag Manager (GA cuando consent).
- Conexiones: Supabase REST + Realtime websocket, Nominatim (geocoding), Google Analytics.
- Fonts: Google Fonts (CSS + binarios).

**Limitaciones aceptadas** (`'unsafe-inline'` + `'unsafe-eval'` en `script-src`): Next.js inyecta inline scripts para hydration; libs como react-leaflet usan `Function` eval interno. Migración a nonces vía middleware Next queda como mejora futura — bloqueada por simplicidad operacional actual.

**Referencia histórica**: commit `1bc1897` introdujo una CSP demasiado restrictiva en `img-src` que rompía cross-origin images, removida en `5c05b22` / `e135d1e`. La policy actual es el re-fix correcto con whitelist precisa basada en inventario real de orígenes usados por la app.

## Vulnerability management

Vulnerabilities reportadas por `npm audit` se filtran por exploitability en nuestro stack real (Pages Router, sin middleware, sin i18n, sin RSC/Server Actions, `images.domains` no `remotePatterns`, Resend solo SEND sin webhooks IN). No toda vulnerability marcada "high" es alcanzable en Pawnecta — muchas son build-time con inputs controlados desde nuestro source, o dev-only (eslint chain, supabase CLI).

**Patrón operacional**: `npm install <package>@<version>` explícito > `npm audit fix` para tener control sobre qué se mueve. `--force` solo si está documentada la cascada de breaking changes que implica.

**Estado actual** (post-bump `next 14.2.3 → 14.2.35`): critical cerrado. Quedan ~14 advisories high en `next` 14.2.x que NO tienen fix backport en la rama 14 (sólo cerradas en 15+). De esos, ~11 no aplican al stack (RSC/App Router/middleware/i18n/beforeInteractive), ~3 aplican parcialmente (rewrites HTTP smuggling, image optimizer DoS). Cierre completo requiere bump a Next 15 mayor — fuera de scope pre-launch.

**Deuda crítica con timer** (no ordinaria — hacer ASAP post-launch):
- **Bump Next 14 → 15**. Cierra 3 advisories high que SÍ aplican al stack en 14.2.x y no tienen backport: (a) HTTP request smuggling en rewrites — tenemos `/supabase-proxy/:path*`, vector real; (b) `next/image` Optimization API DoS — uso extensivo en explorar/servicio/proveedor; (c) `next/image` disk cache growth unbounded — agotamiento storage en Vercel. Migración mayor: ~1-2 días con testing exhaustivo (verificar Pages Router compat, build, hidratación, SW). Bumpea también `eslint-config-next` al mismo major, cerrando la cadena eslint de regalo.

**Backlog ordinario post-launch** (defer aceptado):
- Reemplazar `next-pwa@5.6.0` por `@ducanh2912/next-pwa` (fork activo) — cierra cadena de 7 highs build-time (workbox-build, workbox-webpack-plugin, serialize-javascript, rollup-plugin-terser, lodash, picomatch, @babel/plugin-transform-modules-systemjs).
- `npm install ws@^8.21.0` con override — cierra moderate de uninitialized memory disclosure (advisory cubre hasta 8.20.0; fix en 8.21). Marginal (memory leak hacia Supabase Realtime, mitigado por TLS), pero un override es no-op a nivel app code — sólo upgrade del binario ws.
- `npm install postcss@^8.5.10` override + bump root — cierra moderate XSS via `</style>` (next 14.2.31 sigue trayendo postcss 8.4.31, así que el bump de next NO cerró postcss colateralmente). Build-time, no recibe user input → riesgo real ≈ 0.
- `npm install supabase@latest` (dev CLI) — cierra tar path traversal.
- **Migrar `/api/push/send` al patrón id-only** al activar `NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS`. Hoy el endpoint usa `verifyInternalSecret` (server-to-server) pero el único caller que existía (MessageThread.tsx) llamaba desde el browser — siempre 403. El fetch fue removido en el sweep #2 (finding [86]). Al reactivar push notifications: reescribir push/send con `verifySession` + resolver recipient via relación `conversations`/`agendamientos` + validar ownership (mismo patrón que notify-* de Sprint 3). Sin ese refactor, el endpoint es unusable desde client.
- **Rediseño del gate anti-review-spam** (referencia auditoría 20260723 finding [72]): hoy `ReviewModal.tsx` gatea el submit por count de filas en `contactos` matcheando `auth_user_id + servicio_id`. El sweep #2 cerró el vector `contactos/track` con par `servicio ↔ proveedor` incoherente, pero el vector real "atacante autenticado abre chat trivial con proveedor → dispara `conversations` row → auto-moderar cuenta contacto real" sigue abierto. Auto-moderar deja el review en pendiente pero eventualmente puede aprobar sin evidencia sólida de servicio. Fix real: mover el gate a evidencia fuerte de servicio consumado (`agendamientos.estado = 'confirmada' AND fecha_pasada`), y en su ausencia, moderación humana estricta antes de publicar. Sprint dedicado post-launch.
- **Rename ruta `/mis-solicitudes` → `/mis-reservas` + redirect permanente** (referencia sweep #3 taxonomía). El sweep #3 renombró el heading de la página, el `<title>`, el navlink del Header y todos los toast actions a "Mis reservas" para respetar la taxonomía nueva (RESERVA universal). La ruta física `/mis-solicitudes` quedó intacta para no romper deep links históricos, emails enviados, bookmarks. Cierre limpio: mover el pathname del archivo (`pages/mis-solicitudes.tsx` → `pages/mis-reservas.tsx`) + agregar rewrite 301 en `next.config.js` (`/mis-solicitudes → /mis-reservas`) + actualizar los 5+ `href="/mis-solicitudes"` internos (Header, SolicitarAgendamientoModal toast actions, mis-solicitudes empty state Link, etc). Incluye actualizar los 2 emails que linkean a esa ruta (ver deuda de emails abajo). Sprint chico post-launch — no bloquea nada.
- **Rename taxonomía en templates de email** (referencia sweep #3 taxonomía). Los sweeps #1/#2/#3 dejaron los emails intactos por decisión explícita (fuera de alcance pre-merge). Encontrados con grep post-sweep #3: (a) `components/Emails/ReservaConfirmadaTutorEmail.tsx:98` — el copy dice `"Si necesitas cancelar, puedes hacerlo desde Mis solicitudes"` — cambiar a "Mis reservas"; (b) `AgendamientoProveedorEmail.tsx:60` — Preview `"Nueva solicitud de agendamiento de X para tu servicio"` — reformular a "Nueva solicitud de reserva de X..."; (c) `AgendamientoProveedorEmail.tsx:74` — inline `"te solicitó un agendamiento"` — reformular a "quiere reservar tu servicio"; (d) subject en `pages/api/agendamientos/notify-proveedor.ts:148` — `'Nueva solicitud de agendamiento en Pawnecta'` — reformular a "Nueva solicitud de reserva en Pawnecta". Fase 1: cambios de copy con render-diff. Fase 2 (opcional): renombrar los archivos de template `AgendamientoProveedorEmail.tsx` / `AgendamientoTutorEmail.tsx` a `ReservaProveedorEmail` / `ReservaTutorEmail` — cascada a 4-6 imports. Ambas fases son sprint chico post-launch.

## MCPs con acceso a servicios (staging + Vercel)

### Supabase MCP — staging read-only

MCP configurado en `.mcp.json` local (no committeado) con `--read-only` +
`--project-ref=jmtadvdkicyylcwjcmcl`. Doble candado anti-prod: el MCP no
puede escribir (rechaza INSERT/UPDATE/DELETE/DDL con SQLSTATE `25006` a
nivel de sesión Postgres), y solo ve staging.

**Puedo**: `SELECT`s de verificación en staging — citar query + resultado
en reportes, nunca verificación invisible.

**NO puedo**: INSERT/UPDATE/DELETE/DDL, migraciones, cambios de schema,
cambios de RLS/policies. Siguen siendo bloques SQL que Aldo ejecuta
manualmente — sin excepciones. Tampoco `apply_migration` del MCP (mismo
criterio: cualquier mutación requiere ejecución manual de Aldo tras
revisar el bloque).

Si el proyecto conectado dejara de ser staging o si `--read-only` no
estuviera activo, dejo de usar el MCP y reporto.

### Vercel MCP — hospedado, solo lectura

MCP hospedado en `https://mcp.vercel.com` (OAuth) agregado a `.mcp.json`
local. Solo para lectura: consultar deployments, estados, runtime logs
(retención Hobby ~1h).

**NO puedo** hacer acciones mutantes: redeploy, cambios de env vars,
cambios de dominios, cancelación de builds, cambios de deployment
protection. Todo eso requiere instrucción explícita en el turno vigente.
Cada consulta se cita en reportes igual que Supabase.

## Workflow

Claude Code (VS Code) → commit + push a main → Vercel deploy automático
Rama principal: main
Supabase Management API con PAT para migraciones directas

**Criterio de cierre de commit — REGLA PERMANENTE (P1)**: `npm run build` local debe salir con **exit 0** antes de cualquier `git commit` que toque `.ts` / `.tsx`. `tsc --noEmit` por sí solo NO alcanza: `next build` corre además ESLint con reglas duras (`react-hooks/rules-of-hooks`, `react/*`) que rompen el build en Vercel pero **no aparecen en `tsc`**. Incidente que originó esta regla: dos sweeps consecutivos (`d218b70`, `275cf2e` — 24-07-26) fallaron el build silente por hooks tras un `if (!isOpen) return null`; los tsc locales dieron verde, las suites e2e también (porque corrían contra el deploy anterior aparentando verde), y staging quedó ~3h atrás del código. `npm run build` local hubiera atrapado el error en el primer commit.

**Ejecución de checklists contra prod — REGLA PERMANENTE (P2)**: toda ejecución manual de un checklist (merge a prod, hotfix con migration, rollback) se reporta **por fase**, con los outputs pegados de cada verificación de esa fase. **Nunca como confirmación agregada** ("hice todo, pasó"). Cada fase del checklist tiene su ítem de verificación (SELECT que retorna N, response HTTP, snapshot de policy, output de `git rev-parse origin/main`); ese output es el evidence del cierre de la fase — sin él, la fase no está cerrada. Incidente que originó esta regla: el 24-07-26 se reportó "MERGE F2 COMPLETADO" y al preparar el acta se descubrió con `git ls-remote origin` que `origin/main` seguía en `91d72b4` (pre-F2, 22-07) y ninguna migration se había aplicado en prod — el reporte agregado había ocultado que las Fases 1-3 nunca se ejecutaron contra prod. Detectable en 1 comando (`git ls-remote`); prevenible con reporte por fase (Fase 1.1 → SELECT retorna 1 fila, Fase 2 → `git ls-remote origin main` = <sha>, etc.). Ver `ACTA_CIERRE_F2.md > Incidente #2`.

**Cambios de env vars en Vercel — REGLA OPERATIVA (P4)**: tras editar cualquier env var en Vercel Dashboard → Settings → Environment Variables (rotación, agregado, cambio de scope), verificar:
1. **Timestamp "Updated"** en la fila del env var — debe reflejar la edición reciente. Si dice fecha vieja, el Save no persistió (bug UI de Vercel observado; recargar página y re-guardar).
2. **Redeploy explícito** del último commit del branch afectado. Los env vars nuevos NO se aplican al deploy actual hasta redeploy — el bundle se sirve con el snapshot de env que tenía al momento del build.
3. **Smoke inmediato**: hit al endpoint que consume el env con el valor nuevo. Si sigue fallando auth/config, el fix no aterrizó.

Incidente que originó esta regla: rotación de `CRON_SECRET` (Preview) el 2026-07-28 para el dryRun R3 del tren Recordatorios. La fila mostraba "Updated Jul 9" pese al Save aparente en UI. Post re-guardado con timestamp actualizado + redeploy, ambos endpoints (`invitacion-resenas` viejo + `recordatorio-reserva` nuevo) autenticaron limpio.

**Branch destino en commits con instrucción explícita — REGLA PERMANENTE (P3)**: si la instrucción especifica branch destino (ej. "commit + push a staging", "hotfix directo a main"), verificar `git branch --show-current` **ANTES** del `git commit` y abortar si no coincide. Comando defensivo canónico:
```bash
git branch --show-current | grep -qx <branch-esperada> || (echo "ABORT: no en <branch-esperada>" && exit 1)
```
Incidente que originó esta regla: 28-07-26, commit del acta de cierre F2 pedido "a staging" cayó en `main` porque local había quedado en main desde el merge fast-forward previo. El desliz se detectó en el output del `git push` (`[main 97fd425]` en vez de `[staging ...]`); se corrigió con `git push origin main:staging`. Sin regresión funcional (docs sin runtime impact), pero disparó un deploy prod innecesario. El guard hubiera fallado en 0 segundos y evitado el desvío.

## Database migrations

Las migrations SQL viven en `migrations/*.sql`. Se aplican manualmente al proyecto Supabase vía Management API o PSQL ad-hoc — NO hay supabase CLI con migrations versionadas integrado.

**Flow para una migration nueva**:
1. Crear archivo en `migrations/<nombre_o_fecha>_<descripcion>.sql` con el DDL completo.
2. Aplicar manualmente a prod (`ouezpeeiwjwawauidrqq`) y staging (`jmtadvdkicyylcwjcmcl`).
3. Commitear el archivo al repo.

Mantener fidelidad prod ↔ staging es manual. Cualquier migration aplicada a un proyecto debe aplicarse al otro para que staging refleje prod.

**Convenciones útiles**:
- Usar `IF NOT EXISTS` / `OR REPLACE` / `DROP ... IF EXISTS` donde sea posible — migrations idempotentes pueden re-ejecutarse sin romper.
- DDL destructivo (DROP TABLE, DROP COLUMN, TRUNCATE) requiere comentario explícito al inicio del archivo explicando el blast radius y la verificación previa (ej. "0 filas confirmadas").
- Numeración no es estrictamente cronológica: archivos viejos usan `NN_descripcion.sql`, recientes usan `YYYYMMDD_descripcion.sql`. Ambos patrones conviven.

## Staging environment

**Branches**:
- `main` → deploy automático a producción (`pawnecta.com`).
- `staging` → deploy automático a staging (URL Vercel branch — `pawnecta-landing-mvp-git-staging-*.vercel.app` o subdominio custom si se configura).

**Flow básico**:
1. Hacer cambios en una feature branch o directamente en `staging`.
2. `git checkout staging && git push` → deploy automático a staging URL.
3. Validar en staging (visual + funcional, contra Supabase staging).
4. Promover a prod: `git checkout main && git merge staging && git push`.

**Diferencias entre entornos**:
- Supabase: prod (`ouezpeeiwjwawauidrqq`) vs staging (`jmtadvdkicyylcwjcmcl`).
- Emails: prod manda real; staging redirige todos a `AUDIT_INBOX` con subject prefijado `[STAGING] (orig: <email>) ...` (lógica en `lib/resend.ts`).
- Crons (`vercel.json` los schedulea en cualquier deploy con el archivo): solo ejecutan en producción. Gated por `skipIfNonProd()` en `lib/cronGuard.ts` — chequea `NEXT_PUBLIC_APP_ENV === 'production' || VERCEL_ENV === 'production'`. En staging responden `{ skipped: true, env }` sin tocar BD.
- VAPID keys (push notifications): propias en cada environment para no cross-contaminate subscriptions.
- Auth SMTP de Supabase: staging debe usar defaults Supabase (`noreply@mail.supabase.com`), no custom SMTP apuntando a Resend con dominio de prod. Verificar en dashboard staging `Auth → SMTP Settings`.

**Cambios triviales** (typos, copy menor): pueden ir directo a `main`. **Cambios estructurales** (features, schema, security, deps): pasan por `staging` primero.

**Schema sync prod → staging**: manual via Management API dumps. Documentado en `staging-setup/STAGING_PROJECT.md` (file local, no committeado). Cualquier migration aplicada a prod debe replicarse en staging para que los tests sean fieles.

**Promoción a prod NO es fast-forward automático**: el merge `staging → main` puede generar conflictos si hubo hotfixes directos a main. Lo esperado: hotfixes urgentes a main + mirror a staging via `git checkout staging && git merge main`. Resto de cambios siempre staging-first.

### Continuous Integration

GitHub Actions (`.github/workflows/ci.yml`) corre en cada push a `main`/`staging` y en PRs a `main`:
- `tsc --noEmit` (type check estricto)
- `npm run build` (build de Next completo)

Concurrency cancela runs viejos del mismo branch para no gastar minutos en pushes consecutivos. Sin env vars en CI: `lib/supabaseClient.ts:4-5` y `next.config.js:155` tienen fallback a `placeholder.supabase.co`, el build pasa sin secrets configurados. Si en el futuro el build empieza a requerir una env var real, agregar via GitHub Secrets con valor de staging (NUNCA prod).

Un rojo en CI bloquea visualmente el push (badge en el commit) pero NO previene el deploy de Vercel — Vercel deploya de forma independiente. Si CI falla, arreglar antes de promover staging → main aunque Vercel haya deployado.

**Mejoras pendientes post-launch**:
- Tests funcionales (Playwright o equivalente sobre staging URL).
- Linting en CI (requiere primero cerrar deuda de `eslint-config-next` — ver `## Vulnerability management`).
- Required check para PRs a main (settings de GitHub branch protection).
