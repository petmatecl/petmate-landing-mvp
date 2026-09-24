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

**A1. Lock de auth de supabase-js — PRIMERO (precisión PO 2026-09-22)**:

**Racional del PO**: `getSession()` (UserContext.tsx:631) se cuelga también para invitados sin sesión (que NO tienen perfil que cargar). Eso apunta al lock de auth del SDK más que al camino de perfil (queries `.from('proveedores')`/`usuarios_buscadores`). El path guest normal (L311-338) resuelve rápido con `session=null` → `setIsLoading(false)`; que 66% de events sean guests sin storage session es evidencia fuerte de que el cuelgue está en `getSession()` mismo, ANTES de llegar al hydrateFromSession.

**Caso `/security-logout` (5 events, 16%)**: notable — todos son POST-logout inmediato. El path del logout dispara `onAuthStateChange` con `event='SIGNED_OUT'`; según CLAUDE.md > P10 (sprint deadlock-fix 2026-08-28), llamadas asíncronas al cliente Supabase dentro del callback de `onAuthStateChange` producen deadlock circular en el lock interno de auth. Aunque el fix P10 aterrizó `setTimeout(0)` para diferir el trabajo, puede haber path residual sin la protección. Hipótesis fuerte que A1 + P10 son el mismo bug.

**P8 A1 — 4 sub-experimentos, todos con `navigator.locks.query()` capturado al cuelgue**:
- **A1.a — Guest sin sesión, 1 pestaña**: incognito staging preview `/`, sin login. Si `getSession()` se cuelga aquí, el lock interno del SDK es sospechoso (cero conflicto entre pestañas — es un lock que se queda tomado).
- **A1.b — Guest sin sesión, 2 pestañas simultáneas**: incognito 2 tabs paralelas a `/`. Si una tab cuelga y la otra no → contienda del lock intra-cliente confirmada.
- **A1.c — Autenticado, 2 pestañas misma sesión**: perfil Aldo (proveedor.json) en 2 tabs → `/proveedor`. Reproduce el patrón cross-tab clásico ADV-LOCK — la 2ª tab espera al lock que la 1ª tomó.
- **A1.d — `/security-logout` post-signOut**: login normal → click logout → llegar a `/security-logout` → medir `navigator.locks.query()` + observar si watchdog dispara. Aísla el path P10 del `onAuthStateChange`.

**Captura obligatoria en cada P8**: `page.evaluate(() => navigator.locks.query())` cuando el spinner queda pegado (>10s en la UI) + `navigator.serviceWorker.controller?.scriptURL` para descartar A2 en ese instante + timestamp.

**Verificación de issues conocidos en `@supabase/supabase-js@~2.84.0`**:
- Buscar en `https://github.com/supabase/supabase-js/issues` y `https://github.com/supabase/auth-js/issues` con queries: `getSession hang`, `deadlock auth`, `navigator.locks`, `lock never released`, `pendingInLock`. Rango de versiones afectadas: 2.84.x (pin actual del proyecto por P12 CLAUDE.md 2026-09-17).
- Reporte del hallazgo: **citar issue exacto (URL + título + status) si existe**. Si el issue está resuelto en 2.85+ → decisión PO sobre bump vs workaround local. Si no hay issue → abrir uno con nuestro repro determinista (opción productiva).
- El proyecto documenta ya P10 con stack trace verificado contra `node_modules/@supabase/auth-js/dist/main/GoTrueClient.js` v2.84.0 (sprint deadlock-fix 2026-08-28). Extender esa investigación es la base del A1.

**Escenario alternativo verificable en A1**: el `pendingInLock` interno del SDK tiene una promesa pendiente que nunca resuelve porque el callback subyacente no notifica (bug del propio SDK versión 2.84.x, precedente P10). Reproducir con `signInWithPassword` mid-hydrate y ver si el flag `pendingInLock` queda `true` indefinido — inspeccionable en `page.evaluate` a través del cliente exportado.

**A2. Service Worker (`next-pwa@10.2.9`) — SW REAL, no demoledor (precisión PO 2026-09-22)**:

**Precisión del PO**: el SW `next-pwa` solo se registra en prod (gate `IS_PROD` de `next.config.js`). En previews Vercel el `scripts/write-sw-demolisher.js` hook prebuild escribe un `public/sw.js` auto-destructivo (unregister + purga caches). **NO se puede reproducir A2 en staging preview** — el SW real nunca corre allí.

