# Pawnecta — Claude Code Context

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

## Lo que NO hace Pawnecta — no implementar sin confirmación

- Procesamiento de pagos
- Calendarización o reservas
- Sistema de booking/transacciones
- Monetización (será post-lanzamiento: plan destacado para proveedores)

## PWA / Service Worker

La app usa `next-pwa` (config en `next.config.js`). Resumen de la estrategia de cacheo y cache-busting — relevante porque sin entenderlo, "deploys que parecen no haber landed" se vuelven recurrentes.

**Activación del SW nuevo**: `skipWaiting: true` + `clientsClaim: true` (default de next-pwa). Cuando el browser detecta un `/sw.js` nuevo, se instala y activa al instante, sin esperar a que se cierren las tabs.

**Runtime caching** (defaults de next-pwa 5.6, sin override en config):
- **NetworkFirst** para HTML/navigations y `/api/*` no-auth (10s timeout). El SW intenta network primero; si falla cae al cache. Asegura HTML siempre fresh.
- **StaleWhileRevalidate** para JS chunks, CSS, imágenes, `_next/data/*.json`, `_next/image`. Sirve cache al instante y refresca en background — la próxima visita ya tiene la versión nueva.
- **CacheFirst** para fonts (`gstatic`, audio, video). Cambian rara vez.
- `cleanupOutdatedCaches()` se ejecuta al activar — purga revisions viejas.

**Cache-busting del SW**: `/sw.js` y `/workbox-:hash` se sirven con `Cache-Control: public, max-age=0, must-revalidate` (header explícito en `next.config.js`). Sin esto, Vercel CDN puede cachear el SW largo y el browser nunca re-fetchearía aunque deployemos. Los chunks JS/CSS/imágenes mantienen el caching agresivo default (sus URLs son content-hashed, así que un deploy nuevo = URL nueva = miss natural).

**Limitación conocida (no resuelta)**: el browser re-revisa `sw.js` en navigation events (~24h o cuando vuelve a foco). Con SPA Next.js + client-side routing, las navegaciones internas (Link, router.push) NO disparan re-check. Un user con tab abierta puede tardar en detectar el SW nuevo. Para validar deploys: hard refresh / tab nueva / incógnito.

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
- `npm install postcss@^8.5.10` override + bump root — cierra moderate XSS via `</style>` (next 14.2.35 sigue trayendo postcss 8.4.31, así que el bump de next NO cerró postcss colateralmente). Build-time, no recibe user input → riesgo real ≈ 0.
- `npm install supabase@latest` (dev CLI) — cierra tar path traversal.

## Workflow

Claude Code (VS Code) → commit + push a main → Vercel deploy automático
Rama principal: main
Supabase Management API con PAT para migraciones directas
