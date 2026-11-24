# CLAUDE.md enmiendas propuestas — jornada 2026-11-24 PM (pre-freeze lanzamiento 25-11)

Written for: el PO (Aldo). **Borrador de propuesta**, zero aplicación. Cada enmienda abajo captura una regla operativa nueva o un patrón diagnóstico que aterrizó durante la jornada pre-freeze del 24-11 PM y aún no está en `CLAUDE.md`. El PO revisa el borrador y decide cuáles mergear a `CLAUDE.md` en un PR dedicado (idealmente mañana al arranque, junto con el rehab del ruleset).

**Fuente primaria**: cola continua autónoma del 24-11 PM + episodio ruleset-gridlock + diagnóstico email silent-fail + upgrade Resend Pro. Las reglas abajo son destilación operativa de esas evidencias.

---

## Enmienda 1 — Concurrency `staging-exclusive` global cancela Playwright pull_request de PRs paralelos durante batch pre-freeze

### Contexto

Durante pre-freeze T-2h30 del 24-11 PM, 4 branches (ga4-tutor, tutor-return-to, resend-email, emails-emoji) recibieron empty commits serial dentro de segundos (para pickear `AUDIT_INBOX` nuevo post rotación env). El workflow `.github/workflows/e2e-error-audit.yml` tiene:

```yaml
concurrency:
  group: staging-exclusive
  cancel-in-progress: false
```

**Comportamiento observado** (contrario a lo esperado por `cancel-in-progress: false`): 3 de los 4 runs Playwright quedaron en estado `CANCELLED`. Solo 1 sobrevivió al ciclo de serialización (`emails-emoji` 45409380499). GitHub Actions efectivamente trata los runs encolados en el mismo grupo como cancelables cuando otro ocupa el slot — `cancel-in-progress: false` solo previene cancelación del run EN ejecución, no del encolado.

**Consecuencia**: el ruleset de `main` exige los 2 Playwright checks como required status. Los 3 PRs cuyos Playwright fueron canceled se quedaron sin check completable → `gh pr merge` + `gh pr merge --admin` ambos fallaron con `"4 of 4 required status checks have not succeeded"`. workflow_dispatch manual **no cuenta** como check de PR. Deadlock operacional. El PO relajó temporalmente el ruleset (quitar los 2 Playwright de required) para desbloquear merges.

### Regla propuesta

**Regla operativa — concurrency staging-exclusive y batch merges (anotada 2026-11-24 PM)**: cuando se planea un **batch merge pre-freeze o post-launch** (≥3 PRs con push dentro de ventana ≤5 min), **anticipar el fenómeno de CI cancellation cross-PR por concurrency `staging-exclusive`**. Alternativas para no quedar en deadlock:

- **Opción A — Batch serial con pausa 10+ min entre pushes**: pushear 1 PR → esperar Playwright SUCCESS → pushear el siguiente. Cada PR ocupa el slot ~5-8 min por run completo. 4 PRs serial = 30-40 min total.
- **Opción B — Relajar ruleset temporal (lo que se hizo el 24-11)**: PO quita los 2 Playwright de required en `Settings → Rules → main` antes del batch, re-habilita post-merge de todos. Riesgo: ventana donde merges entran sin Playwright verde. Mitigado si los PRs YA tuvieron Playwright verde en SHA previo del propio sprint.
- **Opción C — Refactor del workflow** (pendiente post-launch, ver enmienda "CI-RULESET-CONCURRENCY-REFACTOR" en BACKLOG.md): mover Playwright a concurrency group per-PR (`e2e-staging-${{ github.event.pull_request.number }}` en vez de `staging-exclusive` global) o split a workflow separado sin concurrency compartida con smoke-prod-diario / cleanup-staging-e2e / visual-update-snapshots.

**Signos de alerta durante batch merges**: si 2+ Playwright runs del mismo workflow aparecen con status `CANCELLED` cronológicamente cercanos en `gh run list --workflow e2e-error-audit --limit 15`, parar + aplicar Opción A o B antes de seguir pusheando.

### Texto propuesto para pegar en CLAUDE.md (nueva sección en `## Continuous Integration`)

> **Concurrency staging-exclusive y batch merges — REGLA OPERATIVA (no P-numerada, 2026-11-24)**: el workflow `.github/workflows/e2e-error-audit.yml` (y otros 3 workflows del ambiente staging) usan `concurrency: group: staging-exclusive`. Durante batch merges pre-freeze/post-launch con ≥3 PRs push dentro de ventana ≤5 min, los Playwright de los PRs encolados pueden quedar `CANCELLED` (comportamiento GitHub Actions no documentado explícito — `cancel-in-progress: false` previene cancel del run EN ejecución, no del encolado). Sin Playwright SUCCESS no se cumple el ruleset de 4 required checks → `gh pr merge --admin` falla. Mitigaciones conocidas: (a) batch serial con pausa 10+ min entre pushes; (b) relajar ruleset temporal + re-habilitar post-batch (ver episodio 24-11); (c) refactor pendiente `CI-RULESET-CONCURRENCY-REFACTOR` → concurrency per-PR o split Playwright a workflow propio. Antes de arrancar batch merges, chequear `gh run list --workflow e2e-error-audit --limit 15` por runs recientes CANCELLED — si ya hay patrón, aplicar mitigación antes de seguir pusheando.

