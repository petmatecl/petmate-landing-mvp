# ACTA — Sprint `error-audit`

**Rama**: `error-audit` (forkeada de `main` @ `def509e` post-cierre `popup-fix`).
**Estado**: **EN CURSO**. Documento vivo que se completa al cierre del sprint.
**Fecha apertura**: 2026-09-08.
**Tag final** (pendiente al cierre completo): `error-audit-prod-YYYYMMDD`.

---

## 1. Motivación

Auditoría del antipatrón "destructurar respuesta de supabase-js ignorando `.error`" — el SDK devuelve `{ data, error }` y NO lanza excepciones ante fallos de red o RLS. Callers que destructuran solo `{ data }` interpretan la ausencia de fila como "no hay resultado" en vez de "no pude preguntar". Consecuencias en producción documentadas en sprint role-degradation (2026-09-04): admin degradado a tutor silente, gates que expulsan a login por fallo de red, mentiras positivas al user.

## 2. Corrección de cifras (universo vs conteo)

**Reporte inicial (Ronda 1)**: 26 llamadas en 12 archivos.
**Realidad post-grep amplio**: **68 llamadas en 34 archivos**. Casi el triple.

**Causa del error**: el grep inicial se corrió sobre `components/*` y `pages/*.tsx` top-level solamente. No incluyó `pages/api/*`, `lib/*`, ni subrutas de `pages/`. **El conteo era del universo estrecho, no del proyecto**.

**Impacto de la subestimación**: si el sprint se hubiera priorizado con 26 en la memoria y 68 en la realidad, se subestimaba el ancho del problema. **Un 44% del código que destructura respuestas supabase-js ignora `.error`** — no es excepción, es convención rota.

**Lección operativa aterrizada en el sprint**: cuando el auditor reporta un conteo, **decir explícitamente sobre qué universo se corrió**. "26 llamadas en components + pages top-level" ≠ "26 llamadas en el proyecto". El PO priorizó basado en la primera lectura sin la aclaración de universo — el conteo se leyó como "problema del proyecto". Es la 12ª instancia del meta-patrón P8 aplicada a métricas de reporte.

## 3. Caso 5 línea 92 — `handlePhotoUpload` en `ClientLayout.tsx`

**SHA**: `f40f499`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO).

### 3.1 Bug buscado (motivación del sprint)

Tutora con fallo de red en la query `usuarios_buscadores`: `esBuscador` viene null (indistinguible de "no hay fila"). El código caía al UPDATE de `proveedores` con WHERE que no matcheaba ninguna fila. PostgREST **no reporta UPDATE 0-filas como error** → `updateError` era null → toast verde "¡Foto actualizada!" mientras la BD nunca recibió el cambio. F5 → foto desaparece.

### 3.2 Bug descubierto (más grave — camino cotidiano)

Al mirar el orden de las operaciones para diseñar el fix, apareció un segundo bug **sin condiciones raras**: cada tutor que intentaba subir foto dejaba un archivo **huérfano** en el bucket `avatars`. El upload sucedía ANTES de la verificación de rol; al detectar `esBuscador` truthy, el flujo mostraba "No disponible aún" y hacía return — pero el archivo ya estaba subido. **100% reproducible en cada intento de subida de cualquier tutor** desde que existe la función. Nadie lo notó porque el user ve un mensaje razonable y se va pensando que no pasó nada.

**Reclasificación**: subestimado en la Ronda 2 como "puede corromper datos". Es de otra categoría — **escribe en bucket sin referencia desde BD**. Es data mal guardada, no una afirmación falsa como los otros 4 casos Tipo A.

### 3.3 Fix — reorden de operaciones

Un solo reorden cerró los dos bugs: query rol al principio, upload solo cuando el rol está confirmado como proveedor. Cero cambio de UI, cero cambio en los modales existentes. Comentario in-code extenso explicando POR QUÉ el orden importa + instrucción explícita al futuro dev "NO mover el upload más arriba".

### 3.4 Smoke verde en preview 2026-09-08

**Preview URL**: `https://pawnecta-landing-mvp-git-error-audit-petmatecls-projects.vercel.app` (SHA `f40f499`).

**Setup**: viewport mobile en DevTools (Device toolbar), tutora Camila logueada, ruta `/usuario/mascotas`. Bucket avatars en 1 archivo (positivo conocido: avatar de proveedor real).

- **Parte 2 (sin bloqueo)**: modal "No disponible aún". Network log muestra **2 requests totales** — preflight OPTIONS + fetch a `usuarios_buscadores`, ambos 200. **Cero requests a `storage/v1/object/avatars`**. Bucket sigue en 1.
- **Parte 1 (con bloqueo `*usuarios_buscadores*`)**: modal "No pudimos guardar la foto — Vuelve a intentar." **1 request a `usuarios_buscadores` en (blocked)**. **Cero requests a storage**. Bucket sigue en 1.

Ambas partes verificadas con conteo de archivos ANTES/DESPUÉS del gesto — cero acumulación.

### 3.5 Investigación paralela — `/usuario` redirige a `/explorar` (NO es regresión del sprint)

