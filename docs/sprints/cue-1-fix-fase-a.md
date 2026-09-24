# Sprint cue-1-fix · Fase A — Reproducción diagnóstica (pre-fix)

**Fecha**: 2026-09-23.
**Rama**: `cue-1-fix` (desde main post merge #83 `f4301f1`).
**Regla férrea**: **cero código productivo del fix hasta que el PO dé GO al reporte pre-fix**. Esta fase solo reproduce + evidencia.

**Insumo**:
- Data empírica prod: 32 events `user_context_stuck` en 7 días (issue `JAVASCRIPT-NEXTJS-7`).
- Investigación issues supabase-js ~2.84 en `scratchpad/cue-1-issues-supabase-js.md`.
- Precisiones PO sub-experimentos A1/A2/A3.

**Alcance**: 3 sub-fases (A1 lock + A2 SW real + A3 anónimo). Reporte pre-fix consolidando "reproduce sí/no + evidencia + cuál explica la distribución real (26 usuarios reales, 17 Chrome Android, /proveedor y /security-logout)".

---

## A1 — Lock de auth-js

**Hipótesis PO**: `getSession()` (UserContext.tsx:631) cuelga TAMBIÉN para guests sin sesión (que no tienen perfil que cargar) → apunta al lock del SDK, no al camino de perfil. Además: los 5 events /security-logout post-signOut huelen a `onAuthStateChange` dentro del lock (regla P10).

**Sub-experimentos** (spec `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts`):

| Sub | Escenario | Reproducción esperada por hipótesis |
|---|---|---|
| A1.a | Guest sin sesión, 1 pestaña, ruta `/` | Si el lock cuelga a guests, el watchdog dispara y `navigator.locks.query()` muestra `held` sobre `lock:sb-<ref>-auth-token`. |
| A1.b | Guest sin sesión, 2 pestañas simultáneas | Contención cross-tab del lock via `navigator.locks` (aunque el `noOpLock` custom del proyecto debería saltearlo — a verificar). |
| A1.c | Autenticado proveedor, 2 pestañas misma sesión | Patrón #2426 supabase-js (tab switch → freeze). Nuestra 2.84.0 es anterior al fix de la línea 2.10x. |
| A1.d | `/security-logout` post-signOut | Deadlock P10: `onAuthStateChange` corre dentro del lock; si el UserContext hace `await` de Supabase en el handler, deadlock circular. |

**Instrumentación**: cada spec captura `navigator.locks.query()` en el instante del cuelgue + trackea `console.warn` con `user_context_stuck` + reporta wall time real. **Cero assertion de reproducción** — solo assertion de que el fixture no reventó (`locks` está definido). Los resultados van al log del CI para el reporte pre-fix.

**Issues supabase-js relevantes** (investigados con `gh api` 2026-09-22, ver scratchpad):

| Issue/PR | Estado | Relevancia a 2.84.0 |
|---|---|---|
| [auth-js#762](https://github.com/supabase/auth-js/issues/762) — "Supabase operations in onAuthStateChange will cause the next call to supabase anywhere else in the code to not return." | **OPEN** (updated 2025-08-13) | Patrón P10 canónico. **Aplica a cualquier versión**. |
| [supabase-js#2426](https://github.com/supabase/supabase-js/issues/2426) — `Lock "lock:jabe-auth" was not released within 5000ms causes app to freeze when switching browser tabs` | **CLOSED** en 2.10x (updated 2026-06-08) | **PROBABLE aplica a 2.84.0** (fix en 2.10x, 2.84 previo). Reproducido en 2.101.1 con Chrome Memory Saver: tab suspendida 20-30s → freeze indefinido. Coincide EXACTO con el patrón CUE-1. |
| [supabase-js#2344](https://github.com/supabase/supabase-js/issues/2344) — `auth-js: _initialize deadlocks when onAuthStateChange registers during init while session is within 90s of expiry` | **CLOSED** (updated 2026-06-01) | **INCIERTO en 2.84**. Reproducido en 2.105.4; puede ser bug preexistente. Deadlock cuando `onAuthStateChange` registra sync durante `_initialize`'s lock callback AND sesión dentro de 90s expiry. |
| [supabase-js#2376](https://github.com/supabase/supabase-js/issues/2376) — `Intermittent RPC hang with lock: No-Op config (not covered by PR #2106)` | **CLOSED** (updated 2026-06-01) | **APLICA a 2.84.0**. Nuestro `lib/supabaseClient.ts:33` usa `noOpLock`. |
| [supabase-js#2618 PR](https://github.com/supabase/supabase-js/pull/2618) — `perf(auth): optimize getSession with in-memory fast-path and lockless…` | **OPEN PR** (updated 2026-08-18) | Reconoce que `getSession` con lock es problemático — propuesta lockless. Confirmatorio del enfoque del fix. |

---

## A2 — Service Worker real (Ruta 1: `next start` local)

**Precisión PO**: el SW `next-pwa` solo se registra en prod (gate `IS_PROD`). En previews Vercel el `scripts/write-sw-demolisher.js` escribe un demoledor auto-destructivo → **NO se puede reproducir A2 en staging preview**.

**Ruta 1 aterrizada** (verificada 2026-09-22 durante análisis previo):

```bash
NEXT_PUBLIC_APP_ENV=production npm run build
```

Output: `public/sw.js` generado con workbox real (15 KB) + `workbox-*.js` (23 KB). Contiene `precacheAndRoute` (100+ assets) + `registerRoute` (NetworkFirst HTML/api, StaleWhileRevalidate JS/CSS/img, CacheFirst fonts). **No es el demoledor** (que sería install:skipWaiting + activate:unregister). Confirma **Ruta 1 viable sin tocar código productivo**.

**Matriz A2** (ejecutable con `npm run start` local + browser manual):

| Sub | Ambiente | SW | Sesión | ¿Cuelga? |
|---|---|---|---|---|
| A2.a | Local `next start` (IS_PROD=true) | registrado (workbox real) | guest | Medir |
| A2.b | Local `next start` (IS_PROD=true) | unregister runtime | guest | Medir |
| A2.c | Local `next start` (IS_PROD=true) | registrado | autenticado 1 tab | Medir |
| A2.d | Local `next start` (IS_PROD=true) | registrado | autenticado 2 tabs | Medir |

**Método**:
- Levantar `npm run start` en background (server local en :3000 con SW real).
- Abrir Chrome DevTools → Application → Service Workers → verificar workbox registrado.
- Navegar guest a `http://localhost:3000/` → medir spinner + `navigator.locks.query()` en Console.
- Repetir con SW desregistrado: `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`.
- Repetir autenticado (login en localhost) + 2 tabs.

**Si A2.a cuelga y A2.b no** → confirmación A2 (SW interfiere con el hydrate). **Si A2.b también cuelga** → A2 NO es la causa, es A1 (lock).

**Ejecución pendiente**: en pass separado (`npm run start` local + browser manual). El resultado se anexa a este documento como sección "A2 · Resultados empíricos" antes del reporte pre-fix final.

---

## A3 — Camino anónimo del hydrate

**Data prod**: 66% events son guests (`has_storage_session=false`). Distribución transaction: `/` 9 (28%), /proveedor 7 (22%), /security-logout 5 (16%), /forgot-password 2 (6%).

**Sub-experimentos** (spec `e2e/specs/cue-1-fix/a3-anonymous-hydrate.spec.ts`):

| Sub | Escenario | Motivo |
|---|---|---|
| A3.a | Guest en `/` | 28% del volumen prod — el más frecuente. |
| A3.b | Guest en `/explorar` | Otro path público, valida si es específico de la home o generalizado. |
| A3.c | Guest en `/forgot-password` | 6% events; puede ser smoke del PO o cuelgue real. |

**Instrumentación**: idem A1 — captura `navigator.locks.query()` + trackea `user_context_stuck` warn + reporta wall time. Cero assertion de reproducción.

---

## Reporte pre-fix (a completar tras correr specs + A2 local)

**Formato esperado por PO**:
- Para cada sospechoso (A1 lock, A2 SW, A3 anónimo): **reproduce sí/no** + **evidencia** (locks dump, warns, wall time) + **cuál explica la distribución real** (26 usuarios reales, 17 Chrome Android, /proveedor y /security-logout).

**Sección pendiente hasta correr specs en CI + A2 local**:
- A1.a · A1.b · A1.c · A1.d — resultados (log del CI, cifras del `console.log`).
- A2.a · A2.b · A2.c · A2.d — resultados manuales (browser + DevTools).
- A3.a · A3.b · A3.c — resultados (log del CI).
- **Veredicto por hipótesis**: cuál sospechoso reproduce en más escenarios + cuál cubre mejor la distribución observada en prod.

**Sin fix hasta GO del PO al reporte**.

---

## Comandos operativos

```bash
# Correr specs A1/A3 en local contra preview (una vez el PR esté abierto):
PLAYWRIGHT_BASE_URL="https://pawnecta-landing-mvp-git-cue-1-fix-*.vercel.app" \
  npx playwright test e2e/specs/cue-1-fix/ --reporter=line

# A2 Ruta 1 local:
NEXT_PUBLIC_APP_ENV=production npm run build
npm run start   # server en :3000 con SW real
# Browser manual: DevTools → Application → Service Workers
```
