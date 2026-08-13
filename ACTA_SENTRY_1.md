# ACTA Sprint R3 SENTRY-1 (rama `sentry-1`)

**Rama**: `sentry-1` (forkeada de `main @ d81cf14`).
**SHAs**: `3b362b2` (Fase A configs + wrapper) → `1fce7b5` (Fase B endpoint smoke) → `bf96ae8` (Fase C fix sent flag + spec e2e).
**Fecha ejecución**: 2026-08-11.
**Estado**: **VERDE EN PREVIEW** — pendiente GO del PO para promoción a `main`. Env vars Vercel pendientes de creación por Aldo.

---

## 1. Alcance ejecutado

Sentry error monitoring con las 4 restricciones del PO:
1. **Solo error monitoring** — session replay OFF, tracing/performance OFF, logging OFF.
2. **Gate a producción** — cero eventos desde staging/preview/local dev.
3. **`sendDefaultPii: false`** + scrub explícito de emails, tokens, cookies, RUTs chilenos.
4. **Sin wizard** — instalación quirúrgica manual, cada archivo revisado antes de commit.

R3 forma partición separada del Batch REMATE-1 promovido el 2026-08-11 (`main @ 0d40d5e → d81cf14`).

---

## 2. Ejecución por fase (P5)

### Fase A — Configs + wrapper next.config (SHA `3b362b2`)

**Archivos nuevos**:
- [sentry.client.config.ts](sentry.client.config.ts) — init browser.
- [sentry.server.config.ts](sentry.server.config.ts) — init nodejs runtime (API routes, gSSP, gSSp).
- [sentry.edge.config.ts](sentry.edge.config.ts) — init Edge Runtime (middleware.ts — hoy solo el bot 404 de Batch REMATE-1 R2a).
- [lib/sentryScrub.ts](lib/sentryScrub.ts) — hook `beforeSend` compartido con walker recursivo (profundidad 8) sobre message, breadcrumbs, extras, contexts, tags, request.url, request.data. Redacta 5 patrones:
  - JWT bearer (`eyJ*.*.*`).
  - Supabase auth cookies (`sb-<projectref>-auth-token`).
  - Emails (`address@domain`).
  - RUT chileno con puntos (`NN.NNN.NNN-K`).
  - RUT chileno sin puntos (`NNNNNNNN-K`).
  - Headers `cookie`, `set-cookie`, `authorization`, `x-*-token` redactados si aparecieran.

**Modificado**:
- [package.json](package.json) — `@sentry/nextjs@^10.70.0` agregado (`npm install --save`, sin `--force` ni wizard).
- [next.config.js](next.config.js) — `module.exports = withSentryConfig(withPWA(nextConfig), {...})`. Orden clave: PWA envuelve primero (respeta N3 tren N15 con `@ducanh2912/next-pwa@10.2.9`), Sentry envuelve todo por fuera. Opciones conservadoras: `silent: true`, `authToken: process.env.SENTRY_AUTH_TOKEN` (opcional — skippea sourcemap upload si no está), `hideSourceMaps: true`, `disableLogger: true`, `widenClientFileUpload: true`.

**Gate a producción — tres capas, misma semántica**:
- Client (browser): `enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'`. Vercel inyecta esta var pública en el bundle automáticamente.
- Server (nodejs): `enabled: process.env.VERCEL_ENV === 'production'`.
- Edge (middleware): `enabled: process.env.VERCEL_ENV === 'production'`.

**Sample rates** (todos los configs): `tracesSampleRate: 0`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 0`, `integrations: []` explícito.

**Build P1**: `npm run build` exit **0**. First Load JS shared 186 → 235 kB (+49 kB Sentry v10, esperado; los integrations `[]` en runtime aseguran que Replay/BrowserTracing quedan como dead code en el bundle pero no se activan). Middleware 34 → 41 kB (+7 kB Sentry edge).

### Fase B — Endpoint smoke temporal (SHA `1fce7b5`)

**Archivo nuevo**: [pages/api/admin/sentry-smoke.ts](pages/api/admin/sentry-smoke.ts) — endpoint gated a admin (`verifySession` + `isAdmin` — patrón id-only del proyecto) que dispara `Sentry.captureException` con tag `smoke=true` + timestamp. Response reporta:
- `sent`: booleano — evento efectivamente aceptado para transmisión.
- `eventId`: UUID Sentry si `sent === true`, `null` si no.
- `gate.env`: `VERCEL_ENV` real (`preview` / `production` / `unknown`).
- `gate.enabled`: booleano gate.
- `gate.dsn_configured`: si `NEXT_PUBLIC_SENTRY_DSN` está seteado.

Sin PII en el mensaje del error (solo timestamp + tags). Pasa por el scrub por consistencia.

### Fase C — Fix `sent` flag + spec e2e (SHA `bf96ae8`)

**Hallazgo del smoke inicial**: Sentry v10 devuelve un `event id` UUID sintético SIEMPRE, incluso con `enabled: false` — el SDK construye el id pero **NO transmite a la red**. El check anterior (`typeof eventId === 'string' && eventId.length > 0`) daba falso positivo en preview (`sent: true`) aunque el gate estaba cerrado.

**Fix** en [pages/api/admin/sentry-smoke.ts](pages/api/admin/sentry-smoke.ts):
```ts
// Antes:  const accepted = typeof eventId === 'string' && eventId.length > 0;
// Ahora:  const sent = gateEnabled && dsnSet;
```
`sent` refleja el estado real del gate + DSN, no el return value del SDK.

**Archivo nuevo**: [e2e/specs/sentry/gate.spec.ts](e2e/specs/sentry/gate.spec.ts) — spec adaptativo al entorno. Handleja 3 escenarios:
- DSN missing → `sent: false, eventId: null`.
- Gate cerrado (preview/staging) con DSN → `sent: false, eventId: null`.
- Gate abierto (prod) con DSN → `sent: true, eventId: <uuid>`.

Reutilizable post-merge para validar el gate en prod (basta con `PLAYWRIGHT_BASE_URL=https://www.pawnecta.com`).