Durante la preparación del smoke, PO observó que `/usuario` redirigía a `/explorar` con dos cuentas distintas (tutor genérico y Camila), ya logueadas parada en `/explorar`. Hipótesis inicial del auditor: memoria del post-login. **Falso** — el auditor grepeó `router.push('/explorar')` solo dentro de `pages/usuario.tsx` y concluyó "no hay redirect".

**Realidad**: [next.config.js:206-210](next.config.js#L206-L210) tiene un redirect server-side HTTP 307:

```
{ source: '/usuario', destination: '/explorar', permanent: false }
```

Sin condiciones. Sin gate. Cualquier request a exactamente `/usuario` cae. Match exacto — NO arrastra `/usuario/mascotas`.

**Commit que lo introdujo**: `4d0f42d` (jueves 02-abr-2026, ~5 meses antes de este sprint). Mensaje: `"fix: redirect /usuario to /explorar — user panel not needed for directory"`. **Intencional**. Decisión de producto de abril: la ruta `/usuario` se retiró como destino navegacional porque el dashboard de tutor no tiene propósito en un modelo de directorio. Cero relación con `f40f499` ni con ningún trabajo del sprint.

**Lección P8 de esta ronda (13ª instancia del meta-patrón)**: **un negativo obtenido con grep de universo estrecho no descarta nada — la búsqueda debe cubrir todas las capas que pueden producir el efecto**. Grepear `router.push('/explorar')` solo en `pages/usuario.tsx` era estructuralmente insuficiente porque:

- El redirect puede vivir en capas server (next.config.js redirects/rewrites, middleware.ts, vercel.json).
- El redirect puede vivir en capas cliente globales (_app.tsx, RoleSelectionInterceptor, UserContext, cualquier useEffect que reaccione a rol o perfil).
- El redirect puede usar formas alternativas de navegación (`window.location.href`, `window.location.replace`, `router.replace`, config `redirect { destination }`).

**Regla operativa**: cuando el auditor busca un efecto observado ("URL cambia a X"), enumerar las capas donde ese efecto puede originarse ANTES del grep, y grepear cada una con su patrón específico. Si alguna capa no se cubrió, el negativo no vale como conclusión. Aplicado a la investigación posterior: grep `explorar` amplio sobre `**/*.{ts,tsx,js,mjs,json}` + lectura de `next.config.js`, `middleware.ts`, `vercel.json`, `_app.tsx`, `RoleSelectionInterceptor.tsx`, `UserContext.tsx` — encontró el redirect en 30 segundos.

Mismo antipatrón que motivó el sprint mismo (26 vs 68 llamadas). El auditor lo reprodujo en la investigación de un caso del propio sprint. Aterrizado como lección para no volver a caerlo.

### 3.6 Hallazgos colaterales de la investigación → BACKLOG

Ver `BACKLOG.md > PEDIDOS DIRECTOS DEL PO > Hallazgos colaterales del sprint error-audit`:

- (a) Archivos huérfanos en bucket `avatars` — extendido al segundo caller `pages/proveedor/index.tsx:778-809`.
- (b) Bucket `avatars` con policy SELECT amplia que permite listado.
- (c) Avatar del tutor en `ClientLayout` — mobile-only trigger que siempre termina en "No disponible aún". Decisión de producto pendiente.
- (d) Código muerto por retiro de `/usuario` (`pages/usuario.tsx`, `DashboardContent.tsx`, comentarios stale en `RoleSelectionInterceptor.tsx:29`).
- (e) Caso 6 `signup.ts:220` — server-side, no reproducible con smoke estándar.

## 4. Casos 2 + 1 — RoleGuard admin + RoleGuard proveedor

**SHA**: `3aeb627`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO en desktop).

### 4.1 Bug antes del fix (idéntico en ambas ramas)

La query fallback a `proveedores` (líneas 39 rama proveedor + 61 rama admin del `RoleGuard.tsx` pre-fix) destructuraba solo `{ data }`. Ante fallo transitorio de red (bloqueo, drop, RLS glitch): `data` era null → el código caía al mismo `router.push('/login')` que "no tiene el rol". **Admin real con drop de red se veía expulsado a login sin explicación, indistinguible de un tutor que legítimamente no tiene el rol**.

### 4.2 Fix estructural

Destructuring `{ data, error }` en ambas ramas. Si `error` truthy:
- `Sentry.captureMessage('roleguard_verify_failed', { level: 'warning', tags: { subsystem: 'roleguard', route, requiredRole, errorCode }, extra: {...} })`.
- Nuevo estado `'error'` en el discriminated union `authState`.
- Sin redirect — user se queda en la ruta con estado explícito.

Render nuevo: título "No pudimos verificar tu acceso" + sublínea "Revisa tu conexión y vuelve a intentar." + botón "Reintentar". Retry incrementa `retryTrigger` que está en las deps del useEffect → re-corre `verifyAccess`.

**Case 1 (proveedor) sin caller vivo hoy** — `grep -rn '<RoleGuard requiredRole="proveedor"' components/ pages/` retorna 0. Se aplica fix estructural por consistencia del archivo (dejar la mitad arreglada es peor).

