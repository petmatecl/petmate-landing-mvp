# Sprint cue-1-fix · Fase B1 · Reporte espejo — upgrade @supabase/supabase-js ~2.84 → ~2.117

**Fecha**: 2026-09-24.
**Rama**: `supajs-upgrade` (PR #86 abierto sin merge).
**Base**: `main` post merge #82.
**Alcance**: 3 cambios aislados (bump SDK, remove `noOpLock`, cherry-picks de specs A1/A3 desde `cue-1-fix`). Cero otros cambios funcionales.
**Método P8 causa raíz**: si A1.c/d/e dejan de reproducir el cuelgue → causa confirmada como algo cerrado por el rango 2.85 → 2.117.1. Si siguen reproduciendo → causa NO es lo que fixearon en el rango, F1+F2 del cue-1-fix son necesarios.

**Run CI del experimento**: [35998380355](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/35998380355) — 5 verdes (typecheck, error-audit incluyendo A1/A3, F2, Vercel, Preview Comments).

---

## Matriz A1.c/d/e pre vs post-upgrade

| Sub | Ambiente | pre (2.84.0) `warns` | post (2.117.1) `warns` | Reproduce | Delta payload |
|---|---|---:|---:|---|---|
| **A1.c** | auth 2 tabs `/proveedor` | 1 + 1 | **1 + 1** | **SÍ (sin cambio)** | `lastAuthEvent`: `INITIAL_SESSION` → `INITIAL_SESSION_GETSESSION` |
| **A1.d** | `/security-logout` post-signOut | 1 | **1** | **SÍ (sin cambio)** | Idem |
| **A1.e** | tab oculta 90s + reactivación (#2426) | 1 + 1 | **1 + 1** | **SÍ (sin cambio)** | Idem |

**A3.a/b/c** (guests /, /explorar, /forgot-password): 0 warns pre + 0 warns post — sin cambio local. **Nota**: el PO reprodujo `/explorar` **con sesión** en prod 2026-09-24 (evidencia adicional en el reporte pre-fix); A3.b local mide guest, no auth — brecha reconocida.

**`navigator.locks.query()`** en las 13 celdas: `{held:[], pending:[]}` pre y post. **El upgrade a 2.117 mantiene el patrón "cero contención Web Locks"** — post-#2392 (2.107.0 removió navigator.locks mutex), el resultado esperado. El `noOpLock` custom removido no cambia nada porque el SDK ya no lo usaría de todos modos.

---

## Cambios semánticos del SDK observados en el payload

**`lastAuthEvent` valor**:
- Pre-upgrade (2.84.0): `INITIAL_SESSION`.
- Post-upgrade (2.117.1): **`INITIAL_SESSION_GETSESSION`**.

**Interpretación**: el SDK 2.117 introdujo un evento auth más específico (`INITIAL_SESSION_GETSESSION`) que dispara cuando `getSession()` resuelve durante init con sesión existente en storage. Cambio de granularidad de eventos, no de mecanismo — el cuelgue sigue en el mismo punto (`getSession()` OK → hydrate de perfil bloqueado). Consistente con [PR #2698](https://github.com/supabase/supabase-js/pull/2698) 2.117.1 que introdujo lógica adicional post-`getSession()` para el race cross-tab; el nombre del event refleja el path nuevo.

**Impacto operativo**: el watchdog en `contexts/UserContext.tsx:807-824` sigue disparando con el mismo `stuck_reason=loading_never_resolved`. La captura Sentry sigue funcionando idénticamente. Si mañana revisamos el dashboard prod post-eventual-upgrade, veremos `lastAuthEvent=INITIAL_SESSION_GETSESSION` en events nuevos — hay que actualizar el filtro visual pero no la lógica del watchdog.

**Cero deprecation warn en build post-upgrade** (removed `noOpLock` no dispara #2627).

---

## Análisis: qué dice el changelog que lo explique

Correlación entre issues del kickoff y qué hicieron:

| Sub reproducido | Issue #kickoff | Release fix | Resultado B1 |
|---|---|---|---|
| **A1.c** auth 2 tabs | #2426 tab switch freeze (fix 2.107.0 #2392 remove navigator.locks + 2.117.1 #2698 cross-tab refresh) | ✅ ambos fixes en 2.117.1 | **NO cierra el cuelgue** — el mecanismo #2426 era `Lock "..." was not released within 5000ms`; nuestros logs muestran `{held:[], pending:[]}` — ya no hay lock, pero el hydrate sigue colgando por OTRO camino. |
| **A1.d** /security-logout post-signOut | Familia P10 patrón `onAuthStateChange` async work | ⚠️ mitigación indirecta (2.107.0 remove lock cambia semántica) | **NO cierra el cuelgue** — el signOut sigue dejando el hydrate colgando en la nav siguiente. |
| **A1.e** tab oculta 90s + reactivación | #2426 refresh cross-tab (2.117.1 #2698) | ✅ fix del PR más reciente | **NO cierra el cuelgue** — la simulación via `document.hidden` + `dispatchEvent` puede ser insuficiente para triggear el mecanismo real de #2698 (que requiere multi-tab con broadcast channel de storage entre tabs distintas del browser — no `document.hidden` simulado en la misma tab). Alternativa: el mecanismo #2698 se activa solo cuando 2 tabs REALES refrescan el token y una gana; nuestra simulación puede no llegar a esa condición. |

**Conclusión del análisis**: los issues #2426/#2698/#2392 que el rango 2.85 → 2.117.1 cerró son de la **familia del navigator.locks + refresh cross-tab**, pero **la causa raíz del cuelgue CUE-1 en Pawnecta NO está en esa familia**. El mecanismo real es distinto — hidratación de perfil (`Promise.all([proveedorRes, seekerRes])`) que se bloquea después de `getSession()` OK, sin `error`, sin locks, sin refresh visible. #2344 (deadlock `_initialize`) fixeado en 2.110.2 tampoco cierra — porque en nuestro caso el `_initialize` completa (obtenemos payload con `hasStorageSession: true` y `lastAuthEvent`), pero el hydrate DEspués de `_initialize` se cuelga.

---

## Breaking changes que hubo que tocar en Pawnecta

**Cero breaking necesitaron ajuste de código productivo**:
- `@supabase/supabase-js` 2.109.0 [#2482](https://github.com/supabase/supabase-js/pull/2482) drop Node.js 20 → **CI ya en Node 22** (`.github/workflows/e2e-error-audit.yml:116`), cero cambio.
- `@supabase/supabase-js` 2.107.0 [#2392](https://github.com/supabase/supabase-js/pull/2392) remove navigator.locks mutex → `noOpLock` custom removido en este PR (1 archivo `lib/supabaseClient.ts`, 7 líneas eliminadas).
- `@supabase/supabase-js` 2.112.4 [#2627](https://github.com/supabase/supabase-js/pull/2627) deprecation warn del `lock` option → prevenido al remover el `noOpLock` (cero warn en build post-upgrade, verificado en `/tmp/build-supajs.log`).

Cero otros breaking en superficie `createClient / getSession / onAuthStateChange / signInWithPassword / signOut / auth.admin.*`. Los 30+ callers de `createClient` (mayoría server-side service_role) funcionan sin cambios.

**Regla P10 sigue vigente** aunque el mecanismo cambia post-#2392 (commit guard en vez de navigator.locks). El pattern "async work en `onAuthStateChange`" es antipatrón por semántica del evento, no por lock específico. Los 3 callers reales (UserContext.tsx:651, reset-password.tsx:27, OnlineStatusProvider.tsx:26) funcionan idénticamente pre y post.

---

## Veredicto B1

**El upgrade a `@supabase/supabase-js@~2.117.0` NO cierra la causa raíz del cuelgue CUE-1**. Los 3 sub-experimentos que reprodujeron pre-upgrade siguen reproduciendo post-upgrade con evidencia idéntica (warns disparados, locks vacíos, mismo `stuckReason`).

**Consecuencias**:

1. **F1+F2 del cue-1-fix son necesarios** — el fix estructural (AbortController timeout 10s en `Promise.all` de perfil + fallback determinístico + Sentry event distinto) es la única vía para cerrar el cuelgue. El upgrade no lo hace redundante.

2. **El upgrade sigue teniendo valor operativo**:
   - Cierra 33 releases de deuda de dependencia (~10 meses).
   - Elimina el workaround `noOpLock` que ya no es necesario por diseño post-#2392.
   - Prevé el deprecation warn de #2627 (que aparecería si mantenemos el lock custom en cualquier upgrade > 2.112.4).
   - Trae fixes menores acumulados (5xx error message, PKCE per-flow slots, logs mejorados, etc).
   - Habilita eventual adopción de features nuevos (passkeys API, MFA recovery codes).

3. **Sin urgencia de merge pre-viaje**. El upgrade **no es blocker** de F1+F2 (funcionan sobre 2.84.0 igual). Sigue la disciplina PO: PR abierto sin merge antes del viaje; merge en Tramo 3 con 2 semanas de observación mínima.

4. **F4 spec de regresión** del cue-1-fix debe correr contra 2.117 también post-merge (como test que verifica que el timeout fallback funciona igual en ambas versiones).

---

## Recomendación al PO

**Merge #86 supajs-upgrade en Tramo 3 (regreso PO 2026-10-28+)** como mantenimiento de dependencia programado, NO como fix de CUE-1. Antes: dejar 2 semanas de observación con el PR abierto (build verde), luego merge con QA post-deploy prod (verificar que las 3 métricas Sentry no cambian negativamente: cantidad events `user_context_stuck`, distribución browsers, geografía).

**F1+F2 sigue siendo el path del fix real** (PR #85 cue-1-fix). Merge pre-viaje con QA PO sobre el fallback empíricamente disparado.

**Nota metodológica P8 causa raíz cumplida**: el experimento B1 falseó la hipótesis "el upgrade cierra la causa". Vale igual — un P8 que falsea es evidencia útil, no fracaso. Sabemos qué NO es la causa (navigator.locks + refresh cross-tab post-#2392) y podemos focalizar el fix en el path que sí se cuelga (Promise.all de queries de perfil, aún desconocido en detalle pero acotable con AbortController).
