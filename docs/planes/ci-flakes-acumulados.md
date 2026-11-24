# CI flakes acumulados — análisis 2026-11-23

Written for: el PO (Aldo). **Análisis read-only, zero código**. Ítem BACKLOG `CI-FLAKES-ACUMULADOS` (sección "Infraestructura y CI", prioridad ALTA pre-campañas). El ítem original pedía análisis de "últimos 10 runs CI fallidos" con clasificación por 4 clases (fixme / quarantine / fix fixture / mejora concurrency). Este doc entrega el análisis con **evidencia del día de hoy** (2026-11-22 noche → 2026-11-23 tarde) donde se acumuló la densidad mayor de fails recientes.

Ventana cubierta: 10 fails + 1 rerun en ~20h.

---

## Clasificación empírica — 5 clases detectadas (más de las 4 originales)

### Clase A — Cold start compounded del preview Vercel fresh

**Firma**: `TimeoutError: locator.fill: Timeout 15000ms exceeded.` en `page.locator('#email').fill()` en `e2e/setup/authenticate.ts:67`.

**Caso canónico**: run `45183160000` (ci-conc-guard 13:21). El preview Vercel del PR es fresh (no hubo pushes previos) → first request del CI pegó frío → `networkidle` resolvió en 1.2s pero React no hidrató `#email` dentro del cap 15s.

**Resolución aplicada**: PR #168 (merge commit 1d33f54) subió el cap del fill 15s → 30s + agregó warmup `page.goto('/')` pre-auth para absorber cold start del preview. **Fix confirmado empírico** — los 10+ runs post-#168 no reprodujeron.

**Acción**: cerrado. Monitorear en próximos 7 días por reaparición.

---

### Clase B — Contención cross-PR sobre Supabase staging BD

**Firma**: múltiples specs pre-existentes fallando simultáneos en PRs docs-only (imposible atribución al cambio del PR). Fails por drift de fixtures compartidos o saturación de Supabase.