**Reproducción canónica del A2** (dos rutas posibles, decisión PO):
- **Ruta 1 — local con next start**: `NEXT_PUBLIC_APP_ENV=production npm run build && npm run start` fuerza `IS_PROD=true` → el prebuild NO ejecuta el demoledor → `next-pwa` genera el `sw.js` workbox real. Playwright/browser manual apunta a `http://localhost:3000` y reproduce el cuelgue con SW registrado vs `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`. Cero contacto con prod real, cero riesgo de deploy.
- **Ruta 2 — preview desechable con SW forzado**: cambiar temporalmente en la rama `cue-1-fix` el gate del hook prebuild + el `disable` de `withPWA` para forzar SW en un preview específico. **Requiere tocar código productivo temporalmente** — decisión PO si vale la pena vs Ruta 1.

**Recomendación**: **Ruta 1 primero** (cero riesgo, cero touch al código productivo, ejecutable inmediato con `npm run build` local). Si el cuelgue no reproduce local pero sí en prod → sub-hipótesis de infra de Vercel + SW (difícil aislar) — evaluar Ruta 2.

**Qué intercepta el SW real**:
- **NetworkFirst** para HTML documentos + `/api/*` no-auth (timeout 10s + fallback `_offline`).
- **StaleWhileRevalidate** para JS chunks, CSS, imágenes, `_next/data/*.json`, `_next/image`.
- **CacheFirst** para fonts Google + `gstatic`.
- **No toca terceros por default**: `*.supabase.co` no está en runtimeCaching, pasa directo a network. Confirmar con `chrome://serviceworker-internals/` en cualquiera de las rutas de reproducción que el SW no aparece como controller de las requests a `*.supabase.co`.
- **BroadcastChannel/postMessage**: verificar si Supabase Auth SDK v2.84.x usa BroadcastChannel para sincronizar sesión entre pestañas — si el SW intercepta esos messages (workbox tiene handlers de messages para SW updates), puede corromper la sincronización de auth.

**P8 A2** — matriz reproducibilidad:
| Sub | Ambiente | SW | Sesión | ¿Cuelga? |
|---|---|---|---|---|
| A2.a | Local `next start` (IS_PROD=true) | registrado (workbox real) | guest | Medir |
| A2.b | Local `next start` (IS_PROD=true) | unregister runtime | guest | Medir |
| A2.c | Local `next start` (IS_PROD=true) | registrado | autenticado 1 tab | Medir |
| A2.d | Local `next start` (IS_PROD=true) | registrado | autenticado 2 tabs | Medir |

Si A2.a cuelga y A2.b no → confirmación A2. Si A2.b también cuelga → A2 no es la causa, es A1.

**Sub-decisión PO al arrancar**: ¿arranco A2 con Ruta 1 (local) sin pedir GO, o dejo A2 en pausa hasta que valides que quieres Ruta 1 vs Ruta 2? Mi propuesta: **Ruta 1 automática** (cero riesgo, cero código productivo tocado). Si prefieres Ruta 2 o pausar A2, dime en el reporte pre-fix.

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
- BACKLOG: [BACKLOG.md](../../BACKLOG.md) > CUE-1 al tope.
- Regla P10 (deadlock lock auth): [CLAUDE.md](../../CLAUDE.md) > Workflow.
- Script query Sentry: [scripts/sentry-query-cue1.ts](../../scripts/sentry-query-cue1.ts).

---

## Estado 2026-09-25 · revisión post identificación de `user.id`

**Evolución del sprint tras B2 (fix stale closure del watchdog) + investigación del incidente prod chat-back-boundary 2026-09-25**:

**a)** Issue Sentry `JAVASCRIPT-NEXTJS-7` (`user_context_stuck`, 39 events al 2026-09-25) = **stale closure del watchdog**, todos del PO en desktop. Fix aterrizado en PR #85 rama `cue-1-fix` — useRef en el efecto del watchdog + F4 doble dirección (negativa A1.c/d/e warns=0 + positiva cue-1-watchdog dispara). Merge sábado 2026-09-27 tras QA PO (2 tabs 5 min + logout + confirmar cero `user_context_stuck` nuevos con release nueva).

**b)** Issues Sentry `JAVASCRIPT-NEXTJS-5` (`[UserContext] hydrate exhausted`, 4 events) + `JAVASCRIPT-NEXTJS-8` (`login_role_lookup_failed`, 1 event) = **dispositivo Android del PO con Failed to fetch intermitente hacia supabase.co**.

Datos empíricos capturados vía [scripts/sentry-query-cue1-events.ts](../../scripts/sentry-query-cue1-events.ts) + [scripts/sentry-event-detail.ts](../../scripts/sentry-event-detail.ts):