**P10**: `verifyAccess` corre dentro de `useEffect` y llama `supabase.from()` directo. NO dentro de `onAuthStateChange` callback ni del lock del SDK Auth. Sesión llega via `useUser()` context ya hidratado. Cero riesgo de deadlock.

### 4.3 Smoke verde en preview 2026-09-08 (SHA `3aeb627`)

Setup: desktop viewport, bloqueo con pattern exacto `https://jmtadvdkicyylcwjcmcl.supabase.co/rest/v1/proveedores*` (staging Supabase).

- **Control positivo**: Aldo sin bloqueo en `/admin/servicios` renderea normal.
- **Parte 1 gesto 1** (con bloqueo): estado "No pudimos verificar tu acceso / Revisa tu conexión y vuelve a intentar / Reintentar". Query `proveedores` en `(blocked)`. Sin redirect a `/login`.
- **Parte 1 gesto 2** (Reintentar con bloqueo activo): repite el estado. Requests bloqueados suman `4 → 7 → 8 affected`, confirma que retry re-ejecuta la query.
- **Parte 1 gesto 3** (bloqueo apagado + Reintentar): renderea panel admin en la misma página. `proveedores` 200. Cero regresión del camino feliz post-retry.
- **Parte 2** (sin bloqueo, otra subruta): Aldo en `/admin/proveedores` carga normal.
- **Parte 3** (control negativo): Camila (tutora sin rol admin), sin bloqueo, en `/admin/servicios` → cae en `/login` por el flujo de no-autorizado preexistente. **La pantalla de error NO aparece** — el fix distingue correctamente error de red vs no-autorizado.

## 5. Caso 3 — hub `/admin` bajo `<RoleGuard requiredRole="admin">`

**SHA**: `c564728`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO).

### 5.1 Análisis previo — Opción 1 vs Opción 2

`pages/admin.tsx` NO estaba wrapeado en RoleGuard — hacía su propio `checkAuth` inline en línea 103 con el mismo antipatrón que Cases 2+1 pre-fix (destructuraba `{ data }` ignorando `.error`). Fallo de red mostraba "Acceso restringido" con **login form embebido** al admin real logueado.

Dos opciones evaluadas:
- **Opción 1** — fix in-place en admin.tsx (~30 líneas nuevas, duplica el patrón error-state de RoleGuard).
- **Opción 2** — wrap en RoleGuard (~80 líneas eliminadas de auth inline, ~5 agregadas de wrap, consistencia arquitectural con las 4 subrutas).

**PO aprobó Opción 2** por 2 razones estructurales: cero duplicación del error-state pattern + consistencia total de los 5 puntos admin.

### 5.2 Verificaciones pre-code

**Paridad de criterio de acceso — 100%**. `checkAuth` hub y RoleGuard admin evalúan misma tabla + WHERE + `roles.includes('admin') && estado === 'aprobado'`. Cero email allowlist, cero conditions extra. Cero admin real pierde acceso, cero no-admin lo gana.

**Lógica exclusiva de `handleAdminLogin` — nada que migrar**. Grep `pawnecta_active_mode|activeMode|activeRole|localStorage|useUser|switchRole|refreshProfile` = 0 matches. `handleAdminLogin` era `signInWithPassword` + query rol + `signOut` defensivo + `setIsAdmin`. Sin persistencia de modo/rol, sin side-effects globales.

### 5.3 Fix estructural

Split del componente en 2:
- **`AdminDashboard`** (default export): wrap en `<RoleGuard requiredRole="admin">`. 3 líneas.
- **`AdminDashboardInner`**: contiene todo el state + effects + JSX previo. Los `useEffect` de contadores (aprobaciones + feedback) solo se disparan cuando RoleGuard autoriza — sino `AdminDashboardInner` no se monta y las queries no corren para no-admins (evita ruido RLS + tráfico inútil).

Eliminado: `checkAuth` (25 líneas), su `useEffect` (3 líneas), `handleAdminLogin` (80 líneas), render branch `!isAdmin` con login form embebido (60 líneas), 4 states del form (`adminEmail/Password/loginLoading/loginError`), `isAdmin` + `loading` states, render branch `if(loading)` (9 líneas), imports muertos (`useCallback`, `useRef`).

**Diff neto: −168 líneas** (−202 +34).

### 5.4 Cambio de comportamiento intencional

Admin sin sesión activa en `/admin` ahora va a `/login` estándar (mismo comportamiento que `/admin/servicios` y las otras 3 subrutas), en vez de ver el login form embebido en `/admin`. Aceptado por PO — la inline form era comodidad menor.

### 5.5 Smoke verde en preview 2026-09-08 (SHA `c564728`)

Setup: bloqueo con pattern exacto `https://jmtadvdkicyylcwjcmcl.supabase.co/rest/v1/proveedores*`.

- **Control positivo**: hub con pestañas Métricas/Conversión/Moderación/Proveedores/Feedback (badge Feedback=1), contadores 14/0/14/7.
- **Parte 1** (con bloqueo): estado "No pudimos verificar tu acceso" + botón Reintentar. **Sin form "Acceso restringido"** (comportamiento nuevo). Reintentar con bloqueo repite el estado y suma bloqueados (`4 → 5 → 7 → 9`). Bloqueo apagado + Reintentar → hub carga en la misma página con los mismos contadores y badge.
- **Parte 2** (sin bloqueo): hub normal como admin, todas las consultas de contadores 200.
- **Parte 3** (control negativo): Camila (sin rol admin) → `/login` estándar, sin pantalla de error.

