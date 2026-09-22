# Sprint cue-1-fix — kickoff (2026-09-22)

**Trigger**: 32 events reales `user_context_stuck` en Sentry prod desde
2026-09-15 (evidencia empírica en `docs/sprints/bloque-j-4.md` y BACKLOG.md
> CUE-1 BLOQUEA). Bug estructural del hydrate de UserContext — no edge case.

**Rama**: `cue-1-fix` (a crear post PR #81 merge).

**Regla operativa**: PR abierto sin merge. Si llega verde antes del
2026-09-28 (fin Tramo 1 del plan-lanzamiento) → merge con QA del PO
antes del viaje. Si no → queda abierto en el congelamiento (Tramo 2) y
es lo primero al volver (Tramo 3). Cero merge autónomo — cualquier
excepción requiere GO explícito PO por chat en el turno vigente.

## Orden estricto acordado con PO 2026-09-22

### A — Causa raíz primero, con P8 por cada hipótesis

Antes de escribir el fix, reproducir el cuelgue de forma DETERMINISTA
para cada hipótesis. Reporta cuál reproduce el cuelgue antes de tocar
el código productivo. Sin reproducción → escribir el fix es adivinar.

**A1. Lock de auth de supabase-js (hipótesis ADV-LOCK del backlog)**:
- **¿Usa `navigator.locks`?** Verificar el código de `@supabase/supabase-js@2.84.x` (`node_modules/@supabase/auth-js/dist/main/GoTrueClient.js`). El proyecto pasa `lock: noOpLock` en `lib/supabaseClient.ts:33` que teóricamente reemplaza la implementación del lock. CLAUDE.md L622 (P10 sprint deadlock-fix) documenta: "Reemplazar la implementación del lock no alcanza. El SDK mantiene su propio estado de reentrada (`lockAcquired` / `pendingInLock`) independiente del lock que se le pase". La noOpLock evita orphan Web Locks entre pestañas pero no elimina el deadlock interno.
- **P8**: abrir 2 pestañas del mismo user en staging preview + medir `navigator.locks.query()` cuando el spinner queda pegado. Si aparece un lock retenido por otra pestaña → confirmación ADV-LOCK. Playwright MCP con 2 contextos + capturar `page.evaluate(() => navigator.locks.query())` cuando el user_context_stuck warn dispare.
- **Escenario alternativo** (sin Web Locks): el `pendingInLock` interno del SDK tiene una promesa pendiente que nunca resuelve porque el callback subyacente no notifica (bug del propio SDK versión 2.84.x). Reproducir con signInWithPassword mid-hydrate.

**A2. Service Worker (`next-pwa@10.2.9`)**:
- **Cuál es**: `@ducanh2912/next-pwa` (`next.config.js:withPWA`). Registrado solo en prod (gate `IS_PROD`). Workbox runtime caching con defaults del plugin.
- **Qué intercepta**: NetworkFirst para navigations (HTML documento) + StaleWhileRevalidate para JS chunks/CSS/imágenes + CacheFirst para fonts Google. `_offline` fallback si NetworkFirst timeout.
- **¿Toca supabase.co?** El SW default `next-pwa` NO tiene runtimeCaching para dominios de terceros — solo mismo origin (`pawnecta.com`, `www.pawnecta.com`). Confirmar con `chrome://serviceworker-internals/` en prod que las requests a `*.supabase.co` pasan directo (network, no SW).
- **¿Toca storage de sesión?** El SW no toca `localStorage` ni `IndexedDB` — sí puede interferir con `postMessage` del SDK. Verificar si Supabase Auth SDK usa BroadcastChannel/postMessage entre pestañas.
- **P8**: reproducir cuelgue con SW registrado + reproducir con SW desregistrado (`navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`). Si cuelgue desaparece con SW off → confirmación A2.

**A3. Camino anónimo** (bug adicional descubierto en cue-1.3):
- **Archivo:línea**: `contexts/UserContext.tsx:631` — `supabase.auth.getSession().then(...)` sin timeout ni catch. Si `getSession()` cuelga por A1 o A2, el `.then` nunca dispara → `hydrateFromSession` no corre → `isLoading` queda true → watchdog dispara.
- **En path guest normal**: `getSession()` debe resolver con `session=null` rápido; `hydrateFromSession(null)` retorna con `setIsLoading(false)` en L338. Cero cuelgue esperado.
- **Contradicción empírica**: 66% de events Sentry tienen `has_storage_session=false` (guests puros) — el cuelgue ocurre en el propio `getSession()`, no en las queries de perfil.
- **P8**: reproducir en staging preview sin login navegando a `/`, `/explorar`, `/forgot-password` en incognito. Con SW registrado en prod (opción A2) y sin (opción A1) — separar variables.

**Reporte pre-fix**: cuál hipótesis reproduce el cuelgue con evidencia (screenshot + `navigator.locks.query()` + `navigator.serviceWorker.controller` + trace zip). Sin reproducción determinista, no arrancar B.

### B — Fix de la causa raíz reproducida + spec de regresión

- Fix mínimo del path identificado en A. Cero refactor especulativo.
- Spec nuevo (o extensión del cue-1-watchdog.spec.ts) que reproduce la condición A_x arreglada y verifica que el cuelgue no ocurre.
- Cero merge sin spec de regresión.

### C — Red de seguridad F1+F2 (segunda capa, no reemplaza el fix)

Aterriza INDEPENDIENTEMENTE del A/B — timeout con fallback determinístico:

- **F1**: `AbortController` con timeout 10s en:
  - `supabase.auth.getSession()` de `UserContext.tsx:631` (mount inicial).
  - `Promise.all([proveedorRes, seekerRes])` de `UserContext.tsx:362-373` (queries perfil).
- **F2**: al timeout, forzar estado terminal:
  - `setUser(session?.user ?? null)` (guest si null, autenticado si session válida).
  - `setIsLoading(false)` — libera el spinner.
  - `Sentry.captureMessage('user_context_timeout_fallback', { level: 'warning', tags: { subsystem: 'user_context', timeout_source: 'getSession'|'perfil_queries', navigator_lock_state: <string>, sw_controlling: String, ... } })` — evento DISTINTO del `user_context_stuck` para poder separar en el dashboard "cuelgues que el fallback rescató" vs "cuelgues que el propio fallback tampoco pudo".
- Tags mínimos requeridos en el event fallback: `timeout_source`, `navigator_lock_state` (query result de Web Locks al momento del timeout), `sw_controlling` (mismo que watchdog).

### D — F3 (umbral 15s → 10s) NO

El watchdog queda en 15s hasta que el fix esté en prod y podamos
comparar antes/después con la misma vara. Cambiar el umbral y el fix
simultáneamente diluye la señal — no sabríamos si la mejora es del
fix o del umbral. Regla del PO 2026-09-22.

### E — F4: P8 del fallback

Test spec dedicado que:
- Fuerza el cuelgue con `page.route` interceptando queries a Supabase.
- Espera 10s (timeout del fallback).
- Asserta que la UI muestra estado terminal (spinner desaparece) — cero panel "Cargando...".
- Asserta que `Sentry.captureMessage('user_context_timeout_fallback', ...)` fue invocado con los tags esperados (monkey-patch de `window.Sentry` como en cue-1-watchdog spec).
- Asserta que `user` está seteado a `session?.user ?? null` (según el path).

## Entregables

- `docs/sprints/cue-1-fix.md` (este archivo) — kickoff antes de partir.
- Rama `cue-1-fix` post merge PR #81.
- Reporte pre-fix con hipótesis reproducida (A) al PO — GO para B.
- PR abierto con B + C + E. Watch checks; merge tras QA PO si llega antes 2026-09-28.
- Acta final en `docs/sprints/cue-1-fix.md` con reproduce del cuelgue + fix aplicado + evidencia post-fix (Sentry Query pre/post con misma vara del umbral 15s).

## Referencias

- Diagnóstico completo: [docs/sprints/bloque-j-4.md](bloque-j-4.md).
- BACKLOG: [BACKLOG.md](../../BACKLOG.md) > CUE-1 BLOQUEA al tope.
- Regla P10 (deadlock lock auth): [CLAUDE.md](../../CLAUDE.md) > Workflow.
- Script query Sentry: [scripts/sentry-query-cue1.ts](../../scripts/sentry-query-cue1.ts).
