# Diagnóstico — 3 flakes pre-existentes detectados en PR #200 (2026-11-25)

**Fecha**: 2026-11-25.
**Trigger**: CI del PR #200 (branch `docs-cat-dd`, docs-only cambio a BACKLOG) devolvió 8 fails: 5 visual drift (esperado — baseline viejo pre-#199) + **3 fails separados NO relacionados con el scope del PR** ni con drift visual. El PR solo toca `BACKLOG.md`.

**Objetivo del documento**: diagnóstico sin fix (análisis read-only). Si alguno resulta ser regresión real, se propone 1 línea de fix para GO PO; si es flake transient, queda documentado para dejar correr la enmienda P11 o rerun autónomo al cumplir precondiciones.

**Run CI de referencia**: [`45518259208`](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/45518259208) · SHA `c036ca3` · fecha 2026-11-25 00:34 UTC.

---

## Flake 1 — `cue-1-fix/a1-lock-sub-experiments.spec.ts:145`

- **Test**: `A1.c — Autenticado 2 pestañas misma sesión (proveedor) › hydrate OK → cero warnings del watchdog (fix stale closure)`
- **Línea exacta**: [`e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts:173`](../../e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts#L173).
- **Error exacto del log** (no inferencia):
  ```
  Error: [A1.c REGRESIÓN] tab1: hydrate OK debe dar cero warns (fix stale closure watchdog)
  expect(received).toBe(expected) // Object.is equality
  Expected: 0
  Received: 1
  > 173 |   expect(w1.warnings.length, '[A1.c REGRESIÓN] tab1: hydrate OK debe dar cero warns ...').toBe(0);
  ```

- **Frecuencia (últimos runs)**: verde en los 3 runs previos del workflow `e2e-error-audit`:
  - Run `45464223205` (ev-pulido-1, 2026-11-24 18:54 UTC): ✓ en 18.4s.
  - Run `45434113282` (tutor-return-to, 2026-11-24 16:12 UTC): ✓ en 18.6s.
  - Run `45425920498` (explorar-pre, 2026-11-24 15:36 UTC): ✓ en 18.5s.
  - Run `45518259208` (docs-cat-dd, 2026-11-25 00:30 UTC): ✘ en 18.7s. **1ª ocurrencia en ≥3 runs consecutivos verdes recientes**.

- **Hipótesis root cause** (2 candidatas):
  1. **Timing — watchdog disparó 1 vez antes de `hasData=true`**: el test espera que la hidratación de `UserContext` termine en <1s y que, por tanto, el watchdog NO se active. Si el cold start del preview Vercel + la latencia de Supabase Auth se estiran lo suficiente, la hidratación puede tardar >1s y el watchdog emite 1 warn antes de que `hasData` flipee. Preview cold = única variable ambiental plausible. Transient por su propia naturaleza.
  2. **Regresión real del watchdog** (menos probable): un cambio en `contexts/UserContext.tsx` o en la lógica del watchdog podría estar haciendo que el warn se emita en escenarios que antes no. **Descartada por evidencia**: main no cambió entre los 3 runs verdes y este fail (SHA `86686ef` es el mismo HEAD de main en las 3 corridas verdes de ayer PM; el PR #200 solo toca `BACKLOG.md`, no `UserContext`).

- **Clasificación**: **flake transient (reranable)** — timing cold start, con historial verde 3/3 en runs recientes. Candidato legítimo a rerun autónomo bajo enmienda P11 (timeout/cold start en test con historial verde reciente). El test NO cae bajo `feedback_p11_rigor` (no es fixture/data pre-existente — es warn count sensible a timing).

- **Propuesta de fix si persiste**: subir threshold de tolerancia del watchdog en el spec (ej. `toBeLessThanOrEqual(1)` en vez de `toBe(0)`), o esperar warmup explícito del preview antes del `beforeAll`. Cero acción hoy.

---

## Flake 2 — `link-confirm-email/p8-positivo-y-negativo.spec.ts:39`

- **Test**: `LINK-CONFIRM-EMAIL · verificación P8 del helper › POSITIVO: helper genera action_link válido + abrir link aterriza en /email-confirmado`
- **Línea exacta**: [`e2e/fixtures/signupLink.ts:117`](../../e2e/fixtures/signupLink.ts#L117) (originado en [`e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts:70`](../../e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts#L70)).
- **Error exacto del log** (no inferencia):
  ```
  Error: [signupLink] admin.generateLink falló: Unexpected token '<', "<!DOCTYPE "... is not valid JSON (status: n/a, key: sb_secret_i9…)
     at fixtures/signupLink.ts:117
     at generateSignupLink (e2e/fixtures/signupLink.ts:117:15)
     at e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts:70:28
  ```

- **Frecuencia (últimos runs)**: verde en los 3 runs previos:
  - Run `45464223205` (ev-pulido-1): ✓ en 3.1s.
  - Run `45434113282` (tutor-return-to): ✓ en 6.3s.
  - Run `45425920498` (explorar-pre): ✓ en 2.7s.
  - Run `45518259208` (docs-cat-dd): ✘ en 22.4s (mucho más largo que verdes → consistente con reintento/timeout interno del SDK).

- **Hipótesis root cause** (2 candidatas):
  1. **Supabase Auth Admin devolvió HTML (hiccup transient)**: el fixture `generateSignupLink` llama `supabaseAdmin.auth.admin.generateLink(...)`. El error `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` indica que la respuesta HTTP fue HTML (un landing de error, status-page, 504 Gateway, Cloudflare block). Causa probable: ventana puntual de slowness o maintenance del endpoint Supabase Auth Admin en staging. Status `n/a` sugiere que el SDK no logró parsear ni el status code. Transient.
  2. **Service role key rotada o expirada** (menos probable): si `SUPABASE_SERVICE_ROLE_KEY` del env de CI quedó stale (rotación de proyecto, secret override), el endpoint devolvería 401 o 403 — típicamente JSON, no HTML. El prefix `sb_secret_i9…` del log es consistente con una JWT service_role válida en formato. **Descartada por evidencia**: la misma key funcionó en los 3 runs verdes previos de ayer PM; cero rotación conocida entre hoy y ayer (no hubo sprint ni acta de rotación de secrets staging).

- **Clasificación**: **flake transient (reranable)** — hiccup del endpoint Supabase Auth Admin, historial verde 3/3 reciente. Candidato P11 rerun autónomo bajo subset infra (ECONNRESET / timeouts de red / 5xx / HTML fallback de edge proxy).

- **Propuesta de fix si persiste**: agregar retry defensivo con backoff en `generateSignupLink` para los errores "respuesta no-JSON" (muy frecuentes en servicios con edge proxies). Cero acción hoy.

---

## Flake 3 — `sentry/gate.spec.ts:98`

- **Test**: `R3 SENTRY-1 — CSP + gate › 3) endpoint server reporta gate correcto (complementario)`
- **Línea exacta**: [`e2e/specs/sentry/gate.spec.ts:123`](../../e2e/specs/sentry/gate.spec.ts#L123).
- **Error exacto del log** (no inferencia):
  ```
  Error: expect(received).toBe(expected) // Object.is equality
  Expected: 200
  Received: 401
  > 123 |   expect(resp.status()).toBe(200);
  ```

- **Frecuencia (últimos runs)**: verde en los 3 runs previos:
  - Run `45464223205` (ev-pulido-1): ✓ en 906ms.
  - Run `45434113282` (tutor-return-to): ✓ en 5.1s.
  - Run `45425920498` (explorar-pre): ✓ en 1.4s.
  - Run `45518259208` (docs-cat-dd): ✘ en 1.5s. **1ª ocurrencia en ≥3 runs consecutivos verdes recientes**.

- **Hipótesis root cause** (2 candidatas):
  1. **StorageState admin del test expiró / Session timeout silente**: el endpoint `/api/admin/sentry-smoke` requiere auth admin via Bearer token. Si el `beforeAll` cargó `e2e/.auth/proveedor.json` con un access_token que ya estaba cerca de su exp, y el fetch del test ocurre después del límite, Supabase Auth devuelve 401 sin refresh del cliente del test. Transient ambiental (depende de cuándo corrió el setup de auth vs cuándo corre este test en el orden de la suite).
  2. **Regresión del gate `verifyAdminSession`**: un cambio reciente en `lib/apiAuth.ts` o `pages/api/admin/sentry-smoke.ts` que rompa el path de auth devolvería 401 consistentemente. **Descartada por evidencia**: main no tocó esos archivos entre los 3 verdes de ayer y este fail (grep `git log` del main 2026-11-24 no muestra cambios a `lib/apiAuth.ts` ni a `pages/api/admin/sentry-smoke.ts` en los commits merged hoy). El PR #200 solo toca `BACKLOG.md`.

- **Clasificación**: **flake transient (reranable)** — timing de auth del setup admin vs este test downstream, historial verde 3/3 reciente. Candidato P11 rerun autónomo bajo subset "AUTH-TOKEN-PERSIST signature" si la causa es el setup `authenticate as proveedor` degradado, o infra si es cold start del endpoint.

- **Propuesta de fix si persiste**: agregar retry defensivo con re-login dentro del `beforeAll` del spec para el caso 401 (patrón ya canónico en `AUTH-TOKEN-PERSIST`). Cero acción hoy.

---

## Síntesis + decisión propuesta

| Flake | Clasificación | Rerun P11 aplicable | Fix propuesto si persiste |
|---|---|---|---|
| A1.c watchdog warn=1 | Transient (timing cold start) | Sí (historial verde 3/3 + firma timing) | Threshold `toBeLessThanOrEqual(1)` o warmup explícito |
| signupLink HTML response | Transient (hiccup Supabase Auth Admin) | Sí (historial verde 3/3 + firma infra) | Retry con backoff en `generateSignupLink` |
| sentry gate 401 | Transient (auth stale) | Sí (historial verde 3/3 + firma auth timing) | Re-login defensivo en `beforeAll` del spec |

**Conclusión**: los 3 son **flakes transient** con historial verde 3/3 en los runs inmediatamente anteriores. Ninguno es regresión real. **No requieren fix inmediato** — están dentro del dominio de la enmienda P11 (rerun autónomo para timeout/cold start/infra con historial verde reciente), aunque por regla temporal 2026-11-13 solo 1 rerun autónomo por PR está permitido por sprint hasta ruleset rehab.

**Acción recomendada** (para GO PO):
1. Mantener #200 escalado hasta que `#199` merge, sync main en #200, rerun. Si en el rerun post-sync persisten los 3 flakes → consumir rerun autónomo P11 iter 1 por scope docs-only (regla 2026-11-12). Si persisten tras iter 1 → escalada al PO para decisión manual.
2. Agendar en BACKLOG las 3 propuestas de fix defensivo como **deuda menor** (sub-ítem de `AUTH-TOKEN-PERSIST` para el 3º; ítems nuevos para los 2 primeros). Prioridad BAJA — no bloquea lanzamiento, solo mejora robustez de la suite.

**Zero implementación aterrizada en este documento** — es diagnóstico read-only para habilitar decisión informada del PO.

---

## Trazabilidad

- Run CI fail: [`45518259208`](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/45518259208) (PR #200 docs-cat-dd).
- Runs verdes de referencia: `45464223205`, `45434113282`, `45425920498` (2026-11-24 15:30-18:54 UTC).
- Specs: `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts`, `e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts`, `e2e/specs/sentry/gate.spec.ts`.
- Reglas operativas aplicables: P11 enmienda 2026-11-13 (rerun autónomo subset infra/auth), feedback_p11_rigor (cero rerun para fixture/data pre-existente — no aplica acá).