## 6. Checklist Sentry post-prod (pendiente al momento de este documento)

Sentry cliente **gated a producción** — `enabled: NEXT_PUBLIC_VERCEL_ENV === 'production'` en [instrumentation-client.ts:30](instrumentation-client.ts#L30). Los eventos client-side desde preview NO llegan al dashboard. Verificación end-to-end diferida a prod post-merge.

**Cobertura del checklist**: 2 eventos distintos a verificar en prod:
- `roleguard_verify_failed` — desde CUALQUIERA de los 5 puntos admin (hub `/admin` + 4 subrutas `/admin/*`) usando el mismo RoleGuard. Se verifica en 2 muestras: subruta (`/admin/servicios`) + hub (`/admin`).
- `login_role_lookup_failed` — desde `/login` post-submit con bloqueo activo.

**Checklist a correr por PO tras deploy prod**:
1. Login como admin en `https://www.pawnecta.com`.
2. DevTools → Network → Request blocking → pattern: `*.supabase.co/rest/v1/proveedores*`.
3. **Prueba 1 — subruta**: address bar → `/admin/servicios`.
4. Verificar estado UI (título "No pudimos verificar tu acceso" + sublínea + botón Reintentar).
5. **Prueba 2 — hub**: address bar → `/admin`.
6. Verificar mismo estado UI (idéntico — el gate es el mismo componente).
7. Sentry dashboard → Issues → filtro `environment:production` + búsqueda `roleguard_verify_failed`:
   - **Deben aparecer 2 eventos** level=warning con tags `subsystem=roleguard`, `requiredRole=admin`, `errorCode=<código real>`.
   - Uno con `route=/admin/servicios`, otro con `route=/admin`.
   - **Extra debe contener** en ambos: `errorMessage`, `errorDetails`, `errorHint`.
8. Click "Reintentar" con bloqueo activo en cualquiera → **debe aparecer un 3° evento** con los mismos tags de esa ruta. Confirma que retry re-invoca en prod.
9. **Prueba 3 — Case 4 login**: logout → `/login` con el mismo bloqueo activo → login como admin real con credenciales válidas → aterrizaje en `/explorar` (fallback seguro).
10. Sentry dashboard → filtro `environment:production` + búsqueda `login_role_lookup_failed`:
    - **Debe aparecer 1 evento** level=warning con tags `subsystem=login`, `route=/login`, `errorCode=<código real o 'unknown' si fallo de red puro>`.
    - **Extra debe contener** `errorMessage`. Cross-referenciar con `errorMessage` cuando `errorCode=unknown` para distinguir fallo de red (`"TypeError: Failed to fetch"`) de otros errores sin código (ver §7.4).

Resultado del checklist: pendiente PO.

## 7. Caso 4 — `pages/login.tsx:132` (destino /explorar seguro cuando falla role lookup)

**SHA**: `5da5289`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO).

### 7.1 Bug antes del fix

Post-login exitoso el cliente hacía query a `proveedores` para decidir `/proveedor` vs `/explorar`. Destructuraba solo `{ data: provData }` — ignoraba `.error`. Fallo de red → `provData` null (indistinguible de "tutor legítimo sin fila") → cae al `else` → `/explorar`. Proveedor real con drop de red aterriza en `/explorar` en vez de `/proveedor`. Fricción menor observable (puede navegar manual desde el link del header), pero silente — cero señal de que la query falló.

### 7.2 Fix mínimo — cero cambio de UI, cero cambio de destinos

Decisión previa del PO: `/explorar` es el destino seguro cuando no se sabe el rol; solo detectar el error, log Sentry, seguir el redirect actual. Cero riesgo de expulsar a tutores a un panel que no les corresponde.

- Destructurar `{ data: provData, error: provError }`.
- Si `provError` truthy: `console.warn` (convención del proyecto, ver `admin.tsx:60`, `admin.tsx:85`) + `Sentry.captureMessage('login_role_lookup_failed', ...)` con tags `subsystem=login`, `route`, `errorCode`.
- **Sin cambio en el redirect**: con `provError` truthy, `provData` es null → cae al `else` → `/explorar` (comportamiento previo intacto, ahora documentado con comentario del porqué).

**Diff neto**: **+25 líneas** (+26 −1).

### 7.3 Smoke verde en preview 2026-09-08 (SHA `5da5289`)

Setup: bloqueo con pattern `https://jmtadvdkicyylcwjcmcl.supabase.co/rest/v1/proveedores*` activo ANTES del submit.

- **Control positivo (sin bloqueo)**: Aldo → `/proveedor`, Camila → `/explorar`.
- **Parte 1 con bloqueo, login Aldo**: aterriza en `/explorar` sin mensaje al user. En Network la query `proveedores?select=id,estado` del login queda en `(blocked)`. En Console con "Preserve log upon navigation" activo, aparece el `console.warn`:
  ```
  [login] role lookup failed: {message: 'TypeError: Failed to fetch',
   details: '...', hint: '', code: ''}
  ```