---

## Enmienda 2 — `AUDIT_INBOX` (y env vars sin prefix `NEXT_PUBLIC_`) · snapshot at deployment creation time

### Contexto

El PO actualizó `AUDIT_INBOX` en Vercel scope Preview a `petmatecl+audit@gmail.com` durante la jornada 24-11 (previo era fallback `audit_inbox@mail.tm`). Mi diagnóstico inicial fue "runtime at module-load" basado en `const AUDIT_INBOX = process.env.AUDIT_INBOX || '...'` en [lib/resend.ts:23](lib/resend.ts#L23). **Técnicamente cierto para el read del módulo**, pero **operacionalmente incompleto** — Vercel hace snapshot de env vars **at deployment creation time**: cada deployment usa los valores que estaban vigentes al momento de crear el deployment, independiente de cuándo la función haga cold start.

**Consecuencia descubierta durante smoke #149**: los 4 previews rebuildeados a las 12:45–13:10 CLT pickearon el valor **viejo** porque el PO actualizó el env var **después** del push post-rebase. Para que levantaran el nuevo valor hubo que hacer **Redeploy UI "sin build cache"** desde Vercel dashboard (re-inyecta env vars actuales del scope) o push nuevo (gatilla deployment nuevo con snapshot env actuales).

### Regla propuesta

**Regla operativa — Vercel env vars snapshot at deployment creation (anotada 2026-11-24)**: cuando se actualiza un env var en Vercel Dashboard → Settings → Environment Variables (de cualquier scope), los deployments YA creados mantienen el valor VIEJO hasta que se haga Redeploy UI o push nuevo. Consecuencias operacionales:

- **Post rotation de env var crítico** (ej. secrets, URLs de servicios, inbox destinos): además de verificar el timestamp "Updated" en Vercel UI (regla P4 ya documentada), hacer **Redeploy UI con flag "sin build cache"** de todos los deployments que deban pickear el valor nuevo. Para branches activos con preview: redeploy del último deployment READY del branch (Vercel Dashboard → Deployments → menú del deployment → "Redeploy").
- **Durante batch de rebuilds**: si el batch empieza ANTES del cambio de env var, los previews rebuildeados quedan con el valor viejo. Dos opciones: (i) finalizar batch → actualizar env var → Redeploy UI de todos; (ii) actualizar env var primero → batch rebuild (pickeará valor nuevo automático).
- **Smoke manual post env-change**: siempre hacer Redeploy UI del preview-target antes del smoke, para evitar diagnosticar sobre deployment stale.

### Texto propuesto para pegar en CLAUDE.md (extender sección `## Staging environment` o `## Vulnerability management`)

> **Rotación de env var en Vercel → Redeploy UI obligatorio post-change para deployments existentes — REGLA OPERATIVA (anotada 2026-11-24)**: Vercel snapshot env vars at deployment creation. Un deployment existente usa los valores que estaban vigentes al momento de crearse, independiente de cold start posterior. Secuencia correcta post cambio de env var (de cualquier scope): (1) verificar timestamp "Updated" en la fila (regla P4); (2) **Redeploy UI con "sin build cache"** desde Vercel Dashboard → Deployments → menú → "Redeploy" de cada deployment que deba pickear el valor nuevo; (3) smoke sobre preview post-Redeploy. Alternativa: push nuevo al branch (gatilla deployment nuevo con snapshot env actuales). **NO asumir** que `process.env.VAR` "runtime at module-load" significa que un deployment existente va a leer el valor nuevo en el próximo cold start — leerá el snapshot congelado at deployment creation. Incidente que originó la regla: smoke #149 F-TR-17 del 24-11 PM — el PO actualizó `AUDIT_INBOX` post-rebuilds de los 4 PRs; los previews quedaron con fallback `audit_inbox@mail.tm` hasta Redeploy UI.

---

## Enmienda 3 — Supabase Auth no usa SMTP para signup flow del app (admin API + Resend custom)

### Contexto

Durante diagnóstico email no-llega del smoke #149 (24-11 PM), hipótesis inicial del PO: "Supabase Auth usando SMTP built-in de Supabase (rate-limited ~3-4/hora) en lugar de SMTP custom apuntado a Resend. Smokes anteriores quemaron el cupo."

**Diagnóstico mostró hipótesis INCORRECTA** — el flow signup del app NO toca SMTP de Supabase en ningún punto:

- [pages/register.tsx:254](pages/register.tsx#L254) hace `fetch('/api/auth/signup')` (endpoint server-side propio, NO `supabase.auth.signUp` del cliente que SÍ gatilla SMTP).
- [pages/api/auth/signup.ts:58](pages/api/auth/signup.ts#L58) usa `supabaseAdmin.auth.admin.createUser(...)` — admin API crea user **sin enviar email automático** (a diferencia del `signUp` público).
- [pages/api/auth/signup.ts:95](pages/api/auth/signup.ts#L95) usa `supabaseAdmin.auth.admin.generateLink(...)` — genera URL de confirmación **sin enviar email**.
- [pages/api/auth/signup.ts:223](pages/api/auth/signup.ts#L223) hace `fetch('/api/auth/welcome')` → [pages/api/auth/welcome.ts:113](pages/api/auth/welcome.ts#L113) manda email via **Resend** vía `lib/resend.ts` wrapper.

**Verificación empírica**: auth_logs de Supabase staging durante smoke 15:41:30 UTC muestran `POST /admin/users` + `POST /admin/generate_link` → **CERO logs `/mailer`, CERO intento SMTP, CERO rate-limit**. Supabase ni intentó enviar email.

**Causa real del bloqueo** (confirmada por PO vía Resend dashboard): candidato (b) WELCOME-EMAIL-SILENT-FAIL-GUARD. Resend rechazó silent (sin throw) → `/api/auth/welcome` responde 200 sin captura Sentry → UI dice "¡Listo!" al usuario + email jamás enviado.

### Regla propuesta

**Regla documental — Supabase Auth NO envía emails de signup en este stack (anotada 2026-11-24)**: el flow signup del app evita completamente el SMTP de Supabase. Rutas que SÍ gatillarían SMTP de Supabase y están **prohibidas** en este stack:

- `supabase.auth.signUp()` desde el cliente (rate-limited por SMTP built-in).
- `supabase.auth.resetPasswordForEmail()` desde el cliente (idem).
- `supabase.auth.resend()` con email magic link (idem).

El patrón canónico del proyecto es:

1. Cliente: `fetch('/api/auth/signup' | '/api/auth/resend-confirmation' | ...)`.
2. Server: `supabaseAdmin.auth.admin.createUser/generateLink/updateUserById/...` (admin API, zero email).
3. Server: `fetch('/api/auth/welcome')` o equivalente → Resend via `lib/resend.ts` wrapper (que redirige a `AUDIT_INBOX` en non-prod).

**Al diagnosticar "email no llega"**: descartar primero hipótesis SMTP Supabase (NO aplica). Investigar en este orden: (a) deploy preview actualizado post env-change (ver enmienda 2); (b) WELCOME-EMAIL-SILENT-FAIL-GUARD (ver deuda BACKLOG); (c) Resend dashboard Delivered log; (d) spam folder destino; (e) rate-limit Resend (cuota).

### Texto propuesto para pegar en CLAUDE.md (extender sección `## Auth flow (arquitectura)`)

> **Supabase Auth NO envía SMTP en el flow signup del app — REGLA DOCUMENTAL (anotada 2026-11-24)**: el signup/resend/reset del app usan admin API server-side + Resend custom vía `lib/resend.ts` wrapper. Rutas cliente que gatillarían SMTP de Supabase (`supabase.auth.signUp`, `supabase.auth.resetPasswordForEmail`, `supabase.auth.resend` con email) **no se usan en producción** para no depender del rate-limit SMTP built-in de Supabase. Al diagnosticar "email no llega", descartar hipótesis SMTP Supabase (NO aplica). Orden correcto de investigación: deploy preview actualizado post env-change (ver enmienda `AUDIT_INBOX snapshot`) → WELCOME-EMAIL-SILENT-FAIL-GUARD → Resend Delivered log → spam folder → rate-limit Resend. Incidente que originó la regla: diagnóstico #149 del 24-11 PM — hipótesis inicial Supabase SMTP rate-limited descartada por auth_logs sin intento `/mailer`.

---

## Síntesis + próximos pasos

- 3 enmiendas propuestas, borrador. PO decide cuáles aterrizar en PR dedicado (opcional mañana 25-11 post-ruleset-rehab, o diferir).
- Enmienda 1 + 3 son documentales (regla + patrón). Enmienda 2 extiende la regla P4 existente con el flujo Redeploy UI post env-change.
- Si se aterrizan las 3: branch sugerido `claude-md-nov24` (15 chars) o similar. ~10 min aplicación mecánica.
- Deuda cruzada: `CI-RULESET-CONCURRENCY-REFACTOR` como nuevo ítem del BACKLOG.md § Deuda técnica si el PO aprueba Opción C del refactor concurrency.

Anotado 2026-11-24 PM pre-freeze T-~2h por cola continua autónoma del auditor.
