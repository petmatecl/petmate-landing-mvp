## ACTA A4 — Rate limit con Upstash Redis (rama `a4-rate` → prod)

**Rama**: `a4-rate` (base `main @ e282b8f`, 52 chars subdominio ≤63 ✅).
**SHA final**: `1decaee` (mergeado FF a `main`).
**Fecha ejecución**: 2026-08-14 (jueves).
**Estado**: **PROD VERIFICADO — sprint cerrado**.

---

## 1. Alcance

Cierra la deuda P1 histórica de `staging-setup/MASTER_AUDIT_REPORT.md` #15: el rate limiter in-memory era no-op en Vercel serverless porque cada invocación arranca con memoria fresca. Documentado en `CLAUDE.md > Auth flow > Caveat del rate limit`.

**Provider**: Upstash Redis Global (region `us-east-1`), instancia `pawnecta-ratelimit`, Free Tier (500k comandos/mes, 256 MB storage). Eviction activada (decisión Aldo: degradación con gracia).

## 2. Ítems ejecutados

### Commit `9ad7c07` — feat inicial

- **`lib/rateLimit.ts` reescrito** — Upstash Redis via REST API (`@upstash/redis@^1.38.2` + `@upstash/ratelimit@^2.0.8`) + fallback in-memory + fail-open + Sentry.
- **21 endpoints `/pages/api/*` sweep mecánico** a `if (!(await xLimiter(req, res))) return;` — signature ahora async, 100% de los call sites migrados en el mismo commit (sed idempotente sobre el patrón exacto).

**Umbrales justificados en código** (constantes en `lib/rateLimit.ts`, aprobados por PO):
- `authLimiter = 5/60s/ip` — signup, tolera error humano + doble submit accidental, mata credential stuffing.
- `emailLimiter = 3/60s/ip` — endpoints que disparan emails transaccionales.
- `apiLimiter = 30/60s/ip` — endpoints públicos generales, tolera burst legítimo de navegación.

Por IP + por endpoint (no globales). Fixed-window fijo (1× comando Redis por check vs 2× de sliding-window; ver deuda `slidingWindow` en BACKLOG).

### Commit `175f242` — fix punto 4 PO

Corrección sobre la implementación inicial: el fallback in-memory silente en prod era exactamente el 6º patrón "output correcto, efecto ausente" del corolario P8. **Formulación PO textual**: *"un rate limiter fantasma es peor que ninguno, porque nadie lo revisa"*.

Fix aplicado — en `VERCEL_ENV=production|preview`, credenciales faltantes al primer intento de init emiten `Sentry.captureMessage({level:'error', tags:{subsystem:'rate-limit', reason:'missing-credentials', vercel_env:<env>}})`. Reportado 1× por lifetime del contenedor (flag `missingCredsReported`) para no floodear.

### Commit `25e2fbb` — BACKLOG supuesto no verificado

Observación PO al cerrar A4: `Sentry.captureMessage` sin `await Sentry.flush()` asume que la cola sobrevive entre invocaciones del mismo contenedor Fluid Compute — mismo supuesto que costó una iteración completa en R3 SENTRY-1 (P8 falla B). Anotado como deuda con protocolo de verificación pendiente (rotar token Preview a inválido → hit → verificar Sentry recibe → esperar cold-start → segundo hit → verificar segundo recibe).

### Commit `1decaee` — feat fase 2 observability (aporte del sprint)

Cierra el hueco expuesto durante el smoke A4 preview — **8ª instancia del meta-patrón P8 del día, esta vez cometida por el PO al leer "dashboard Upstash 0" como "Redis no ejecutó", sin considerar latencia de reporte del free tier**. Ver §4 aprendizajes.

Tres canales complementarios de observabilidad:

1. **Header `X-RateLimit-Backend`** en TODAS las responses del limiter (`upstash | memory | memory-fallback`). Diagnóstico permanente por request — `curl -I` basta para leer el path atendido sin interpretación de firmas de comportamiento.

