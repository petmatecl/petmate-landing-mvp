# Auditoría de seguridad — 2026-11-20

**Audiencia**: PO · **Autor**: auditor (2026-11-20 PM).
**Objetivo**: inventario del estado de seguridad actual + vectores de ataque abiertos + priorización de fixes. Base para decidir qué cerrar pre-campañas.
**Método**: (a) análisis estático del código (`main @ 0954bbe`); (b) inspección de headers HTTP prod; (c) revisión de endpoints API expuestos; (d) matriz de controles existentes.
**Limitación**: zero prod traffic consultado (regla P8). Zero intento de explotación. Auditoría puramente defensiva.

---

## Resumen ejecutivo

**Estado general**: **BUENO**. El sistema tiene defensas en profundidad razonables para un marketplace en operación orgánica.

Controles presentes:
- ✅ HTTPS + HSTS preload (`max-age=63072000; includeSubDomains; preload`).
- ✅ CSP razonable con whitelist específica.
- ✅ RLS en Supabase (tablas críticas con policies).
- ✅ Rate limit con Upstash Redis (login) + fail-open con Sentry alert.
- ✅ Auth flow Supabase JS SDK + confirmación email obligatoria.
- ✅ Middleware edge que bloquea bot patterns.
- ✅ Sentry error tracking con PII scrub.
- ✅ Bucket privado para documentos (carnets).
- ✅ Correos con escape React automático (en templates; HTML inline requiere audit manual).

Vectores abiertos (priorizados):
1. **Rate limit in-memory en emails + signup** — fail soft en serverless.
2. **Review spam vector residual** (sprint rediseño reviews pendiente).
3. **Push send endpoint 403-only** (unused, pero endpoint vivo).
4. **PII leak en chat/mis-reservas** — cerrándose sábado (PII-VIEW-TIGHT).
5. **CSP `unsafe-inline` + `unsafe-eval`** — necesarios por Next.js, mitigable con nonces post-launch.

---

