# CI-CONCURRENCY-E2E — Diagnóstico + Propuesta

**Autor**: auditor · **Fecha**: 2026-11-19 · **Estado**: propuesta sin código.
**Trigger**: 5 ocurrencias registradas de flake CI que BACKLOG inicial atribuyó a
contención cross-PR + cold start Vercel preview. Pedido PO 2026-11-19 PM:
analizar las 5 ocurrencias + proponer fix real + estimación.

## Hallazgo corrector — concurrency cross-PR ya está aplicado

Primera verificación empírica (grep `.github/workflows/e2e-error-audit.yml`):
**la propuesta inicial del BACKLOG ya está en código desde 2026-09-09**.

- [`e2e-error-audit.yml:62-96`](../../.github/workflows/e2e-error-audit.yml#L62-L96):
  ```yaml
  concurrency:
    group: e2e-staging
    cancel-in-progress: false
  ```
- Aplicado en sprint L1-1 (PR #15, 2026-09-09) tras 4 reruns rojos por
  contención Supabase staging cross-PR. Documentado en CLAUDE.md L635
  (regla P11). Verificado 2026-11-19: sigue vivo, cero reversión.
- ci.yml (typecheck + build) tiene su propio concurrency por-ref — bien,
  no toca Supabase staging.
- Único workflow que hitea staging + bypass Vercel: `e2e-error-audit.yml`.
  Serialización cross-PR = efectiva.

**Consecuencia**: el spin-off "serialize `e2e-error-audit` cross-PR" del
BACKLOG queda **cerrado por existencia**. Los flakes recientes **no son**
contención cross-PR — otra causa.

## Re-análisis de las 5 ocurrencias

Snapshot real (gh run list + logs):

| # | PR / run | Fecha | Fail observable | Timing fail vs mediana | Clase real |
|---|---|---|---|---|---|
| 1 | #120 iter 2 rerun (`44529030120`) | 2026-11-19 12:59 | `c4-login-redirect:45` 16.4s + `def3-bell:89` 16.3s (mediana ~2.5s) | **~7× mediana** | timeout/cold start sobre preview |
| 2 | #120 iter 5 (`44576452576`) | 2026-11-19 17:22 | `def3-bell:125 T3` 19.6s + `lote-1-proveedor:86` 15.7s + `s10-a11y:25` 20.0s (medianas <5s) | **5-18× mediana** | timeout/cold start sobre preview |
| 3 | #96 del-cuenta-decis fail (`42866067053`) | 2026-11-10 17:32 | `visual/paginas-clave:206` explorar desktop + mobile 2.6s / 1.9s | tiempos normales | **visual regression, NO flake cross-PR** (BACKLOG anterior fue error mío) |
| 4 | #118 nav-mensajes | 2026-11-17 | ambos runs verdes (44165411783 + 44162505371) | n/a | **no hubo fail** (BACKLOG anterior fue error mío) |
| 5 | #15 L1-1 origen P11 | 2026-09-09 | 4 reruns rojos `beforeAll` timeout f2-3 — resuelto en el mismo sprint con el concurrency actual | n/a | **ya resuelto 2026-09-09** |

**Reducción**: de 5 ocurrencias "cross-PR concurrency" solo **2 son del patrón
real** (iter 2 + iter 5 del #120). Y esas 2 son **cold start preview + latencia
Supabase staging específica del momento**, no contención cross-PR.

## Diagnóstico real de los 2 fails del #120

Patrón común:
- Specs que son verdes en 5+ runs anteriores consecutivos con mediana <5s.
- En iter 2 + iter 5 de #120, mismos specs caen a 15-20s con TimeoutError
  variados (page.waitForURL, locator.waitFor, toBeVisible).
- Mi PR #120 no toca ninguno de los flows afectados (login-redirect, bell,
  proveedor-dashboard, a11y-modales). Cero regresión funcional.
- Timing cold Vercel preview típico: 1er goto ~15-17s (deploy frío).
  Runs subsiguientes bajan a <5s porque el edge network cachea.

**Causa raíz hipotética (orden de probabilidad)**:
1. **Cold Vercel preview**: cada push dispara deploy nuevo. El primer hit
   externo paga penalty. Si el spec corre temprano en la suite + el preview
   todavía está "warming" → timeout.
2. **Latencia Supabase staging específica del momento**: cuando varios workers
   del mismo CI hitean simultáneamente + hay query lenta (ej. una tabla con
   índice stale, pg_stat_activity con backups en curso).
3. **SIGNED_IN remount race (P10)**: tras setup auth + navegación, el callback
   de `onAuthStateChange` global bloquea el lock de Supabase JS → queries
   downstream en el test se encolan. Si el test tiene timeout 15s, puede
   caer si el lock se libera después. P10 documentada en CLAUDE.md.

## Propuesta — 3 piezas, independientes

### Pieza A — Warmup de preview antes de Playwright (ya intentado, diferido)

Spin-off ya anotado en BACKLOG como `CI-WARMUP` (sprint ci-warmup del
2026-11-13, PR #113 cerrado sin merge tras 4 iteraciones por lecciones
operativas — ver BACKLOG `CI-WARMUP` para detalles).

Lecciones del ci-warmup que aplican acá:
- Bypass Vercel por header NO funciona; query params SÍ (ya aplicado en
  warmup steps actuales del workflow).
- `curl -L` engaña con 200 OK de la página SSO de Vercel; grep "Pawnecta"
  en body discrimina pero requiere `-L` false + query params correctos.
- Fail iter 4b sin diagnóstico claro antes del timebox → reapertura requiere
  tiempo para debug iterativo.

**Alcance propuesto**: reabrir CI-WARMUP post-lanzamiento con 4-6 h de
budget. Script `scripts/warmup-preview.sh` con reintentos (3 attempts,
deadline 60→240s), check "Pawnecta" en body, log de timing a `/tmp/warmup.log`.
Integrar como step `Wait for preview warm` ANTES del step `Run Playwright`
en los 3 jobs del workflow.

**Estimación**: 4-6 h (budget del intento previo fue 2h — insuficiente).
**Prioridad**: media-baja. Resuelve ~50% de los flakes actuales pero no la
raíz (causa 2 y 3 persisten).

### Pieza B — Timeouts Playwright más tolerantes para specs de "primer hit"

Hoy el `timeout` por test default en `playwright.config.ts` es 30s (línea 112
aprox. verificar). Los specs que caen en cold start lo hacen a los 15-20s —
dentro del budget, pero el `locator.waitFor` o `page.waitForURL` dentro del
test tiene su propio timeout menor (15s por default).

**Propuesta**: envelope de `test.setTimeout(45_000)` en los specs que caen
recurrente por cold start (c4-login-redirect, def3-bell, lote-1-proveedor,
s10-a11y). Preserva el test-level default 30s para el resto. Trade-off: un
test real roto podría tardar 45s en reportarse. Aceptable considerando que
la mediana es <5s — 45s solo activa en el borde patológico.

Más quirúrgico: ajustar los `expect(locator).toBeVisible({ timeout: 25_000 })`
dentro de los specs específicos. Cambio 1-línea por spec.

**Estimación**: 1 h por spec (identificar el `expect` que cae + aumentar
timeout + smoke del flake). 4 specs = 4 h.
**Prioridad**: media. Resuelve el síntoma sin tocar raíz.

### Pieza C — Retry policy global para los 4 specs problemáticos

Playwright soporta `retries` por-test o por-project. Hoy el config tiene
`retries: process.env.CI ? 0 : 1` (línea 123 aprox.) — cero retries en CI.

**Propuesta**: `retries: 1` global en CI. Trade-off: duplica el tiempo del
test fallido (corre 2 veces), oculta un test realmente flaky si solo pasa
en el retry.

Alternativa quirúrgica: `test.describe.configure({ retries: 2 })` solo
en los 4 specs problemáticos. Más controlado.

**Riesgo del retry global**: la P11 ampliación (CLAUDE.md L799) dice "cero
rerun autónomo por fixture/data pre-existente" — un retry global automático
contradice el espíritu de esa regla (esconde señales). Con retry, un fail
timeout en cold start se intenta de nuevo + probable pase → no se escala.

**Estimación**: 30 min config + 1 h smoke. Pero decisión política pendiente
con PO (contradice P11 espíritu).
**Prioridad**: baja (requiere decisión PO explícita).

## Recomendación

**Combinación B + eventual A**:
- Pieza B (timeouts tolerantes 4 specs) como primer fix — 4 h, quirúrgico,
  no contradice P11, resuelve ~80% de los fails observados.
- Pieza A (warmup) post-lanzamiento con budget 4-6 h — complemento, no
  reemplazo. Reduce latencia de los primeros goto en todos los specs.
- Pieza C (retry) descartar salvo decisión PO explícita.

Pieza B primero + medir 2 semanas de runs. Si el flake persiste, agregar
Pieza A. Pieza C queda archivada.

## Alcance y pre-requisitos

**Alcance Pieza B**:
- Modificar 4 archivos spec para aumentar timeout del `expect` crítico:
  - `e2e/specs/error-audit/c4-login-redirect.spec.ts:45`
  - `e2e/specs/pan-1/def3-bell-user-context.spec.ts:89` + `:125`
  - `e2e/specs/tipo-b/lote-1-proveedor-dashboard.spec.ts:86`
  - `e2e/specs/zonab-1/s10-a11y-modales-batch.spec.ts:25`
- Patrón del cambio por spec:
  ```ts
  // Antes:
  await expect(locator).toBeVisible();
  // Después:
  await expect(locator).toBeVisible({ timeout: 25_000 });  // tolerancia cold start preview
  ```
- Comentario inline citando este doc.

**Pre-requisito**: ninguno técnico. Decisión producto: aceptar que los 4
specs se vuelven más lentos en reportar fail real (25s vs 5s mediana).
Trade-off: menor false-positive rate vs mayor latencia de señal roja.

**Riesgo**: si un fix productivo real rompe uno de esos 4 flows, el test
tardará 25s en reportarlo en vez de 5s. En CI es tolerable (job termina
igual); en dev local puede ser un poco molesto.

**Estimación total**: 4 h (1 h por spec, incluye identificar el expect
exacto + smoke manual + verificar que el fail time cae a 25s + commit + PR).

**Entregable**: PR chico `ci-timeouts-tolerantes-cold-start` con 4 commits
(uno por spec para diff claro), cada uno con línea de código + comentario.
CI del propio PR valida que los 4 specs siguen pasando.

**Horizonte**: post-lanzamiento 25-11, sprint propio de 4 h.

## Nota estructural pendiente

El patrón "cold start preview del PR" es inherente a Vercel preview-per-branch.
Único workaround real es warming — Pieza A. Pero Pieza A tiene lecciones
operativas no triviales (CI-WARMUP timebox 2h fue insuficiente). Mientras
tanto, Pieza B compensa a nivel spec individual.

Si post-Pieza B el flake sigue >5% de runs, abrir sprint CI-WARMUP con
budget realista (6-8 h con tiempo para debug iterativo contra preview real
+ rollback si el warmup introduce su propio fail).