2. **`console.error('[rate-limit] ...')`** en missing-credentials + redis-init-failed + upstash-error. Cierra el gate-Sentry-solo-prod al agregar segundo canal visible en Vercel Runtime Logs en TODOS los entornos (preview incluido).

3. **Badge visible en `/admin`** — pill al lado del `<h1>` del panel. Verde cuando Upstash healthy (con `latency ping ms`), amarilla cuando ping fail, roja persistente cuando degraded en prod/preview. Silencio en dev local por diseño (memory + not degraded). Aldo entra a `/admin` seguido y lo ve sin buscarlo.

**Infra nueva expuesta**:
- `getBackendStatus()` y `pingRedis()` exportadas desde `lib/rateLimit.ts`.
- `lastRuntimeError` module-level: última falla runtime de Upstash con timestamp. El badge muestra `memory-fallback` por ~60s post-error, luego asume recuperación. Al primer `rl.limit()` exitoso, `lastRuntimeError` se limpia solo — recuperación observable en vivo sin polling extra.
- Endpoint `GET /api/admin/rate-limit-status` (gated `verifySession + isAdmin`) — retorna `{backend, degraded, ping, lastRuntimeError, vercelEnv, checkedAt}` con Cache-Control 30s. Costo: 1 comando Upstash por refresh del badge (~10 pings/día × Aldo = ~300/mes vs 500k del free tier).

## 3. Smoke preview end-to-end (pre-merge)

Ejecutado por Aldo desde navegador logueado (opción B, sin bypass token de Deployment Protection), URL preview `pawnecta-landing-mvp-git-a4-rate-petmatecls-projects.vercel.app` sirviendo SHA `1decaee`.

**Paso 1 — verificación backend**:
```
backend: upstash · status: 400
```

**Paso 2 — ciclo completo contra Redis** (7 signups + 1 extra):
```
req  status  backend   remaining  retryAfter
1    400     upstash   4          null
2    400     upstash   3          null
3    400     upstash   2          null
4    400     upstash   1          null
5    400     upstash   0          null
6    429     upstash   0          57
7    429     upstash   0          57
8    429     upstash   0          57
```

Evidencia decisiva: **el `remaining` bajando 4→3→2→1→0 de forma monótona entre requests demuestra estado compartido**. Un contador in-memory hubiera resetado en cada cold-start de contenedor distinto. Esta continuidad prueba el pipeline Redis end-to-end.

**Paso 5 — recuperación post-ventana (>60s)**:
```
post-window: {status: 400, backend: 'upstash', remaining: '4'}
```

Bucket reseteado. Ventana libera correctamente.

**`retryAfter: 57` vs el smoke previo con `Retry-After: 5,4`**: mismo algoritmo `fixedWindow` alineado al minuto absoluto del reloj UNIX (`reset = (bucket + 1) * windowDuration`, source SDK line 1181), distintos momentos del clock. La corrida de ayer cayó cerca del final del minuto (retry ~5s); esta cayó al inicio (retry ~57s). Comportamiento correcto documentado.

## 4. Smokes prod ejecutados (post-merge `main = 1decaee`)

**Deploy prod activo confirmado** (SHA `1decaee`):
- `GET /api/admin/rate-limit-status` → `401 {"error":"Unauthorized"}` — endpoint feature-nuevo del `1decaee` existe y aplica gate `isAdmin` correctamente.
- Feature `X-RateLimit-Backend` header confirmado en response (ver más abajo).

**Rutas core (patrón S1-S7)** — 10/10 → 200 ✅:
```
  /                                                          → 200 OK
  /explorar                                                  → 200 OK
  /faq                                                       → 200 OK
  /quienes-somos                                             → 200 OK
  /login                                                     → 200 OK
  /register                                                  → 200 OK
  /privacidad                                                → 200 OK
  /terminos                                                  → 200 OK
  /forgot-password                                           → 200 OK
  /servicio/52a6e060-14f2-491d-900e-76240318aadc             → 200 OK
```
(UUID real del sitemap.xml prod.)