---

## 3. Smoke ejecutado contra preview `sentry-1`

**Preview URL**: `https://pawnecta-landing-mvp-git-sentry-1-petmatecls-projects.vercel.app`.

**Comando**:
```bash
PLAYWRIGHT_BASE_URL="https://pawnecta-landing-mvp-git-sentry-1-petmatecls-projects.vercel.app" \
  npx playwright test e2e/specs/sentry/gate.spec.ts --project=chromium
```

**Resultado — 2 passed (5.6s)**:
```
ok 1 [setup] authenticate as proveedor (3.0s)
[sentry-smoke] {
  "sent": false,
  "eventId": null,
  "gate": {
    "env": "preview",
    "enabled": false,
    "dsn_configured": false
  },
  "timestamp": "2026-08-13T20:28:02.624Z"
}
ok 2 [chromium] R3 SENTRY-1 — gate rechaza envío en preview/staging, acepta en prod (1.6s)
```

**Interpretación**:
- `gate.env: "preview"` — Vercel identifica correctamente el entorno.
- `gate.enabled: false` — gate cerrado como esperado.
- `gate.dsn_configured: false` — Aldo aún no creó `NEXT_PUBLIC_SENTRY_DSN` en Vercel (esperado; ese paso queda en su cancha).
- `sent: false, eventId: null` — cero eventos hacia Sentry desde preview. **Cuota preservada**.

---

## 4. Pasos pendientes para Aldo (fuera del código)

Antes del GO de promoción a `main`:

### 4.1 Crear env vars en Vercel — scope Production

En Vercel Dashboard → `pawnecta-landing-mvp` → Settings → Environment Variables:

| Variable | Valor | Scope | Sensitive |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `https://6dae36e1c7edf5b084d984cdd9427b30@o4511905223016448.ingest.us.sentry.io/4511905344847872` | Production | No (es público por convención Sentry — aparece en el bundle cliente) |
| `SENTRY_AUTH_TOKEN` | (opcional) auth token de la org `pawnecta` para sourcemap upload | Production | **Sí — Sensitive** |

**Ritual P4 tras crear las vars**:
1. Verificar timestamp "Updated" en la fila — debe reflejar la edición reciente. Si dice fecha vieja, el Save no persistió (bug UI conocido de Vercel) — recargar y re-guardar.
2. Redeploy explícito del último commit de la rama (necesario porque los env vars nuevos no aterrizan al bundle sin build).
3. Smoke inmediato (ver 4.2).

### 4.2 Post-promoción a prod — smoke gate abierto

Con `main` mergeado y env vars aterrizadas:

```bash
PLAYWRIGHT_BASE_URL="https://www.pawnecta.com" \
  npx playwright test e2e/specs/sentry/gate.spec.ts --project=chromium
```

Resultado esperado:
```json
{
  "sent": true,
  "eventId": "<uuid-hex-32-chars>",
  "gate": { "env": "production", "enabled": true, "dsn_configured": true }
}
```

Dashboard Sentry (https://sentry.io/organizations/pawnecta/issues/?project=<id>) — buscar tag `smoke=true` en la lista de issues. El evento debería aparecer en **<30s**.

---

## 5. Deuda residual / candidatos post-launch

- **Tree-shake más agresivo del bundle client**: Sentry v10 incluye BrowserTracing/Replay como código dead-por-config en el bundle (+49 kB shared). Post-launch, si el bundle pesa, migrar a `@sentry/browser` puro + init manual bajaría ~30-40 kB. Deuda menor.
- **Sourcemap upload en build** (`SENTRY_AUTH_TOKEN`): opcional pero recomendado. Sin él, los stacktraces en Sentry se ven minificados (`chunk-abc.js:1:12345`). Con él, líneas reales del código fuente. Setup ~5 min post-launch.
- **Remover endpoint smoke** o dejarlo: `/api/admin/sentry-smoke` es útil para re-tests futuros del gate. Decisión operativa post-launch.
- **Tunnel para bypass de ad-blockers**: hoy el cliente envía directo a `ingest.us.sentry.io`. Si un ad-blocker rompe eventos, habilitar `tunnelRoute: '/monitoring'` en `next.config.js` → Sentry genera un proxy en `pages/api/monitoring` que reenvía. Trade-off: consume Vercel Functions time por evento.

---

## 6. Referencias

- SHAs: `3b362b2` (configs) → `1fce7b5` (endpoint) → `bf96ae8` (fix + spec).
- Rama: `sentry-1` (base: `main @ d81cf14`).
- Suite gate.spec.ts: 2 passed (5.6s) contra preview.
- Reglas P1-P7 aplicadas: **P1** (build local exit 0 en las 3 fases), **P3** (branch `sentry-1` verificada pre-commit), **P4** (aplica cuando Aldo cree las env vars), **P5** (esta acta committeada con evidencia por fase), **P6** (verificación del shape del response Sentry v10 — hallazgo del event id sintético cazado en el smoke, no en el diseño), **P7** (fecha 2026-08-11).
- Autorización: rama lista para merge. **NO promovida sin GO explícito del PO.**
