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

## Workflow

Claude Code (VS Code) → commit + push a main → Vercel deploy automático
Rama principal: main
Supabase Management API con PAT para migraciones directas
