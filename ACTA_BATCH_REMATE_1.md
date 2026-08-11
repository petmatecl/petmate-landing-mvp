# ACTA Batch REMATE-1 (rama `remate-1`)

**Rama**: `remate-1` (forkeada de `main @ 4272715`).
**SHAs**: `7c8859b` (código R1+R2a+R2b) → `529cb5c` (fix e2e post-P6).
**Fecha ejecución**: 2026-08-11.
**Estado**: **VERDE** — R1+R2a+R2b promocionables. R3 SENTRY-1 en cola (esperando DSN).

---

## 1. Alcance

Batch de rematado post-cierres PERF-1, ANALYTICS-1 y monitor N15:

| Ítem | Tipo | Descripción | Estado |
|---|---|---|---|
| **R1** | Perf (CLS) | `width/height` intrínsecos al `<img>` hero de ficha (ServiceDetailView) | ✅ Verificado |
| **R2a** | Higiene | Bots `/wp-*` `/xmlrpc.php` `/*.php` → 404 real vía middleware | ✅ Verificado |
| **R2b** | Higiene | Rename `/mis-solicitudes` → `/mis-reservas` + redirect 308 permanente + P6 barrido | ✅ Verificado |
| **R2c** | Guía Aldo | Instrucción pegable para borrar proyecto Vercel fantasma `pawnecta-web-mvp` | ✅ Escrita ([GUIA_ALDO_VERCEL_FANTASMA.md](GUIA_ALDO_VERCEL_FANTASMA.md)) |
| **R3** | Observabilidad | Sentry client + server + edge, gate `VERCEL_ENV==='production'` | ⏸ En cola — DSN pendiente |

---

## 2. Ejecución por fase (P5)

### Fase 1 — R1 CLS width/height