- **Recuperación**: con bloqueo apagado, el header resuelve el rol y ofrece "Panel de proveedor" (Aldo puede navegar manual sin más fricción).
- **Parte 2 sin bloqueo**: cero regresión en ninguno de los dos destinos.

### 7.4 Nota sobre `errorCode=unknown` en el evento Sentry

**Observación del PO durante el smoke**: en fallos de red puros (browser bloquea el request), el `PostgrestError.code` viene vacío string (`code: ''`), no un código PostgREST (que sería tipo `PGRST116`, `42501`, etc.). El helper `provError.code || 'unknown'` toma el fallback → tag `errorCode=unknown` en Sentry.

**Es el escenario esperado, no defecto del fix**: los códigos PostgREST solo aparecen cuando la request llega al backend y la BD responde con un error semántico. Cuando el request nunca sale (bloqueo devtools, offline, DNS drop), el SDK devuelve el TypeError como PostgrestError con `code: ''`. Sentry sigue capturando el evento con toda la info útil en `extra.errorMessage` (`"TypeError: Failed to fetch"`) — solo el tag `errorCode` queda genérico.

**Implicación operativa para diagnósticos futuros**: cuando se ve `errorCode=unknown` en el dashboard filtrando por `login_role_lookup_failed`, cross-referenciar con `extra.errorMessage` para distinguir "fallo de red del cliente" (`TypeError: Failed to fetch`) de otros errores sin código (`AbortError` de fetch cancelado, etc.).

## 8. Caso 5 líneas 40+51 — `fetchClientProfile` en `ClientLayout.tsx`

**SHA**: `da06fbc`. **Aterrizado en `main`**: 2026-09-08 (post-smoke verde del PO).

### 8.1 Bug antes del fix

Las 2 queries de `fetchClientProfile` (usuarios_buscadores + proveedores) destructuraban solo `{ data }`. Fallo de red en cualquiera → `data:null` (indistinguible de "no hay fila"). Fallthrough silente al final del flujo con `clientProfile` en null.

**Consecuencias visibles al tutor**:
- Avatar mobile: icono genérico gris `<User />` (como si no tuviera foto).
- **Badge "Usuario Verificado" (línea 187 previa)**: texto FIJO renderizado igual → **afirmación falsa** (se mostraba aunque no cargamos ningún dato del perfil).
- Children (mascotas, etc.): rendering aparte con sus propios fetches.
- Cero indicador de que el perfil no se cargó. Degradación silente.

### 8.2 Fix — banner no bloqueante + Sentry + badge condicionado

Diseño aprobado por PO con un ajuste obligatorio del último round: eliminar la afirmación falsa del badge condicionándolo a `clientProfile !== null`.

- Destructurar `{ data, error }` en ambas queries.
- Si ANY `.error`: `console.warn` (convención del proyecto) + `Sentry.captureMessage('profile_fetch_failed', ...)` con tags `subsystem=client_layout`, `route`, `table`, `errorCode` + extra `errorMessage/Details/Hint` + `setProfileError` + return early (no proceder a la siguiente query).
- 2 nuevos states: `profileError` + `retryTrigger`.
- Nuevo `useEffect` deps `[userId, retryTrigger]` — retry incrementa `retryTrigger` → re-fetch corre en próximo tick.
- `handleRetryProfile`: `setProfileError(null) + setRetryTrigger(prev + 1)`.
- **Banner** en el header del layout cuando `profileError` truthy:
  - Título: **"No pudimos cargar tu perfil"**
  - Sublínea: **"Revisa tu conexión y vuelve a intentar."**
  - Botón: **"Reintentar"** (verde accent, mismo estilo que RoleGuard).
  - **NO bloquea children** — el layout es chrome, no gate. El user puede tener trabajo pendiente en la página.
- **Badge "Usuario Verificado"** condicionado a `clientProfile && (...)`. Copy y estilo intactos, solo cambia la condición de render. Con `profileError` o con perfil aún cargando → badge NO aparece (no afirmar sin verificar).

**Diff neto**: **+101 líneas** (+108 −7).

### 8.3 Control negativo "sin perfil legítimo" — no verificado en runtime

Ambas queries succeed sin data → comportamiento previo preservado: `clientProfile` queda null, `profileError` NO se dispara, banner NO aparece. **Verificado por lectura del diff**, NO ejercitado en runtime — escenario edge difícil de construir (requiere `auth_user_id` sin fila en ninguna de las 2 tablas). Documentado explícito en el commit y en el comentario in-code.

### 8.4 Smoke verde en preview 2026-09-08 (SHA `da06fbc`)

Setup: viewport mobile, Camila logueada, `/usuario/mascotas`, bloqueo pattern `https://jmtadvdkicyylcwjcmcl.supabase.co/rest/v1/usuarios_buscadores*`.

