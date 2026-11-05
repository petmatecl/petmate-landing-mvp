# Sprint cue-1-fix · Reporte pre-fix consolidado

**Fecha**: 2026-09-23.
**Rama**: `cue-1-fix` (PR #85 abierto, cero merge).
**Método**: A1 (5 sub-experimentos) + A3 (3) en CI vs preview `cue-1-fix` (run [35929626761](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/35929626761)); A2 v2 (5 celdas) local con `next start` IS_PROD=true + envs staging (`docs/sprints/cue-1-fix-a2-resultados.json`).
**Regla férrea**: cero código productivo del fix hasta GO PO sobre este reporte.

**Descubierta durante ejecución** (corolario P8 13ª): specs `cue-1-fix/` estaban en disco pero el workflow los ignoraba silencioso (path faltante en `npx playwright test`). Los checks "verdes" pre-`d17125e` no ejecutaban ni un test A1/A3. Fix workflow commit `d17125e` los agregó a la suite rápida.

---

## Matriz consolidada de reproducción

| # | Sub | Sesión | Ruta / condición | Warn `user_context_stuck` | locks.query() | Cuelga sí/no | Wall |
|---|---|---|---|---:|---|---|---:|
| A1.a | Lock guest 1 tab | guest | / | 0 | `{held:[], pending:[]}` | **NO** | 18.9s |
| A1.b | Lock guest 2 tabs | guest | / (paralelo) | 0/0 | `{held:[], pending:[]}` × 2 | **NO** | 21.1s |
| **A1.c** | Lock auth 2 tabs | proveedor | /proveedor (paralelo) | **1 + 1** | `{held:[], pending:[]}` × 2 | **SÍ** | 18.3s |
| **A1.d** | /security-logout post-signOut | proveedor (residual) | /security-logout | **1** | `{held:[], pending:[]}` | **SÍ** | 18.1s |
| **A1.e** | Tab oculta 90s + reactivación (#2426) | proveedor 2 tabs | /proveedor + hide/show | **1 + 1** | `{held:[], pending:[]}` | **SÍ** | 93.3s |
| A2.a | SW real registrado | guest | / (SW controller ✓) | 0 | `{held:[], pending:[]}` | **NO** | 8.8s |
| A2.b | SW desregistrado runtime | guest | / | 0 | `{held:[], pending:[]}` | **NO** | 1.6s |
| A2.c | SW real registrado | proveedor 1 tab | /proveedor (controller ✓) | 0 | `{held:[], pending:[]}` | **NO** | 1.6s |
| A2.d1 | SW real registrado | proveedor tab1 (paralelo) | /proveedor | 0 | `{held:[], pending:[]}` | **NO** | 1.5s |
| A2.d2 | SW real registrado | proveedor tab2 (paralelo) | /proveedor | 0 | `{held:[], pending:[]}` | **NO** | 1.5s |
| A3.a | Guest / | guest | / | 0 | `{held:[], pending:[]}` | **NO** | 18.7s |
| A3.b | Guest /explorar | guest | /explorar | 0 | `{held:[], pending:[]}` | **NO** | 18.6s |
| A3.c | Guest /forgot-password | guest | /forgot-password | 0 | `{held:[], pending:[]}` | **NO** | 18.7s |

---

## Análisis por sospechoso

### Sospechoso A1 — Lock de auth-js

**Reproduce**: **sí, en 3/5 escenarios**, específicamente los autenticados con sesión persistida (A1.c, A1.d, A1.e).

**Evidencia** (warn payload uniforme en los 3):
```
[user_context_stuck] {
  stuckReason: loading_never_resolved,
  currentRoute: /proveedor (o /security-logout),
  previousRoute: null,
  lastAuthEvent: INITIAL_SESSION,
  hasStorageSession: true
}
```

**Contradicción con la hipótesis PO original**: PO propuso que guests colgaban por el lock del SDK. Los guests **NO cuelgan** en ninguno de los 5 escenarios guest (A1.a, A1.b, A2.a, A2.b, A3.a/b/c). El cuelgue reproduce **solo con sesión persistida en storage** (`hasStorageSession=true` en 3/3 warns).

**`navigator.locks.query()` vacío en TODAS las celdas (13/13)**. Confirma que **el `noOpLock` custom del proyecto funciona** — cero contención Web Locks. **El mecanismo NO es el lock del SDK a nivel navigator.locks**.

**Camino real del cuelgue** (deducido por el payload): `getSession()` resuelve OK con la sesión pre-existente → `hydrateFromSession(session)` → `Promise.all([proveedorRes, seekerRes])` (UserContext.tsx:362-373) **cuelga aquí** sin throw. El chequeo de `.error` post-await no captura promises stale, y el `isLoading` sigue `true` → watchdog dispara a 15s → warn.

**A1.e nota metodológica**: la assertion `getSession post-reactivación` reportó `error: "supabase not on window"` — el cliente Supabase no está expuesto como global. La reproducción del cuelgue igual quedó capturada via el warn del watchdog (tabA_warns=1, tabB_warns=1). Wall 93.3s consistente con espera cumplida. **Evidencia del path #2426 específico (refresh cross-tab) es indirecta** — el warn confirma que el hydrate se cuelga con tab visible después de 90s de otra oculta, pero no distingue si es el mecanismo #2426 o el mismo path que A1.c/d.

**Cuál del rango de issues aplica**:
- **NO es #2426 lock:auth freeze** puro (locks vacíos, no hay lock retenido).
- **NO es #2376 noOp hang** puro (locks vacíos, el noOp funciona).
- **Es probable #2344 pattern**: `_initialize deadlocks when onAuthStateChange registers during init while session <90s expiry` — cuando el UserContext registra `onAuthStateChange` durante init y hay sesión activa, el path del initialize puede colgar. Los warns todos dicen `lastAuthEvent: INITIAL_SESSION`, consistente con este mecanismo. **Fixeado en 2.110.2 #2498** — el upgrade a 2.117.1 lo cerraría.

### Sospechoso A2 — Service Worker

**Reproduce**: **no, en 5/5 celdas** con `controller` poblado correctamente (v2 corregido tras P8).

**Evidencia**: loading resolvió 19ms-531ms en todas; `navigator.locks.query()` = `{held:[], pending:[]}` uniforme; SW controller = `yes (/sw.js)` en A2.a/c/d, `no` en A2.b (desregistrado). Wall 1.5s-8.8s.

**A2 descartado como causa única**. El SW real no dispara el cuelgue local. Puede que Chrome Memory Saver real (que suspende procesos, no simulable en Playwright) contribuya al 56% `sw_controlling=true` de events prod, pero el mecanismo primario está en el hydrate del UserContext (A1.c/d/e reproduce sin necesidad de SW).

### Sospechoso A3 — Camino anónimo

**Reproduce**: **no, en 3/3 escenarios guest** (/, /explorar, /forgot-password).

**Evidencia**: warns=0, locks vacíos, wall 18.6s-18.7s (18s es el `waitForTimeout` del spec — todos completaron sin señal de cuelgue).

**A3 descartado como causa**. Los 66% guests de prod (`has_storage_session=false`) probablemente NO son guests genuinos — pueden ser **users con sesión que el UserContext no logró leer todavía** (getSession() atrás del cuelgue de hydrate → `has_storage_session=false` reportado por Sentry porque el context no llegó a poblar el flag). Post-#82 `Sentry.setUser({id})` mergeado hoy `330a890`, cualquier event futuro va a distinguir `user.id` presente vs `<no-uid>` — reclasificación empírica disponible en próximos días.

---

## Cuál explica la distribución real de los 32 events

Distribución empírica (32 events, últimos 7 días, del script `sentry-query-cue1.ts`):
- Transaction: `/` 9 (28%), `/proveedor` 7 (22%), `/security-logout` 5 (16%), `/forgot-password` 2 (6%), `/admin` 2 (6%), otros.
- 66% `has_storage_session=false`, 56% `sw_controlling=true`, 17 Chrome Android.

**Match con lo reproducido local**:

| Bucket prod | Evento reproducido | Consistencia |
|---|---|---|
| **`/proveedor` 7 (22%)** | A1.c (auth 2 tabs /proveedor) | **Exacto** — 100% de los events en /proveedor caen en el path autenticado + hydrate `Promise.all` bloqueado. |
| **`/security-logout` 5 (16%)** | A1.d (post-signOut, sesión residual) | **Exacto** — warn payload idéntico `currentRoute:/security-logout, hasStorageSession:true`. |
| **`/admin` 2 (6%)** | A1.c análogo (auth en ruta protegida) | **Consistente** — mismo path admin route + auth. |
| **`/` 9 (28%)** | ? (guests no cuelgan local) | **Inconsistente aparente** — probable que muchos de estos sean users autenticados con Sentry reportando `has_storage_session=false` porque el context se colgó antes de leer. Post-#82 se podrá reclasificar. |
| **`/forgot-password` 2 (6%)** | A3.c NO reproduce | **PO smoke** — 2 events del `2026-09-22` durante ventana de smokes del PO por LINK-CONFIRM-EMAIL. Ruido conocido. |
| **17 Chrome Android** | A1.c/d/e reproducen en chromium (headless linux CI) | **Consistente** — el mecanismo es puramente client-side JS, no específico de Android. Chrome Mobile es más frecuente en prod (~53%) por composición del user base. |

**Total explicado por A1.c/d pattern**: ~14 events (`/proveedor` 7 + `/security-logout` 5 + `/admin` 2), 44% del volumen — **con reproducción local directa**.

**Explicable por A1.c/d + user autenticado sobre otras rutas** (los `/` 9 events post-reclasificación probable): ~23 events, **72% del volumen**.

**Resto (~9 events, 28%)**: guests genuinos + smokes PO + long-tail. Requiere data post-#82 para reclasificar con confianza.

---

## Veredicto por hipótesis

**Causa raíz principal**: `hydrateFromSession` de `contexts/UserContext.tsx:362-373` — el `Promise.all([proveedorRes, seekerRes])` de las queries de perfil se cuelga bajo condiciones específicas que reproducen SOLO cuando hay `hasStorageSession=true`. El path del `getSession()` puro resuelve OK; el bloqueo está downstream, en las queries de tablas de perfil.

**Mecanismos secundarios**:
- **`onAuthStateChange` durante init** con sesión activa (patrón #2344): consistente con `lastAuthEvent: INITIAL_SESSION` en 3/3 warns.
- **NO es lock del navigator.locks**: 13/13 celdas con `{held:[], pending:[]}`.
- **NO es el SW**: 4/4 celdas SW registrado sin cuelgue.
- **NO es el camino anónimo**: 5/5 guests sin cuelgue.

**Fix estructural F1+F2** (previamente propuesto, aterriza sobre esta evidencia):
- **F1**: `AbortController` con timeout 10s sobre el `Promise.all([proveedorRes, seekerRes])` de `hydrateFromSession` (UserContext.tsx:362-373). El path exacto del cuelgue reproducido.
- **F2**: al timeout: `setUser(session?.user ?? null)` (evita `user=null` cuando la sesión existe) + Sentry event `user_context_timeout_fallback` con tag distinto del watchdog para distinguir "el fallback funcionó" vs "el cuelgue original quedó".
- **F3**: umbral watchdog **NO baja a 10s** (decisión PO 2026-09-22, mantener 15s hasta comparar antes/después del fix con la misma vara).
- **F4**: test P8 del timeout fallback en `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts` como test regresión permanente + assertion adicional que el evento `user_context_timeout_fallback` se dispara.

**Complemento (fase B - PR aparte)**: **upgrade a `@supabase/supabase-js@~2.117.0`** cierra estructuralmente #2344 (2.110.2 #2498 defer init-time notifications) + #2426 refresh cross-tab (2.117.1 #2698). F1+F2 son red de seguridad independiente del SDK version. Ver [`cue-1-fix-upgrade-supabase-js.md`](cue-1-fix-upgrade-supabase-js.md).

---

## Evidencia empírica adicional del PO (2026-09-24, dos reproducciones en prod)

**Actualización crítica**: PO reprodujo el cuelgue **dos veces en prod en 5 min** el 2026-09-24 con Chrome 153 Windows en **una sola pestaña en incógnito** — invalida parcialmente las conclusiones "guests no cuelgan" y "no reproduce sin 2 tabs / Android":

| # | Ruta | has_storage_session | sw_controlling | Sesión | Pestañas | stuckReason |
|---|---|---|---|---|---|---|
| 1 | `/servicio/[id]` | **false** | **true** | Sin sesión | 1 (incógnito) | `loading_never_resolved` |
| 2 | `/explorar` | **true** | **false** | Con sesión | 1 (incógnito) | `loading_never_resolved` |

**Cross-check con A1/A3**:
- **A3.b (`/explorar` guest)** NO reprodujo en local; PO reprodujo en `/explorar` **con sesión** en prod — el A3.b midió el path guest, no el path autenticado. Falta A3.d: `/explorar` autenticado 1 tab.
- **`/servicio/[id]` sin sesión** NO estaba cubierto por ningún sub-experimento (ni A1 ni A3). Reproduce SIN sesión + con SW → contradicción con la hipótesis "el cuelgue requiere hasStorageSession=true" que dedujo el análisis local. Falta A3.e: guest en `/servicio/[uuid]` con SW controller.
- Ambas en **1 pestaña sola** — el mecanismo NO requiere multi-tab. Los 3 escenarios que reprodujeron en CI local (A1.c/d/e) eran multi-tab o post-signOut; el volumen prod real es 1 tab.

**Revisión del veredicto**: la causa raíz sigue siendo consistente con `Promise.all([proveedorRes, seekerRes])` colgando o el `getSession()` colgando (indistinguible sin instrumentación server-side de qué promise específica), pero **el disparador es más amplio** de lo que sugerían A1/A2/A3 locales:
- Puede reproducir con guest + SW en `/servicio/[id]`.
- Puede reproducir con auth + sin SW en `/explorar`.
- Puede reproducir con 1 tab sola.

Consistente con **la hipótesis original del PO 2026-09-22** ("apunta al lock del SDK, no al camino de perfil") — el guest en `/servicio/[id]` cuelga sin tener perfil que cargar. **El `Promise.all` de perfil NO es la causa única** — el `getSession()` también puede colgar antes del hydrate en algunos paths.

**Match con changelog supabase-js**: 2.117.1 [#2698](https://github.com/supabase/supabase-js/pull/2698) "auth: return stored session when a refresh loses to another tab" — el mecanismo de "refresh loses to another tab" puede afectar single-tab también si el SDK detecta interferencia del SW o pauses en background. Sprint B1 va a probar empíricamente si el upgrade cierra estos casos.

**Cross-cruce user.id**: PO pidió cruzar su user.id con el spec F4 cuando exista. Post-fix F1+F2+F4 aterrizado, spec de regresión debe INSERTAR row de prueba con user.id conocido para comparar. Anotable en F4.

**Cifra actualizada** (2026-09-24): el issue prod ya va en **36 events, no 32** (delta +4 events entre 2026-09-22 sentry-query y 2026-09-24 revisita PO). Consistente con el ritmo ~4-5/día estimado en el reporte original.

## Sin fix hasta GO PO

**Este reporte es el entregable de la fase A**. Cero código productivo aterrizado. Los 3 archivos que quedan como referencia permanente post-GO:
- `e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts` (5 sub-experimentos).
- `e2e/specs/cue-1-fix/a3-anonymous-hydrate.spec.ts` (3 sub-experimentos).
- `scripts/a2-sw-matrix.ts` + `docs/sprints/cue-1-fix-a2-resultados.json` (matriz SW local).

**PR #85** queda abierto sin merge hasta GO PO → aterrizar F1+F2 → verde CI → merge en Tramo 2/3 según ventana.

**Corolario P8 13ª** (workflow ignorando specs) queda anotado para el acta bloque-j-4 como cuarto caso canónico "señales verdes que no hacen nada", junto a `| tee` sin `pipefail` (P12), ruleset `required_status_checks: []`, y `Promise.allSettled` fulfilled con 0 filas borradas bajo RLS silente.
