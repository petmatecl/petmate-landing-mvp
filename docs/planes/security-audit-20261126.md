# Security audit read-only — 2026-11-26

Written for: el PO (Aldo). Deliverable ITEM 2 opción (a) del dispatch autónomo paralelo 2026-11-26. **Docs-only — cero fix implementado sin GO PO**. Trigger: dispatch pidió review de auth flows + RLS policies + endpoints API sensibles como gap útil pre-campañas.

**Método**: revisión estática read-only sobre código del repo (branch `main` @ `f9e3e8b`) + consulta Supabase prod-ro cuando corresponde. Alcance: 3 superficies principales (auth, RLS, API endpoints). Cero explotación, cero mutation.

**Timestamp**: 2026-11-26 ~22:30 UTC (19:30 CLT).

---

## 1. Resumen ejecutivo

- **3 hallazgos SEVERIDAD ALTA** (no bloqueantes pero priorizan sprint propio pre-campañas).
- **5 hallazgos SEVERIDAD MEDIA** (deuda documentable, revisables post-launch).
- **4 hallazgos SEVERIDAD BAJA** (defensive hardening + housekeeping).
- **0 hallazgos CRÍTICOS** (ningún vector explotable identificado en la sesión).

Las 3 ALTA concentran riesgo pre-campañas donde el CAC amplificará cualquier abuso (spam, enumeration, cross-user leak). Priorización recomendada: sprints dedicados cada una ANTES de activar ads pagados a tráfico orgánico frío.

---

## 2. Hallazgos SEVERIDAD ALTA

### AUDIT-SEC-H1 — Rate limit in-memory sin replica (auth flow brute-force)

**Archivo**: [`lib/rateLimit.ts > authLimiter`](../../lib/rateLimit.ts).