## 1. Headers HTTP (verificado en prod)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://images.pexels.com https://ui-avatars.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://firebasestorage.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://nominatim.openstreetmap.org https://www.googletagmanager.com https://*.google-analytics.com https://analytics.google.com https://images.unsplash.com https://images.pexels.com https://ui-avatars.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://cdnjs.cloudflare.com https://firebasestorage.googleapis.com https://fonts.gstatic.com https://fonts.googleapis.com https://*.ingest.us.sentry.io; media-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Referrer-Policy: origin-when-cross-origin
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-Xss-Protection: 1; mode=block
```

**Análisis**:

| Header | Valor | Análisis |
|---|---|---|
| CSP | con whitelist específica | ✅ Buena. Whitelist documentada en CLAUDE.md § CSP. |
| CSP `unsafe-inline` + `unsafe-eval` en script-src | presente | ⚠️ Necesario por Next.js (inline hydration scripts + libs con eval). Mitigable con nonces + middleware (sprint propio, documentado como "limitación aceptada" en CLAUDE.md). |
| HSTS preload | 2 años + subdomains + preload | ✅ Excelente. |
| `frame-ancestors 'none'` | presente | ✅ Mitiga clickjacking. Redundante con `X-Frame-Options: SAMEORIGIN` pero más estricto. |
| `object-src 'none'` | presente | ✅ Mitiga plugin content. |
| `form-action 'self'` | presente | ✅ Evita hijacking de forms. |
| Permissions-Policy | camera/mic/geo disabled + interest-cohort disabled | ✅ Correcto para marketplace sin features de cámara/micro. |
| Referrer-Policy | `origin-when-cross-origin` | ✅ Balance entre privacy y analytics (manda solo origin a terceros). |
| X-Content-Type-Options | nosniff | ✅ |
| X-XSS-Protection | legacy header | ⚠️ Deprecated en Chrome moderno. No hace daño. CSP frame-ancestors + object-src cubren el espacio. |

**Hallazgo S-H1** [BAJO]: `frame-ancestors 'none'` + `X-Frame-Options: SAMEORIGIN` entran en leve conflicto (CSP más estricto gana en browsers modernos, X-Frame-Options en legacy). Opcional ajustar a `X-Frame-Options: DENY` para alinear. ~5 min.

---

## 2. CSP — análisis específico

### Orígenes permitidos
- Supabase (connect + wss + img).
- Unsplash + Pexels (img + connect, para blog imgs).
- Google Fonts (fonts + style).
- Google Tag Manager + GA4 (script + connect).
- Nominatim OSM + cartocdn + openstreetmap tile (img + connect, para mapas Leaflet).
- Firebase Storage (img + connect).
- Sentry ingest (connect).
- cdnjs (img, probable Leaflet marker icons).
- UI Avatars (img + connect).

### Hallazgos

**S-CSP1** [BAJO]: `cdnjs.cloudflare.com` en `img-src` + `connect-src` cubre Leaflet marker icons. Si Leaflet se mueve a dynamic import (ítem BACKLOG post-launch perf), este origen puede eliminarse.

**S-CSP2** [BAJO]: `firebasestorage.googleapis.com` — verificar que efectivamente se usa (probable para logo de email). Si no, eliminar.

**S-CSP3** [BAJO]: `pexels.com` agregado por reciente auditoría blog images (regla CLAUDE.md permite Unsplash/Pexels/Pixabay). Pixabay NO está en la lista. Si se decide usar Pixabay para alguna imagen futura, agregar.

**S-CSP4** [MEDIO]: `unsafe-inline` + `unsafe-eval` en script-src. Riesgo residual de XSS si llegase a existir alguna superficie con injection. Mitigación: nonces por request via middleware. Esfuerzo: ~1 día. Impacto: endurecimiento, sin ganancia funcional observable.

---

## 3. Auth flow

### Patrón vigente

- **Auth**: Supabase JS SDK (`signInWithPassword`, `signOut`). Cero endpoints server propios de auth.
- **Rate limit login**: Upstash Redis via `authLimiter`.
- **Email confirmation**: obligatoria antes de login funcional.
- **Session persistence**: localStorage por proyecto Supabase (default SDK v2).
- **signOut scope**: `global` (revoca all refresh tokens del user). Deuda SIGNOUT-SCOPE documentada en BACKLOG.
- **Password reset**: Supabase Auth con link token.

### Hallazgos

**S-A1** [MEDIO]: `signOut` scope global revoca tokens de todas las sesiones del user. Si user tiene 2 tabs abiertas, cierra sesión en ambas. Fricción conocida, documentada como SIGNOUT-SCOPE post-campañas.

**S-A2** [BAJO]: no hay segundo factor (2FA/MFA). Supabase Auth soporta MFA opt-in. Para user base inicial (tutores + proveedores pymes) es overkill. Admin sí debería tener 2FA. Sprint propio post-campañas.

**S-A3** [BAJO]: password requirements. Supabase default minimum 6 chars. Recomendación OWASP 2024 es 12 chars + complejidad. Decisión de producto (fricción vs seguridad). Actualmente default.

**S-A4** [BAJO]: no hay bloqueo de cuenta tras N intentos fallidos. Rate limit de 10 min cierra la sesión por IP + user, mitigación suficiente para primer año.

### Vector específico — reset password token

El reset usa Supabase Auth con link único que expira en 1h (default). Si el user no revisa email → link expira. Reintento está disponible. ✅ OK.

**Riesgo residual**: si user tiene email comprometido (inbox hackeado), attacker puede pedir reset + tomar control. Mitigación: requiere comprometer el inbox primero. Fuera del alcance de la app.

---

## 4. Endpoints API — matriz auth

Patrón de auth: dos tipos (CLAUDE.md § "Auth para endpoints internos"):
- `verifySession(Bearer)` — client-called, user-owned.
- `verifyInternalSecret` — server-to-server.

| Endpoint | Patrón auth | Risk level | Notas |
|---|---|---|---|
| `/api/auth/signup` | public (rate-limited) | MEDIO | authLimiter + transaccional con rollback. OK. |
| `/api/auth/welcome` | verifyInternalSecret (server-to-server) | BAJO | Solo caller = signup. OK. |
| `/api/auth/complete-registration` | verifySession Bearer | BAJO | User-authenticated. OK. |
| `/api/admin/*` | verifySession + isAdmin() | BAJO | Admin-gated. OK. |
| `/api/agendamientos/notify-*` | verifySession + ownership check (caller === resource.owner) | BAJO | Sprint 3 patrón canónico. OK. |
| `/api/agendamientos/cancelar` | verifySession + ownership | BAJO | OK. |
| `/api/contactos/track` | verifySession | BAJO | User-authenticated. |
| `/api/evaluaciones/notify` | verifySession + ownership | BAJO | OK. |
| `/api/evaluaciones/auto-moderar` | ¿? | VERIFICAR | revisar si tiene gate. |
| `/api/notifications/create` | verifySession + relationship check | BAJO | Fix post-audit 1bc1897 cerró spam vector. |
| `/api/notifications/new-message` | verifySession + relationship | BAJO | OK. |
| `/api/push/send` | verifyInternalSecret | BLOQUEADO | Único caller histórico (MessageThread.tsx) removido. Endpoint vivo pero sin caller legítimo. Deuda BACKLOG: migrar a id-only patrón al activar push. |
| `/api/push/subscribe` | verifySession | BAJO | OK. |
| `/api/referidos/generar-codigo` | verifySession | BAJO | OK. |
| `/api/servicios/[id]/slots` | public | BAJO | Read-only, no exposes PII. |
| `/api/cron/*` | CRON_SECRET header | BAJO | Vercel Cron OK. Rotación cuando sea necesario. |
| `/api/log-consent` | public | BAJO | Solo escribe consent, no lee data sensible. |
| `/api/noop` | public | NONE | Debug endpoint, retorna 200. |
| `/api/visitor-hash` | public | BAJO | Genera hash para tracking anónimo. No PII. |
| `/api/waitlist/subscribe` | public (rate-limited) | BAJO | Email-only. |

**Hallazgo S-E1** [VERIFICAR]: `auto-moderar.ts` — verificar que tiene auth gate, no es llamable anónimo.

**Hallazgo S-E2** [BAJO]: `/api/noop.ts` + `/api/mercadopago_disabled` (si existe). Revisar si quedaron de sprints viejos.

---

## 5. Rate limiting

### Login

Via Upstash Redis (`lib/rateLimit.ts > authLimiter`). Fixed window + fail-open.

**Config vigente**: 10 intentos por 10 min por IP+email. Más permisivo que OWASP (5 por 15 min) pero razonable para UX.

**Fail-open**: si Upstash no responde, el limiter deja pasar + Sentry capta. Trade-off documentado.

### Emails + signup

In-memory (Map en memoria). Deuda P1 BACKLOG.

**S-R1** [MEDIO]: rate limit emails / signup in-memory, no efectivo en serverless. Un attacker puede hacer flood de signup / emails sin ser frenado. Mitigación residual: Supabase Auth tiene su propio rate limit plataforma (menos estricto pero existe) + Resend tiene rate limit por API key. Fix: migrar a Upstash como ya se hizo con login. Esfuerzo: 2-3h. **Alta prioridad pre-campañas** (durante campaña es el momento donde más probable que lleguen scrapers / abusers).

### Endpoints custom

El resto de endpoints no tiene rate limit explícito (confían en Supabase RLS + Vercel edge throttling). Para el volumen esperado pre-campañas, OK.

---

## 6. PII (datos personales)

### Estado actual

- **Sprint pii-nombre-publico** cerrado: `/explorar` + cards + ficha pública muestran "Nombre I." (sin apellido completo).
- **Sprint pii-chat-nombre PR #120** pendiente (viernes 20-11 AM): chat + favoritos ocultan apellido completo.
- **Sprint PII-VIEW-TIGHT sábado 21-11** (plan `docs/planes/pii-view-tight-sabado.md`): vista pública `proveedores_publicos` + RPC `buscar_servicios` dejan de retornar `nombre`/`apellido_p`/`apellido_m` crudos.

### Hallazgo S-P1 [ALTO hasta sábado 21] — PII leak estructural en vista pública

Hasta sábado, `GET /rest/v1/proveedores_publicos?select=*` con anon key retorna los 3 campos. Afecta Ley 21.719 compliance (vigente 01-12-2026).

**Status**: trabajo planificado y aterriza sábado. Zero acción adicional.

### Hallazgo S-P2 [MEDIO] — Email como PII en emails subject

Subject `AgendamientoProveedorEmail` incluye nombre tutor completo. Cualquier terceros con acceso al inbox del proveedor ve "Allison Morel te solicitó...". Documentado como RESERVA-MAIL-NOMBRE. Decisión producto pendiente.

### Hallazgo S-P3 [BAJO] — foto_carnet en bucket privado

Bucket `documents` es privado. Admin UI tiene bug de render (imagen rota en admin panel) pero NO es leak — endpoint `/object/public/` retorna 400 para bucket privado incluso con cookie admin. OK estructural.

---

## 7. XSS

### Superficies de riesgo

- **Reviews**: user input texto. Renderizado con React → escape automático. ✅
- **Mensajes chat**: user input. React escape. ✅
- **Nombre proveedor / tutor**: entra desde signup, renderizado con React. ✅
- **Descripción servicios**: user input de proveedor. React escape. ✅
- **Emails HTML inline**: ⚠️ `AprobacionProveedorEmail` + `RechazoProveedorEmail` + `NewMessageEmail` (3 templates con HTML inline en call sites). Verificado en auditoría correos: subject + cuerpo de #4 y #10 usan HTML inline con `${nombre}` directo — hallazgo D1 pendiente (grep escape HTML).

### Hallazgo S-X1 [MEDIO] — Verificar escape en emails HTML inline

Ver `docs/auditorias/correos-20261119.md § Sec II D1`. Pendiente ejecutar grep + fix 1-2 líneas si aplica. ~10 min.

### Hallazgo S-X2 [BAJO] — React auto-escape confirmado

Confirmado con grep: cero uso de `dangerouslySetInnerHTML` en el repo. Zero. ✅

---

## 8. SQL injection

Vector: inyección en RPC Supabase (`buscar_servicios`, etc.).

**Hallazgos**:
- Todas las queries a Supabase van vía SDK con parámetros bind. Sin string concat.
- RPCs definidos en PL/pgSQL con parámetros tipados.
- `buscar_servicios(p_texto text)` acepta texto user y usa `ILIKE '%' || p_texto || '%'`. Concatenación en PL/pgSQL **pero dentro de parámetro tipado text** → SQL injection imposible (el parámetro no se interpreta como SQL por PL/pgSQL).

**Status**: ✅ OK.

---

## 9. CSRF

- Supabase session uses JWT en Authorization header (no cookie-based) → CSRF no aplica al mismo modelo que forms tradicionales.
- Form actions van a `/api/*` con fetch + Authorization header.
- `form-action 'self'` en CSP previene form hijacking.

**Status**: ✅ OK.

---

## 10. Vectores específicos del producto

### S-V1 [MEDIO] — Review spam residual

Documentado en CLAUDE.md § "Rediseño del gate anti-review-spam". El vector "atacante autenticado abre chat trivial con proveedor → dispara `conversations` row → cuenta como contacto real → auto-aprueba review" sigue vivo. Sprint dedicado post-launch.

### S-V2 [BAJO] — Enumeración de users por rate limit

Un attacker podría intentar signup con email X: si falla con "email ya existe" vs otro error, revela si el user existe. Verificar: `/api/auth/signup` → debería retornar mensaje genérico "No pudimos registrarte" en ambos casos. **A verificar en code review**.

### S-V3 [BAJO] — Content enumeration en `buscar_servicios`

RPC retorna hasta 100 resultados. Attacker con anon key podría extraer todos los proveedores (26 hoy). No es "leak" porque el catálogo es público, pero sí permite scraping. Mitigación residual: rate limit Supabase plataforma. Para volumen inicial OK.

### S-V4 [BAJO] — Intents de bot

Middleware edge bloquea bot patterns (`/wp-*`, `/xmlrpc`, `*.php`). Response 404 real. ✅

### S-V5 [MEDIO] — URL de pago externos

Hoy NO hay pagos in-platform. Todo tracking de contacto va via chat / WhatsApp / teléfono. Attacker que logre insertar URL `https://evil.com/pagar` en descripción de servicio → tutor confiado podría caer en phishing.

**Mitigación residual**: descripción de servicio renderizada con React escape (texto plano, sin links clickeables automáticos). Para que un link sea clickeable, el user debe copiar-pegar manualmente. Fricción suficiente para 1er año.

**Fix futuro**: filtro de URLs maliciosas en ServiceFormModal onBlur + warning al proveedor si detecta patrones phishing (domains diferentes al propio proveedor).

---

## 11. Admin + roles

- Role `admin` en array `proveedores.roles`. Verificado via `is_admin()` function.
- `is_admin()` definido SECURITY DEFINER → role check seguro.
- Admin UI en `/admin`, gated per-página con `verifySession + isAdmin`.

**Hallazgo S-M1** [BAJO] — Admin account sharing. Hoy Aldo es el único admin. Si equipo crece, considerar 2FA obligatorio para admin (como S-A2).

---

## 12. Secretos / env vars

- `.env*` git-ignored (verificado).
- Vercel env vars vía dashboard, no commiteados.
- `NEXT_PUBLIC_*` solo para keys públicas (anon key Supabase).
- `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` + `RESEND_API_KEY` + `UPSTASH_*` solo server-side.

**Hallazgo S-S1** [BAJO] — Rotación periódica. No hay calendario de rotación de secrets. Recomendación OWASP: rotar cada 6-12 meses. Setear recordatorio en calendar PO para 2027-05-20.

---

## 13. Observabilidad de seguridad

- **Sentry**: captura errores + eventos custom. Gate a prod.
- **Vercel Logs**: retention 30 días (Pro plan).
- **GA4**: eventos de usuario.
- **Supabase Logs**: query logs + auth logs.

**Hallazgo S-O1** [BAJO] — No hay alertas automáticas de patrones sospechosos (ej. 100 intentos signup en 1 min desde 1 IP). Ver OBSERVABILIDAD-ALERTAS en BACKLOG (post-campañas).

---

## Resumen de hallazgos priorizados

| ID | Severidad | Esfuerzo fix | Pre-campañas? |
|---|---|---|---|
| S-R1 (rate limit emails/signup in-memory) | MEDIO | 2-3h | **SÍ** |
| S-P1 (PII vista pública) | ALTO | ejecutándose sábado | YA PLANIFICADO |
| S-E1 (verificar auth gate auto-moderar) | VERIFICAR | 10 min | SÍ (si falta gate) |
| S-X1 (escape HTML emails inline) | MEDIO | 10 min + 1-2 líneas | SÍ |
| S-P2 (nombre completo en subject email) | MEDIO | decisión producto + 1h | MEDIA |
| S-CSP4 (unsafe-inline / unsafe-eval CSP) | MEDIO | 1 día (nonces middleware) | NO (post-campañas) |
| S-V1 (review spam residual) | MEDIO | sprint dedicado | NO (post-campañas) |
| S-V5 (phishing URLs en descripción) | MEDIO | 2-3h filtro URLs | NO (fase 2) |
| S-A1 (signOut scope global) | MEDIO | 30 min | NO (deuda SIGNOUT-SCOPE) |
| S-A2 (2FA admin) | MEDIO | 2h | MEDIA (si equipo crece) |
| S-H1 (X-Frame-Options alinear a DENY) | BAJO | 5 min | NO |
| S-CSP1-S-CSP3 (CSP cleanup) | BAJO | 15 min | NO |
| S-A3 (password policy) | BAJO | decisión producto | NO |
| S-A4 (bloqueo cuenta tras N fallos) | BAJO | 2h | NO |
| S-V2 (enumeration via signup) | BAJO | 15 min verify copy | SÍ |
| S-V3 (scraping anon) | BAJO | n/a (vía rate limit) | NO |
| S-M1 (2FA admin) | BAJO | fuera de scope | NO |
| S-S1 (rotación secrets) | BAJO | 0h (calendar) | NO |
| S-O1 (alertas sospechosas) | BAJO | post-campañas | NO |

---

## Top 5 fixes pre-campañas

1. **S-R1 + S-E1 + S-X1 + S-V2** (combinado ~3h): migrar rate limit emails/signup a Upstash + verificar auth gate `auto-moderar` + escape HTML emails inline + generic message para signup error (no revela si email existe).
2. **Confirmar S-P1 PII-VIEW-TIGHT ejecutado sábado 21-11** según plan existente.
3. **S-P2 decidir** copia del subject email tutor nombre completo (RESERVA-MAIL-NOMBRE pendiente).

**Total impacto**: cierra todos los hallazgos MEDIO/ALTO pre-campañas en una pasada compacta.

---

## Decisiones pendientes del PO

### D1. Sprint de seguridad consolidado pre-campañas

**Pregunta**: ¿autorizás arrancar sprint de ~3h con S-R1 + S-E1 + S-X1 + S-V2 juntos?

**Recomendación**: sí. Cierra los 4 hallazgos MEDIO de una vez, impacto desproporcionado al esfuerzo. Prioritario pre-campañas (cuando tráfico de bots/attackers aumenta).

**Impacto si no se decide**: default = quedan como deuda post-campañas.

### D2. S-P2 — Nombre completo en subject email al proveedor

**Pregunta**: ¿el email "Nueva solicitud de reserva" al proveedor mantiene nombre+apellido del tutor o cambia a "Nombre I."?

**Recomendación**: mantener nombre completo en emails de reserva confirmada (contexto necesario para operación). Nombre+Inicial solo en superficies públicas/privadas sin transacción.

**Impacto si no se decide**: default = mantener como está.

### D3. 2FA admin

**Pregunta**: ¿valide activar 2FA para admin (PO) ya mismo, o esperar a tener equipo mayor?

**Recomendación**: activar **ya** si Supabase Dashboard lo permite (el admin tiene acceso a service role key + poder cleanup data real). 10 min de setup vs riesgo si credenciales admin se comprometen.

**Impacto si no se decide**: default = no 2FA.

### D4. S-CSP4 — CSP nonces post-campañas

**Pregunta**: ¿agendamos sprint de endurecimiento CSP post-campañas?

**Recomendación**: sí, Q1 2027. Post-launch cuando el stack sea estable.

**Impacto si no se decide**: default = CSP con `unsafe-inline` por ahora.

### D5. Rotación de secrets calendar

**Pregunta**: ¿valide agregar al calendar del PO rotación de secrets cada 6 meses (próxima: 2027-05-20)?

**Recomendación**: sí. Mejor práctica estándar.

**Impacto si no se decide**: default = rotar reactivamente ante incidente.

---

## Firma

Auditoría base al 2026-11-20. Re-auditar cada 3 meses o tras incidente de seguridad. La matriz de hallazgos sirve como punto de partida para un pentest externo si se decide invertir en uno post-primer trimestre.
