# Pawnecta — Claude Code Context

## Estado del roadmap

- **F1 (agenda horaria por slots) — EN PROD**. `/proveedor` configura agenda por categoría (5 categorías con slots), tutor reserva desde ficha con `SolicitarAgendamientoModal`.
- **F2 (agenda de estadías por rango de noches) — EN PROD desde 2026-07-28** (tag `f2-prod-20260728` sobre `d2bee23`). Ver [ACTA_CIERRE_F2.md](ACTA_CIERRE_F2.md).
- **Recordatorios 24h antes** — EN PROD desde 2026-07-30 (`/api/cron/recordatorio-reserva` @ 22:00 UTC diario). Mitad "24h" del tren Doctoralia-style completa. Ver [BACKLOG.md > Sprint Recordatorios](BACKLOG.md).
- **Sentry error monitoring** — EN PROD desde 2026-08-11 (tags `sentry-1-prod-20260811`, `sentry-csp-prod-20260811`, más hotfix `sentry-flush` en curso). Gate `VERCEL_ENV==='production'`. Ver [ACTA_SENTRY_1.md](ACTA_SENTRY_1.md), [ACTA_SENTRY_CSP_HOTFIX.md](ACTA_SENTRY_CSP_HOTFIX.md).
- **Siguiente**: recordatorio "1h antes" (habilitado por upgrade Vercel Pro) + admin notifs solicitudes pendientes (pedido PO 2026-08-11). Priorización en cancha del PO — ver `BACKLOG.md > PEDIDOS DIRECTOS DEL PO`.

## Qué es este proyecto

Pawnecta es un marketplace de servicios para mascotas en Chile. Conecta tutores con proveedores de servicios. **Gestiona el ciclo completo de reserva** — agenda F1 (slots horarios) + F2 (estadías multi-noche), estados derivados REALIZADA/VENCIDA, cancelación bilateral con ventana configurable, recordatorios cron 24h antes. Contacto directo (chat interno, WhatsApp, teléfono) sigue disponible para coordinación post-reserva. **NO gestiona pagos** (transacciones son fuera de la plataforma; contacto post-reserva las coordina) ni monetización a proveedores (plan destacado futuro).

- URL producción: https://www.pawnecta.com
- GitHub: petmatecl/petmate-landing-mvp
- Deploy: Vercel (auto-deploy en push a main, Pro plan)
- Base de datos: Supabase (proyecto prod: `ouezpeeiwjwawauidrqq`, staging: `jmtadvdkicyylcwjcmcl`)
- Framework: **Next.js 15.5.22** con Pages Router (tren N15 en prod desde `next15-prod-20260804`)
- Lenguaje: TypeScript
- Estilos: Tailwind CSS
- Iconos: Lucide React (NO emojis — el usuario los detesta)
- Auth: Supabase Auth
- Storage: Supabase Storage (buckets: avatars, servicios-fotos, documents)
- Observabilidad: Sentry (error monitoring, gate a prod, sin tracing/replay)
- Emails: Resend (`send.pawnecta.com` subdomain) + Zoho Mail para casillas `@pawnecta.com` (contacto/soporte)
- PWA: `@ducanh2912/next-pwa@10.2.9` (fork mantenido de next-pwa, N3 tren N15)

## Roles de usuario

**Tutor (usuario)** — explora sin registro. Necesita cuenta para contactar o evaluar. Tabla: `usuarios_buscadores` (solo tiene: id, auth_user_id, nombre, email, rut, created_at).

**Proveedor** — se registra con correo (signup wizard). El registro es **auto-aprobado** (sprint badge-f1, 2026-08-18). Publica servicios con precio y disponibilidad. Puede verificar su identidad opcionalmente (subir carnet frontal + dorso) para obtener el badge "Identidad verificada" en su ficha. Tabla: `proveedores` (tiene nombre_publico para display, nombre/apellido_p/apellido_m para datos legales).

**Admin** — rol en array `proveedores.roles`, verificado por `is_admin()` function. Panel en /admin con sidebar sticky.

### Ejes independientes: `estado` vs `verificacion_estado`

Dos dimensiones que gobiernan cosas distintas — **no se mueven en tándem**. Confundirlas es la clase de bug donde "aprobado" pasa a significar cualquier cosa.

- **`proveedores.estado`** → **cuenta activa o suspendida** (eje de moderación).
  - Valores usados: `'aprobado'` (activa, publica y aparece en catálogo), `'pendiente'` (legacy, cuenta creada pero no habilitada — histórico pre-2026-08-18), `'suspendido'` (moderación admin lo apagó — no publica, no aparece en catálogo).
  - Signup nuevo: `'aprobado'` de entrada (auto-aprobación, sin intervención admin). `aprobado_por=NULL` distingue auto-aprobación de la humana histórica.
  - Cambio a `'suspendido'` es acción del admin desde el panel — pieza de S2 (reportes) del sprint badge-f1.
  - RPC `buscar_servicios` filtra por `estado='aprobado'` → `'suspendido'` desaparece del catálogo público.

- **`proveedores.verificacion_estado`** → **identidad verificada (badge de confianza)** (eje del badge).
  - Valores: `'sin_enviar'` (default, no subió carnet), `'pendiente'` (subió carnet, admin no revisó), `'aprobado'` (admin verificó la coincidencia carnet↔nombre), `'rechazado'` (admin rechazó — nota en `verificacion_nota`).
  - **NO condiciona publicar, aparecer en catálogo, ni recibir reservas.** Es puro incentivo — determina el badge "Identidad verificada" en cards, ficha y perfil público.
  - Fuente real del badge en RPC `buscar_servicios`: `COALESCE(p.rut_verificado, false) AS proveedor_verificado`. En `pages/proveedor/[id].tsx` el badge condiciona por `rut_verificado OR verificacion_estado='aprobado'` (unificado a "Identidad verificada" en las 3 superficies desde sprint badge-f1).
  - El tab admin "Verificaciones" (`ProveedorApprovalList.tsx` L197-198) actualiza `verificacion_estado='aprobado', rut_verificado=true` en un solo UPDATE — son la misma acción a nivel producto.

**Reglas prácticas al leer/escribir el modelo**:
- Un proveedor `estado='aprobado' + verificacion_estado='sin_enviar'` es lo normal en el flow nuevo — publica y aparece en catálogo sin badge.
- Un proveedor `estado='suspendido' + verificacion_estado='aprobado'` es un caso legítimo: cuenta suspendida por moderación, aunque su carnet estuvo verificado.
- Un proveedor `estado='pendiente'` es **legacy** — sprint badge-f1 dejó cero pendientes en prod (`migrations/20260818_auto_aprobar_7_pendientes.sql`). Si aparece uno nuevo es por acción admin (reactivación tras suspensión, por ejemplo).
- **Nunca inferir uno del otro** en código o queries. Si un caller necesita "cuenta activa AND verificada", debe pedir ambas condiciones explícitas.

## Tablas principales (Supabase)

- `proveedores` — perfil del proveedor (nombre, apellido_p, apellido_m, nombre_publico, rut, foto_perfil, foto_carnet, foto_carnet_dorso, bio, comuna, tipo_entidad, genero, ocupacion, fecha_nacimiento, galeria[], estado, verificacion_estado, etc.)
- `usuarios_buscadores` — perfil del tutor (nombre, email, rut). NO tiene apellido_p ni foto_perfil.
- `servicios_publicados` — servicios del proveedor (titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos[], detalles jsonb, comunas_cobertura text[], disponibilidad, activo)
- `categorias_servicio` — 10 categorías activas (verificado MCP staging 2026-08-11): `adiestramiento, cuidado ("Cuidado y Hospedaje" — reemplazó al slug viejo `domicilio` y fusionó `hospedaje`), etologia, fotografia, guarderia, paseos, peluqueria, retratos, traslado, veterinario`. Slug `hospedaje` deprecado (fusionado en `cuidado`). Cambios recientes: `retratos` (sprint dedicado), `etologia`, `fotografia` (nuevas categorías post-launch).
- `evaluaciones` — reviews (servicio_id, proveedor_id, usuario_id→auth.users.id, rating, comentario, estado, respuesta_proveedor)
- `conversations` / `messages` — chat interno
- `contactos` — tracking de contactos (canal: mensaje/whatsapp/llamada/email_copiado)
- `favoritos` — servicios favoritos del usuario

## RPCs importantes

- `buscar_servicios` — búsqueda principal en /explorar. Filtra por categoría, comuna, mascota, precio, texto. Retorna proveedor_verificado y proveedor_primera_ayuda para badges.
- `registrar_proveedor` — signup de proveedor (server-side via service role key)

## Estructura de archivos clave