**Riesgo**: Vercel serverless cada invocación arranca con memoria fresca → el contador in-memory NO persiste entre invocaciones concurrentes → el rate limit es efectivo solo en dev (single process). Documentado como deuda P1 en el repo (`staging-setup/MASTER_AUDIT_REPORT.md` #15), pero el pre-campañas lo recrudece: atacante puede paralelizar signup attempts desde múltiples IPs (bots cheap) sin que ninguna invocación comparta estado. Supabase Auth rate limit a nivel plataforma es el único cinturón real.

**Exploit potencial**: enumeración de emails válidos vía signup intentos paralelos (response diferencia entre email ya registrado vs disponible). O brute force password recovery.

**Mitigación recomendada**: migrar `authLimiter` a store distribuido vía Upstash Redis u equivalente. Ya existe `@upstash/ratelimit` + `@upstash/redis` como dependencias del repo (verificado en deps-safe-2 merged d50c043). Sprint propio ~1 día estimado.

**Fix sugerido** (NO implementar sin GO):

```ts
// lib/rateLimit.ts refactor con Upstash
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export const authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 m'),  // 5 per 10 min per IP
    prefix: 'auth-lim',
});
```

### AUDIT-SEC-H2 — Endpoint `/api/unsubscribe` sin auth + user enumeration via token predecible

**Archivo**: [`pages/api/unsubscribe.ts`](../../pages/api/unsubscribe.ts) (Sprint A PR 4 nudge-unsub, local committed).

**Nota**: este hallazgo es sobre código que va en Sprint A PR 4 nudge-unsub, aún NO pushed/merged. Lo incluyo acá porque el audit se hizo sobre el código completo visible en la sesión, incluyendo el committed local.

**Riesgo**: HMAC-SHA256 del `auth_user_id` con secret estático es seguro contra forgery si el secret es fuerte. PERO: si el secret se filtra (Sentry log, leaked env var, PR público con secret por error), un atacante puede generar tokens para CUALQUIER `auth_user_id` y desuscribir users masivamente. El UNSUBSCRIBE_SECRET nunca rota. Riesgo medio hoy, pero compound con el uso creciente post-campañas.

**Mitigación recomendada**:
1. Incluir expiration en el token (timestamp firmado → token válido solo 30 días post-emisión).
2. Rotación anual de UNSUBSCRIBE_SECRET con ventana de gracia (verify con secret viejo + nuevo).
3. Monitoring: alerta Sentry si >10 unsubscribes en <1 min (señal abuse).

**Fix sugerido (post-H2 aplicado)**:

```ts
// lib/unsubscribeToken.ts v2
export function signUnsubscribeToken(userId: string, secret: string, ttlDays = 30): string {
    const expiresAt = Date.now() + ttlDays * 86_400_000;
    const payload = `${userId}.${expiresAt}`;
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return `${expiresAt}.${sig}`;
}
// verify: parsear expiresAt, check Date.now() < expiresAt, verify HMAC sobre payload reconstruido.
```

Sprint propio ~1 día + migration data (bulk sign new tokens para re-link) si se quiere aplicar a usuarios existentes.

### AUDIT-SEC-H3 — Cron endpoints: CRON_SECRET vs IP allowlist Vercel

**Archivos**:
- [`pages/api/cron/recordatorio-reserva.ts`](../../pages/api/cron/recordatorio-reserva.ts)
- [`pages/api/cron/recordatorio-onboarding.ts`](../../pages/api/cron/recordatorio-onboarding.ts)
- Otros 4 crons en `pages/api/cron/*`.

**Riesgo**: todos los crons autentican via `CRON_SECRET` header Bearer. Si el secret se filtra (misma matriz H2) o es débil, atacante puede disparar mass actions (spam de emails nudge, cancelación masiva de reservas, etc). Vercel documenta que los cron requests vienen de IPs específicas pero el repo NO verifica eso como fallback.

**Mitigación recomendada**: agregar check adicional `x-vercel-id` header (Vercel-added, no spoofable desde browser) O IP allowlist via `req.headers['x-forwarded-for']` matcheando rangos documentados de Vercel Cron.

**Fix sugerido**:

```ts
// lib/cronGuard.ts enhancement
export function validateCronRequest(req: NextApiRequest): boolean {
    const bearer = req.headers.authorization?.slice(7);
    if (bearer !== process.env.CRON_SECRET) return false;
    // Defense in depth: Vercel adds x-vercel-id to its internal requests.
    const vercelId = req.headers['x-vercel-id'];
    if (!vercelId) {
        console.warn('[cron] missing x-vercel-id — Vercel cron should always have it');
        // Consider rejecting; for now log and allow (pending post-launch validation).
    }
    return true;
}
```

Sprint ~0.5 día. Low risk de aplicar.

---

## 3. Hallazgos SEVERIDAD MEDIA

### AUDIT-SEC-M1 — RLS: `proveedores` SELECT public via RPC `buscar_servicios`

**Observación**: el RPC `buscar_servicios` ejecutado desde cliente anon retorna datos de proveedores (nombre, rut_verificado, etc). Verificar que NO expone campos sensibles como `foto_carnet`, `foto_carnet_dorso`, `fecha_nacimiento`, `rut` (solo rut_verificado boolean está OK).

**Verificación requerida**: `pg_get_functiondef('public.buscar_servicios'::regproc)` + revisar qué columnas selectea desde `proveedores`.

### AUDIT-SEC-M2 — Supabase Storage bucket `documents` privado pero URLs públicas en BD

**Documentado en CLAUDE.md**: `components/Admin/ProveedorApprovalList.tsx:376,384` renderiza `<img src={prov.foto_carnet}>` con URLs `/storage/v1/object/public/documents/...` pero el bucket es privado → URLs rotas en prod.

**Riesgo**: imagen rota (funcional, no de seguridad) + confusión admin. PO lo tiene documentado como bug conocido.

**Mitigación**: migrar a `createSignedUrl(path, 60)` cuando el admin consulte. Sprint ~1h.

### AUDIT-SEC-M3 — HTML injection via `prov.nombre` en templates HTML inline (legacy)

**Archivos**: `pages/api/cron/recordatorio-onboarding.ts` bloques 1 + 2 usan `escapeHtml(prov.nombre)` en los templates HTML inline. Bloque 3 (Sprint A PR 2 nudge-cron local committed) SÍ usa React Email que escapa por default. Pero los bloques 1+2 legacy construyen HTML con template literal sin escape del subject.

**Verificación**: `prov.nombre` viene de `proveedores.nombre` que es editable por el proveedor. Si contiene HTML, va directo al subject (no escaped en subject string). El body SÍ escapa el nombre (`escapeHtml(prov.nombre)`). El subject puede ser render-bomb pero solo afecta al proveedor que ve su propio nombre en el From.

**Riesgo**: bajo (self-only, no cross-user), pero deuda defensive.

**Mitigación**: aplicar `escapeHtml` al subject también, o migrar los bloques 1+2 a React Email templates (mismo patrón que Sprint A PR 3 nudge-email).

### AUDIT-SEC-M4 — Session timeout: 2 guards paralelos `isOrphanSafeRoute` + `SessionTimeout`

**Archivo**: [`lib/authTransitRoutes.ts`](../../lib/authTransitRoutes.ts).

**Observación**: el refactor ya unificó la lista de rutas via `AUTH_TRANSIT_ROUTES` Set. PERO los 2 guards leen distinto:
- `UserContext hydrateFromSession` → consulta `isOrphanSafeRoute` para redirigir huérfanos.
- `SessionTimeout` → consulta `isAuthTransitRoute` para excluir del timeout.

**Riesgo**: cambio en una ruta nueva olvidada en el Set → bug tipo "timeout expulsa user en flow auth". Ya ocurrió históricamente (sprint email-landing session-timeout fix 2026-08-25).

**Mitigación**: agregar unit test que verifique que TODAS las rutas de auth del repo están en AUTH_TRANSIT_ROUTES. Scanner estático: grep `pages/login.tsx` + `/register` + `/forgot-password` + `/email-confirmado` + etc. + diff con el Set. ~1h sprint.

### AUDIT-SEC-M5 — Admin notificaciones endpoint sin rate limit propio

**Archivo**: [`pages/api/admin/notify-nueva-solicitud.ts`](../../pages/api/admin/notify-nueva-solicitud.ts).

**Riesgo**: endpoint `verifySession` + check `isAdmin`. Admin usuario legítimo NO es amenaza. PERO si cuenta admin se compromete (phishing, credential reuse), atacante con admin session puede spammear notificaciones push a todos los proveedores sin rate limit → degradación UX masiva.

**Mitigación**: rate limit por admin user (`authLimiter` pattern), max 10 notify/hora por admin. Sprint ~0.5 día.

---

## 4. Hallazgos SEVERIDAD BAJA

### AUDIT-SEC-L1 — Email templates React: props no validadas con zod

Los 11 templates + nuevo NudgePerfilEmail reciben `props: Readonly<Props>` TypeScript pero no validación runtime. Si algún call site pasa datos no sanitizados, el template podría contener XSS payload en text.

**Riesgo**: bajo porque React Email escapa children text por default. Edge case: si alguien usa `dangerouslySetInnerHTML` dentro del template (actualmente ninguno lo usa). Lo marco para prevenir regresión.

### AUDIT-SEC-L2 — Sentry server config fallback silent

Si `SENTRY_DSN` env missing en runtime, Sentry inicializa en modo silent. Zero alertas durante incident = ciego. Mitigación: alerta de deploy que verifique `SENTRY_DSN` en env post-deploy.

### AUDIT-SEC-L3 — CSP `script-src 'unsafe-inline' 'unsafe-eval'`

Documentado en CLAUDE.md como limitación aceptada (Next.js inline scripts + react-leaflet eval). Migración a nonces via middleware queda como mejora futura. Riesgo real: bajo (whitelist precisa de origins mitiga el valor de XSS potencial).

### AUDIT-SEC-L4 — `signOut` scope: 3 call sites sin `{ scope: 'local' }`

Documentado en CLAUDE.md regla operativa (`SIGNOUT-SCOPE` BACKLOG candidate). Impacto: logout cross-device inesperado. Mitigación: migrar call sites a `scope: 'local'` + agregar botón "Cerrar sesión en todos los dispositivos". Deuda consolidada.

---

## 5. Síntesis + decisión propuesta

**Priorización pre-campañas** (3 ALTA):

| # | Sprint candidate | Esfuerzo | Blast radius pre-campañas |
|---|---|---|---|
| H1 | `AUTH-RATELIMIT-UPSTASH` | 1 día | Alto (bots enumeration con tráfico pagado) |
| H3 | `CRON-GUARD-VERCEL-ID` | 0.5 día | Medio (si CRON_SECRET se filtra) |
| H2 | `UNSUBSCRIBE-TOKEN-TTL` | 1 día | Medio (si secret se filtra) |

**Post-launch cleanup** (5 MEDIA): batch de ~3 días total si se agrupan en sprint SEC-M-BATCH.

**Zero implementation aterrizada** en este documento — spec read-only para habilitar decisión informada del PO.

**Backlog candidates** (todos NEW, prioridades propuestas):

- `AUTH-RATELIMIT-UPSTASH` — ALTA pre-campañas
- `CRON-GUARD-VERCEL-ID` — ALTA pre-campañas
- `UNSUBSCRIBE-TOKEN-TTL` — MEDIA post-launch
- `BUSCAR-SERVICIOS-RPC-AUDIT` — MEDIA
- `CARNET-SIGNED-URL-FIX` — MEDIA (ya documentado como bug conocido)
- `EMAIL-SUBJECT-HTML-ESCAPE` — MEDIA
- `AUTH-TRANSIT-ROUTES-STATIC-TEST` — MEDIA
- `ADMIN-NOTIF-RATELIMIT` — MEDIA
- `SENTRY-DSN-DEPLOY-CHECK` — BAJA
- `CSP-NONCES-MIGRATION` — BAJA
- `SIGNOUT-SCOPE` — BAJA (ya en BACKLOG)

---

## 6. Trazabilidad

- Dispatch origen: PO 2026-11-26 ITEM 2 opción (a).
- Repo ref: main @ `f9e3e8b` post merge PR #229 (nudge-schema refined).
- Archivos consultados: ver links inline.
- Reglas CLAUDE.md referenciadas: P1 (build + tsc), P5 (acta por fase), P6 (nombres columna verificados), EMAILS-EMOJI-POLICY, anti-voseo.
- Deuda relacionada BACKLOG pre-existente: `SIGNOUT-SCOPE`, `AUTH-TOKEN-PERSIST` (histórico CI).