| # | when (UTC) | route | issue | user_id_masked | browser | OS | release |
|---|---|---|---|---|---|---|---|
| 1 | 2026-09-08 17:00:31 | /admin | -5 hydrate exhausted | `0c2ab509…` | Chrome Mobile 151 | Android 15 | `ed34a69` |
| 2 | 2026-09-08 17:06:11 | /login | -5 hydrate exhausted | `0c2ab509…` | Chrome Mobile 151 | Android 15 | `ed34a69` |
| 3 | 2026-09-21 21:13:06 | /login | -8 login_role_lookup_failed | anon | Chrome Mobile 152 | Android 15 | `e19154c` |
| 4 | 2026-09-21 21:13:18 | /explorar | -5 hydrate exhausted | `0c2ab509…` | Chrome Mobile 152 | Android 15 | `e19154c` |
| 5 | 2026-09-21 21:13:35 | /proveedor | -5 hydrate exhausted | `0c2ab509…` | Chrome Mobile 152 | Android 15 | `e19154c` |

Un solo `user.id`, 2 sesiones aisladas (08-sep 5m40s + 21-sep 29s). PO confirma 2026-09-25 que `0c2ab509…` es su propia cuenta Android — los 5 events son pruebas del PO desde su móvil.

Contexto capturado del captureMessage `-5`: `role_degradation: {"attempts_total":4, "last_error":"TypeError: Failed to fetch (ouezpeeiwjwawauidrqq.supabase.co)", "route":"/proveedor", "user_id_masked":"0c2ab509…"}`. Patrón de breadcrumbs repetido: `fetch/http error → fetch/http info 200 → hydrate/default warning attempt N failed` (attempts 0-3 alternando fail/OK contra el mismo host) — descarta outage sostenido de Supabase, apunta a intermitencia en el path cliente del dispositivo.

**[causa probable: filtro DNS/bloqueador del dispositivo / causa no determinada]** — pendiente del PO completar `[Mi teléfono tiene / no tiene DNS privado o bloqueador: ___]`.

**c)** Usuarios reales afectados en 28 días de monitoreo (15-sep → 25-sep, `Sentry.setUser({id})` activo desde #82): **cero**. Los únicos 2 `user.id` distintos que aparecen en el proyecto son ambos del PO — Desktop `aff2a90d…` en -7 watchdog + Android `0c2ab509…` en -5/-8 hydrate exhausted.

**d)** El cuelgue reportado por el PO en agosto 2026 no tiene evidencia registrada en Sentry — anterior al kickoff del sprint prelaunch CUE-1 (2026-09-15) que aterrizó el watchdog.

**Clasificación**: **[CONVIENE si hay bloqueador confirmado / se mantiene en observación 29-09 a 27-10 si no]** (pendiente completar placeholder de la entrada b).

**Disparador para reabrir**: cualquier evento de `hydrate_exhausted` o de `user_context_stuck` con `user.id` distinto del PO (`aff2a90d…`, `0c2ab509…`) o distinto de cuentas de prueba conocidas.

**F1 + F2 (AbortController + fallback determinístico)**: **archivados como "no aplican"** — la causa real es `Failed to fetch`, que ya se resuelve con error del fetch y ya dispara los 4 reintentos del hydrate; AbortController + fallback no habrían cambiado el path ni el user experience. La necesidad estructural que motivó F1+F2 no existió — era interpretación errónea del ruido del watchdog stale closure.

**`cue-1-mobile-toast`**: **CONVIENE post-lanzamiento**. Cuando UserContext cae a `hydrationState=degraded` post-hydrate exhausted, surface toast al user con copy "Tuvimos problemas conectando con nuestro servicio. Algunas funciones pueden fallar." + action "Recargar". UX de degrade explícito — hoy el user queda con dashboard vacío sin explicación. Sprint chico ~30 min.

**Hilo "5 de /security-logout" cerrado** — la query amplia (`transaction:*security-logout*`, `url:*security-logout*`, `"security-logout"`, `message:*security_logout*`, todos ejecutados vía [scripts/sentry-security-logout.ts](../../scripts/sentry-security-logout.ts) 2026-09-25) confirmó que eran distribución de transaction del issue `-7` (watchdog `user_context_stuck`) del 22-09 (cue-1.4). Con el stale closure explicado y el fix en #85, esos 5 dejan de significar algo separado.

**Regla operativa nueva ganada en este sprint** (aplicable a TODO análisis futuro de Sentry): **antes de clasificar un issue, cruzar `user.id` — y cuando no hay id, navegador/dispositivo — contra las cuentas del PO y de prueba** (`aff2a90d…` desktop, `0c2ab509…` Android, y las cuentas E2E de Aldo/Camila). Dos semanas de "evidencia CUE-1 BLOQUEA" fueron el PO probándose a sí mismo desde dos dispositivos distintos; la clasificación real solo se pudo hacer cuando el sprint `cue-1-sentry-user` (#82) llenó el `user.id` en scope y este sprint hizo el cruce. Agregada al CLAUDE.md > sección Sentry / patrones de análisis.