| Escenario | Banner | Badge "Usuario Verificado" | Children |
|---|---|---|---|
| Control positivo (sin bloqueo) | ausente | **presente** | lista mascotas normal |
| Gesto 1 con bloqueo | presente | **AUSENTE** | siguen renderando |
| Gesto 2 Reintentar con bloqueo | presente | ausente | idem |
| Gesto 3 bloqueo apagado + Reintentar | desaparece | **aparece** | idem |
| Parte 2 (regresión check) | ausente | presente | sin destello del banner al mount |

Console evidencia: `console.warn "[client_layout] fetch usuarios_buscadores failed: {message: 'TypeError: Failed to fetch', code: ''}"`. Traza desde `hydrateRoot` en gesto 1 (mount) y desde el handler de click en gestos 2 (retry). Requests bloqueados suman `3 → 5 → 6` entre gesto 1 y 2 — retry re-ejecuta la query.

---

## 9. Cierre del sprint — resumen final

### 9.1 Cifras finales

**Universo real**: **68 llamadas** que destructuran respuestas de supabase-js ignorando `.error`, en **34 archivos**. Cifra corregida de la Ronda 1 (26 en 12) que salió de un grep de universo estrecho (`components/*` + `pages/*.tsx` top-level, sin `pages/api/*` ni `lib/*` ni subrutas).

**44% del código** que destructura respuestas supabase-js ignora `.error` (68 sobre ~154 destructurings totales). No es excepción, es convención rota que este sprint empezó a corregir.

### 9.2 Casos Tipo A — los 6 completos

| Caso | Archivo:línea | SHA | Estado | Smoke |
|---|---|---|---|---|
| 5-L92 | `components/Client/ClientLayout.tsx:92` (handlePhotoUpload) | `f40f499` | ✅ prod | ✅ verde 2026-09-08 |
| 2 + 1 | `components/Shared/RoleGuard.tsx:39, 61` | `3aeb627` | ✅ prod | ✅ verde 2026-09-08 (Case 1 sin caller vivo — fix estructural por consistencia) |
| 3 | `pages/admin.tsx:103` (wrap RoleGuard, −168 líneas) | `c564728` | ✅ prod | ✅ verde 2026-09-08 |
| 4 | `pages/login.tsx:132` | `5da5289` | ✅ prod | ✅ verde 2026-09-08 |
| 5-perfil | `components/Client/ClientLayout.tsx:40, 51` (fetchClientProfile) + badge condicionado | `da06fbc` | ✅ prod | ✅ verde 2026-09-08 |
| 6 | `pages/api/auth/signup.ts:220` | — | ⏭ BACKLOG (server-side, no reproducible con smoke estándar) | — |

### 9.3 Lecciones P8 de esta ronda

Tres lecciones nuevas anotadas durante el sprint. Todas variantes del meta-patrón "una verificación corrió y el auditor la leyó como conclusión sin cross-check".

1. **Reporte de conteos**: cuando el auditor reporta un número (26 llamadas), debe decir **sobre qué universo se corrió**. "26 llamadas en components + pages top-level" ≠ "26 llamadas en el proyecto". Priorización con el número mal-atribuido subestima el ancho del problema.