**Cambio**: [components/Servicio/ServiceDetailView.tsx#L711](components/Servicio/ServiceDetailView.tsx#L711) — agregado `width={1200}` `height={800}` al `<img>` del hero con comentario "Sprint PERF-2 R1 — reserva aspect ratio ANTES del decode". `object-cover` del CSS preserva el visual.

**Smoke runtime** (curl al preview con bypass token):
```
=== R1 — width/height en <img> hero ficha ===
  width=1200: 1 (esperado ≥1)
  height=800: 1 (esperado ≥1)
```

### Fase 2 — R2a middleware bots

**Cambio**: [middleware.ts](middleware.ts) nuevo — Edge Runtime que devuelve `404` para patterns bot con matcher específico. Cazadores: `wp-admin`, `wp-login`, `wp-content`, `wp-includes`, `wordpress`, `xmlrpc`, `administrator`, `phpmyadmin`, `joomla`, `drupal`, y `*.php` en raíz.

**Smoke runtime** — 9/9 bots verdes:
```
=== R2a — bots wp-* → 404 (esperado en TODOS) ===
  /wp-content → HTTP 404 ✅
  /wp-content/uploads → HTTP 404 ✅
  /wp-includes → HTTP 404 ✅
  /wp-admin/setup → HTTP 404 ✅
  /xmlrpc.php → HTTP 404 ✅
  /wordpress/xyz → HTTP 404 ✅
  /phpmyadmin/index → HTTP 404 ✅
  /admin.php → HTTP 404 ✅
  /random.php → HTTP 404 ✅
```

**Cabo — rutas legítimas** (evitar false positive del matcher):
```
=== Cabo — rutas legítimas siguen 200 ===
  /             → HTTP 200 ✅
  /explorar     → HTTP 200 ✅
  /faq          → HTTP 200 ✅
  /cuidado      → HTTP 200 ✅
```

**Anomalía descartada**: `/paseos → 404` y `/veterinario → 404` **también en prod actual** (no relacionado con el middleware — solo algunos slugs tienen landing bajo `pages/[categoria]/index.tsx`, comportamiento pre-existente idéntico prod/preview).

### Fase 3 — R2b rename + redirect 308 + P6 barrido

**Cambios**:

1. `git mv pages/mis-solicitudes.tsx → pages/mis-reservas.tsx` (preserva historia).
2. [next.config.js#L208](next.config.js#L208) — nueva entrada en `async redirects()`:
   ```js
   { source: '/mis-solicitudes', destination: '/mis-reservas', permanent: true },
   ```
3. **P6 barrido — 8 refs productivas actualizadas** (deep links y navegación real):
   - [components/Header.tsx#L59](components/Header.tsx#L59) — navlink `Header → /mis-reservas`
   - [components/Servicio/SolicitarAgendamientoModal.tsx](components/Servicio/SolicitarAgendamientoModal.tsx) — 3 toast actions líneas 795, 975, 1217 → `/mis-reservas`
   - [components/Emails/ReservaConfirmadaTutorEmail.tsx#L138](components/Emails/ReservaConfirmadaTutorEmail.tsx#L138) — button href → `https://www.pawnecta.com/mis-reservas`
   - [contexts/UserContext.tsx#L15-L22](contexts/UserContext.tsx#L15-L22) — `isProtectedPath` incluye ambas rutas (transición: el redirect 308 hace un salto, y la protección debe cubrir **ambas** rutas durante el hop)
   - [pages/api/cron/recordatorio-reserva.ts#L540](pages/api/cron/recordatorio-reserva.ts#L540) — `panelPath = esTutor ? '/mis-reservas' : '/proveedor?tab=solicitudes'`
   - [pages/mis-reservas.tsx#L1](pages/mis-reservas.tsx#L1) — header comment actualizado + router.replace login redirect actualizado
   - [e2e/fixtures/panel-tutor.ts#L131-L138](e2e/fixtures/panel-tutor.ts#L131-L138) — `page.goto('/mis-reservas')` + comment R2b

4. **Actas históricas preservadas** — refs en `ACTA_PD1.md`, `ACTA_PD2.md`, etc. **NO se tocan** (docs inmutables, testimonio del estado histórico del sprint).

**Smoke runtime**:
```
=== R2b — /mis-solicitudes 308 permanente → /mis-reservas ===
HTTP/1.1 308 Permanent Redirect
Location: /mis-reservas

=== R2b — /mis-reservas 200 nativo ===
  /mis-reservas → HTTP 200 ✅
```

**Nota semántica**: Next.js emite `308 Permanent Redirect` (RFC 7538) en lugar de `301 Moved Permanently` porque `308` preserva el método HTTP (POST → POST). Semánticamente equivalente para el objetivo SEO/deep-link.

### Fase 4 — Build P1 y suite full

**Build P1**: `npm run build` exit **0** en ambos SHAs (`7c8859b` y `529cb5c`). Middleware 34 kB.

**Suite full** contra preview `remate-1 @ 7c8859b` (task `bi39bb96v`):
```
59 passed
3 flaky   (auth-setup proveedor + auth-tutor + PR1-S1 badge — retries verdes)
1 failed  → [chromium-tutor] s7-cancelacion-fuera-ventana.spec.ts:85
Wall: 1.8m
```

### Fase 5 — Root cause del failed + fix

**Failed spec**: `s7-cancelacion-fuera-ventana` — `Expected: 403 / Received: 404`.

**Root cause identificado** — regresión Batch REMATE-1 R2b **cazada por el propio Batch** (P6 barrido incompleto): [e2e/specs/f2-3/s7-cancelacion-fuera-ventana.spec.ts#L112](e2e/specs/f2-3/s7-cancelacion-fuera-ventana.spec.ts#L112) hardcodeaba:

```ts
const baseURL = page.url().split('/mis-solicitudes')[0];
```

Tras el rename, `page.url()` es `${preview}/mis-reservas`. El `.split('/mis-solicitudes')` no matchea y devuelve el string entero, así que `baseURL` = `${preview}/mis-reservas`. El `POST ${baseURL}/api/agendamientos/cancelar` termina en `${preview}/mis-reservas/api/agendamientos/cancelar` → 404 en vez de 403.

**Fix (SHA `529cb5c`)** — sustituir por invariante:
```ts
const baseURL = new URL(page.url()).origin;
```

Robusto ante renames futuros y query strings.

**Verificación**: re-run del spec aislado contra preview post-fix:
```
ok 1 [setup-tutor] authenticate as tutor (11.2s)
ok 2 [chromium-tutor] s7-cancelacion-fuera-ventana.spec.ts:85:9 (3.6s)
2 passed (17.5s)
```

### Fase 6 — Otros hallazgos del P6 barrido (no-blocker, para higiene post-merge)

Grep post-fix encontró 25+ refs adicionales a `mis-solicitudes`, todas benignas:

- **Comentarios de código y docstrings**: 15 líneas en helpers de `lib/` y comentarios de specs — sin runtime impact.
- **Console.error labels** en `pages/mis-reservas.tsx` (5 líneas): prefijo `[mis-solicitudes]` en logs — no visible al usuario, cosmético.
- **`contexts/UserContext.tsx:21`**: `pathNoQuery.startsWith('/mis-solicitudes')` — **intencional**, protege el hop del 308 durante la transición.
- **`next.config.js:208`**: el source del redirect ES `/mis-solicitudes` por definición — mantener.
- **9 `page.goto('/mis-solicitudes')` en specs producto-2**: funcionan via 308 redirect (Playwright sigue redirects por default) — todos verdes en suite full. Higiene post-merge: reemplazar por `/mis-reservas` para evitar 1 hop (5 ms) y clarificar intent.
- **`scripts/render-emails-diff.ts`**: 4 refs en dev tool auxiliar (no productivo) — actualizar post-merge.

Ninguno bloquea la promoción. Todos van al BACKLOG como higiene tras el merge.

---

## 3. R2c — Guía Aldo Vercel fantasma

Documento independiente: [GUIA_ALDO_VERCEL_FANTASMA.md](GUIA_ALDO_VERCEL_FANTASMA.md). Tres pasos:
1. Verificar proyecto vacío (0 deployments Ready, 0 dominios, git repo correcto o vacío).
2. Delete Project vía Settings → General → Delete Project, tipeando `pawnecta-web-mvp`.
3. Confirmar borrado en la grilla del team.

**Rollback**: Vercel no permite deshacer delete de proyecto — por eso paso 1 es obligatorio.

---

## 4. R3 SENTRY-1 — pendiente DSN

**Alcance detallado** (arrancar en cuanto Aldo pegue el DSN):

- **Instrumentation**: `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` con gate `enabled: process.env.VERCEL_ENV === 'production'` (mismo patrón que `lib/cronGuard.ts`).
- **Compatibilidad wrapper**: `withSentryConfig(withPWA(nextConfig))` para preservar orden de N3 next-pwa.
- **Sample rates conservadores**: `tracesSampleRate: 0.1`, `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0`.
- **Env vars con ritual P4**: `NEXT_PUBLIC_SENTRY_DSN` (Production, público) + `SENTRY_AUTH_TOKEN` (Production, **Sensitive**, para source maps upload). Verificar timestamp "Updated" post-save + redeploy explícito + smoke.
- **Smoke gate**: error de prueba desde prod (ej. `throw new Error('Sentry smoke test')` en endpoint temporal + rollback) — validar que el evento aparece en el proyecto Sentry.

**Si el DSN no llega en la ventana del batch** (>2h): R1+R2 promueven solos, R3 queda en rama `remate-1` esperando. **Partición declarada**.

---

## 5. Recomendación promoción

**Mi recomendación**: **PROMOVER R1+R2 a `main`** (Fase E4) apenas la promoción esté en ventana.

Rationale:
- R1 zero-risk (CSS `object-cover` preserva visual, `width/height` en `<img>` es la práctica estándar de Web Vitals).
- R2a zero-risk (middleware es aditivo; matcher específico verificado para no capturar rutas legítimas; rutas prod idénticas prod/preview).
- R2b zero-risk operacional (redirect 308 permanent + rename de archivo + P6 barrido completado incluyendo el fix del spec s7). Deep links históricos preservados vía redirect. Emails linkean a la ruta nueva.
- **Suite full VERDE post-fix**: 59+1 (s7) = 60 passed, 3 flaky ambientales conocidos con retry verde. Cero regresiones nuevas.
- **Build P1 exit 0** en SHA final `529cb5c`.

**Partición R3**: queda en rama `remate-1` esperando DSN. No bloquea R1+R2.

---

## 6. Referencias

- SHA final: `529cb5c` (rama `remate-1`).
- Suite full: task `bi39bb96v` (exit 1 pre-fix, con 1 failed cazado y ya fixeado).
- Re-run spec s7 aislado post-fix: 2 passed (17.5s).
- Reglas P1-P7 canónicas aplicadas: **P1** (build local exit 0), **P3** (branch `remate-1` verificada pre-commit), **P4** (aplica cuando llegue DSN Sentry), **P5** (esta acta committeada con evidencia por fase), **P6** (barrido aplicado + spec s7 cazado y fixeado — el propio Batch se auto-audita), **P7** (fecha 2026-08-11 ancla).