**Verificación paso 1 backend en prod** — 1 request pública contra endpoint que pasa por `apiLimiter`, sin gastar el bucket sensible del signup ni ensuciar el contador:

```
GET /api/servicios/00000000-.../slots
  → HTTP: 400
  → X-Ratelimit-Backend: upstash
  → X-Ratelimit-Limit:     30
  → X-Ratelimit-Remaining: 29
```

Header `X-Ratelimit-Backend: upstash` en prod ✅ + contador Redis vivo (`Remaining: 29` = 1 comando consumido). Rate limiter operativo end-to-end en producción.

## 5. Aprendizajes — 8ª instancia P8 del día, cometida por el coordinador

**Cita textual del PO** (al cerrar A4 fase 2):

> "El error de lectura fue mío: interpreté el dashboard en 0 como ausencia de tráfico, sin considerar latencia de agregación ni TTL de 60s. Octava instancia del patrón del día, cometida por el coordinador. La regla no distingue de quién viene la lectura apresurada."

**Aprendizaje operativo consolidado** (aporte del PO, para codificar en CLAUDE.md corolario P8):

> "Cuando el sistema observado tiene latencia de reporte o retención corta, el dashboard no sirve como verificación inmediata. Ahí el header en la respuesta es superior — es síncrono, no depende de agregación de terceros, y no caduca. Vale como criterio general: **preferir señales síncronas del propio sistema por sobre dashboards con latencia**."

Secuencia de las 8 instancias del día (2026-08-14):
1. Sentry `sent:true` sin envío real (post-CSP hotfix, R3 flush anterior).
2. GA4 log extensión Chrome DevTools sin string en bundle real (ga4-fix / ga4-revert).
3. Migration `IF NOT EXISTS` NO-OP semántico silencioso (20260814_fks_habilitantes).
4. MCP `information_schema` vacío por privileges del rol read-only (bug1-fks premisa falsa).
5. Assertion `DO $$` reventando por parser edge case en prod (`ERROR 42P01`).
6. SQL Editor Supabase `BEGIN`/`COMMIT` en corridas separadas = rollback silente (A2 primer intento).
7. Sentry gate a `VERCEL_ENV=='production'` → fix missing-credentials invisible en preview (§ smoke A4 punto 4 ciego).
8. Dashboard Upstash en 0 leído como "Redis no ejecutó" sin considerar latencia + TTL 60s (§ smoke A4 fase 1).

La convergencia de 8 instancias en un solo día de trabajo motivó el aporte estructural del sprint (header + console.error + badge) como codificación permanente del antídoto: **triple canal síncrono independiente de sistemas de terceros con latencia**.

## 6. Deudas anotadas en BACKLOG

- `Rate limit resistente a rotación de IP (captcha / Vercel BotID)` — trigger: primer patrón real detectado. No preventivo.
- `Sentry.flush() en el path missing-credentials` — supuesto no verificado sobre cola sobrevive entre invocaciones Fluid Compute.
- `Cambiar authLimiter a slidingWindow si se necesita precisión "60s reales desde primera falla"` — trigger: attacker que abuse el boundary del minuto absoluto de fixedWindow. Costo 2× comandos Upstash.

## 7. Tag prod

`a4-prod-20260814` sobre `main = 1decaee`.

## 8. Próximo movimiento

- **A4 CERRADO**. Bloqueo previo de Ola 2 (`pendiente cuenta Upstash`) resuelto.
- **Ola 2** arranca: B1 íconos + B3 form errors + B4 toasts + B5 fotografía vs retratos diferido con dato ficha_vista.
- Backlog A2 residual (proveedores ejemplo prod) ya ejecutado por Aldo en A2 (proveedores 20→11, ejemplos_restantes:0).