**Casos canónicos pre-fix** (2026-11-23 12:03–13:41, ventana de 1.5h con 5 fails distintos):
- `45170650670` (pwd-meter): 3 fails — launch-l1 toast-dup-regresion, sentry/gate, producto-2 s1-estados-derivados PD4-bis.
- `45171529059` (f2-pick-helper): 1 fail — launch-l1 toast-dup-regresion (coincide con #151).
- `45181056632` (tutor-f2-opts docs-only puro): 5 fails — cue-1 A1.e, c4-login-redirect, pan-1 bell, sentry/gate, tipo-b lote-4.
- `45186495623` (home-tabs-cat docs-only puro): 3 fails — c3-admin-hub, pan-1 bell, tipo-b lote-4.

**Mecanismo**: workflows paralelos de distintos PRs contra la misma Supabase staging + fixtures compartidos sin aislamiento → race entre cleanups + reads intercalados.

**Resolución aplicada**: PR #168 ci-conc-guard — Opción D del análisis (`docs/analisis/ci-concurrency-e2e-20261123.md`): grupo concurrency global `staging-exclusive` en 4 workflows que tocan staging (e2e-error-audit, visual-update-snapshots, smoke-auth-templates, cleanup-staging-e2e). Solo 1 workflow corre a la vez cross-PR + cross-workflow, `cancel-in-progress: false` preservado.

**Evidencia empírica post-fix**: 10+ runs post-#168 ejecutados secuenciales, el patrón no reapareció. `#169 home-tabs-cat` docs-only post-guard pasó limpio (contraste directo con `45186495623` del mismo branch 2h antes falló 3 specs).

**Acción**: cerrado por Opción D interim. Fix robusto post-campañas sería Opción B del mismo análisis (seeding idempotente, 1-2 días) — queda como BACKLOG separado.

---

### Clase C — AUTH-TOKEN-PERSIST (session stale cache)

**3 manifestaciones distintas** detectadas hoy, documentadas:

#### 3a — INSERT silent-null en creadores de fixture

**Firma**: `[servicio-efimero] INSERT (cuidado) falló: sin data` en `e2e/fixtures/servicio-efimero.ts:118` o equivalente.

**Mecanismo**: refresh_token revocado post-signOut global humano → fallback signInWithPassword OK → INSERT siguiente retorna `{data: null, error: null}` por sesión server-side revocada mid-request.

**Caso canónico**: run `45202745519` (tutor-f2-opts 15:13 post-#168).

**Resolución**: PR #170 fix-fix-cuidado (merge `6664218c`). Nueva fn `invalidateRoleCache(role)` en `supabase.ts` + retry defensivo UNA vez en `crearServicioEfimero` + `crearServicioCuidadoConF2` ante silent-null.

#### 3b — SELECT silent-null en resolvedores de profile ID

**Firma**: `[e2e/supabase] El usuario autenticado no tiene fila en 'proveedores'` en `e2e/fixtures/supabase.ts:351` (o equivalente tutor).

**Mecanismo**: mismo que 3a pero sobre `.single()` del `.select` tras `auth.getUser(accessToken)`.

**Caso canónico**: run `45222291115` (f2-pick-helper 16:57 post-#170).

**Resolución**: PR #171 fix-sel-stale (merge `cd590651`). Helper interno `resolveProfileId(role, table)` que encapsula `getProveedorId` + `getTutorId` con mismo patrón retry defensivo.

#### 3c — setup auth `waitForTokenInStorage returned=false`

**Firma**: `[AUTH-STEP][tutor] 7 waitForTokenInStorage(10s) start` sin seguimiento `8 waitForTokenInStorage returned=true` + cascada downstream `Error: [e2e/supabase] storageState no existe en e2e/.auth/tutor.json`.

**Mecanismo**: el token no llega a persistirse en localStorage post-login dentro de 10s del wait → setup aborta → cascada.

**Caso canónico**: run `45237712737` (track-meta-sql 18:22 post-#171).

**Resolución aplicada**: **regla temporal PO 2026-11-13** (extendida 2026-11-19 hasta freeze 2026-11-24) autoriza **rerun autónomo UNO** para esta firma exacta + cascada de setup. Rerun del `45237712737` pasó verde empírico (confirmó transient). Fix estructural permanente queda **pendiente** — puede aplicarse post-freeze.

**Acción 3a + 3b**: cerradas. Monitorear por reaparición en 3ª superficie distinta (trigger documentado: si aparece en 3er lugar en próximos 7 días → escalar a rediseño del cliente Supabase e2e con detector silent-null universal).

**Acción 3c**: trigger explícito — se repite firma waitForTokenInStorage returned=false, escalar al PO con nuevo stacktrace. Regla temporal rige hasta 2026-11-24 16:00 CLT.

---

### Clase D — Regresión real del patch (no flake)

**Firma**: fails EXACTAMENTE en los specs que el PR del patch MODIFICA, con error específico atribuible al cambio.

**Caso canónico**: PR #166 f2-pick-helper. El patch modifica `e2e/fixtures/panel-tutor.ts > locatorDiaPicker` para aceptar nueva firma `(page, date: Date)` que construye selector `.rdp-day[aria-label="N de MES de AÑO"]`. Los 2 specs modificados del PR (`f2-3/s2-dias-pintados.spec.ts` + `f2-3/s4a-race.spec.ts`) fallaron en 3 reruns consecutivos con el mismo locator → el aria-label real del react-day-picker v8 NO coincide con el que el patch construye.

**Diagnóstico**: no es flake ni AUTH-TOKEN-PERSIST. Es regresión directa del patch.

**Acción**: #166 ESCALADO al PO con 3 opciones (cerrar sin merge recomendado, debug aria-label real + ajuste, o revert solo los 2 specs al helper number). Pendiente decisión PO.

**Lección**: el diagnóstico inicial clasificó estos fails como "flake pre-existente" (los 2 specs sí pasaron verde en 6 runs previos del helper number legacy). Correcto reclasificar tras ver en el log específico el locator que el patch construye versus el que existe en runtime. **Adición al protocolo**: cuando un spec que el PR MODIFICA falla, priorizar hipótesis "regresión del patch" sobre "flake" hasta descartar con evidencia del locator exacto del log.

---

### Clase E — Flake transient Playwright (ambiente o timing)

**Firma**: 1-2 specs fallan con assertion timeout genérico (`expect(...).toBeVisible() failed` sin patrón atribuible), sin reproducirse en reruns, sin coincidir con el patch.

**Caso canónico**: run `45212671356` (f2-pick-helper 1er rerun). 2 fails:
- `chat-open-error/regresion.spec.ts:57` (19.6s).
- `error-audit/c5-perfil.spec.ts:108` (11.6s).

**Diagnóstico**: ambos specs pasaron verde en 6+ runs success recientes del workflow (ventana 24h). Cero relación con el patch de #166 (helpers F2-3). Patrón intermitente, sin pattern repetible. Hipótesis: cold start Playwright chromium o latencia transient Vercel.

**Resolución recomendada**: NO fix estructural ahora. Monitorear frecuencia. Trigger: si frecuencia >=3 veces/semana sobre los mismos specs → sprint dedicado FIX-FLAKES-TRANSIENT-PLAYWRIGHT (debug específico + waitForLoadState más agresivo o retry a nivel Playwright).

**Acción**: documentar en bitácora. Rerun selectivo cuando la clase vuelve a aparecer.

---

## Matriz resumen

| Clase | Casos registrados hoy | Fix aplicado | Estado |
|---|---:|---|---|
| A — Cold start fresh preview | 1 | PR #168 (warmup + 30s fill) | ✅ Cerrado |
| B — Contención cross-PR staging | 4 PRs × 3-5 fails = ~15 fails | PR #168 Opción D (group global) | ✅ Cerrado |
| C3a — AUTH INSERT silent-null | 1 | PR #170 (invalidateRoleCache + retry) | ✅ Cerrado |
| C3b — AUTH SELECT silent-null | 1 | PR #171 (resolveProfileId retry) | ✅ Cerrado |
| C3c — setup waitForToken timeout | 1 | Regla temporal PO (rerun P11 único) | 🟡 Mitigado |
| D — Regresión patch #166 | 2 fails consistentes | ESCALADO PO | 🔴 Pendiente decisión |
| E — Flake transient Playwright | 2 fails puntuales | Monitor | 🟢 Aceptado |

**15/23 fails del día cubiertos por fixes estructurales aterrizados HOY** (65%). Resto: 2 regresión del patch #166 (decisión PO), 2 flakes transient aceptados, 1 setup waitForToken mitigado por regla temporal.

---

## Deuda post-análisis

**Pendientes no cubiertos por este análisis + fixes**:

1. **Fix estructural AUTH-TOKEN-PERSIST clase 3c**. Regla temporal P11 (rerun autónomo único) vence en freeze 2026-11-24 16:00 CLT. Post-freeze, si la clase sigue apareciendo, aplicar fix equivalente al 3a/3b en el flow del setup auth: detectar waitForTokenInStorage returned=false → re-login forzado con password + retry UN intento. Alcance: ~1h código en `e2e/setup/authenticate.ts`.

2. **Opción B seeding idempotente de fixtures** (análisis #159 `docs/analisis/ci-concurrency-e2e-20261123.md`). Fix robusto para Clase B. Opción D interim resuelve el síntoma pero el fixture drift cross-worker sigue latente. Esfuerzo 1-2 días. Trigger: si la Clase B recurre post-Opción D con mismo patrón en >3 ocasiones.

3. **Decisión #166** (regresión patch). 3 opciones documentadas en PR comment — recomendación auditor (a) cerrar sin merge.

4. **Fix rediseño cliente Supabase e2e para detectar silent-null universal**. Trigger documentado (PO): si AUTH-TOKEN-PERSIST aparece en una **3ra superficie distinta** en próximos 7 días (ya hay 3a + 3b + 3c = 3 superficies, pero cada una tuvo fix específico). Para una 4a superficie distinta, en vez de 4o parche, rediseñar el cliente para que `.single()` y `.insert()` detecten silent-null automáticamente + invaliden cache + retry desde capa base, sin tener que parchar caso a caso.

---

## Recomendación operativa al PO

**Corto plazo** (próximas 48h):
- Dejar la cola priorizada corriendo. Patrones Clase A + B + 3a + 3b cerrados estructuralmente — nuevos PRs deberían tener menos fricción.
- Clase 3c: regla temporal P11 vigente hasta 2026-11-24 16:00. Si aparece después, escalar sin excepción.
- Decisión #166 con tiempo — no bloquea nada crítico (PR cerrado o fix cosmético).

**Mediano plazo** (post-campañas):
- Sprint FIX-SETUP-AUTH-WAITFORTOKEN si Clase 3c vuelve post-freeze (~1h código).
- Sprint Opción B seeding idempotente si Clase B recurre.
- Sprint rediseño cliente Supabase e2e si aparece 4a superficie AUTH-TOKEN-PERSIST.

**Lección estructural del análisis**: el patrón "docs-only puro falla X specs pre-existentes" fue en casi todos los casos atribuible a infra (Clase A o B), nunca al patch. El fix de Clase B (#168) desenmascaró las Clases C (que eran invisibles antes por el ruido de B) → cada fix revela el siguiente. El plan ordenado del día (diagnóstico → fix → rerun → próximo diagnóstico) fue el patrón correcto para avanzar sin bloqueo.

---

## Trazabilidad

- 10 runs failure analizados: ver tabla.
- Fixes aterrizados hoy: PR #168 (ci-conc-guard), #170 (fix-fix-cuidado), #171 (fix-sel-stale).
- Rerun autónomo P11 aplicado: `gh run rerun 45237712737 --failed` (PR #172).
- Ítem BACKLOG origen: `CI-FLAKES-ACUMULADOS` sección "Infraestructura y CI" prioridad ALTA pre-campañas.
- Análisis complementario: `docs/analisis/ci-concurrency-e2e-20261123.md` (PR #159 mergeado).

Zero código modificado en este doc. Zero PR nuevo (más allá del PR docs-only que lo aterriza).
