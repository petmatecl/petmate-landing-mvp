# Bitácora de incidentes CI/operación — 2026-11-23

Written for: el PO (Aldo). Registro de los 4 patrones detectados y resueltos durante la jornada 2026-11-22 noche → 2026-11-23 tarde (ventana ~20h con mayor densidad de CI fails del mes). Captura causa raíz + fix aplicado + trigger documentado para reaparición.

Complementa el análisis empírico en [`docs/planes/ci-flakes-acumulados.md`](../planes/ci-flakes-acumulados.md) — este doc es la perspectiva "aprendizaje operativo" (qué patrones agregamos al playbook), no estadísticas de fails.

---

## Patrón 1 — Cold start compounded del preview Vercel fresh

**Primera observación**: 2026-11-23 13:21 (run `45183160000`, PR #168 ci-conc-guard primer fail).

**Síntoma**: setup auth e2e falla con `TimeoutError: locator.fill: Timeout 15000ms exceeded.` en `page.locator('#email').fill()` en `e2e/setup/authenticate.ts:67`. El preview Vercel del PR es fresh (primer push de la branch) y hit `/login` con `networkidle` en 1.2s pero React no hidrata `#email` dentro del cap 15s. Cascada: 190+ tests downstream abort.

**Causa raíz**: Cold start compounded del preview Vercel fresh del PR + first chromium.launch() del runner + React hydration lenta (chunks JS SSG + edge functions tibios).

**Fix aplicado**: PR #168 ci-conc-guard (merge `1d33f54`):
- Nuevo paso WARMUP pre-auth: `page.goto('/')` + networkidle (timeout 15s + 15s). Absorbe cold start.
- Fill timeout 15s → 30s en `#email` + `#password`.
- Comentarios inline actualizados citando el run `45183160000`.

**Validación empírica**: los 10+ runs post-#168 no reprodujeron el patrón.

**Trigger para reapertura**: si vuelve a aparecer `TimeoutError: locator.fill` en `#email` del setup auth con duración >15s pero <30s → cap actual no alcanza → considerar bump 30s → 45s o warmup más agresivo. Si aparece con duración >30s → investigar Vercel edge regionalidad o Supabase latency.

---

## Patrón 2 — Contención cross-PR sobre Supabase staging BD

**Primera observación**: ya existía desde PR #15 L1-1 2026-09-09 (concurrency original). **Reaparición escalada** 2026-11-23 12:03–13:41 (ventana de 1.5h con ~15 fails cross-PR imposibles de atribuir al cambio).

**Síntoma**: PRs docs-only puros fallan múltiples specs pre-existentes diversos (no relacionados con el cambio). Cross-PR, diferentes specs por run. Hipótesis "flake" no sostiene — es patrón sistémico.

**Causa raíz**: workflows paralelos (e2e-error-audit + visual-update-snapshots + smoke-auth-templates + cleanup-staging-e2e) contra la misma Supabase staging BD + fixtures compartidos sin aislamiento → race entre cleanups + reads intercalados.

**Fix aplicado**: PR #168 ci-conc-guard (mismo merge) — Opción D del análisis `docs/analisis/ci-concurrency-e2e-20261123.md`:
- Grupo concurrency global `staging-exclusive` en 4 workflows que tocan staging (e2e-error-audit, visual-update-snapshots, smoke-auth-templates, cleanup-staging-e2e).
- Solo 1 workflow corre a la vez cross-PR + cross-workflow.
- `cancel-in-progress: false` preservado (zero cancel destructivo de cleanups a mitad).

**Validación empírica**: PR #169 home-tabs-cat docs-only post-guard pasó limpio (contraste directo con `45186495623` del mismo branch 2h antes falló 3 specs).

**Trigger para reapertura**: si Clase B recurre post-Opción D con mismo patrón >3 ocasiones → aplicar Opción B del análisis (seeding idempotente de fixtures, esfuerzo 1-2 días). Ítem BACKLOG separado post-campañas.

---

## Patrón 3 — AUTH-TOKEN-PERSIST (session stale cache, 3 manifestaciones)

Patrón más complejo del día. 3 manifestaciones distintas detectadas, 2 cerradas estructuralmente + 1 mitigada por regla temporal.

### 3a — INSERT silent-null en creadores de fixture

**Primera observación**: 2026-11-23 15:13 (run `45202745519`, PR #163 tutor-f2-opts post-#168).

**Síntoma**: `[servicio-efimero] INSERT (cuidado) falló: sin data` en `e2e/fixtures/servicio-efimero.ts:118`. INSERT retorna `{data: null, error: null}` tras `refreshTokens` 400 + `signInWithPassword` OK.

**Causa raíz**: la sesión server-side fue revocada entre el `signInWithPassword OK` y el INSERT siguiente (race transient del refresh token). RLS INSERT policy pasa WITH CHECK pero RETURNING devuelve 0 filas por sesión inconsistente.

**Fix aplicado**: PR #170 fix-fix-cuidado (merge `6664218c`):
- Nueva fn `invalidateRoleCache(role)` en `e2e/fixtures/supabase.ts` — borra cliente + profileIds + authUserIds del cache del rol.
- `crearServicioEfimero` y `crearServicioCuidadoConF2` detectan silent-null → invalidate + fresh client → retry UNA vez con payload nuevo (titulo con timestamp fresco).
- Si retry también silent-null → throw descartando session issue.

**Validación empírica**: rerun #163 post-#170 pasó verde — el INSERT no cayó silent-null en segunda corrida.

### 3b — SELECT silent-null en resolvedores de profile ID

**Primera observación**: 2026-11-23 16:57 (run `45222291115`, PR #166 f2-pick-helper 2do rerun post-#170).

**Síntoma**: `[e2e/supabase] El usuario autenticado no tiene fila en 'proveedores'` en `e2e/fixtures/supabase.ts:351`. La `.single()` del `.select` devuelve silent-null tras `auth.getUser(accessToken)` exitoso.

**Causa raíz**: mismo mecanismo que 3a (sesión server-side revocada mid-request) pero sobre SELECT en vez de INSERT.

**Fix aplicado**: PR #171 fix-sel-stale (merge `cd590651`):
- Helper interno `resolveProfileId(role, table)` que encapsula lógica común de `getProveedorId` + `getTutorId` con mismo patrón retry defensivo.
- `getProveedorId` y `getTutorId` reducidos a 3 líneas: check cache + delegate.

**Validación empírica**: rerun #166 post-#171 — el error de `getProveedorId` no reapareció (aunque el PR #166 tuvo otro fail distinto, ver Patrón 4).

### 3c — setup auth `waitForTokenInStorage returned=false`

**Primera observación**: 2026-11-23 18:22 (run `45237712737`, PR #172 track-meta-sql).

**Síntoma**: `[AUTH-STEP][tutor] 7 waitForTokenInStorage(10s) start` sin seguimiento `8 waitForTokenInStorage returned=true` + cascada downstream `Error: [e2e/supabase] storageState no existe en e2e/.auth/tutor.json`. Setup abort 2.0m.

**Causa raíz**: el token Supabase no llega a persistirse en localStorage post-login dentro del cap 10s del wait. Probable condición transient de Supabase Auth staging (latencia pico o rate-limit del endpoint `/auth/v1/token`).

**Mitigación aplicada**: **regla temporal PO 2026-11-13** (extendida 2026-11-19 hasta freeze 2026-11-24 16:00 CLT) autoriza **rerun autónomo UNO** para esta firma exacta + cascada de setup. Rerun del `45237712737` pasó verde empírico (confirmó transient).

**Trigger post-freeze**: si Clase 3c vuelve a aparecer después de 2026-11-24 16:00 CLT → fix estructural equivalente al 3a/3b en el flow del setup auth (`e2e/setup/authenticate.ts`). Detectar `waitForTokenInStorage returned=false` → re-login forzado con password + retry UN intento. Alcance: ~1h código.

### Trigger agregado 3→4ª superficie (rediseño cliente Supabase e2e)

Si el mismo patrón AUTH-TOKEN-PERSIST aparece en una **4ª superficie distinta** (ni INSERT, ni SELECT en resolvedores, ni setup waitForToken), en próximos 7 días:
- **Escalar a fix estructural**: rediseñar el cliente Supabase e2e para detectar silent-null universal automáticamente desde la capa base (wrapper que intercepte `.insert()`, `.update()`, `.select().single()`, etc.) + invalidar cache + retry desde esa capa.
- Alcance estimado: 2-3h código + testing.
- Beneficio: elimina la necesidad de parchar fixtures caso a caso.

---

## Patrón 4 — Regresión real del patch (no flake)

**Primera observación**: 2026-11-23 16:06 (run `45212671356`, PR #166 f2-pick-helper 1er rerun). Reclasificada post-análisis empírico del 3er rerun (`45235274899` 18:09).

**Síntoma**: fails EXACTAMENTE en los specs que el PR del patch MODIFICA, con error específico atribuible al cambio.

**Caso canónico**: PR #166 f2-pick-helper. El patch modifica `e2e/fixtures/panel-tutor.ts > locatorDiaPicker` para aceptar nueva firma `(page, date: Date)` que construye selector `.rdp-day[aria-label="N de MES de AÑO"]`. Los 2 specs modificados del PR (`f2-3/s2-dias-pintados.spec.ts` + `f2-3/s4a-race.spec.ts`) fallaron en 3 reruns consecutivos con el mismo locator → el aria-label real del react-day-picker v8 en runtime NO coincide con el que el patch construye.

**Diagnóstico corregido**: no es flake ni AUTH-TOKEN-PERSIST. Es regresión directa del patch.

**Estado**: #166 ESCALADO al PO con 3 opciones (cerrar sin merge recomendado, debug aria-label real + ajuste, o revert solo los 2 specs al helper number legacy). Pendiente decisión PO.

**Lección estructural para el protocolo**: el diagnóstico inicial clasificó estos fails como "flake pre-existente" porque los 2 specs sí pasaron verde en 6 runs previos del helper number legacy. Correcto reclasificar tras ver en el log específico el locator que el patch construye versus el que existe en runtime. **Adición al protocolo**: cuando un spec que el PR MODIFICA falla, priorizar hipótesis "regresión del patch" sobre "flake" hasta descartar con evidencia del locator exacto del log.

---

## Patrón 5 — Flake transient Playwright (ambiente o timing) — aceptado

**Observación**: 1-2 specs fallan con assertion timeout genérico (`expect(...).toBeVisible() failed` sin patrón atribuible), sin reproducirse en reruns, sin coincidir con el patch.

**Casos del día**: run `45212671356` (f2-pick-helper 1er rerun) con 2 fails en `chat-open-error/regresion.spec.ts:57` + `error-audit/c5-perfil.spec.ts:108`. Ambos specs pasaron verde en 6+ runs success recientes del workflow (ventana 24h). Cero relación con el patch de #166.

**Clasificación**: hipótesis cold start Playwright chromium o latencia transient Vercel. Patrón intermitente, sin pattern repetible.

**Mitigación**: NO fix estructural. Rerun selectivo cuando aparece.

**Trigger**: si frecuencia >=3 veces/semana sobre los mismos specs → sprint dedicado **FIX-FLAKES-TRANSIENT-PLAYWRIGHT** (debug específico + `waitForLoadState` más agresivo o retry a nivel Playwright). No urgente.

---

## Nota sobre "slips" del día

**Clase separada mientras concurrency-guard está en validación**:

Hoy aparecieron 2 push-time slips que aisladamente son clase "push durante CI de otra rama activa" (regla `feedback_pr_ci_no_pushes`). Dado que el concurrency-guard activado hoy en PR #168 cambió el comportamiento de la cola cross-PR, estos slips son clase operativa separada que **no cuentan para el trigger de 3er slip del mismo patrón** hasta que el guard esté validado con >=48h sin reaparición de la clase B.

Regla operativa ampliada (anotada por el PO en el dispatch de la decisión 23-11): **"slips post-concurrency-guard cuentan como clase separada mientras el guard esté en validación"**. Vence cuando se confirmen 48h sin reaparición de Clase B (ventana estimada: 2026-11-25 ~16:00 CLT).

---

## Resumen operativo

| Patrón | Estado | Trigger reapertura |
|---|---|---|
| 1 — Cold start compounded | ✅ Cerrado PR #168 | `locator.fill` #email >15s |
| 2 — Contención cross-PR staging | ✅ Cerrado PR #168 (Opción D interim) | Clase B >3 ocasiones → Opción B seeding idempotente |
| 3a — AUTH INSERT silent-null | ✅ Cerrado PR #170 | 4ª superficie → rediseño cliente e2e |
| 3b — AUTH SELECT silent-null | ✅ Cerrado PR #171 | 4ª superficie → rediseño cliente e2e |
| 3c — setup waitForToken | 🟡 Mitigado regla temporal | Post-freeze 2026-11-24 16:00 → fix estructural ~1h |
| 4 — Regresión patch | 🔴 Pendiente decisión #166 | — |
| 5 — Flake transient Playwright | 🟢 Aceptado monitor | >=3/sem → sprint FIX-FLAKES-TRANSIENT-PLAYWRIGHT |

---

## Trazabilidad

- 5 PRs mergeados autónomos hoy post-recovery del patrón sistémico: #168, #170, #171 (fixes estructurales) + #172, #173 (backlog cerrado).
- 4 PRs mergeados previos del día: #158, #160, #165, #159, #162, #167, #169 (9 total hoy).
- 2 PRs escalados pendientes decisión PO: #163 (ya mergeado tras rerun #170), #166 (regresión patch, pendiente).
- Análisis complementario: `docs/planes/ci-flakes-acumulados.md` (5 clases + deuda post-análisis).
- Doc análisis original CI: `docs/analisis/ci-concurrency-e2e-20261123.md` (4 opciones, PR #159 mergeado).

Zero código modificado en este doc. Zero PR nuevo adicional (más allá del PR docs-only que lo aterriza).