```
middleware.ts        — Edge Runtime, bloquea patterns bots (wp-*, xmlrpc, *.php) → 404. Batch REMATE-1 R2a.
sentry.client.config.ts / sentry.server.config.ts / sentry.edge.config.ts — Init Sentry v10 en las 3 runtimes. R3.

pages/
  index.tsx          — Landing/home
  explorar.tsx       — Catálogo con filtros
  login.tsx          — Login (redirige a /proveedor o /explorar según rol)
  register.tsx       — Registro wizard multi-step
  admin.tsx          — Panel admin con sidebar
  mis-reservas.tsx   — Panel tutor: pestañas Próximas/Pendientes/Historial + estados derivados. Batch REMATE-1 R2b (renombrado desde mis-solicitudes; redirect 308 en next.config.js).
  servicio/[id].tsx  — Ficha de servicio + CTA "Reservar" F1/F2
  proveedor/index.tsx — Dashboard proveedor + agenda F1/F2 + solicitudes
  proveedor/[id].tsx  — Perfil público del proveedor
  [categoria]/index.tsx — Landing SEO por categoría (peluqueria, cuidado, etc)
  api/auth/signup.ts  — API de registro (rate-limited, rollback on failure)
  api/auth/welcome.ts — Email bienvenida (server-to-server, verifyInternalSecret)
  api/agendamientos/notify-proveedor.ts / notify-tutor.ts / notify-tutor-reserva-confirmada.ts / notify-proveedor-cancel.ts / cancelar.ts — Sprint 3 agendamiento
  api/cron/recordatorio-reserva.ts — Cron 24h antes @ 22:00 UTC daily (Vercel Pro)
  api/cron/recordatorio-onboarding.ts / recordatorio-mensajes.ts / invitacion-resenas.ts / reset-visitas-mes.ts / cleanup-visitas-tracking.ts — Otros crons
  api/admin/sentry-smoke.ts — Endpoint smoke gated a admin para validar Sentry gate + flush. R3.
  api/contactos/track.ts — Tracking de contactos (mensaje/whatsapp/llamada/email_copiado)
components/
  Explore/ServiceCard.tsx — Card de servicio (con trust badges)
  Explore/SidebarFiltros.tsx — Filtros laterales
  Proveedor/ServiceFormModal.tsx — Crear/editar servicio + agenda F1/F2 + bloqueos
  Servicio/ServiceDetailView.tsx — Ficha con hero + campos dinámicos (renderCampoCard). Batch REMATE-1 R1 CLS fix.
  Servicio/SolicitarAgendamientoModal.tsx — Modal reserva tutor (F1 slots / F2 rango de noches)
  Service/ReviewList.tsx / ReviewForm.tsx / ReviewModal.tsx — Evaluaciones
  Emails/ — 11 templates React Email (Agendamiento*, Reserva*, Recordatorio*, Aprobacion*, Rechazo*, Welcome, InvitacionResena, NewMessage, NewEvaluation)
  Shared/ConfirmDialog.tsx — Modal de confirmación estilizado (compartido admin + proveedor)
  Home/SearchBar.tsx — Buscador del hero (dropdown custom, no select nativo)
contexts/
  UserContext.tsx — Auth state global. Sin Promise.race ni timeout (canal 1 sincrónico + canal 2 event-driven). Anti-race condition documentado inline.
lib/
  supabaseClient.ts — Cliente Supabase
  serviceMapper.ts — Mapeo RPC → ServiceResult
  camposPorCategoria.ts — Definición campos dinámicos por categoría (9 categorías)
  estadoDerivado.ts — REALIZADA/VENCIDA en render-time (PD1 sprint PRODUCTO-2)
  puedeCancelarPorVentana.ts — Ventana cancelación (F1/F2)
  emails/resolvers.ts — Resolvers fecha/donde compartidos entre templates + cron (ZB3)
  apiAuth.ts — verifySession (Bearer) + isAdmin + verifyInternalSecret
  sentryScrub.ts — beforeSend hook scrub PII (JWT/emails/RUT/cookies). R3.
  sentryServer.ts — flushSentryEvents helper para drenar cola antes de res.json(). Sprint sentry-flush.
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

  **Regla anti-voseo también aplica al OUTPUT del auditor al PO** (chat, actas, resúmenes, snippets de código pegables al chat, mensajes de commit). No solo strings de UI. Antes de enviar cualquier respuesta al PO, releer buscando `logueá`, `pegá`, `mirá`, `dale`, `andá`, `pasame`, `contame`, `fijate`, `vos ejecutas`, `vos verificas`. Cambiar por imperativos en tú: `inicia sesión`, `pega`, `mira`, `anda`, `pásame`, `cuéntame`, `fíjate`, `ejecutas`, `verificas`. Historia: durante el sprint sentry-flush (2026-08-11), aparecieron 3 voseos en snippets pegables al chat del PO en la misma sesión — "logueá como admin", "y vos ejecutas el fetch", etc. El PO tuvo que corregir explícitamente. Aunque el registro de output al PO es más informal que la UI, la regla del proyecto es tuteo consistente — incluye el meta-canal auditor↔PO. Checklist mental antes de enviar: (a) revisar strings pegables al chat, (b) revisar snippets `console.log`/toast/comentarios internos con probabilidad de leerse, (c) revisar mensajes de commit visibles al PO en `git log`.
- NO `type="url"` en inputs — usar `type="text"` (acepta www. sin https://)
- Precios siempre con separador de miles (toLocaleString('es-CL'))
- Precios siempre dicen "Desde" antes del monto
- `getProxyImageUrl()` para URLs de Supabase Storage (bypass AdBlock)
- Autonomía total: no pedir permiso para editar, commitear o pushear
- Commits incluyen `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`

## Bugs conocidos / precauciones

- `usuarios_buscadores` NO tiene `apellido_p` ni `foto_perfil` — no hacer joins o inserts con esas columnas
- `evaluaciones.usuario_id` referencia `auth.users.id`, NO `usuarios_buscadores.id`
- `buscar_servicios` RPC: p_comuna debe aceptar NULL (no solo string vacío)
- El header tiene banner "EXCLUSIVO LANZAMIENTO" que agrega altura variable — no hardcodear px para sidebars
- **Admin verificación de carnet — imagen rota en prod**. [components/Admin/ProveedorApprovalList.tsx:376,384](components/Admin/ProveedorApprovalList.tsx#L376-L384) renderiza `<img src={prov.foto_carnet}>` con URLs `/storage/v1/object/public/documents/...` guardadas en BD. El bucket `documents` es **privado** (verificado por probe: el endpoint `/object/public/` retorna 400 "Bucket not found" para buckets privados, incluso con cookie de admin — el endpoint no acepta auth). El upload en [pages/proveedor/index.tsx:771-789](pages/proveedor/index.tsx#L771-L789) usa `getPublicUrl()` que genera URLs cosméticamente "públicas" pero inválidas para bucket privado. Fix post-launch: cambiar el upload a guardar el `path` (no la URL); en el render del admin, `await supabase.storage.from('documents').createSignedUrl(path, 60)`. No es un riesgo de seguridad (los carnets NO se descargan sin auth), es un bug funcional del flujo de verificación.
- ~~Known-flaky s1-editor-visible.spec.ts~~ **CERRADO 2026-08-11** — no reapareció en 6 merges a prod (`f2-prod-20260728` → `next15-prod-20260804` → `remate-1-prod-20260811` → `sentry-1-prod-20260811` → `sentry-csp-prod-20260811` + intermedios). Condición de cierre cumplida.

## Lo que NO hace Pawnecta — no implementar sin confirmación

**F1/F2 (agenda + reservas) YA es el core del producto**, en prod desde 2026-07 — no listar acá como no-goal.

Lo que sigue fuera de scope hasta confirmación explícita:

- **Procesamiento de pagos in-platform** (pasarela integrada, cobros propios, split de comisión). Las transacciones hoy se coordinan por chat/WhatsApp/teléfono post-reserva.
- **Monetización a proveedores** (plan destacado, ranking premium, subscripción). Post-lanzamiento.
- **Sistema de disputas / arbitraje / refunds automatizados**. Depende de pagos in-platform.
- **Verificación de identidad automatizada** (KYC via SDK externo). Hoy es revisión manual admin del carnet frontal + dorso.

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

**Estado actual** (post-bump `next 14.2.35 → 15.5.22`, tren N15 en curso desde 2026-07-30). Antes del tren N15 la sección de deuda crítica listaba 3 advisories high que se creían VIVOS en nuestro stack; **verificación exhaustiva 2026-07-30 mostró que los 4 items del CLAUDE.md previo estaban MITIGADOS** por combinación de patch backport a 14.2.35 + Vercel-hosting (que maneja rewrites e image opt en su propia infra). Matriz verificada:

| # | Item | Advisory | Estado en 14.2.35 + Vercel |
|---|---|---|---|
| 1 | HTTP smuggling `/supabase-proxy/*` | [GHSA-ggv3-7p47-pfv8](https://github.com/vercel/next.js/security/advisories/GHSA-ggv3-7p47-pfv8) | ✅ Parchado en 14.2.35 + rewrites Vercel a nivel CDN (doble cinturón) |
| 2 | `next/image` DoS memory loader | [GHSA-h64f-5h5j-jqjh / CVE-2026-44577](https://github.com/vercel/next.js/security/advisories/GHSA-h64f-5h5j-jqjh) | ✅ "If you are using Vercel, you are NOT impacted" — requiere self-hosting |
| 3 | `next/image` DoS SVGs | [GHSA-q8wf-6r8g-63ch / CVE-2026-64644](https://github.com/vercel/next.js/security/advisories/GHSA-q8wf-6r8g-63ch) | ✅ "Users on Vercel are not impacted" |
| 4 | `next/image` cache disk growth | [GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980](https://github.com/vercel/next.js/security/advisories/GHSA-3x4c-7xq6-9pq8) | ✅ "Note that this does not impact platforms that have their own image optimization capabilities, such as Vercel" |

**Fecha de verificación**: 2026-07-30 vía WebFetch a GitHub Security Advisories oficiales.

**Timer real que sí justificó el tren N15**: Next 14 alcanzó **End of Life el 2025-10-26** (9 meses y 4 días atrás al momento del arranque N15 — ver [HeroDevs EOL Timeline](https://www.herodevs.com/blog-posts/nextjs-eol-dates-version-support-timeline)). La línea 14.2.x quedó congelada en `14.2.35` (Sept 2025 fue la última publicación 14.2.x). Ya no recibe parches garantizados; futuras CVEs no necesariamente serán backporteadas o mitigables por Vercel-hosting. El tren N15 se ejecutó como mantenimiento preventivo pre-viaje del PO (ausencia sept–oct), con soak de ~2 meses en prod antes de esa ventana.

**Tren N15 en curso** (rama `next15` desde staging, 2026-07-30):
- N1 ✅ bump `next 14.2.35 → 15.5.22` + `eslint-config-next 14.2.3 → 15.5.22` (React 18.3.1 pinned por decisión PO — pages router soporta React 18 nativamente en Next 15).
- N2 ✅ migración `images.domains` → `images.remotePatterns` en `next.config.js` (5 hosts, `pathname: '/**'` mantiene permisividad equivalente).
- N3 pendiente: swap `next-pwa@5.6.0` → `@ducanh2912/next-pwa@10.2.9` (drop-in, decisión PO — `@serwist/next` queda backlog).
- N4 pendiente: audit `fetch()` en `getServerSideProps` + API routes para el flip de cache-default en Next 15.
- N5-N7 pendientes.

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
(retención extendida bajo Pro — ver "Plan Vercel" abajo).

**NO puedo** hacer acciones mutantes: redeploy, cambios de env vars,
cambios de dominios, cancelación de builds, cambios de deployment
protection. Todo eso requiere instrucción explícita en el turno vigente.
Cada consulta se cita en reportes igual que Supabase.

### Vercel plugin (oficial) — instalado 2026-08-04

Plugin oficial de Vercel instalado vía `/plugin` (autenticado con la cuenta
petmatecl de Aldo). Convive con el Vercel MCP hospedado — el plugin
expone superficie más rica de deployments/builds/crons + operaciones que
el MCP no tiene, sin exigir OAuth manual por sesión.

**Motivación operacional**: reemplazar el cuello de botella histórico del
"Ready confirmado" (~30 rondas en semana del 2026-08-04) por verificación
directa desde la CLI. El plugin son los ojos de Aldo sobre Vercel, no su
autoridad.

**REGLAS DE USO** (mismo espíritu que Supabase MCP + Vercel MCP):

- **VERIFICACIÓN de estado / lectura de logs / consulta de config**: libre.
  Ejemplos ok:
  - Consultar `deployment_status` de un SHA para verificar Ready antes de suite.
  - Leer runtime logs prod para diagnóstico.
  - Listar crons + `Last Run` en Fase 8 de checklists.
  - Ver env vars sin cambiarlas.
  Cada consulta se cita en reportes igual que Supabase/MCP.

- **ACCIONES MUTANTES**: **SIEMPRE con GO explícito del coordinador** en
  el turno vigente. Cero excepciones. La lista de mutantes incluye:
  - Redeploy / promote de un preview a prod.
  - Cambios de env vars (add/rm/update).
  - Cambios de dominios (add/rm).
  - Cancelar builds en curso.
  - Cambios de deployment protection / rotación de bypass token.
  - Cualquier flag `--force`, `--yes`, `--prod` de write.
  - Borrado de deployments / logs.

  "GO explícito" significa: el PO nombra la acción concreta con SHA o
  parámetros específicos en el turno actual. Autorizaciones anteriores
  ("cuando sea Ready, redeploy") **no cuentan** — el patrón sigue siendo
  el mismo que rige commit+push: acción reversible sin ask, acción
  irreversible con confirmación del turno.

- **Auth**: OAuth via `/plugin` (petmatecl). Sesión persistente local —
  no requiere re-auth por operación.

### Plugins Security Guidance + Code Review — instalados 2026-08-04

Ambos Anthropic-verified. **Rol operativo**: segundos revisores en la
Auditoría Integral #2 (jueves post-desfile). Mi pasada de code review
canónica + su barrido → las 3 fuentes van al triage único con score
comparable al formato audit del 2026-07-23. Si alguno resulta redundante
o ruidoso durante la evaluación previa, se descarta sin drama.

**Superficie a evaluar antes del jueves** (reportar cuando corran):
- Hooks activos (¿pre-commit? ¿pre-push? ¿on-review?).
- Agentes que exponen (¿new subagent_types en el listado?).
- Formato de output (¿markdown estructurado? ¿integra con `ReportFindings`?).
- Cobertura vs mi code-review actual (`.claude/skills/code-review`
  ya vigente).

### Plugins Playwright + Chrome DevTools — instalados 2026-08-04

Habilitan el **módulo "UX WALKTHROUGH NAVEGADO"** de la Auditoría #2 (jueves
post-desfile, sobre staging consolidado).

**REGLA CRÍTICA DE CREDENCIALES** (aplica a todo uso de estos plugins):
**PROHIBIDO navegar producción (`www.pawnecta.com`) con cuentas reales**.
Solo staging con las cuentas del setup e2e:
- Tutora: `acanocts+tutor@gmail.com` (Camila).
- Proveedor: `acanocts@gmail.com` (Aldo, cuenta de dev con rol admin).

Prod se navega **solo con browsing anónimo** (sin login) para smokes
públicos. Cualquier walkthrough logueado corre contra la URL de staging
del branch relevante. Misma disciplina que la suite Playwright (guard
deny-list en `e2e/setup/guard.ts` bloquea prod hosts).

**Diseño del módulo UX Walkthrough** (para el jueves):
- **Recorridos golden path**:
  - **Proveedor**: registro → perfil → publicar servicio → configurar
    agenda F1 y F2 → wizard etología con sus 12 campos.
  - **Tutora**: búsqueda → ficha → reserva F1 → reserva F2 → cancelación
    → reseña → página Mis reservas completa (pestañas + filtros + CTA
    vencida — los 3 aterrizados en PRODUCTO-2).
  - **Admin**: aprobación de proveedor + moderación.
- **Cosecha por recorrido**: errores de consola, requests fallidos
  (4xx/5xx en Network), estados visualmente rotos (screenshot), fricciones
  UX (heurísticas + a11y).
- **Entregable**: findings con score comparable al formato audit del
  2026-07-23 → entran al MISMO triage único del jueves junto al code
  review + los 2 plugins revisores → backlog priorizado.

**Evaluación pre-jueves**: verificar que ambos plugins operan (login de
prueba en staging + captura de un error de consola inducido como smoke).
Reportar superficie + resultado antes del monitor N15 cerrando.

## Workflow

Claude Code (VS Code) → commit + push a main → Vercel deploy automático
Rama principal: main
Supabase Management API con PAT para migraciones directas

**Criterio de cierre de commit — REGLA PERMANENTE (P1)**: `npm run build` local debe salir con **exit 0** antes de cualquier `git commit` que toque `.ts` / `.tsx`. `tsc --noEmit` por sí solo NO alcanza: `next build` corre además ESLint con reglas duras (`react-hooks/rules-of-hooks`, `react/*`) que rompen el build en Vercel pero **no aparecen en `tsc`**. Incidente que originó esta regla: dos sweeps consecutivos (`d218b70`, `275cf2e` — 24-07-26) fallaron el build silente por hooks tras un `if (!isOpen) return null`; los tsc locales dieron verde, las suites e2e también (porque corrían contra el deploy anterior aparentando verde), y staging quedó ~3h atrás del código. `npm run build` local hubiera atrapado el error en el primer commit.

**P1 enmienda — output completo del build, no solo exit code, cuando se agrega una biblioteca nueva — REGLA PERMANENTE (P1.1)**: `npm run build` con exit 0 NO alcanza cuando el sprint agrega o modifica la config de una biblioteca externa (SDK, plugin, framework, adapter). El SDK puede emitir warnings críticos en stderr (deprecations, config incompleta, hooks requeridos, permisos faltantes) que NO cambian el exit code pero indican que la feature no funciona en runtime. Regla operativa: (a) capturar el output COMPLETO del build a archivo (`npm run build > /tmp/build.log 2>&1`), no `tail -N`; (b) grep sobre el archivo por `warning|deprecat|action required|instrumentation|missing|required` **más el nombre del SDK/lib que se está tocando** (`@sentry`, `@stripe`, `@openai`, etc.); (c) reportar cada match en el chat como parte del cierre del sprint, junto con la acción tomada (fix aplicado, ignorado con justificación, o deuda anotada). Aplicar en TODO sprint que toque una lib nueva o modifique la config de una existente — no solo al agregar. Incidente que originó la enmienda: R3 SENTRY-1 promovido a prod en 3 iteraciones (`sentry-1-prod-20260811`, `sentry-csp-prod-20260811`, `sentry-flush-prod-20260811`) sin `instrumentation.ts` que Next 15 requiere para inicializar el SDK server. El warning `[@sentry/nextjs] Could not find a Next.js instrumentation file. An instrumentation file is required for the Sentry SDK to be initialized on the server` venía en stderr desde el primer build. Se perdió por leer solo `tail -3` del output. Otro warning del mismo sprint decía literalmente `ACTION REQUIRED` — el build llevaba semanas pidiendo cosas que nadie leía. 3 iteraciones y ~4 horas de debugging fueron el costo del atajo. Con el pass sobre output completo, el bug estructural se hubiera detectado en el primer merge.

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

**Evidencia por fase de un checklist en ejecución — REGLA PERMANENTE (P5)**: cuando un checklist de merge está en curso (`MERGE_*_PROD_CHECKLIST.md`), la evidencia de cada fase completada se **commitea al archivo del checklist en el repo** en el momento de completarla — casilla `[x]` marcada + bloque `**Ejecución <fecha>**:` con los outputs esenciales pegados (SHA, wall time, conteos, verificaciones, MCP queries). El acta vive en git como fuente de verdad; el chat es solo coordinación (efímero, se pierde). Sin este anclaje, un reset del contexto o una falla de red puede dejar la ejecución sin trazabilidad reconstruible. Incidente que originó esta regla: durante N7 Fase 2 del tren N15 (2026-07-31), el output de la suite 41/41 contra preview `next15` con whitelist activa fue reportado solo en el chat; el PO tuvo que pedir re-acreditación en el turno siguiente porque no encontraba la evidencia atada al checklist. Aplica a cualquier `MERGE_*_PROD_CHECKLIST.md` en ejecución activa, no solo el tren de turno.

**Verificación de nombres de columna contra `information_schema` antes de entregar SQL — REGLA PERMANENTE (P6)**: cualquier migration/SQL que referencie columnas de tablas existentes debe validar los nombres contra `information_schema.columns` vía MCP staging (o SQL Editor manual) **ANTES de entregar el archivo para ejecución**. Cero confianza en memoria, en grep de otros archivos, o en asunciones de nomenclatura patrón. Los nombres de columna difieren entre tablas semánticamente relacionadas (`agendamientos.duracion_min` snapshot de reserva vs `servicios_publicados.duracion_slot_min` config del slot); grepear el nombre en un archivo puede llevar a la tabla equivocada. Además, el tipo (nullable/NOT NULL) importa para los semáforos — un `NOT NULL` colado en un `IS NOT NULL` es siempre-true (redundancia lógica que enmascara bugs).

**Extensión a queries de investigación ad-hoc (2026-08-25, 3ª instancia de slip en un día)**: la regla P6 aplica NO solo a migrations que se van a ejecutar contra prod, sino a **cualquier SQL que el auditor entrega al PO para copiar/pegar en Studio, incluyendo queries de investigación read-only**. Cuando el auditor está por escribir SQL para una tabla y "sabe" el nombre de una columna por proximidad semántica (`categoria_slug` cuando existe `categoria_id`, `email` cuando existe `email_publico`, etc.), ejecutar el `SELECT column_name FROM information_schema.columns WHERE table_name='X'` **PRIMERO**, no como fallback tras el fail del PO. Es la misma superficie de error del corolario P8 11ª (atribución sin verificar) aplicada a schema knowledge — el auditor confía en memoria de nombres cuando tiene MCP disponible para verificarlos gratis. Incidentes en un solo día (2026-08-25): (i) query mascotas duplicadas Etología con `categoria_slug` — real es `categoria_id` uuid FK a `categorias_servicio.id`. PO tuvo que escribir la query correcta con el JOIN correcto. Predicho "0 servicios Etología en prod" empíricamente confirmado por el PO — pero el mecanismo de verificación que le entregué al PO falló, otra vez P8 5ª (verificación reventa mientras verificado sí funciona). Regla operativa refinada: **si el auditor escribe SQL con un nombre de columna que NO acaba de leer de `information_schema` en el turno vigente, es hipótesis de nombre, no hecho**. Marcar explícito como "verificar antes de ejecutar" o ejecutar el `information_schema` inline como primer bloque del SQL.

Comando canónico vía MCP:
```sql
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema='public' AND table_name='<tabla>'
   AND column_name IN ('<col1>', '<col2>', ...);
```

**⚠️ Excepción crítica agregada 2026-08-14** — P6 solo cubre nombres de **columna** vía `information_schema.columns` (que es visible al rol MCP con SELECT). Para verificar **constraints, indexes, triggers, permisos, secuencias**, `information_schema` es UNSAFE con el rol read-only del MCP — filtra por privileges y puede reportar `[]` para objetos que sí existen (ver corolario P8 abajo con incidente 2026-08-14 sprint bug1-fks: reporté "cero FKs" cuando había 41). **Regla ampliada de P6**:
  - Columnas + tipos + nullable: `information_schema.columns` sigue OK (mismo query que P6 declara).
  - Foreign keys / delete rules: `pg_constraint` con `contype='f'` + join `pg_class`/`pg_namespace`/`pg_attribute`.
  - Índices: `pg_index` con join `pg_class`.
  - Triggers: `pg_trigger`.
  - Privileges de rol: `has_table_privilege(rol, tabla, 'REFERENCES')` etc.
  - **Regla operativa nueva**: si la verificación fundamenta una conclusión de severidad alta o va a decidir el alcance de un sprint, contrastar por segunda vía (query paralela desde SQL Editor de Supabase Studio con rol `postgres`, que ve todo) antes de reportar. Toma 10 segundos y descarta el sesgo de privileges del MCP.

Incidente que originó esta regla: PR1 sprint PRODUCTO-1 (2026-07-31). La migration `20260731_buscar_servicios_agenda_activa.sql` referenció `s.duracion_min` en el RPC `buscar_servicios` — nombre inexistente en `servicios_publicados` (real: `duracion_slot_min`). PL/pgSQL NO valida columnas al CREATE — el DROP+CREATE aplicó ok (V1 pasó), pero cualquier ejecución del RPC reventó con `ERROR 42703 column s.duracion_min does not exist`. Explorer de staging/previews caído en su path RPC hasta el fix (`20260731_buscar_servicios_agenda_activa_fix.sql`). Bug secundario detectado en el mismo diagnóstico: `min_noches` es NOT NULL en el schema, así que `IS NOT NULL` era siempre-true — semáforo redundante. Los dos bugs se hubieran evitado con una query de 5 segundos contra `information_schema` antes de escribir el SQL.

**Fecha del tag anotado ≠ fecha del commit apuntado — REGLA OPERATIVA (no P-numerada, 2026-08-20)**: para timestamps de deploy en actas y evidencia P5, usar `git for-each-ref --format='%(creatordate:iso)' refs/tags/<tag>` (fecha del objeto tag, la que se registra cuando se ejecuta `git tag -a ...`). **NO usar** `git log --format=%ci -1 <tag>` — devuelve la fecha del **commit** al que apunta el tag, que puede ser días antes si hubo ventana entre el commit final y el merge+push. Instancia P8 de manual sobre gestión de sprints: comando corre, no falla, devuelve un valor plausible que no es lo que se declaró medir. Incidente que originó la regla: acta de badge-f1 (2026-08-20) — con el método incorrecto habría quedado registrando el deploy a prod 2 días antes de que ocurriera (`d0cffb2` commit del 2026-08-18 18:29 vs tag creado 2026-08-20 11:51). Aplicar en toda `ACTA_*.md` con timestamp de deploy y en cualquier auditoría que ordene por fecha de release.

**`SET LOCAL role='service_role'` NO se propaga al schema `auth` — COROLARIO OPERATIVO (adición 2026-08-20)**: la regla del `SET LOCAL role='service_role'` documentada más abajo aplica al schema `public` (bypass de triggers `_guard_fn`), pero es **contraproducente para operaciones sobre `auth.users` u otras tablas del schema `auth`**. El SQL Editor de Supabase Studio corre por default como `postgres` (superuser); ese rol tiene DELETE/UPDATE completos sobre `auth.users`. `service_role` es rol de aplicación que Supabase mantiene con **menos privilegios sobre `auth.*`** para reducir superficie de errores desde código app (los signup/updateUser/deleteUser de la API `admin.*` van por un canal internal que sí puede). Al hacer `SET LOCAL role='service_role'` bajamos de superuser a rol de app y quitamos el permiso. Matriz operativa:

| Objetivo del SQL | Schema | Rol correcto en SQL Editor |
|---|---|---|
| Bypass trigger `proveedores_guard_fn` para UPDATE de `estado`, `roles`, etc. | `public.proveedores` | `SET LOCAL role='service_role'` |
| Bypass triggers `certificaciones_guard_fn`, `evaluaciones_guard_fn`, `servicios_publicados_guard_fn` | `public.<tabla>` | `SET LOCAL role='service_role'` |
| DELETE / UPDATE de `auth.users` (por email, cleanup smoke, etc.) | `auth.users` | Sin `SET LOCAL` — quedarse en `postgres` |
| Consultas SELECT sobre `auth.users` para joins | `auth.users` | Sin `SET LOCAL` (SELECT permitido en ambos) |
| Mixto (UPDATE public + DELETE auth en la misma transacción) | mixto | Dos bloques separados, uno con SET LOCAL, otro sin |

Incidente que originó el corolario: cleanup S4-bis post-smokes F1 (2026-08-20). El DELETE de `auth.users` (email del proveedor smoke) con `SET LOCAL role='service_role'` en el mismo bloque falló con `42501: permission denied for table users`. Aldo lo resolvió sacando el SET LOCAL — cero cambio a la operación, solo restaurar `postgres` como rol activo. Cascade posterior verificada, cero filas huérfanas en `proveedores`, `certificaciones`, `contactos`, `evaluaciones`, etc.

**UPDATE manual desde SQL Editor sobre columnas protegidas por triggers `_guard_fn` — REGLA OPERATIVA (no P-numerada, 2026-08-18)**: cuatro tablas del schema tienen triggers user-defined que rechazan mutaciones a columnas sensibles desde roles no privilegiados: `proveedores.proveedores_guard_fn`, `certificaciones.certificaciones_guard_fn`, `evaluaciones.evaluaciones_guard_fn`, `servicios_publicados.servicios_publicados_guard_fn`. En `proveedores` (el más relevante), las columnas bloqueadas son `estado`, `roles`, `rut_verificado`, `aprobado_at`, `aprobado_por`, `motivo_rechazo`, `codigo_referido`, `auth_user_id`, `id`, `created_at`. `verificacion_estado` tiene guardia parcial: owner puede transicionar solo entre `sin_enviar` ↔ `pendiente`; `aprobado`/`rechazado` es admin-only. Cualquier `UPDATE` desde el SQL Editor de Supabase Studio (que corre por default como `authenticated`) falla loud con `ERROR 42501: proveedores.<col> can only be changed by admin or service role`. Todos los triggers hacen bypass explícito para `service_role` y admin (via `is_admin() = TRUE`).

**Fix operativo**: envolver el bloque con `SET LOCAL role = 'service_role';` dentro de la transacción. Ejemplo canónico:

```sql
BEGIN;
SET LOCAL role = 'service_role';
UPDATE public.proveedores
   SET estado = 'aprobado', aprobado_at = NOW(), aprobado_por = NULL
 WHERE estado = 'pendiente'
   AND (es_ejemplo IS DISTINCT FROM true)
RETURNING nombre, apellido_p, estado;
COMMIT;
```

`SET LOCAL` es scoped a la transacción — al `COMMIT`/`ROLLBACK` el rol vuelve al default automáticamente. **NO usar** `SET SESSION role` (deja rol elevado hasta cerrar sesión). Incidente que originó la regla: migration `20260818_auto_aprobar_7_pendientes.sql` del sprint badge-f1 (2026-08-18). El bloque original no contemplaba el trigger; Aldo lo resolvió agregando `SET LOCAL role = 'service_role';` durante la corrida — 7 proveedores aprobados correctamente. **Verificación previa obligatoria antes de cualquier migration futura que toque columnas sensibles**: `SELECT pg_get_functiondef('public.<tabla>_guard_fn'::regproc);` para el listado actualizado (el schema del trigger puede cambiar). Aplica también a F1b (RUT-gate) — el endpoint server-side ya usa service_role vía `SUPABASE_SERVICE_ROLE_KEY`, entonces cero problema, pero cualquier prueba manual en SQL Editor requiere el SET LOCAL.

**Verificar fecha contra evidencia antes de gatillar ventanas temporales — REGLA PERMANENTE (P7)**: cuando una decisión depende de que una ventana temporal se haya cumplido (monitor 48h, deadline programado, "esperar N horas desde X"), verificar la fecha REAL contra evidencia CONCRETA antes de declarar la ventana cumplida — no inferir del contexto operativo ni asumir el día de la semana. Evidencia válida: (a) día explícito confirmado por el PO en el turno vigente, (b) timestamps de git (`git log --format=%ci -1 <sha>`), (c) captura de dashboard con timeline visible, (d) el `system-reminder` de fecha del entorno si está presente. Cuando la fecha del sistema da solo `YYYY-MM-DD` (sin día de la semana), **calcular explícitamente** con un comando en vez de asumir. Incidentes que originaron esta regla: (i) 2026-07-25 tren F2, reporté "ventana 24h cumplida" un turno antes del cierre real; (ii) 2026-08-04 monitor N15 Fase 8, reporté "hoy jueves 6-ago" cuando era martes 4-ago noche — la ventana 48h estaba a ~44h de cerrar. Ambas prevenibles con un `date` command o consulta explícita al PO antes de gatillar el flujo dependiente. Costo del error: falso arranque de flow crítico que exige rollback mental del PO.

**Ante un resultado negativo, verificar primero que el método detecta un positivo conocido — COROLARIO P8 (adición 2026-08-18, 10ª instancia del meta-patrón)**: los resultados negativos ("cero matches", "cero filas", "dashboard vacío", "sin issues", "sin logs", "sin errores") son **estructuralmente ambiguos** — pueden significar (a) ausencia del problema o (b) ausencia de medición. El default cognitivo es leer (a), pero solo (a) es evidencia; (b) es fallo silente del método. Un resultado positivo se autovalida (algo apareció, alguien lo generó); un resultado negativo no prueba nada por sí solo. **Regla operativa**: antes de aceptar un resultado negativo como conclusión, probar el método con un caso positivo conocido — si el grep no encuentra X, verificar que sí encuentra algo que existe; si la query no retorna filas, verificar que retorna algo con un filter más laxo; si el dashboard está en 0, generar 1 evento controlado y ver que aparece. Es el mismo antídoto (d) del corolario P8 5ª instancia (assertion PL/pgSQL — probar el bloque con un caso donde SÍ deba fallar) **generalizado a todo tipo de verificación**. Incidentes que originaron el corolario acumulando 10 instancias en 3 días: migration `IF NOT EXISTS` retornando "sin cambios" leído como "ya estaba en el estado deseado" (P8 3ª — realidad: matcheó por nombre, semántica divergente); MCP `information_schema.table_constraints` retornando `[]` leído como "cero FKs" (P8 4ª — realidad: rol sin REFERENCES privilege); Upstash dashboard "Total Commands: 0" leído como "Redis no ejecutó" (P8 8ª — realidad: latency de reporte free tier + TTL 60s); Sentry dashboard "cero issues rate-limit" leído como "no hay fallos" (P8 7ª — realidad: gate a production silencia preview); `grep AlertCircle` retornando 0 matches leído como "fix aterrizó en prod" (P8 10ª — realidad: patrón escapado con espacio de más que no matcheaba el HTML formatted, detectado por auto-aplicación en el mismo turno de merge Ola 2 B3 2026-08-18). **Ancla cognitiva**: la primera línea del smoke que reporta "cero X" debe estar precedida por una línea que reporte ">0 Y_conocido" con el mismo método — si Y_conocido también da 0, el método está roto, no el sistema. Ese par de líneas hace que un smoke sea auditable: sin él, un resultado negativo es acto de fe.

**Refactor de union type que renombra literales → grep exhaustivo del literal viejo obligatorio antes del commit — REGLA OPERATIVA (no P-numerada, 2026-08-25)**: cuando un refactor cambia los valores literales de un union type TypeScript (ej. `'expired' | 'invalid' | 'unknown'` → `'used_or_expired' | 'unknown'`), el `Edit` tool con `replace_all: true` **NO garantiza cobertura de todas las ocurrencias del literal viejo**: replazca cada match exacto del `old_string`, pero si el literal aparece en contextos con espaciado/comentarios/casos ligeramente distintos (ej. dentro de una regex, en una string interpolada, en otro `failWith(..., 'invalid')` con distinta indentación), quedan intocados y el output "All occurrences replaced" es engañoso — solo cambió las N que matcheaban el patrón exacto, no todas las N reales. Obligatorio post-refactor: `grep -nE "'literal-viejo-1'|'literal-viejo-2'" <archivo>` **antes** del build. Si el grep devuelve match, hay residuos que TypeScript va a rechazar. **Combinar con la regla P1.1 abajo** (build + grep encadenados con `&&` antes del commit).

Incidente que originó la regla: sprint email-landing hotfix (2026-08-25) colapsó `errorKind: 'expired' | 'invalid' | 'unknown'` → `'used_or_expired' | 'unknown'` en `pages/email-confirmado.tsx`. 3 commits necesarios para completar el hotfix por residuos incompletos: (1) `1c9666d` dejó una ocurrencia sin tocar → TS error L164; (2) `b7c1691` arregló L164 pero dejó L181 sin tocar → TS error L181; (3) `0fa0ead` cerró tras grep exhaustivo. Los 2 primeros commits pushearon con `npm run build` exit 1 porque el `git commit` no estaba encadenado (ver regla siguiente). Costo: 3 pushes, 2 builds rojos en preview, ~15 min extra.

**Encadenar `npm run build && git commit` cuando build es prerequisito de correctitud — REGLA OPERATIVA (no P-numerada, 2026-08-25)**: cuando el build es parte del criterio de correctitud del commit (regla P1.1 del proyecto: `npm run build` exit 0 antes de cualquier `git commit` que toque `.ts`/`.tsx`), la ejecución bash **debe encadenarse con `&&`** — no dejarlos como comandos separados. Bash sin `&&` respeta el exit del comando anterior solo si el shell falla; con exit code non-zero pero sin trap, el siguiente comando corre igual. Un `npm run build > /tmp/log 2>&1` seguido de `git add ... && git commit ...` en el mismo one-liner ejecuta el commit **incluso si el build falló** — se pushea código roto.

Patrón canónico correcto:

```bash
npm run build > /tmp/build.log 2>&1 && { grep -iE "warning|deprecat" /tmp/build.log | ...; git add ...; git commit -m "..."; } || { echo "BUILD FAILED — abort commit"; tail -20 /tmp/build.log; exit 1; }
```

O más simple y robusto:

```bash
npm run build > /tmp/build.log 2>&1 || { echo "BUILD FAILED"; tail -20 /tmp/build.log; exit 1; }
# ... solo si llegamos acá, build pasó — continuar con grep + commit
git add ... && git commit -m "..."
```

Incidente que originó la regla: mismos 3 commits del sprint email-landing hotfix (2026-08-25). Los primeros 2 pushearon con exit 1 del build. Aplicar en toda operación con `git commit` post-build. **Complementa** la regla P1.1 (que dice "build antes de commit") con la mecánica bash que la hace inviolable.

**Antes de emitir una atribución causal (X explica Y), verificar contra el positivo conocido — COROLARIO P8 (adición 2026-08-20, 11ª instancia del meta-patrón — generalización a análisis, no solo smoke)**: el corolario P8 10ª ("resultado negativo → verificar el método con positivo conocido") se aplicaba a **verificaciones instrumentales** (grep, query, dashboard). Se generaliza acá a **atribuciones causales en reportes narrativos**: cuando el auditor escribe "X explica Y" (bug root explica huérfanas, config rota explica caída, race condition explica flakiness), antes de darlo por bueno debe verificar la correlación temporal/estructural contra los datos de Y — no confiar en la plausibilidad de X. Una atribución plausible que no se contrasta cae en el mismo P8: enunciado ejecutado (auditor lo escribió), sin efecto real (no se midió), y una tercera parte (PO, lector futuro) puede tratarlo como hecho establecido a los 3 meses.

**Regla operativa**: para toda atribución causal en respuestas al PO o docs (`ACTA_*.md`, `REPORTE_*.md`, comentarios de commit largos), obligar la línea de contraste antes de emitir: "según los datos, X y Y correlacionan así: {distribución/timestamps/counts}". Si la correlación no se sostiene o no se puede verificar, decir explícitamente **"hipótesis, sin verificar"** o eliminar la atribución. La reticencia a hacerlo suele indicar que la evidencia no está — ese momento es la señal para no escribir la atribución.

Incidente que originó el corolario (2026-08-20, diagnóstico P0 `%20` post-smokes F1): el auditor atribuyó las 15 huérfanas "nunca confirmaron" del rango dic-2025 → mar-2026 al bug del `%20` en Site URL de Supabase Auth prod. Doble error contra evidencia disponible en el mismo turno: (a) contradicción con la propia evidencia del auditor — el mecanismo del `%20` pasa por `admin.generateLink`, agregado en commit `fad1875` (12-mar-2026); casi toda la ventana atribuida (dic-2025 → 11-mar-2026) es **anterior al mecanismo mismo**; (b) datos empíricos del PO: los 15 no-confirmados están **repartidos parejo por mes** (dic:1, ene:6, feb:4, mar:4), sin salto en marzo cuando el mecanismo del `%20` entró en escena. Si el `%20` fuera la causa, el patrón esperable sería 0 antes del 12-mar + salto post; el patrón observado es lo opuesto (mayoría pre-mar). El PO tuvo que hacer explícito el error y traer la distribución mes a mes que el auditor no consultó antes de escribir la atribución. Costo del error: **atribución causal falsa que, si aterrizaba a docs, se leería como hecho establecido a los 3 meses cuando nadie recuerde que fue inferencia**.

**Antídoto específico**: cuando el auditor emite "explica" / "por eso" / "causa de" / "root de", *antes* de escribir la frase, pausa mental para preguntarse (a) ¿tengo la distribución temporal/estructural del efecto Y para contrastarla?; (b) ¿el mecanismo X existió durante toda la ventana de Y?; (c) si Y es un conjunto (huérfanas, caídas, casos), ¿revisé su composición o extrapolé desde 1-2 casos vistoso? Si alguna de las tres es "no", la atribución es hipótesis, no explicación. Docs registran hechos verificados o hipótesis rotuladas — no plausibilidades sin marcar.

**Verificación de que este error no aterrizó a `.md`**: grep 2026-08-20 sobre patrones de la atribución (`15 huérfan`, `%20 histór`, `DNS_PROBE`, `pawnecta.com%20`) en `**/*.md` → 0 matches. Método positivo confirmado con `badge-f1` que sí aparece 14 veces en `ACTA_BADGE_F1.md`. La atribución falsa quedó solo en la respuesta al PO de ese turno; cero riesgo de que se lea como hecho establecido en el repo. Documentado acá como caso canónico de aplicación futura.

**Preferir señales síncronas del propio sistema por sobre dashboards de terceros con latencia o retención corta — COROLARIO P8 (adición 2026-08-14 noche, 8ª instancia del meta-patrón)**: cuando la verificación de que "algo ocurrió" está mediada por un dashboard externo con reporte agregado (Upstash "Total Commands", GA4 Realtime, Vercel Analytics, Sentry Issues), ese dashboard **no distingue entre tres estados**: (a) el evento no ocurrió, (b) ocurrió pero aún no fue agregado por la latencia interna del proveedor, (c) ocurrió y ya expiró por TTL / retención corta. Los tres se ven idénticos: "cero". Sin distinguirlos no se puede sacar conclusión firme del sistema observado. La única forma de evitar el pantano es exponer, desde el propio sistema en el momento de la request, una señal que solo puede existir si el efecto ocurrió — y verificar esa señal síncrona en vez del dashboard. **Ejemplos canónicos**: `X-RateLimit-Backend` header en el response del limiter (fue el aporte del sprint A4 fase 2 — resolvió en 1 request lo que dos turnos de análisis del dashboard Upstash no pudieron); `X-Cache: HIT|MISS` de CDN; `X-Sentry-Id` header en response para saber que la captureException emitió ID no cero; `RETURNING` de un DELETE para ver las filas afectadas en la misma corrida. Incidente que originó el corolario (2026-08-14 smoke A4 preview): el PO leyó "dashboard Upstash Total Commands: 0" como "Redis no ejecutó" — sin considerar que el free tier agrega comandos con delay + las claves TTL 60s expiran antes de que uno mire. Realidad post-diagnóstico: Upstash SÍ ejecutó (evidencia por firma del Retry-After = fixedWindow alineado al reloj UNIX + `X-RateLimit-Remaining` bajando 4→3→2→1→0 entre requests, comportamiento imposible sin estado compartido). **Regla operativa nueva**: cuando el diseño de un smoke depende de "consultar un dashboard externo para verificar efecto", agregar EN EL MISMO SPRINT una señal síncrona (header, campo de response, log de la propia request) que exhiba el efecto sin depender del dashboard. Los dashboards son útiles como visor persistente para el operador, no como assertion de verificación en un smoke.

**Verificación de que un deploy tiene un SHA específico — REGLA OPERATIVA (no P-numerada)**: para confirmar "el deploy que responde en esta URL es el commit X y no un commit anterior", **NO** comparar `BUILD_ID` local con `BUILD_ID` que sirve el server. Next.js genera el `buildId` (`.next/BUILD_ID`) con nanoid random en cada `next build` — dos builds del mismo commit git dan buildIds distintos, así que comparar prueba solo "es el mismo build binario" (raro), no "es el mismo git SHA". **Método válido**: consultar un endpoint o contrato que solo exista en el SHA nuevo. Si el server responde con el contract nuevo, el deploy es de ese SHA o posterior; si responde 404 / con el contract anterior, el deploy es del previo. Es la misma lógica de P8 aplicada al deploy — **verificar contra un efecto que solo puede existir si el commit se aterrizó en runtime**, no contra una señal que se compone lateral al efecto. Ejemplos: endpoint API nuevo del sprint (GET → 401/200 si existe, 404 si no); header response que solo emite el código del SHA nuevo; campo de response con schema extendido. Incidente que originó la regla: sprint A4 (2026-08-14) — mi poll de background por `BUILD_ID` local vs prod timeouteó a los 5 min porque **el método era estructuralmente inválido** (`next build` en Vercel produce buildId distinto al de mi `next build` local), no porque el deploy hubiera fallado. La verificación funcional correcta (GET `/api/admin/rate-limit-status` → 401 = endpoint feature-nuevo existe = deploy es 1decaee o posterior) confirmó el deploy en 1 segundo. Alternativa opcional para hacerlo determinístico: setear `generateBuildId: () => process.env.VERCEL_GIT_COMMIT_SHA || nanoid()` en `next.config.js` — no lo hicimos porque el método del endpoint feature-nuevo funciona sin cambio a la config.

**SQL Editor de Supabase NO mantiene transacciones entre ejecuciones separadas — COROLARIO P8 (adición 2026-08-14 noche, 6ª instancia del meta-patrón)**: cada botón "Run" abre su propia transacción implícita y hace COMMIT/ROLLBACK al terminar la corrida. Un `BEGIN;` en una corrida y un `COMMIT;` en otra **NO** forman una única transacción — el `BEGIN;` de la primera corrida cierra en ROLLBACK al finalizar esa ejecución, y el `COMMIT;` de la segunda no tiene transacción abierta que persistir. **`RETURNING` de un `DELETE` en la primera corrida devuelve las filas correctamente (parece exitoso) pero la transacción hace ROLLBACK silencioso al terminar la corrida**. Patrón P8 puro: output correcto, efecto ausente. **Regla operativa**: `BEGIN;` + `DDL/DML` + `COMMIT;` deben ir en un **único bloque enviado con un único click de Run**. Nunca separar corridas. Incidente que originó el corolario: A2 prod (Aldo, 2026-08-14 tarde) — primer intento fue `BEGIN` en corrida 1 + `DELETE FROM proveedores WHERE es_ejemplo=true RETURNING ...` (9 filas devueltas correctamente) en corrida 2 + `COMMIT` en corrida 3 → rollback silente entre 1 y 2, el DELETE fue no-op efectivo. Detectado al re-verificar con `SELECT COUNT(*) WHERE es_ejemplo=true` y ver 9 filas seguían. Fix: `BEGIN; DELETE ... RETURNING ...; COMMIT;` en un solo bloque → persistió (`ejemplos_restantes: 0`, `proveedores: 20→11`). Aprendizaje meta: **6ª instancia del día del patrón "output correcto, efecto ausente"** (Sentry `sent:true` sin envío real; GA4 log extensión inexistente en bundle real; migration `IF NOT EXISTS` no-op silencioso; MCP `information_schema` vacío por privileges; assertion `DO $$` reventando; ahora `BEGIN`/`COMMIT` en corridas separadas del SQL Editor). Documentado en `MIGRATION_FKS_HABILITANTES.md §4.3` con alternativa segura (dry-run destructivo con `BEGIN;` + `DELETE ... RETURNING;` sin `COMMIT;` — el rollback silente del propio SQL Editor **se convierte en feature**: permite ver el RETURNING sin persistir).

**El mecanismo de verificación puede fallar mientras la operación verificada está bien — COROLARIO P8 (adición 2026-08-14 tarde, 5ª instancia del meta-patrón)**: cuando una migration o smoke incluye un bloque de assertion post-operación, verificar SEPARADAMENTE que el bloque de assertion mismo funciona. En un caso registrado (correctiva FKs prod, sprint bug1-fks, 2026-08-14), el DDL principal aplicó correcto (3 CASCADE → RESTRICT), pero el bloque de assertion `DO $$ ... FOREACH SLICE 1 IN ARRAY esperado ...` reventó con `ERROR 42P01: relation 'actual_rule' does not exist` en prod (staging había pasado con el mismo SQL — hipótesis: parser inconsistente con `text[][]` + `FOREACH SLICE`, o el delimiter `$$` tratado distinto entre sesiones del SQL Editor Supabase). Lo que confirmó el estado real fue una **query manual del PO**, no el mecanismo diseñado específicamente para eso. **Patrón meta**: el mecanismo de verificación falló mientras la operación verificada estaba bien — 5ª instancia del día (Sentry `sent:true`, GA4 log extensión, migration `IF NOT EXISTS` no-op, MCP `information_schema` vacío, ahora assertion `DO $$` reventando). Antídoto operativo: (a) preferir `pg_catalog` sobre `information_schema` en assertion blocks (mismo motivo que el corolario MCP siguiente); (b) usar `FOR r IN (VALUES ...) AS t(col1, col2) LOOP` idiomatico en vez de `FOREACH SLICE` sobre arrays multidim; (c) variables PL/pgSQL prefijadas con `v_` para eliminar edge cases de parser; (d) probar el bloque de assertion en staging con **al menos un caso donde SÍ deba fallar** (ej. una FK esperada que NO existe todavía) para confirmar que RAISE EXCEPTION se dispara — sin ese test negativo, no sabemos si el "verde" es "OK" o "fallo silente del propio verificador".

**MCP read-only y `information_schema` — sesgo por privileges — COROLARIO P8 (adición 2026-08-14)**: las verificaciones de schema hechas con el rol read-only del MCP (`supabase_read_only_user`) tienen un sesgo conocido: **`information_schema` oculta objetos sobre los que el rol no tiene privilegios**. Documentado en PostgreSQL cap. 34: las vistas `information_schema.table_constraints`, `information_schema.table_privileges`, `information_schema.role_column_grants`, etc., filtran filas por privileges del rol consultante. `supabase_read_only_user` tiene SELECT + BYPASSRLS pero **no REFERENCES/USAGE/etc.**, entonces las FKs / algunas grants / algunos triggers quedan invisibles en `information_schema`. **Para cualquier afirmación sobre existencia o ausencia de constraints, índices, triggers, permisos o secuencias, usar `pg_catalog` (`pg_constraint`, `pg_index`, `pg_trigger`, `pg_class`, `pg_attribute`) en vez de `information_schema`, o contrastar ambos**. `pg_catalog` es catálogo de sistema sin filtro por permisos — cualquier rol autenticado ve el estado real. **Instrucción operativa**: si una consulta vía MCP fundamenta una conclusión de severidad alta, contrastarla por una segunda vía antes de reportarla (SQL Editor de Supabase Studio corre con `postgres`/`supabase_admin` y ve todo — un `SELECT COUNT(*)` toma 10 segundos y descarta el sesgo). Incidente que originó el corolario: 2026-08-14 sprint bug1-fks — reporté "cero FKs en 12 tablas del proyecto → SEVERIDAD ALTA sistémico BD" basado en `information_schema.table_constraints` que devolvió `[]`. Realidad verificada por PO desde SQL Editor: **41 FKs en el schema public**. Todas las 10 FKs "nuevas" del sprint YA existían con esos nombres exactos → migration `20260814_fks_habilitantes.sql` fue NO-OP completo. **Costo del error**: sprint entero motivado por premisa falsa. Deuda técnica listada erróneamente en BACKLOG (removida post-mortem). Diagnóstico de bug relacionado (C1 400 ConversionMetrics "por FKs missing") también erróneo — causa real era FK mismatch en el embed (`!sitter_id(proveedores)` cuando FK apunta a `auth.users`). Cuarto instancia del día del meta-patrón "una verificación corrió, devolvió resultado, nadie lo contrastó contra la realidad" — precedentes Sentry `sent:true`, GA4 log extensión, migration `IF NOT EXISTS` no-op silencioso. **Vacío no es lo mismo que cero**: cuando una consulta devuelve nada, primera hipótesis es que la consulta está mal (rol, permisos, filter, syntax), no que el dato no existe.

**Verificar contra el sistema del producto, no contra tooling de dev — COROLARIO P8 (adición 2026-08-14)**: la verificación del efecto observable debe hacerse contra la **superficie del sistema en producto** (dashboard oficial, endpoint del proveedor, BD del propio sistema, respuesta HTTP real), NO contra **herramientas de desarrollo, extensiones de navegador o interceptores intermedios** que agregan capas de interpretación. Un log de tooling puede reportar un fallo que no existe, igual que puede ocultar uno que sí — su lectura del sistema pasa por su propia estructura interna, que puede diverger del comportamiento real observable en el producto. Antes de perseguir un diagnóstico basado en output de tooling, verificar primero la señal equivalente en la superficie del propio sistema: si son inconsistentes, el tooling puede ser el equivocado. Incidente que originó el corolario: **GA4 diagnóstico 2026-08-14** — 3 iteraciones (`ga4-fix @ 3fb1ad5` + rondas de análisis del SW cross-origin + análisis de la estructura interna del gtag) perseguidas contra el log `Sending event "X" to undefined` de la extensión Chrome **GA Debugger**. Verificado post-mortem descargando el bundle del script GA (497 KB de `googletagmanager.com/gtag/js?id=X`): la string `"Sending event"` **NO existe** en ese código. El log venía de la extensión, que inspecciona la estructura interna `destinationId` del gtag (distinta del `tid` que se envía en `/g/collect`) y reporta `undefined` cuando esa clave interna está vacía — **aunque los eventos SÍ lleguen a GA4 y se procesen correctamente**. La verificación decisiva era `Reports → Realtime → eventos por nombre` (superficie del producto GA4): mostró 5 hits de `registro_proveedor_iniciado` en 24h + los 3 tests manuales llegando. GA4 nunca estuvo roto. **Costo del error**: 3 iteraciones + ~3 horas persiguiendo un bug inexistente + un fix (`ga4-fix`) que arreglaba algo que no fallaba y hubo que revertir (`ga4-revert`). **Antídoto operativo**: cuando `X.debug` / `Y.log()` / `extensión.output` diga "algo falla", el próximo paso NO es investigar por qué X falla — es verificar en la superficie del producto (dashboard oficial, endpoint público, reporte usuario final) si el efecto real ocurre. Solo si ahí también falla, entonces investigar el pipeline técnico. Aplica a Sentry dashboard (Issues tab), GA4 (Realtime + Reports), Resend (Emails Delivered tab), Supabase (Table Editor / SQL), Vercel (Production URL). El tooling de dev es asistente de debug, no sistema de verdad.

**Smoke debe ejercitar el camino del usuario Y verificar el efecto observable, no la señal del emisor — REGLA PERMANENTE (P8)**: cuando una funcionalidad tiene más de un camino de ejecución (cliente / servidor / edge) o el envío de un side-effect atraviesa un sistema externo (Sentry ingest, Resend delivery, Supabase RPC, webhook downstream), el smoke debe (a) ejercitar el camino que los usuarios finales ejercen en producción, no una ruta interna alternativa por ser fácil de instrumentar; y (b) verificar el efecto en el sistema observado (evento en dashboard, email en Delivered, fila en BD, response del downstream), no la señal que devuelve la propia librería que estás probando. Un smoke que falla ambas — o cualquiera — produce **falsa confianza**: es peor que no tener smoke porque cierra la investigación cuando el sistema falla silente en el path real. Pregunta de diseño canónica antes de escribir cada assertion: **"si esta assertion pasa, ¿qué es exactamente lo que quedó probado?"** — si la respuesta es "que la librería aceptó la llamada" o "que la función interna no tiró", no alcanza; la assertion debe ser sobre un efecto que un usuario o un operador podría auditar independientemente. Incidentes que originaron la regla (ambos R3 SENTRY-1, 2026-08-11): **Falla A (camino)** — el smoke `/api/admin/sentry-smoke` corría server-side (Node.js sin CSP) y reportaba `sent:true` correctamente; los eventos client-side estaban 100% bloqueados por CSP durante ~30 min hasta que el PO abrió DevTools en /admin y detectó "Refused to connect". El SDK server nunca pasa por CSP, así que el smoke era ciego al path que importaba. Fix: 3 tests en `e2e/specs/sentry/gate.spec.ts` cubren `bundle → CSP → network → gate` (`sentry-csp @ ccee68c`). **Falla B (señal)** — post-fix CSP, el fetch pegable devolvía `{sent:true, eventId:"<uuid>"}` pero el evento no aparecía en el dashboard Sentry. `Sentry.captureException()` es síncrona y devuelve un eventId sintético inmediato — el envío HTTP al ingest es async y buffered. Sin `await Sentry.flush(timeoutMs)` antes de `res.json()`, la Vercel function termina con la cola sin drenar y el envelope se pierde sin error. El smoke medía "la librería devolvió eventId" (señal del emisor) en vez de "el evento aparece en el dashboard" (efecto observable). Fix: `await Sentry.flush(2000)` en el handler via `lib/sentryServer.ts:flushSentryEvents()` (helper compartido) + assertion smoke sobre `flushed:true` en response + verificación end-to-end del evento real en dashboard.

**Una sola respuesta final por tarea — CONVENCIÓN OPERATIVA (no P-numerada)**: cuando el PO delega una tarea, entregar **una sola respuesta al terminar**, no estados parciales mientras se ejecuta. Nada de "voy avanzando", "esperando el preview", "reporte parcial mientras compila". Trabajar hasta terminar todo el alcance y entregar el resultado en un solo bloque ≤10 líneas. Excepción legítima: si algo bloquea de verdad y requiere una decisión del PO para continuar, decirlo en una línea y detenerse — eso sí es válido. Los avances intermedios generan ruido, se cortan a media frase (una respuesta puede morir en un dato sin completar), y obligan al PO a hacer de cartero entre la ventana del auditor y su propio siguiente turno. Origen de la convención: turno del 2026-08-11 durante el sprint sentry-flush, donde varios reportes intermedios ("D8 verificado contra git log real:") murieron a media frase y el PO tuvo que pedir explícitamente que se completara. Aplica también dentro de tareas encadenadas: si el PO dice "haz A, B, C en orden", el reporte va al final con las 3 partes, no una respuesta por cada A/B/C.

**Longitud de nombres de rama — CONVENCIÓN OPERATIVA (no P-numerada)**: los hostnames de preview de Vercel se construyen como `<project>-git-<branch>-<team>-projects.vercel.app`. Con proyecto = `pawnecta-landing-mvp` (20 chars) + `-git-` (5) + `-petmatecls-projects` (20) = **45 chars fijos** consumidos antes de contar la rama. El límite DNS de un label es **63 chars** (RFC 1035 §2.3.4) → **presupuesto real para el nombre de rama = 18 chars**. Ramas más largas producen un hostname > 63 → el DNS del preview **no resuelve** (`nslookup` retorna `Unspecified error`, `curl` da HTTP 000 sin error obvio). Vercel deploya la build igual (visible en dashboard) pero el hostname público nunca se emite — la banda de "preview URL" queda inaccesible sin trazo obvio del por qué.

**Regla práctica**: nombres de rama ≤ **18 caracteres**. Contar antes de `git checkout -b`. Preferencias:
- Sprints / batches: `sentry-csp`, `sentry-1`, `remate-1`, `producto-2`, `zonab-1`, `perf-1` — todos ≤ 12 chars ✅.
- Hotfixes: `sentry-csp` en vez de `sentry-1-hotfix-csp` (19 chars → hostname 64 chars, ROTO).
- Si el contexto necesita más chars, usar códigos: `hf-sentry-csp` en vez de `hotfix-sentry-csp`.

Incidente que originó la regla: rama `sentry-1-hotfix-csp` (19 chars → subdominio 64 chars) el 2026-08-11 aterrizó el build pero el hostname preview nunca se emitió; 8 minutos de polling con HTTP 000 antes de detectar el root cause vía `nslookup`. Fix: rename a `sentry-csp` (10 chars → subdominio 55 chars → resuelve OK).

**Pedidos directos del PO se leen PRIMERO al armar cualquier alcance — PRÁCTICA OPERATIVA (no P-numerada)**: cuando se arma cualquier menú de "¿con qué seguimos?", el alcance de un sprint/sweep, o el ordering de la deuda técnica para un batch, **primer paso obligatorio** = leer `BACKLOG.md > PEDIDOS DIRECTOS DEL PO` (sección al tope del archivo). Los ítems de esa sección tienen **prioridad por defecto** sobre deuda técnica equivalente — solo se relegan si hay bloqueo técnico explícito o el propio PO reasigna el orden. Cuando un pedido explícito de Aldo aparece en un turno (verbal o en instrucción de sprint), **migrar de inmediato** a esa sección con fecha del pedido y estado (`abierto` / `asignado a <sprint>` / `en curso <sha>` / `cerrado <fecha> <sha>`), no dejarlo en actas o secciones técnicas profundas donde pueda enterrarse. Incidente que originó esta práctica: pedido del PO del 2026-07-31 (íconos específicos por campo en "Información del servicio") quedó enterrado en la sección `## Deuda técnica / pulido` de `BACKLOG.md` como ítem `[P3]` y NO llegó a ejecutarse pese a 4 sprints + Auditoría #2 + Sweep #1 intermedios — el PO tuvo que reclamarlo explícitamente el 2026-08-07 para que aterrizara al Sweep #2. Sección creada 2026-08-07 con puntero desde el ítem original que se mantiene para trazabilidad. Aplica también a nitpicks textuales del PO que aparezcan durante reviews/walkthroughs — migran a esa sección antes de asignarse a batch, no directo a "deuda light".

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

