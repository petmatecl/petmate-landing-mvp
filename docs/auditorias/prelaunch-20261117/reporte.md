# Auditoría pre-lanzamiento acotada · 2026-11-17

**Ejecutor**: auditor (read-only, cero CI, cero cambios).
**Ventana**: 10:00–14:30 CLT.
**Alcance**: 6 secciones (Lighthouse, enlaces, SEO, seguridad, Sentry, bundle) sobre `https://www.pawnecta.com` prod.

**Semáforo global**:
- 🔴 **Bloqueantes** (justifican posponer launch al 25-11): **0**.
- 🟡 **Importantes** (fix pre-freeze si es trivial, o aterriza en 24-48h post-launch): **5** — PII nombre legal cerrada por sprint `pii-nombre-publico` (PR #115, pendiente smoke PO + merge).
- 🔵 **Post-lanzamiento** (deuda ordinaria): **detalles abajo + entrada BACKLOG `AUDIT-POST-LANZAMIENTO`**.

---

## 1. Lighthouse — mediana 3 runs × 12 páginas × desktop + mobile (72 corridas completas)

| Página | Preset | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| home | mobile | 🟢90 | 🟢97 | 100 | 92 | 🟡3.5s | 🟢0.000 | 100ms | 1.1s |
| home | desktop | 🟡81 | 🟢97 | 100 | 92 | 🟡3.3s | 🟢0.000 | 0ms | 0.3s |
| explorar | mobile | 🟡76 | 🟢90 | 100 | 92 | 🔴6.0s | 🟢0.000 | 79ms | 2.1s |
| explorar | desktop | 🟢93 | 🟢95 | 100 | 92 | 🟢1.8s | 🟢0.000 | 0ms | 0.5s |
| ficha | mobile | 🟡63 | 🟢92 | 100 | 92 | 🔴**10.1s** | 🟢0.000 | 192ms | 2.1s |
| ficha | desktop | 🟡88 | 🟢95 | 100 | 92 | 🟢1.7s | 🟡0.112 | 0ms | 0.5s |
| proveedor | mobile | 🟢91 | 🟢95 | 100 | 92 | 🟡2.7s | 🟢0.000 | 106ms | 2.1s |
| proveedor | desktop | 🟢94 | 🟢99 | 100 | 92 | 🟢1.1s | 🟢0.002 | 0ms | 0.5s |
| register | mobile | 🟢98 | 🟢96 | 100 | 🟡58 | 🟢2.4s | 🟢0.002 | 60ms | 0.8s |
| register | desktop | 🟢100 | 🟢97 | 100 | 🟡58 | 🟢0.6s | 🟢0.001 | 0ms | 0.3s |
| register-prov | mobile | 🟢97 | 🟢92 | 100 | 🟡58 | 🟢2.4s | 🟢0.003 | 79ms | 0.9s |
| register-prov | desktop | 🟢98 | 🟢92 | 100 | 🟡58 | 🟢0.6s | 🟢0.088 | 0ms | 0.3s |
| login | mobile | 🟢98 | 🟢95 | 100 | 🟡58 | 🟢2.4s | 🟢0.002 | 56ms | 0.8s |
| login | desktop | 🟢100 | 🟢95 | 100 | 🟡58 | 🟢0.6s | 🟢0.001 | 0ms | 0.4s |
| faq | mobile | 🟢100 | 🟢95 | 100 | 92 | 🟢0.8s | 🟢0.000 | 56ms | 0.8s |
| faq | desktop | 🟢100 | 🟢95 | 100 | 92 | 🟢0.6s | 🟢0.001 | 0ms | 0.3s |
| quienes | mobile | 🟡86 | 🟢96 | 100 | 92 | 🔴4.1s | 🟢0.002 | 71ms | 0.9s |
| quienes | desktop | 🟢99 | 🟢97 | 100 | 92 | 🟢0.9s | 🟢0.001 | 0ms | 0.3s |
| blog | mobile | 🟡86 | 🟢95 | 100 | 92 | 🔴4.2s | 🟢0.002 | 65ms | 0.9s |
| blog | desktop | 🟢97 | 🟢95 | 100 | 92 | 🟢1.2s | 🟢0.001 | 0ms | 0.3s |
| terminos | mobile | 🟢100 | 🟢95 | 100 | 92 | 🟢0.9s | 🟢0.002 | 56ms | 0.9s |
| terminos | desktop | 🟢100 | 🟢95 | 100 | 92 | 🟢0.3s | 🟢0.001 | 0ms | 0.3s |
| privacidad | mobile | 🟢100 | 🟢95 | 100 | 100 | 🟢0.9s | 🟢0.002 | 52ms | 0.9s |
| privacidad | desktop | 🟢100 | 🟢95 | 100 | 100 | 🟢0.3s | 🟢0.001 | 0ms | 0.3s |

### Lectura

**🟢 OK**: A11y 90+ en todas. Best Practices 100 todas. Perf 90+ en 18/24. Login/register/faq/terminos/privacidad perfectos.

**🟡 Importantes**:
- **SEO 58 en login, register, register-prov** — explicado por falta de meta description/OG/canonical (ya en sección 3). Fix pre-freeze opcional.
- **CLS ficha-desktop 0.112** — persistente. Causa raíz identificada en 2026-11-12: logo footer con `w-auto + loading=lazy`. `cls-footer` aterrizó pero no cerró del todo en esta ficha.
- **Perf ficha-mobile 63** / **home-desktop 81** / **quienes-mobile 86** / **blog-mobile 86** — amarillo. Post-launch.

**🔴 Pobres LCP > 4s**:
- **ficha-mobile LCP 10.1s mediana 3 runs** sobre `/servicio/7134e58a-...` (4 fotos originales no next/image optimizadas). Peor métrica de toda la auditoría. Ficha que me devolvió Supabase como "activa reciente con fotos" — la pena es que es cat veterinaria sin optimización agresiva. **BACKLOG post-launch** `FICHA-MOBILE-LCP-PROD`.
- explorar-mobile 6.0s — ya en BACKLOG `EXPLORAR-MOBILE-LCP`.
- quienes-mobile 4.1s, blog-mobile 4.2s — marginal pobre. Post-launch.

Datos crudos: `scratchpad/lighthouse-20261117/audit/*.json` (72 archivos).

---

## 2. Enlaces internos — HEAD sobre 25 URLs clave + footer + landings categoría/comuna

### 🟡 Importante — Landings `/[categoria]` SEO rotas por mismatch de slugs

`pages/[categoria]/index.tsx` tiene `getStaticPaths` whitelist con slugs que no coinciden con los slugs reales en BD:

| Slug app/BD | Slug en getStaticPaths | HTTP /{slug} | Nota |
|---|---|---:|---|
| `cuidado` | `cuidado` | 200 | OK |
| `peluqueria` | `peluqueria` | 200 | OK |
| `adiestramiento` | `adiestramiento` | 200 | OK |
| `traslado` | `traslado` | 200 | OK |
| `retratos` | `retratos` | 200 | OK |
| **`paseos`** | `paseo` | **404** | ❌ singular vs plural |
| **`veterinario`** | `veterinaria` | **404** | ❌ veterinario vs veterinaria |
| **`guarderia`** | `guarderia-diurna` | **404** | ❌ mismatch |
| **`etologia`** | ausente | **404** | ❌ categoría nueva sin landing |
| **`fotografia`** | ausente | **404** | ❌ categoría nueva sin landing |

**Impacto**: tráfico orgánico SEO para 5 categorías cae en `/404 | Página no encontrada`. El footer enlaza a `/explorar?categoria=X` que SÍ funciona (200 en los 11 slugs probados), así que **el user real que navega desde la UI NO rebota** — solo afecta a quien llega vía Google con URL directa `/paseos`, `/veterinario`, etc. (que son URLs canónicas típicas que Google puede indexar si estuvieron publicadas alguna vez).

**Fix pre-freeze**: 2 líneas en `pages/[categoria]/index.tsx:158-162`, agregar `paseos`, `veterinario`, `guarderia`, `etologia`, `fotografia` al array `categorias` + confirmar que `getStaticProps` resuelve bien. ~30 min con smoke en preview. **Ortogonal a cualquier otro cambio** — PR chico independiente. Recomiendo GO pre-freeze.

**Fix post-launch**: actualizar `BACKLOG.md > SEO-LANDING-CATEGORIAS` con decisión + priorizar.

### 🟡 Importante — `/peluqueria/ñuñoa` responde 400

Mismo archivo `pages/[categoria]/[comuna].tsx`: whitelist comunas usa slug `nunoa` (sin ñ), pero la URL con "ñ" devuelve 400. Si Google indexó `ñuñoa` como string en URL, está roto. Las URLs correctas son `/peluqueria/nunoa`. Verificar sitemap que se publica.

### 🟢 OK — resto de URLs públicas

Las 20 URLs restantes responden 200 (`/`, `/explorar`, `/faq`, `/quienes-somos`, `/blog`, `/terminos`, `/privacidad`, `/login`, `/register`, `/register?rol=proveedor`, `/forgot-password`, `/sitemap.xml`, `/robots.txt`, `/api/health`, `/api/sitemap`, 11 landings de `/[categoria]/[comuna]`). URLs inexistentes devuelven 404 correctamente (sin leak de stack).

---

## 3. SEO técnico

### 🟢 OK — Sitemap + robots

- `/sitemap.xml` responde 200 con lista de rutas (`/`, `/explorar`, `/blog`, `/faq`, `/terminos`, `/privacidad` + N `proveedor/<uuid>` + N `servicio/<uuid>`). `lastmod: 2026-11-17` consistente. **Observación menor**: usa `https://pawnecta.com/` (sin www), diferente del canonical de la mayoría de páginas (`https://www.pawnecta.com/`) — Google tolera pero sería mejor coherente.
- `/robots.txt` responde 200 con bloqueos correctos: `/admin`, `/usuario`, `/mensajes`, `/sitter`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/api/*`, `/security-logout`. `Allow: /proveedor/`, `/servicio/` explícito. Sitemap declarado. `Host: https://www.pawnecta.com`.

### 🟡 Importante — Páginas públicas sin canonical / OG / description

| Página | title | description | canonical | og:* | ld+json |
|---|:---:|:---:|:---:|:---:|:---:|
| `/` | ✅ | ✅ | ✅ (sin www) | ✅ | ✅ (1) |
| `/explorar` | ✅ | ✅ | ✅ | ✅ | ✅ (1) |
| `/faq` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/quienes-somos` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/blog` | ✅ | ✅ | **❌** | **❌** | ❌ |
| `/terminos` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/privacidad` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/login` | ✅ | ✅ | **❌** | **❌** | ❌ |
| `/register` | ✅ | ✅ | **❌** | **❌** | ❌ |
| `/register?rol=proveedor` | ✅ | ✅ | **❌** | **❌** | ❌ |

- `/blog`: sin canonical ni og:* — **IMPORTANTE** porque es contenido indexable. Fix: agregar `<Head>` con canonical + OG estándar. ~15 min.
- `/login`, `/register`: sin canonical ni og:* — **menos crítico** porque robots.txt las bloquea (`Disallow`). Defensa en profundidad: agregar `<meta name="robots" content="noindex,nofollow">` + canonical autoreferencial. ~10 min.
- Canonical del landing `/` apunta a `https://pawnecta.com` sin www — el resto usa `www.`. Inconsistencia a resolver (uno u otro — recomendado www porque es el host en producción y el sitemap debería alinearse). ~5 min.
- `ld+json` (structured data) solo en `/` y `/explorar`. Oportunidad post-launch para `/servicio/[id]` (Product schema) y `/proveedor/[id]` (LocalBusiness schema) — **BACKLOG post-launch**.

**Fix pre-freeze recomendado**: /blog canonical + og:* + robots inconsistency (`https://pawnecta.com` → `https://www.pawnecta.com`). ~30 min.

---

## 4. Seguridad básica

### 🟢 OK — Headers HTTP de las 7 páginas públicas clave

Todas las páginas devuelven:
- `Content-Security-Policy`: whitelist precisa con Supabase, GTM, Fonts, CARTO, OSM, Unsplash, Pexels, Sentry. `frame-ancestors 'none'` (equivalente X-Frame-Options DENY). `object-src 'none'`. `upgrade-insecure-requests`.
- `Strict-Transport-Security`: `max-age=63072000 (2 años); includeSubDomains; preload` ✅.
- `X-Content-Type-Options: nosniff` ✅.
- `Referrer-Policy: origin-when-cross-origin` ✅.
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), interest-cohort=()` ✅.
- **Sin X-Frame-Options explícito** — reemplazado por `frame-ancestors 'none'` del CSP, que es la forma moderna recomendada. ✅.

**Observación informativa**: el CSP incluye `'unsafe-inline' 'unsafe-eval'` en `script-src`. Documentado en CLAUDE.md como "limitación aceptada" por Next.js hydration + libs. Sprint de nonces queda post-launch.

### 🟡 Importante — Supabase prod advisors

**Security** (lint vía MCP):
- 🟡 **1 ERROR** · `security_definer_view` · `public.proveedores_publicos` — **DIAGNÓSTICO EJECUTADO**: la vista SÍ filtra `WHERE estado = 'aprobado'` + protege privacidad por campo (lat/lng redondeados 2 decimales, teléfono/WhatsApp/email con CASE según flags `mostrar_*`, `rut_verificado` boolean solo — no RUT real). **Observación menor**: expone `nombre` + `apellido_p` legales al anon (más `nombre_publico` separado). Si la UI solo renderiza `nombre_publico`, OK; si algún caller usa `nombre/apellido_p` para display público, es exposición PII. Confirmar con el PO si es intencional. Sin exploit claro — bajar a 🔵 post-launch salvo el PO decida reclasificar.
- 🟡 **6 WARN** · `anon_security_definer_function_executable`: `buscar_servicios`, `es_owner_aprobado`, `is_admin`, `proveedor_esta_aprobado`, `registrar_proveedor`, `registrar_visita` — funciones SECURITY DEFINER ejecutables por `anon`. Son intencionales (RPC públicos del marketplace) pero merecen revisión rápida que `buscar_servicios` filtra `estado='aprobado'` dentro (confirmado en CLAUDE.md) y que `registrar_proveedor` no permite inyección de role admin. **Confirmar `is_admin()` desde anon devuelve `false` siempre** (lo haría — chequeo trivial pre-launch).
- 🟡 **8 WARN** · `authenticated_security_definer_function_executable`: 2 adicionales (`admin_listar_proveedores`, `calcular_perfil_completo_proveedor`). `admin_listar_proveedores` disponible a `authenticated` suena peligroso — **verificar que internamente valida `is_admin()`**.
- 🔵 **18 WARN** · `function_search_path_mutable`: 18 funciones sin `SET search_path = ''` fijo. CVE conocido en Postgres: user con WRITE en schema puede shadow-ejecutar funciones del `search_path`. Impacto real bajo en Supabase (schemas lockeados), igualmente deuda post-launch.
- 🔵 **2 WARN** · `extension_in_public`: `pg_net`, `btree_gist` en schema `public`. Mover a `extensions` schema post-launch.
- 🔵 **1 WARN** · `rls_enabled_no_policy`: `visitas_tracking` con RLS enabled sin policies — efecto: cero filas accesibles a cualquier role. Si la app lee/escribe con `service_role` bypass, OK; si la app depende de policies, roto. Verificar callsites.
- 🟡 **1 WARN** · `auth_leaked_password_protection`: **esperado que desaparezca al activar Supabase Pro hoy** (checklist 0.4 del plan de launch).

**Performance** (lint vía MCP, resumido por Agent):
- 🔵 **0 ERROR**. 5 advisors, 195 findings.
- 🔵 `multiple_permissive_policies` (107): múltiples policies PERMISSIVE por tabla × role × action. Degradación a volumen alto, no al baseline. Sprint deuda BD post-launch.
- 🔵 `auth_rls_initplan` (52): RLS re-evalúa `auth.uid()` por fila; fix idiomático `(select auth.uid())`. Impacta escala.
- 🔵 `unindexed_foreign_keys` (29): FKs sin índice (top: `conversations` 4, `contactos` 2, `evaluaciones` 2, `messages` 2, `servicios_publicados` 2). Migration CREATE INDEX batch post-launch — blast radius bajo.
- 🔵 `unused_index` (6): incluye `agendamientos_no_solape_estadias` que **suena a constraint EXCLUDE de correctitud F2**. Verificar antes de tocar.
- 🔵 `auth_db_connections_absolute` (1): Auth server fijado a 10 conn. No escala con upgrade de instancia. Revisar al escalar Pro.

### 🟢 OK — Secretos en bundle público

Grep sobre 3 chunks JS más usados:
- Zero hits de patrones peligrosos: `sk_live_*`, `sbp_*`, `sb_secret_*`, `AWS_*`, `BEGIN PRIVATE KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE`.
- Supabase anon key: sí está en el bundle (es público por diseño).

---

## 5. Sentry prod — últimos 7 días (actividad reciente)

API Sentry Free plan devuelve stats_period solo 24h o 14d. Pedí 14d y filtré lastSeen >= hoy-7d.

| Short ID | Events | Users | Primer visto | Último visto | Título |
|---|---:|---:|---|---|---|
| **JAVASCRIPT-NEXTJS-7** | 203 | **5** | 2026-09-15 | **2026-11-17 (hoy)** | `user_context_stuck` — CUE-1. Clasificado `CUE-1-ANON POST-LANZAMIENTO` (BACKLOG). Los 5 users suman al del PO y cuentas E2E según sweeps previos. 🔵 |
| **JAVASCRIPT-NEXTJS-6** | 5 | 0 | 2026-09-12 | 2026-11-15 | `supabase_read_failed` — anónimos (0 users = sin `setUser`). Baja frecuencia. 🔵 |
| **JAVASCRIPT-NEXTJS-H** | 1 | 0 | 2026-11-17 | **2026-11-17 (hoy)** | `TypeError: Cannot read properties of undefined (reading 'proveedores')` — **NUEVO HOY**. 🟡 |

### 🟡 Importante — NEXTJS-H nuevo hoy

TypeError `'proveedores'` undefined, 1 event, user=0 (anónimo). Puede ser:
- Crawler/bot hitting ruta rara.
- Bug en una página que destructura `data.proveedores` sin optional chaining.
- Request con body/query malformado.

**Pre-freeze**: diagnóstico 10 min (abrir el event en Sentry dashboard, leer stack + breadcrumbs + URL). Si es trivial (optional chaining), fix pre-freeze. Si no, anotar en BACKLOG como monitor post-launch.

### 🟢 OK — resto

NEXTJS-7 está documentado como CUE-1-ANON post-lanzamiento. NEXTJS-6 es anónimo residual con 0 users. Cero issues con `user.id` real desconocido en la ventana 7d.

---

## 6. Peso del JavaScript y top chunks

### 🟡 Importante — First Load JS por página (build local `npm run build` exit 0)

Baseline (`_app` shared): **244 kB** gzip. Umbral Next.js "ideal" es < 150 kB; estamos ~65% arriba. Páginas específicas:

| Página | Size chunk propio | First Load JS | Observación |
|---|---:|---:|---|
| `/ejemplo` | 1.11 kB | **327 kB** | Dev page (no público) |
| **`/servicio/[id]`** | 1.16 kB | **327 kB** | Ficha pública — alto por map Leaflet + galería |
| **`/proveedor`** (dashboard) | 42.5 kB | **323 kB** | No público (auth gate) |
| **`/proveedor/[id]`** | 9.99 kB | **288 kB** | Ficha pública proveedor |
| **`/explorar`** | 16.5 kB | **279 kB** | Catálogo público — mapa + filtros |
| **`/usuario/mascotas`** | 32.2 kB | **277 kB** | No público (auth gate) |
| `/[categoria]` (SEO) | 2.56 kB | 265 kB | — |
| `/[categoria]/[comuna]` | 379 B | 263 kB | — |
| `/` | 14.4 kB | 263 kB | Landing |
| `/favoritos`, `/mensajes`, `/mis-reservas` | 2-9 kB | ~260 kB | Auth gated |
| `/faq`, `/privacidad`, `/terminos`, `/login`, `/quienes-somos`, `/email-confirmado` | 2-4 kB | 247-249 kB | Estáticas livianas |
| `/blog` | 12.6 kB | 257 kB | Index blog |
| `/blog/[slug]` | 3.16 kB | 248 kB | Post individual |
| `ƒ Middleware` | — | **302 kB** | Edge middleware — inusualmente pesado |

### Top chunks estáticos (runtime, uncompressed from .next/static/chunks)

| Rank | Chunk | Size uncompressed |
|---|---|---:|
| 1 | `pages/_app` | 383 kB |
| 2 | `main` | 289 kB |
| 3 | `pages/proveedor` | 179 kB |
| 4 | `25f4ac2a` (vendor) | 145 kB |
| 5 | `framework` (React) | 137 kB |
| 6 | `4978` (vendor) | 117 kB |
| 7 | `polyfills` | 110 kB |

### Dependencias más pesadas del `node_modules` (indicador de peso en bundle — no exacto sin bundle analyzer)

| Top | Paquete | Uncompressed | Observación |
|---|---|---:|---|
| 1 | `@supabase/*` (incluye realtime-js + auth-js) | 140 MB | SDK client. Tree-shakeable parcialmente. |
| 2 | `@sentry/nextjs` | 75 MB | Monitoring. Config `tracesSampleRate: 0` aplicado — reduce bundle cliente. |
| 3 | `lucide-react` (iconos) | 42 MB | Tree-shakeable; peso real depende de cuántos íconos se importen. |
| 4 | `react-aria` | 29 MB | A11y primitives. Tree-shakeable. |
| 5 | `date-fns` | 21 MB | Date utils. Tree-shakeable. |
| 6 | `@opentelemetry` | 20 MB | Sentry dep. |
| 7 | `@heroicons` | 15 MB | **Convive con `lucide-react`** — duplicación de iconos. Candidato a consolidar. |

**Observación**: `@heroicons` + `lucide-react` conviven — CLAUDE.md § convenciones dice "iconos Lucide monocromáticos", así que `@heroicons` podría eliminarse si nada lo usa. **Post-launch**: grep para confirmar y remover si cero uses.

**Build warnings cuando se compiló**:
- `[@sentry/nextjs] Importing withSentryConfig from @sentry/nextjs is deprecated and will stop working in v11` — deuda @sentry v11 post-launch.
- 7× `@next/next/no-img-element` — ya conocido, entrada `UPLOAD-IMG-RESIZE` en BACKLOG.
- 4× `react-hooks/exhaustive-deps` — deuda ordinaria.
- 1× `aria-required` sobre `role="button"` — nitpick a11y.

### 🔵 Post-launch — optimización de bundle

- Analizar bundle con `@next/bundle-analyzer` para identificar qué infla `/servicio/[id]` a 327 kB y Middleware a 302 kB.
- Consolidar `@heroicons` → `lucide-react` si convive sin uso.
- Code-split `/proveedor` dashboard (42.5 kB propio) — mover subsecciones a dynamic imports.

---

## Semáforo consolidado

### 🔴 Bloqueantes (0)

Ninguno. Lanzamiento 2026-11-18 sostiene.

### 🟡 Importantes (candidatos a fix pre-freeze — decidir con PO)

1. **SEO landings `/paseos` `/veterinario` `/guarderia` `/etologia` `/fotografia` dan 404** — fix 2 líneas en `pages/[categoria]/index.tsx:158-162`. ~30 min + preview smoke. Impacta tráfico orgánico.
2. **Supabase advisor ERROR `security_definer_view public.proveedores_publicos`** — verificar `pg_get_viewdef` + confirmar filtro interno `WHERE estado='aprobado'`. ~15 min lectura. Si no filtra, fix pre-launch obligatorio.
3. **NEXTJS-H nuevo hoy** — 10 min de diagnóstico en Sentry dashboard. Fix si trivial.
4. **CLS 0.187 ficha-mobile + 0.112 ficha-desktop** — diagnosticar `layout-shifts.rootCauses` del JSON Lighthouse. Fix si trivial (dimensiones fijas CSS).
5. **SEO `/blog` sin canonical/og + login/register sin noindex + canonical inconsistente www/no-www** — ~45 min batch (1 PR docs-SEO).

Si el PO prefiere launch limpio: los 5 caben en 2-3 PRs chicos secuenciales durante la tarde (holgado hasta 16:00 CLT). Si prefiere launch conservador con solo lo bloqueante-cero: todos pasan a `AUDIT-POST-LANZAMIENTO` sin impacto de usuario inmediato.

### 🔵 Post-lanzamiento → BACKLOG `AUDIT-POST-LANZAMIENTO`

- CUE-1-ANON observación (ya en BACKLOG).
- Supabase advisors: `function_search_path_mutable` × 18, `multiple_permissive_policies` × 107, `auth_rls_initplan` × 52, `unindexed_foreign_keys` × 29, `extension_in_public` × 2, `rls_enabled_no_policy` `visitas_tracking`.
- First Load JS > 300 kB en `/servicio/[id]` y `/proveedor` → bundle analyzer + code-split.
- Middleware 302 kB → auditar qué se empaqueta.
- Consolidar `@heroicons` → `lucide-react`.
- `@sentry/nextjs` v11 config migration (withSentryConfig deprecated).
- `<img>` → `next/image` restantes (7 call sites).
- `exhaustive-deps` warnings (~4).
- `aria-required` sobre `role="button"` nitpick.
- ld+json en `/servicio/[id]` (Product schema) y `/proveedor/[id]` (LocalBusiness schema).

---

## Addendum (se agrega al cierre cuando termine Lighthouse completo ~10:48 CLT)

Lighthouse 72 runs completo con mediana por métrica para las 12 páginas. Tabla pivote + análisis CLS detallado + flag de cualquier regresión vs baseline 2026-11-12.
