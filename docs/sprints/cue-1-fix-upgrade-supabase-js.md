# Sprint cue-1-fix · Fase B análisis — Upgrade supabase-js

**Fecha**: 2026-09-23.
**Modo**: solo análisis (npm view + gh api + grep read-only). Cero código.
**Insumo para**: decisión PO post reporte pre-fix sobre si upgrade entra en cue-1-fix como fase B1 (antes del F1+F2) o como PR aparte.
**Regla férrea**: cero fix estructural hasta GO PO al reporte pre-fix.

---

## 1. Versión actual pinneada + últimas estables

**Actual en `package.json`**:
```json
"@supabase/supabase-js": "~2.84.0"
```
Rango `~2.84.0` = solo patch (2.84.x), no minor. Verificado con `node_modules/@supabase/*/package.json` → **2.84.0 exacta** en toda la familia (@supabase/supabase-js, auth-js, postgrest-js, realtime-js, storage-js, functions-js).

**Últimas estables en npm** (verificado con `npm view` 2026-09-23):
- `@supabase/supabase-js@2.117.1` (2026-09-23, HOY).
- `@supabase/auth-js@2.117.1` (idem).
- Toda la familia @supabase/* alineada en 2.117.1.

**Diferencia**: 33 releases estables entre 2.85.0 y 2.117.1 (~10 meses).

**Por qué se pinneó `~2.84`** (CLAUDE.md sección P12, 2026-09-17):

Durante sprint `bloque-h H-1 lock regen`, el `package-lock.json` regenerado bumpeó `@supabase/supabase-js` de 2.84.x → **2.109.0** dentro del rango `^2.84.0`. La versión 2.109 dropea Node.js 20 (`repo: drop Node.js 20 support` [#2482](https://github.com/supabase/supabase-js/pull/2482)) y el `realtime-js` exige WebSocket nativo. CI en Node 20 falló con:
```
Error: Node.js 20 detected without native WebSocket support
```
19 tests F2 fallaron + 22 skipped, pero `| tee` sin `set -o pipefail` enmascaró exit code → step "success" con conclusion=success → merge autónomo con CI verde falso (PR #60 `vistas-doble`).

**Fix inmediato**: pin `@supabase/supabase-js@~2.84.0` (patch-only, evita re-bump automático) + `set -o pipefail` en workflow (regla P12).

**Producción NO afectada** (Vercel default es Node 22, WebSocket nativo). Solo CI (Node 20 pin) rompió. Subir CI a Node 22 quedó como sprint separado, no ejecutado.

---

## 2. Cambios auth/lock/getSession/onAuthStateChange/refresh/visibility entre 2.85 y 2.117.1

Extraído de https://github.com/supabase/supabase-js/blob/master/CHANGELOG.md (CHANGELOG oficial, no memoria).

### 2.1 Cambios que resuelven directamente los issues citados en el kickoff cue-1-fix

| Issue kickoff | Estado issue | Release que fixea | PR | Descripción |
|---|---|---|---|---|
| [#2376](https://github.com/supabase/supabase-js/issues/2376) — Intermittent RPC hang con `lock: No-Op` | CLOSED | **2.98.0** | [#2106](https://github.com/supabase/supabase-js/pull/2106) | `auth: recover from orphaned navigator locks via steal fallback`. **APLICA a nuestro `noOpLock`** — desde 2.98.0 el SDK ya no depende del lock custom para recuperación. |
| [#2402](https://github.com/supabase/supabase-js/pull/2402) — prevent navigator.locks deadlock max acquire timeout | CLOSED (PR merged) | **2.98.0** | [#2125](https://github.com/supabase/supabase-js/pull/2125) | `auth: lower lockAcquireTimeout default to 5s and fix stale JSDoc`. |
| [#2344](https://github.com/supabase/supabase-js/issues/2344) — `_initialize` deadlocks when onAuthStateChange registers during init while session <90s expiry | CLOSED | **2.110.2** | [#2498](https://github.com/supabase/supabase-js/pull/2498) | `auth: defer init-time notifications until initializePromise resolves`. **APLICA aunque nuestro reproducer local no lo dispare** — el issue fue reproducido en 2.105.4 pero puede ser preexistente en 2.84. |
| [#2426](https://github.com/supabase/supabase-js/issues/2426) — `Lock "lock:jabe-auth" was not released within 5000ms causes app to freeze when switching browser tabs` | CLOSED (múltiple) | **2.107.0** (fix estructural) + **2.117.1** (fix cross-tab refresh) | [#2392](https://github.com/supabase/supabase-js/pull/2392) + [#2698](https://github.com/supabase/supabase-js/pull/2698) | **CLAVE — dos fixes complementarios**: (a) 2.107.0 remueve el navigator.locks mutex por completo, reemplaza por commit guard + `dispose()` — el fenómeno "lock no liberado" deja de existir por diseño; (b) 2.117.1 (**2026-09-23, hoy**) `auth: return stored session when a refresh loses to another tab` — cierre exacto del race cross-tab que causa la sensación de "freeze indefinido". |
| [#2618](https://github.com/supabase/supabase-js/pull/2618) — perf(auth): optimize getSession with in-memory fast-path and lockless reads | **OPEN, NO merged** | — | — | El diseño post-#2392 (commit guard, sin lock) obvia la necesidad de #2618 tal como está planteado. Sigue open pero probablemente cambia de forma. |

### 2.2 Otros cambios auth/lock/refresh relevantes en el rango

| Versión | PR | Cambio | Comentario |
|---|---|---|---|
| 2.87.1 | [#1928](https://github.com/supabase/supabase-js/pull/1928) | `auth: skip navigator lock when persistSession is false` | Nuestros fixtures e2e ya usan `persistSession: false` (`supabase.ts`, `supabaseAdmin.ts`, `signupLink.ts`). |
| 2.90.0 | [#1962](https://github.com/supabase/supabase-js/pull/1962) | `auth: add configurable lock acquisition timeout to prevent deadlocks` | Introduce `lockAcquireTimeout` option. |
| 2.91.0 | [#2014](https://github.com/supabase/supabase-js/pull/2014) | `auth: defer subscriber notification in exchangeCodeForSession to prevent deadlock` | Fix familia P10 en el path OAuth exchange. |
| 2.96.0 | [#2112](https://github.com/supabase/supabase-js/pull/2112) | `auth: resolve Firefox content script Promise.then() security errors in locks` | Fix Firefox-específico. |
| 2.100.0 | [#2178](https://github.com/supabase/supabase-js/pull/2178) | `auth: guard navigator lock steal against cascade when lock is stolen by another request` | Refuerzo del steal fallback de 2.98.0. |
| 2.105.2 | [#2309](https://github.com/supabase/supabase-js/pull/2309) | `auth: forward lockAcquireTimeout to SupabaseAuthClient` | Fix del bug #2492 (undefined forwarded regression). |
| **2.107.0** | **[#2392](https://github.com/supabase/supabase-js/pull/2392)** | **`auth: remove navigator.locks-based mutex; introduce commit guard + dispose()`** | **CAMBIO ESTRUCTURAL — elimina el lock, reemplaza por commit guard**. El `noOpLock` custom del proyecto queda obsoleto. |
| 2.108.2 | [#2436](https://github.com/supabase/supabase-js/pull/2436) | `auth: preserve valid session on refresh failure and cooldown repeat failures` | Refresh no vacía sesión válida si falla. |
| **2.109.0** | **[#2482](https://github.com/supabase/supabase-js/pull/2482)** | **`repo: drop Node.js 20 support`** | **BREAKING — CI Node 20 rompe. Requiere Node 22.** |
| 2.110.2 | [#2498](https://github.com/supabase/supabase-js/pull/2498) | `auth: defer init-time notifications until initializePromise resolves` | Fix issue #2344 (deadlock _initialize + expiry 90s). |
| 2.110.8 | [#2544](https://github.com/supabase/supabase-js/pull/2544) | `auth: downgrade aborted/transient fetch failures from console.error to warn` | Baja ruido de logs. |
| 2.110.9 | [#2559](https://github.com/supabase/supabase-js/pull/2559) | `auth: downgrade stale refresh token console noise` | Idem. |
| 2.112.1 | [#2587](https://github.com/supabase/supabase-js/pull/2587) | `auth: preserve 5xx error message` | Mensajes 5xx no se pierden. |
| 2.112.4 | [#2616](https://github.com/supabase/supabase-js/pull/2616) | `auth: convert stolen-lock AbortError when acquireTimeout is 0` | Ajuste steal fallback. |
| **2.112.4** | **[#2627](https://github.com/supabase/supabase-js/pull/2627)** | **`auth: warn on deprecated lock option and prevent unhandled refresh rejection`** | **Nuestro `auth: { lock: noOpLock }` empieza a emitir deprecation warning** post-upgrade. Fix limpio: remover el lock custom. |
| 2.116.0 | [#2668](https://github.com/supabase/supabase-js/pull/2668) | `auth: silence commit-guard-discarded refresh in initial session` | Cleanup de logs del nuevo commit guard. |
| **2.117.1** | **[#2698](https://github.com/supabase/supabase-js/pull/2698)** | **`auth: return stored session when a refresh loses to another tab`** | **RELEASE DE HOY (2026-09-23)** — fixea el race cross-tab de refresh que probablemente es el mecanismo detrás de los 32 events prod (o de una parte de ellos). |

### 2.3 Cambios visibility/refresh específicos

Grep de "visibility" + "hidden" + "tab" en el CHANGELOG: cero matches directos (no hay un cambio taggeado "visibility" en el rango 2.85 → 2.117.1). Los cambios de tab switch se manejaron indirectamente por (a) removal del lock (#2392), (b) session recovery cross-tab (#2698).

---

## 3. Breaking changes en el rango que afectan a Pawnecta

### 3.1 Node.js 20 dropped (2.109.0, #2482)

**Impacto**: CI actual pinneado en Node 20 (`.github/workflows/e2e-error-audit.yml`). Post-upgrade requiere Node 22 en CI.

**Fix necesario**: subir `NODE_VERSION` en workflows + verificar que la suite e2e sigue verde. Sin este cambio, cualquier upgrade > 2.108.x rompe CI.

**Prod NO afectada**: Vercel default es Node 22, WebSocket nativo disponible.

### 3.2 Removal del navigator.locks mutex (2.107.0, #2392)

**Impacto**: `lib/supabaseClient.ts:33`:
```ts
export const supabase = createClient(clientUrl, supabaseAnonKey, {
    auth: { lock: noOpLock },
});
```

El `noOpLock` custom fue introducido como workaround del issue `supabase-js#2111` (bfcache/unmount → orphaned Web Locks). Post-#2392 el SDK ya no usa `navigator.locks` — la option `lock` queda irrelevante.

**Fix necesario post-upgrade**: remover el `auth: { lock: noOpLock }` completo. La deprecation warning de 2.112.4 (#2627) confirma el path recomendado.

### 3.3 Deprecation warning del `lock` option (2.112.4, #2627)

**Impacto**: post-upgrade a 2.112.4+, el bundle emitirá console warn en cada init del cliente Supabase browser mientras el `noOpLock` siga en `lib/supabaseClient.ts:33`. Ruido no crítico pero visible en devtools + Sentry breadcrumbs.

**Fix necesario**: mismo que 3.2 (remover el option).

### 3.4 Otros breaking / semánticos

Grep exhaustivo del CHANGELOG 2.85 → 2.117.1: **cero otros breaking taggeados** en superficie `createClient / getSession / onAuthStateChange / signInWithPassword / signOut / auth.admin.*`. Los cambios son fixes + features aditivas.

---

## 4. Callers en Pawnecta (grep read-only 2026-09-23)

### 4.1 APIs afectadas — mapa por archivo

| API | Callers productivos | Nota |
|---|---|---|
| `createClient` | `lib/apiAuth.ts`, `lib/supabaseClient.ts`, `pages/api/admin/*` (3), `pages/api/agendamientos/*` (5+), `pages/api/auth/*`, otros. 30+ archivos productivos. | La mayoría son `createClient(url, serviceRoleKey)` en endpoints server-side — cero interacción con lock/refresh. Solo `lib/supabaseClient.ts` (cliente browser) usa el `auth: { lock }` custom. |
| `.auth.getSession()` | `contexts/UserContext.tsx` (**L631** — el que se cuelga), `lib/notifications.ts`, `pages/admin/proveedores.tsx`, `pages/completar-registro.tsx`, `pages/email-confirmado.tsx`, `pages/mensajes.tsx`, `pages/mis-reservas.tsx`, `pages/proveedor/index.tsx`, `pages/usuario/mascotas/index.tsx`, `components/Admin/EvaluacionModerationList.tsx`, `components/Admin/ProveedorApprovalList.tsx`, `components/Admin/RateLimitBadge.tsx`, `components/Chat/MessageThread.tsx`, `components/Proveedor/ServiceFormModal.tsx`, `components/Service/ReviewForm.tsx`. 15+ callers. | Todos son client-side (browser). El bug CUE-1 solo se manifiesta en el UserContext.tsx (hydrate). Los otros usan `getSession()` para leer token en handlers de UI (menor riesgo, latencia acotada). |
| `onAuthStateChange` subscribe REAL | `contexts/UserContext.tsx:651`, `pages/reset-password.tsx:27`, `components/Shared/OnlineStatusProvider.tsx:26`. **3 callers reales**. | Los otros 6 matches del grep son comentarios inline sobre P10, no subscribes. |
| `auth: { lock }` custom | `lib/supabaseClient.ts:33`. **Único callsite**. | Se remueve como parte del upgrade (§3.2). |
| `persistSession: false` | `e2e/fixtures/signupLink.ts:104`, `e2e/fixtures/supabase.ts:157`, `e2e/fixtures/supabaseAdmin.ts:84`, 2 specs e2e. **Solo tests**. | Beneficia el fix 2.87.1 #1928 (skip lock cuando persistSession=false) — cero impacto. |

### 4.2 Endpoints con Sentry (los 32 events prod)

- `wrapApiHandlerWithSentry` / `withSentry` wrappers: **33 archivos** en `pages/api/`.
- `Sentry.captureException` / `captureMessage` directo: 3 archivos.

**Endpoints afectados por el upgrade**: cero directamente — Sentry es capa ortogonal. El upgrade solo puede mejorar (menos deadlocks → menos events fantasma).

### 4.3 P10 callers específicos

`onAuthStateChange` con lógica async dentro del callback (el patrón que P10 prohíbe):

- **contexts/UserContext.tsx:651**: hoy usa el `setTimeout(0)` defer canónico (sprint deadlock-fix 2026-08-28). **Post-upgrade a 2.107.0+** (sin lock), el setTimeout(0) sigue siendo buena práctica pero el deadlock específico "await dentro del lock" deja de existir por diseño.
- **pages/reset-password.tsx:27**: usa `async (event)` callback. Requiere revisar si hace await interno. Post-upgrade (sin lock) el riesgo se reduce.
- **components/Shared/OnlineStatusProvider.tsx:26**: usa `(_event, session)` sin async. Zero riesgo P10 pre/post upgrade.

---

## 5. Riesgo para reglas P10 y P8: cobertura de regresión

### 5.1 Specs que cubrirían regresión del upgrade

**Suite rápida (error-audit + form-post + tipo-b + launch-l1 + pan-1 + conviene + prelaunch)** — corre en cada PR:

| Spec | Cubre |
|---|---|
| `e2e/specs/prelaunch/cue-1-watchdog.spec.ts` | El watchdog `user_context_stuck` (queda vivo como red de seguridad; si el upgrade rompe hydrate, el warn dispara y falla el spec). |
| `e2e/specs/pan-1/def3-bell-user-context.spec.ts` | UserContext + fetch de perfil bajo carga (paso natural que ejerce `getSession()` + queries de perfil sequential). |
| `e2e/specs/deadlock-fix/*` (T1a/T1b/T3) | Test canónico del deadlock cerrado en sprint deadlock-fix. Post-upgrade el mecanismo cambia (sin lock) — estos tests deben seguir verdes. |
| `e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts` | admin.generateLink + magiclink flow (usa auth path completo). |
| `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts` (**este sprint**) | Los 5 sub-experimentos A1 se convierten en regresión permanente post-upgrade (verifica que el nuevo commit guard no reintroduce el cuelgue). |

**Suite F2 (f2-2b + f2-3 + f2-recordatorios-cron)** — corre en PRs que tocan F2:

- Ejercicio natural del flow de reserva con auth real. Post-upgrade cualquier regresión de auth se cae en estas suites.

### 5.2 SessionTimeout coverage

`components/SessionTimeout.tsx` fue reescrito en sprint email-landing session-timeout fix (2026-08-25) para NO depender del `SIGNED_IN` event (patrón vetado por regla del proyecto sobre eventos SDK). Post-upgrade el `SIGNED_IN` event puede cambiar semántica — cero impacto porque ya no lo consumimos.

Spec de regresión: no hay spec dedicado al SessionTimeout completo (limitación reconocida). Cubierto indirectamente por Playwright de flows con navegación de rutas de tránsito.

### 5.3 Qué falta

- **Spec P10 canónico** ausente. Tenemos regla documentada + tests deadlock-fix específicos, pero no un spec que verifique "cualquier onAuthStateChange no cuelga la app entera" para nuevos callers agregados post-upgrade. Riesgo bajo (3 callers reales).
- **Spec de refresh cross-tab** ausente (patrón #2698 fixeado en 2.117.1). La cobertura vendría del A1.e del sprint actual si logra reproducir + queda como regresión.
- **Verificación empírica del deprecation warning** de 2.112.4 post-upgrade: agregar test que asserta que el console warn del `lock` deprecated NO aparece (o que el `noOpLock` fue removido). Recomendación: agregar en el mismo PR del upgrade.

---

## 6. Recomendación

### 6.1 Versión objetivo

**`@supabase/supabase-js@~2.117.0` (patch-only del actual 2.117.1)**.

Rationale:
- **2.117.1** (release de HOY 2026-09-23) fixea explícitamente el patrón cross-tab que probablemente causa una fracción de los 32 events prod (#2698 "return stored session when refresh loses to another tab").
- **2.107.0** eliminó el navigator.locks mutex — el `noOpLock` custom del proyecto queda obsoleto. Menos código de workaround.
- **2.110.2** cerró #2344 (deadlock _initialize + 90s expiry).
- **2.98.0** cerró #2376 (nuestro noOp lock hang).

**Pin patch-only** (`~2.117.0`) mantiene la disciplina del incidente P12 — evita auto-bump a minors que rompan CI.

### 6.2 ¿Cue-1-fix fase B1 o PR aparte?

**Recomendación: PR aparte** por 3 razones:

1. **Dependencia dura de Node 22 en CI** (breaking 2.109.0 #2482). Sin subir CI a Node 22 primero, el upgrade rompe todos los PRs. Este cambio de infra amerita PR propio con soak dedicado antes de tocar deps.
2. **El fix estructural del cue-1-fix (F1+F2)** — AbortController timeout 10s en `getSession()` + fallback determinístico + Sentry event distinto — **funciona como red de seguridad independientemente de la versión del SDK**. Si el upgrade a 2.117.1 no elimina el 100% de los cuelgues (probable — puede haber path que #2698 no cubre), F1+F2 los captura. Los dos son complementarios, no alternativos.
3. **Scope del PR upgrade** = deps + remove `noOpLock` + subir Node CI + eventual ajuste del `onAuthStateChange` de reset-password si el análisis async detecta riesgo. **Scope de cue-1-fix F1+F2** = AbortController + fallback + tests. Mezclarlos rompe el principio de PRs de un solo tema.

### 6.3 Orden sugerido de sprints

```
Tramo 2 (viaje PO):
1. cue-1-fix F1+F2 (AbortController + fallback) — arranca post GO PO al reporte pre-fix.
2. Sprint aparte: SUPAJS-UPGRADE
   2.1 Subir CI Node 20 → 22 (workflow change + verificar suite verde).
   2.2 Bump `@supabase/supabase-js` a `~2.117.0` + remover `auth: { lock: noOpLock }`.
   2.3 Grep de `onAuthStateChange` async callbacks + ajustar si es necesario.
   2.4 Correr suite F2 + rápida + Playwright A1 sub-experiments como regresión.
   2.5 Documentar cambio en CLAUDE.md sección P12 (pin ya no necesario, actualizar).
```

Ambos PRs quedan abiertos sin merge durante Tramo 2. Merge en Tramo 3 (regreso PO) con QA post-deploy en Sentry (verificar reducción de events `user_context_stuck` post-upgrade).

### 6.4 Alternativa (rechazable)

**Alternativa "todo en cue-1-fix"**: bump SDK + Node 22 + noOpLock removal + F1+F2 en un solo PR.

**Rechazada porque**:
- Blast radius alto — falla del CI Node 22 mezclada con falla del fix estructural = imposible desligar.
- Rollback complicado — reverting el PR entero deja al proyecto con la vulnerabilidad CUE-1 más los issues resueltos por 2.85-2.117.1.
- Viola separación de temas (upgrade infra vs fix funcional).

**Excepción legítima**: si el PO decide priorizar velocidad sobre disciplina de scope (viaje inminente + solo 4 semanas de soak), es defendible. En ese caso el sprint aparte se colapsa como fase B1 dentro de cue-1-fix y el PR crece a ~50% más lines pero cierra el tema completo.

**GO PO decide** post reporte pre-fix.

---

## 7. Referencias

- CHANGELOG oficial: https://github.com/supabase/supabase-js/blob/master/CHANGELOG.md (leído completo del rango 2.85 → 2.117.1).
- Issues investigados: auth-js#762 (OPEN), supabase-js#2426 CLOSED, #2344 CLOSED, #2376 CLOSED, #2402 CLOSED, #2492 CLOSED, #2618 OPEN PR.
- CLAUDE.md sección P12 (pin ~2.84 rationale + incidente H-1 lock regen 2026-09-17).
- CLAUDE.md sección P10 (canónico deadlock onAuthStateChange dentro del lock — post-upgrade cambia semántica).
