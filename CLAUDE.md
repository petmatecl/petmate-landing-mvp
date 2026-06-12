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
- **Admin verificación de carnet — imagen rota en prod**. [components/Admin/ProveedorApprovalList.tsx:376,384](components/Admin/ProveedorApprovalList.tsx#L376-L384) renderiza `<img src={prov.foto_carnet}>` con URLs `/storage/v1/object/public/documents/...` guardadas en BD. El bucket `documents` es **privado** (verificado por probe: el endpoint `/object/public/` retorna 400 "Bucket not found" para buckets privados, incluso con cookie de admin — el endpoint no acepta auth). El upload en [pages/proveedor/index.tsx:771-789](pages/proveedor/index.tsx#L771-L789) usa `getPublicUrl()` que genera URLs cosméticamente "públicas" pero inválidas para bucket privado. Fix post-launch: cambiar el upload a guardar el `path` (no la URL); en el render del admin, `await supabase.storage.from('documents').createSignedUrl(path, 60)`. No es un riesgo de seguridad (los carnets NO se descargan sin auth), es un bug funcional del flujo de verificación.

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

## Auth flow (arquitectura)

El login y logout reales son **100% client-side via Supabase JS SDK** (`supabase.auth.signInWithPassword`, `supabase.auth.signOut`). NO hay endpoints server propios de auth — los antiguos `/api/auth/login` y `/api/auth/logout` eran no-ops legacy y se removieron. Rate limit anti-brute-force al login lo provee Supabase a nivel plataforma.

Endpoints server que SÍ participan del flujo de auth:
- `/api/auth/signup`: crea user + perfil con service_role en una transacción server-side (admin.createUser + rollback en caso de fallo del INSERT en `proveedores`/`usuarios_buscadores`). Rate-limitado con `authLimiter` (in-memory; ver caveat abajo).
- `/api/auth/welcome`: server-to-server llamado desde signup, gated por `verifyInternalSecret`. Manda email de bienvenida.

**Caveat del rate limit**: `lib/rateLimit.ts > authLimiter` es in-memory. En Vercel serverless cada invocación arranca con memoria fresca → el contador NO persiste entre invocaciones → el limit es efectivo solo en dev (single process). Documentado como deuda P1 en `staging-setup/MASTER_AUDIT_REPORT.md` (#15). Fix real requiere store distribuido (Upstash Redis u equivalente) — sprint propio post-launch.

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