### Plan Vercel

**Actualizado 2026-08-04**: proyecto en **Pro plan** (motivación: velocidad + lanzamiento). Antes estaba en Hobby.

Diferencias operativas vs. Hobby (referencia [docs/cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) verificada 2026-08-04):

| Aspecto | Hobby (antes) | Pro (ahora) |
|---|---|---|
| Precisión cron | Per-hour (±59 min) — "ventana flexible 1h" | Per-minute — dispara al minuto exacto declarado |
| Frecuencia mínima cron | Once per day | Once per minute |
| Cron jobs por proyecto | 100 | 100 |
| Retención runtime logs | ~1h | Extendida (~30 días para runtime logs — verificar en dashboard) |

**Consecuencias directas**:
- **Crons ahora disparan a la hora exacta** declarada en `vercel.json`. El schedule `0 22 * * *` del cron de Recordatorios (`/api/cron/recordatorio-reserva`) ejecuta a **22:00 UTC en punto** — no en la ventana 22:00-22:59 UTC de antes. Verificar en Vercel Logs con timestamp exacto para confirmar la mejora.
- **Retención de logs extendida** — las instrucciones históricas del tipo "capturar antes de X hora por retención 1h" quedan **relajadas**. La captura sigue siendo buena práctica (evidencia P5) pero deja de ser urgente por ventana temporal.
- **Contingencia heredada de R5** (límite Hobby de crons diario) ya no aplica — los crons con frecuencia mayor a diario (ej. cada hora, cada 15 min) son ahora viables. Ver BACKLOG "Cron 1h antes del servicio" (habilitado por este upgrade).

**Regla para actas y checklists nuevos**: no anclar deadlines de observación a la retención de logs Hobby. Cuando un checklist herede el patrón viejo ("capturar antes de HH:MM"), relajarlo al actualizarlo.

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