2. **Negativo con grep de universo estrecho no descarta nada**. En la investigación de `/usuario → /explorar`, el auditor grepeó `router.push('/explorar')` solo dentro de `pages/usuario.tsx` y concluyó "no hay redirect". Realidad: redirect server-side en [next.config.js:206-210](next.config.js#L206-L210) (intencional desde commit `4d0f42d` de abril 2026). **Regla operativa**: cuando el auditor busca un efecto observado, enumerar las capas donde puede originarse (server config, middleware, vercel.json, contexts, hooks globales) ANTES del grep, y grepear cada una con su patrón específico. Si alguna capa no se cubrió, el negativo no vale como conclusión.

3. **`errorCode=unknown` en Sentry es esperado para fallos de red del cliente**. `PostgrestError.code` viene vacío string (`code: ''`) cuando el request nunca sale del browser (bloqueo devtools, offline, DNS drop). Los códigos PostgREST (`PGRST116`, `42501`, etc.) solo aparecen cuando la request llega al backend. **Implicación operativa**: al ver `errorCode=unknown` en dashboard, cross-referenciar con `extra.errorMessage` (`"TypeError: Failed to fetch"` vs otros) para distinguir tipos de fallo.

### 9.4 Casos NO cubiertos en este sprint

Ver `BACKLOG.md > Hallazgos colaterales del sprint error-audit`:

- **Caso 6** (Tipo A server-side, no reproducible).
- **Tipo B (~39 líneas)** — degradación de features user-facing (favoritos, dashboard, home landing, perfil público, notifs admin, etc.).
- **Tipo C (~5 líneas)** — SEO/landing/metrics con impacto bajo.
- **Tipo D (~16 líneas)** — server crons + auth.getSession + notify server-to-server. Silente sin superficie user.
- **5 destructurings en `e2e/**` tests** — excluidos del sprint por convención (tests son código de assertion, no de app).

Lista completa por archivo:línea en el BACKLOG para que el próximo sprint arranque sin re-auditar.

## 10. Checklist Sentry post-prod completo — pendiente PO

Ver §6 arriba (consolidado con los 3 eventos que este sprint agregó al proyecto):

- `roleguard_verify_failed` (rutas `/admin/*` incluida `/admin`).
- `login_role_lookup_failed` (ruta `/login`).
- `profile_fetch_failed` (rutas `/usuario`, `/usuario/mascotas`).

Todos level `warning`, filtro `environment:production` en el dashboard.

## 11. Metadata del tag

- **Tag anotado**: `error-audit-prod-20260908`
- **Apunta a**: `d645907` (commit `docs(error-audit): cierre del sprint — acta final + BACKLOG consolidado`).
- **Fecha del tag** (`git for-each-ref --format='%(creatordate:iso)' refs/tags/error-audit-prod-20260908`): **2026-09-08 13:52:35 -0300**.
- **Fecha del commit apuntado**: **2026-09-08 13:52:14 -0300**.

Fechas separadas por regla del proyecto — no usar `git log --format=%ci -1 <tag>` para timestamp de deploy: el tag anotado tiene su propia fecha (`creatordate`), distinta de la fecha del commit al que apunta.

## 12. Resultado del checklist Sentry post-prod

Corrido por PO 2026-09-08 en `https://www.pawnecta.com`.

### 12.1 Deploy prod Ready confirmado

`https://www.pawnecta.com/admin` renderea bajo RoleGuard, **sin form embebido** (post-Case 3 wrap). Confirma que el deploy de `ed34a69` está vivo en prod.

### 12.2 Reproducción verificada — `roleguard_verify_failed` en `/admin`

**Setup**: admin logueado, DevTools → Network → Request blocking sobre `https://ouezpeeiwjwawauidrqq.supabase.co/rest/v1/proveedores` (host de producción). Address bar → `/admin`.

**Flujo observado**:
1. Estado UI: **"No pudimos verificar tu acceso"** con Reintentar (idéntico al preview).
2. **Un Reintentar** con bloqueo activo repite el estado.
3. Bloqueo apagado + Reintentar → hub carga normal.
4. Requests bloqueados totales: **4 → 7**.

**Evento capturado en Sentry** (proyecto `javascript-nextjs`, All Envs, 14D):
- Issue **`roleguard_verify_failed`** (`JAVASCRIPT-NEXTJS-4`).
- Route: `/admin`.
- **2 eventos** en la ventana (mount + retry).
- Estado: **New**, hace ~3 min a las ~14:0x -03.
- Confirma: (a) el gate `enabled: NEXT_PUBLIC_VERCEL_ENV === 'production'` deja pasar los eventos client-side, (b) los tags `subsystem/route/requiredRole/errorCode` llegan al dashboard.

### 12.3 Eventos NO reproducidos en prod (cobertos por el mismo gate + SDK)

- **`login_role_lookup_failed`** (Case 4): no reproducido en prod para no forzar logins repetidos con cuentas reales.
- **`profile_fetch_failed`** (Case 5-perfil): no reproducido en prod por no tener cuenta tutora de prueba en producción.

**Ambos se dan por cubiertos indirectamente**: comparten el mismo gate (`instrumentation-client.ts:30`), la misma librería (`@sentry/nextjs`), y el mismo path de captura (`Sentry.captureMessage` con tags/extra). Si `roleguard_verify_failed` llegó al dashboard con la config actual, los otros dos también llegarán cuando se disparen en producción real. Aceptado como equivalencia estructural — no se fuerza reproducción manual.

### 12.4 Colateral confirmado — `[UserContext] hydrate exhausted`

Issue **`JAVASCRIPT-NEXTJS-5`** (`[UserContext] hydrate exhausted`), route `/admin`, **1 evento** en la misma ventana del smoke.

Este es el mecanismo del sprint `role-degradation` reportando correctamente cuando la hidratación del context falla sostenidamente. Evidencia útil de que **ambos sistemas de recuperación loguean en paralelo**:

- `roleguard_verify_failed` (2 eventos) — desde el gate del RoleGuard, con Reintentar directo.
- `[UserContext] hydrate exhausted` (1 evento) — desde el retry chain del context.

Refuerza la entrada BACKLOG "Triple UI de recuperación" — hay 3 mecanismos independientes disparándose para el mismo tipo de fallo. Cada uno tiene su UI (banner, toast, estado del guard) y su Sentry log. La deuda del sprint de unificación queda mejor documentada con esta evidencia empírica.

---

## 13. Hotfix `admin-redirect` — RoleGuard preserva ruta de origen en /login

**Tag**: `error-audit-prod-20260908-hotfix`. **Apunta a**: `e71f571` (este mismo commit del acta). **Fecha del tag**: 2026-09-08 14:27:13 -0300. **SHA de código**: `7df7a1b` (fix del RoleGuard). **Aterrizado en `main`**: 2026-09-08 vía FF merge desde branch `admin-redirect`.

### 13.1 Regresión observada en prod (post-cierre error-audit)

PO observó tras el cierre del sprint: admin sin sesión entra a `www.pawnecta.com/admin` → RoleGuard lo manda a `/login` → tras autenticarse, `login.tsx` lo despacha por rol y, como la cuenta admin también es proveedor, aterriza en `/proveedor`. **Antes del sprint el form embebido del hub lo dejaba en `/admin`.** Con el wrap del Case 3 se perdió el destino de origen. Mismo problema en las 4 subrutas `/admin/*` que ya usaban RoleGuard desde antes.

### 13.2 Investigación pre-code (una línea)

`login.tsx` **ya honra** `?redirect=<path>` — [pages/login.tsx:51-52](pages/login.tsx#L51-L52) lee `router.query.redirect`, valida via `safeRedirectFromQuery` (`new URL()` con origen actual como base, rechaza open-redirect: URL debe resolverse al mismo origen, path debe empezar con `/` y NO con `//`, retorna solo `pathname+search+hash`), y en línea 129-130 `if (redirect) { window.location.replace(redirect); }` tiene **precedencia absoluta** sobre la decisión por rol.

Nombre del parámetro: **`redirect`**. Mecánica en el sitio desde el **finding [78] del Sweep #1**. El aviso contextual del banner (`getRedirectMessage` con copy "Ingresa para acceder al panel admin" para `/admin*`) también existe desde ese mismo sweep. Cero cambio a login.tsx en este hotfix — la infraestructura estaba, RoleGuard nunca la usó.

### 13.3 Fix

Los 4 sitios de RoleGuard que redirigen a `/login` ahora incluyen `?redirect=<router.asPath>` via object form del router API (auto-encode):

- Línea 41 (unauth): `router.replace({ pathname: '/login', query: { redirect: router.asPath } })`
- Línea 85 (proveedor sin fila): `router.push` idem
- Línea 93 (proveedor estado != aprobado): `router.push` idem
- Línea 128 (admin sin permiso): `router.push` idem

**Diff neto**: **+19 líneas** (+23 −4). Cero cambio a login.tsx.

### 13.4 Caveat conocido aceptado por PO

Loop edge: user autenticado sin el rol requerido (ej. Camila logueada visita `/admin/servicios`) → `/login?redirect=/admin/servicios` con sesión activa. Si **reenvía** credenciales de su rol tutor en el form (edge — típicamente navega en vez de re-submit), post-auth el redirect param gana → vuelve al gate → gate deniega → vuelve a `/login` → loop. El destino `/login` para no-autorizado con sesión activa está en BACKLOG entrada b (fix estructural separado: página `/403` o redirect a `/explorar` con toast). El redirect param no agrava el problema de fondo, solo lo hereda cuando el user re-submitea. **Parte 4 del smoke no se ejercitó** — el loop queda documentado, no verificado en runtime.

### 13.5 Smoke verde en preview 2026-09-08 (SHA `7df7a1b`)

- **Parte 1**: sin sesión → `/admin` → **`/login?redirect=%2Fadmin`** con el aviso contextual **"Ingresa para acceder al panel admin"** → login Aldo → **aterriza en `/admin`** con el hub cargado.
- **Parte 2**: sin sesión → `/admin/servicios` → **`/login?redirect=%2Fadmin%2Fservicios`** → login Aldo → **aterriza en `/admin/servicios`**.
- **Parte 3 (control positivo, sin regresión)**: login directo en `/login` sin parámetro → Aldo → `/proveedor`, Camila → `/explorar`. Sin cambios en el comportamiento por-rol cuando no hay redirect.
- **Parte 4 (loop edge)**: no ejercitada por diseño — documentado en §13.4.

Preview URL: `https://pawnecta-landing-mvp-git-admin-redirect-petmatecls-projects.vercel.app` (branch rebaseada sobre main tras sección 12, SHA final del rebase).

### 13.6 Verificación en producción — pendiente PO

Smoke que PO va a correr en `https://www.pawnecta.com`: logout → `/admin` → login como admin real → aterrizar en `/admin` (no en `/proveedor`). Resultado se anexa acá cuando esté.

---

**SHAs de código aterrizados dentro de este tag** (todos ya en `main` en el orden de merge):

| SHA | Sprint / Case | Efecto |
|---|---|---|
| `f40f499` | error-audit Case 5-L92 | `handlePhotoUpload` verificar rol antes de upload (evita write con WHERE que no matchea + huérfanos en avatars). |
| `3aeb627` | error-audit Cases 2+1 | RoleGuard distinguir error de red vs no-autorizado; nuevo estado `'error'` + Reintentar + Sentry log. |
| `c564728` | error-audit Case 3 | Hub `/admin` wrap en `<RoleGuard requiredRole="admin">`. Elimina auth inline duplicada, −168 líneas. |
| `5da5289` | error-audit Case 4 | `login.tsx` role lookup destructura `.error` + Sentry log; `/explorar` como fallback seguro documentado. |
| `da06fbc` | error-audit Case 5-perfil | `ClientLayout.fetchClientProfile` distingue error de red vs "sin perfil"; banner no bloqueante + badge "Usuario Verificado" condicionado a `clientProfile !== null`. |

---

**Estado del documento**: **CERRADO**. Sprint 100% ejecutado en producción, smoke verde por PO en las 5 rondas de casos Tipo A. Case 6 y clasificaciones B/C/D anotadas al BACKLOG con listado línea a línea para el próximo sprint.
