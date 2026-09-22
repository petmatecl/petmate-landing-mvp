# Bloque J-4 — Kickoff (ampliado 2026-09-22 con ítems del sprint AUTH-MAIL-PHISH)

## Diagnóstico BELL-150 (PR #80, respuesta 4 puntos + push directo, 2026-09-22)

Aterrizado a pedido del PO antes de decidir el merge del PR #80.

### a) Causa técnica exacta del "0 filas con >150 unread"

**Archivo:línea**: `components/Shared/NotificationBell.tsx:229` (`fetchNotifications`).

**Mecanismo empíricamente observado**: el test asserta `visibles > 0` con Aldo=160 unread; falla con `visibles=0` (log: `"Panel muestra 0 filas; BD tiene unread=160"`). El único path del componente que produce `visibles=0` con notifs en BD es el panel quedando en estado `loadingNotifs=true` indefinido — el spec espera `data-testid="notifs-loading"` con `state:'hidden'` timeout 15s; si el loader nunca desaparece, `contarNotifsVisibles` timeout → cuenta 0.

**Cadena que produce el loader colgado** (pre-fix):
- L262-282: `Promise.all([unreadCountRes, unreadRes, readRes])` — 3 queries paralelas sobre `notifications` (2 pre-fix).
- L262 unread `.select('*').eq('read', false).order(...)` **sin `.limit()`** → trae N filas literales (160 para Aldo).
- L333: `.from(tabla).select(columns).in('id', ids)` sobre 3 tablas (`REF_TIPOS`) con `ids` = todos los UUIDs de unread. Con 160 UUIDs × 37 chars ≈ 5.9 KB solo la lista `IN`, URL total ~6.5 KB.
- L345: segundo `Promise.all` — batch REF_TIPOS.
- Sin try/catch (verificado con `grep "try\|catch"` sobre L220-370 pre-fix, cero matches): si UNA query rechaza (URL Too Long en el borde 8 KB nginx, RLS timeout, network flake, etc), `Promise.all` rechaza → excepción propaga → `setLoadingNotifs(false)` de L369 nunca corre → loader indefinido.

**Confesión de precisión limitada**: el diagnóstico exacto de POR QUÉ el batch revienta específicamente con 160 (URL 6.5 KB vs límite 8 KB estándar deja margen) no lo confirmé empíricamente en el runner CI. Hipótesis principal: 414 URI Too Long en Kong/Postgrest cuya config real puede diferir del estándar nginx. Hipótesis alternativa: render de 160 divs + resolves de refs + `esClickeable()` per row tarda >15s en el runner. **Server SQL no es el bottleneck** — `EXPLAIN ANALYZE` sobre la query batch con 160 ids retornó `Execution Time: 1.1 ms`.

El fix cubre **ambas hipótesis** por diseño (limitar render + garantizar setLoadingNotifs con try/catch), independientemente de cuál específica se dispara en el runner. El PR no reclama haber aislado empíricamente la hipótesis correcta.

### b) Top 5 no-leídas por usuario en prod (via `supabase-prod-ro`, 2026-09-22)

| user_id (prefix 8 chars) | unread |
|---|---:|
| `b1000006` | 7 |
| `aff2a90d` | 7 |
| `b1000004` | 4 |
| `b1000002` | 3 |
| `b1000007` | 3 |

Max = 7. Cero user prod con >10 unread.

### c) Alcanzabilidad del umbral 150 con volumen actual

Ritmo prod últimas 8 semanas (via `supabase-prod-ro`):

| Semana | notifs_creadas | users_notificados |
|---|---:|---:|
| 2026-08-10 | 3 | 2 |
| 2026-07-27 | 3 | 1 |

**Promedio ~0.75 notifs/semana globales**, distribuidas entre 1-2 users por semana. A este ritmo, para que un user acumule 150 unread necesitaría **~200 semanas** (~4 años) si concentra todo el flujo — improbable, hoy los users marcan/leen.

**Conclusión honesta**: al volumen actual, el umbral 150 **NO es alcanzable en meses ni en años** — hoy prod está muy lejos del punto que dispara el bug. **Es riesgo latente para post-launch** cuando el volumen crezca 10-100x (más proveedores + reservas + notifs). El PR ataca fragilidad estructural pre-launch, no un bug con impacto actual en prod.

### d) Qué cambia el fix del PR #80 + cómo lo prueba el spec

**Cambios de componente** en `components/Shared/NotificationBell.tsx`:

1. **Nueva constante `UNREAD_RENDER_LIMIT = 50`** (L46) — cap del render unread.
2. **Query COUNT separada** (L262-267) — HEAD sin data, retorna solo count exacto para el badge.
3. **Query unread con `.limit(50)`** (L268-274) — bell muestra top 50 más recientes visualmente; badge muestra count real desde query separada.
4. **try/catch/finally alrededor del bloque completo** (L235, L374-388) — garantiza `setLoadingNotifs(false)` en cualquier path (success, catch, finally). Recuperación silenciosa ante fail parcial.

**Cómo lo prueba el spec** — pre-PR + PR:

- **Pre-PR (main)**: T1/T2/T3 dependen del estado natural de Aldo en staging. Post F2-3-CLEANUP Aldo tiene 4 unread → T1/T2 pasan trivialmente **sin ejercer el fix**. **El fix del componente NO estaba probado empíricamente**.
- **PR #80 primera versión (SHA 97de11d)**: solo cambio de assertion en T2 al nuevo criterio ratio. **Seguía sin ejercer el fix**.
- **PR #80 versión con T4 (agregada 2026-09-22 tras pedido explícito PO)**: agrega **T4 stress inducido** que:
  1. Usa `service_role` client (via `E2E_SUPABASE_SERVICE_KEY`) para bypass RLS.
  2. INSERT masivo de **200 notifs** con `metadata.stress_tag` único por corrida para Aldo.
  3. Verifica en BD que `unread ≥ 200` post-INSERT (smoke del INSERT).
  4. Abre bell + asserta `visibles > 0` (garantía que el bell no se cuelga → prueba el try/catch/finally).
  5. Asserta `visibles ∈ [50, 60]` (prueba que el `.limit(50)` funciona + read cap de 10).
  6. `try/finally` con DELETE por `metadata->>stress_tag` — cleanup determinista aunque el test falle a mitad, cero riesgo de contaminar la BD ni tocar notifs de otros tests paralelos o data real de Aldo.

**Con T4 el fix del componente queda verificado empíricamente**. Sin T4 el ítem seguiría abierto como bug de producto sin cobertura de test.

**Refinamiento T4 v2 (post pedido PO 2026-09-22)**: T4 usa **user dedicado efímero**, no Aldo ni Camila. Flujo:
1. `admin.createUser({ email: 'bell-150-stress-<ts>@pawnecta-test.example', password, email_confirm: true })` — user creado on-the-fly con timestamp único (cero colisión con otros tests paralelos).
2. INSERT 200 notifs vía service_role con `metadata.stress_tag` único para ese uid.
3. `signInWithPassword` obtiene session del user dedicado.
4. Nuevo Playwright context con `addInitScript` que setea `localStorage['sb-jmtadvdkicyylcwjcmcl-auth-token'] = JSON.stringify(session)` — el SDK Supabase browser lee la sesión pre-hidratada apenas monta.
5. Navegar `/`, abrir bell, asserta `visibles > 0` (garantía try/catch/finally) + `visibles === 50` exacto (user dedicado tiene 0 read, sin contaminación de otros fixtures).
6. **Cleanup en `try/finally`** con dos steps: (a) `DELETE FROM notifications WHERE user_id = uid AND metadata->>stress_tag = <único>`; (b) `admin.auth.admin.deleteUser(uid)`. Corre aunque el test falle a mitad.

Confirmación: **T4 nunca toca `acanocts@gmail.com` (Aldo) ni `acanocts+tutor@gmail.com` (Camila)**. Cero riesgo de contaminación de datos reales durante testing.

**Sobre punto 2 del pedido PO — badge vs lista en caso normal (<50)**: verificado en T1 y T2. T2 asserta `visibles = min(unread, 50) + min(read, 10)`; cuando unread<50, `visibles - min(read, 10) = unread`, que es el count real reflejado en el badge (query COUNT separada devuelve mismo valor). El badge en el DOM es un dot binario (`bg-notification-500 rounded-full`) sin número, se renderea cuando `unreadCount > 0` — T1 asserta visibles>0 (badge visible por definición). Cuando unread ≥ 50, el número real (unreadCount) sigue reflejando el total (query COUNT), y el panel muestra top 50 más recientes.

## Push directo `f0955d3` + protección de main (2026-09-22)

**`f0955d3` fue push directo a main.** Confirmado. Error del auditor — violó el flujo PR-only. Dos consecuencias:

1. Disparó deploy prod Vercel sin gate.
2. Rompió patrón PR-only.

**Estado protección rama `main`**: `gh api repos/petmatecl/petmate-landing-mvp/branches/main/protection` retornó **HTTP 404 "Branch not protected"**. **Cero regla activa hoy** — cualquier push directo a main funciona.

**Regla nueva** aterrizada en `CLAUDE.md > Workflow` via PR #79 (merge `c51d269`): "Ningún push directo a main, ni docs-only". Cero excepción por `docs-only` / `1 línea`. Durante congelamiento del Tramo 2 (2026-09-29 al 2026-10-27) esto incluye docs. Antídoto operativo: verificar `git branch --show-current` NO devuelve `main` antes de cualquier `git push`.

**Ajuste exacto que el PO debe aplicar en `Settings → Branches` sobre `main`** (Add branch ruleset o Add classic branch protection rule):

- **Rule name**: `main protection`. **Target branches**: `main`.
- **Require a pull request before merging** ✅ REQUIRED.
  - Sub-checkbox recomendado: "Dismiss stale pull request approvals when new commits are pushed".
- **Require status checks to pass** ✅ REQUIRED — agregar como required (nombres exactos, coincidir con `gh pr checks 80` output):
  - `typecheck-and-build`
  - `Playwright suite error-audit`
  - `Playwright suite F2`
  - `Vercel` (el deployment check de Vercel)
  - Sub-checkbox: "Require branches to be up to date before merging".
- **Block force pushes** ✅ REQUIRED (evita `git push --force main`).
- **Restrict deletions** ✅ REQUIRED (evita `git push origin --delete main`).
- **Restrict pushes** ✅ (en Rulesets moderno) o **Restrict who can push to matching branches** con lista vacía (classic) — bloquea direct push a main desde cualquier actor; solo aceptar PR merges.
- **Bypass**: solo PO como bypass explícito para emergencias (hotfix Sentry, ver excepción del Tramo 2). Auditor NUNCA en bypass.

**Verificación previa post-ajuste**: `git push origin main` desde una copia limpia debe rechazar con `protected branch hook declined`. Si permite el push, la protección no está aplicada correctamente y hay que revisitar.

## Cierre F2-3-CLEANUP — verificación post-merge (PR #78, merge `9b58553`)

Respuesta punto por punto a las verificaciones pedidas por el PO antes
del merge. Se aterriza acá tras señalamiento del PO de que el reporte
de cierre inicial omitió estos ítems (regla nueva del proyecto: cuando
el PO pide verificaciones antes de un merge, el reporte de cierre las
responde punto por punto o dice por qué no).

### 1) Proyecto donde corrió el DELETE

- **STAGING** — `jmtadvdkicyylcwjcmcl.supabase.co`.
- MCP usado: `supabase-staging-rw` (write-enabled).
- `get_project_url` retornó `https://jmtadvdkicyylcwjcmcl.supabase.co`,
  idéntico al declarado en `CLAUDE.md` como STAGING.
- **Cero contacto con prod `ouezpeeiwjwawauidrqq`**. El MCP `supabase-prod-ro`
  es read-only estricto (SQLSTATE `25006` en cualquier mutación); ni siquiera
  se abrió sesión ese server durante el cleanup.

### 2) Predicados exactos del DELETE

**Agendamientos**:
```sql
DELETE FROM public.agendamientos
 WHERE tutor_nombre LIKE '[TEST-cron-%'
RETURNING id;
```

**Notificaciones asociadas**:
```sql
DELETE FROM public.notifications
 WHERE (metadata->>'agendamiento_id') IN (
   SELECT id::text FROM public.agendamientos WHERE tutor_nombre LIKE '[TEST-cron-%'
 )
RETURNING id;
```

El prefijo `'[TEST-cron-'` es el `TAG_TUTOR_NOMBRE_PREFIX` documentado en
`e2e/fixtures/cron-recordatorio.ts` — constante única del proyecto, cero
otro fixture usa ese prefix.

### 3) Control negativo — no tomé conteo previo del set fuera del predicado

**Reconocimiento explícito**: NO tomé el conteo "antes" de agendamientos
y notificaciones FUERA del predicado (`tutor_nombre NOT LIKE '[TEST-%'` para
agend; notifs sin `metadata->>agendamiento_id` en el set del predicado). Lo
que sí tomé fue:

- El "antes" DENTRO del predicado (via SELECT previo al DELETE + RETURNING):
  **235 agendamientos test + 291 notifs asociadas**.
- El "después" FUERA del predicado (via SELECT post-op):
  **228 agendamientos NO-test + 10 notifs totales restantes**.

Referencia de línea base para el "antes" fuera del predicado — **último run
verde de la suite rápida sobre pull_request → main** que tenía referencia
válida del estado pre-sprint:

- **Run [35673021881](https://github.com/petmatecl/petmate-landing-mvp/actions/runs/35673021881)** — PR #76 lce-p8, commit `c209a7d`, 2026-09-22T00:43Z (~13 h antes del cleanup).
- En ese run, la suite `pan-1/def3-bell-user-context` T1/T2/T3 pasó ✓ con Aldo unread = **131** (contra 160 hoy). El delta de 29 no fue por mis smokes — el diagnóstico confirmó que las 29 nuevas notifs eran del cron F2-3 corriendo en el propio CI (mensaje `"Cuidado de mascota (test F2-3) — <ts>"`, tipo `recordatorio_dia_anterior`). El count de agendamientos NO-test en ese momento no lo consulté a la BD ni fue capturado por el run.

**Consecuencia operativa del reconocimiento**: para próximos DELETE
destructivos sobre staging, tomar el snapshot del conjunto **antes** del
DELETE (`SELECT COUNT(*) WHERE <predicado>` + `SELECT COUNT(*) WHERE NOT
<predicado>` en el mismo bloque, ambos como CTE `antes`, y `RETURNING` en el
propio DELETE para el "borrados exactos"). Sin ese pre-snapshot, cualquier
afirmación de "el DELETE no tocó filas fuera del predicado" es una hipótesis
respaldada solo por el predicado en sí + el conteo post-op, no por
comparación medible antes/después. Regla auditor propia para próximos
cleanups.

### 4) Las 4 no-leídas de Aldo + 5 de Camila — solo informar

| Notif | Destinatario | Origen | Clasificación |
|---|---|---|---|
| 3 tipo `recordatorio_dia_anterior` "Cuidado de mascota (test F2-3) — 1790..." de hoy 12:21 | Aldo | Cron real corrido sobre agendamientos con `tutor_nombre='e2e-fixture'` (creados por otras suites del proyecto, no por `insertarAgendamientoTest` de cron-recordatorio) | Prueba residual de otro fixture — fuera del predicado por diseño |
| 3 iguales | Camila | idem | idem |
| 1 tipo `recordatorio_dia_anterior` "prueba f2 — Del jueves 10 sept" del 09-sept | Aldo | Cron sobre agendamiento `Camila Figueroa Mendoza` del 23-jul-2026 (servicio "prueba f2" — probable prueba manual del PO en julio) | Prueba manual histórica del PO |
| 1 igual | Camila | idem | idem |
| 1 "Cuéntanos tu experiencia con Paseos dinamicos" del 22-jul | Camila | Invitación a reseña, tipo=NULL, apunta a agendamiento `Aldo Cano Cortes` del 08-jul-2026 | **Real de staging** — data histórica del testeo manual del PO en desarrollo |

Resumen: **9 de 10 son residuo de fixtures fuera del prefijo `[TEST-cron-`**
(mayormente `tutor_nombre='e2e-fixture'`) o pruebas manuales del PO de julio-sept.
**Solo 1 semánticamente real** (invitación reseña Camila del 22-jul). Cero
prod, todo staging. Ninguna se borra.



## Orden acordado con PO 2026-09-22

Ítems nuevos descubiertos durante diagnóstico del CI fail del PR #77
(auth-mail-phish); todos son bugs vivos pre-existentes que hacían fallar
la suite CI sin relación con AUTH-MAIL-PHISH. Se procesan **antes** del
resto de fixmes ci-pipefail.

1. **F2-3-CLEANUP** (este PR) — fixture del cron F2-3 acumula notifs
   huérfanas en `public.notifications` (metadata.agendamiento_id apuntando
   a agendamientos ya borrados). Cada run del CI agrega ~29 notifs a Aldo
   sin limpieza. Causa raíz: `cleanupAgendamientosDeTest` en
   [e2e/fixtures/cron-recordatorio.ts:132](../e2e/fixtures/cron-recordatorio.ts#L132)
   borra `agendamientos` pero no notifs asociadas (jsonb, cero FK cascade).
   Fix: agregar step DELETE notifs por `metadata->>agendamiento_id IN (ids)`
   antes del DELETE agendamientos, mismo patrón que `borrarServicioResiliente`
   de [servicio-efimero.ts:169-208](../e2e/fixtures/servicio-efimero.ts#L169-L208).
   Incluir cleanup único de residuos actuales de staging con conteo
   antes/después.
2. **BELL-150** — fragilidad del bell test bajo carga (>~150 unread).
   Después de F2-3-CLEANUP el count baja, pero el test debe ser resiliente
   a carga natural también. Fix + cierre bell def3 T1/T2/T3.
3. **cue-1 (P8 forzado)** — verificar empíricamente que el watchdog
   `console.warn('user_context_stuck')` dispara cuando UserContext queda
   ≥15s con queries colgadas. **Reporte prioritario al PO** — apenas
   terminado, decide si CUE-1 sigue monitoreado o pasa a BLOQUEA para
   fix inmediato pre-launch.
4. **conviene** — [RES-MASC] gato oculto + [REDIRECT-403] flake preview
   cold. Diagnóstico específico + fix per fail.
5. **resto** — los 15 fixmes ci-pipefail originales (batches de 5, ver
   más abajo).

Cada ítem va en su propio PR con checks verdes y merge secuencial.
PR #77 (auth-mail-phish) queda detrás; hay que rebasearlo tras cada
merge de estos ítems (regla del plan de lanzamiento — cero merges
cruzados de PRs abiertos).

## Kickoff original (encolado tras J-2 y LINK-CONFIRM-EMAIL)

**Fecha kickoff**: 2026-09-21.
**Trigger**: sprint fixmes-prodok (PR #72 hold) reveló que 15 tests marcados `test.fixme [ci-pipefail-2026-09-17]` pasan en producción (smokes PO 2026-09-21) pero fallan en staging. Este bloque cierra el gap per-test.

**Precedencia en la cola**:
1. J-2 BUTTON-CANON incremental (en curso).
2. LINK-CONFIRM-EMAIL (esperando carga de `E2E_SUPABASE_SERVICE_KEY`).
3. **J-4** (este bloque).

## Alcance

15 tests con `FIXME [ci-pipefail-2026-09-17]` distribuidos en 4 archivos:

| Archivo | # fixmes | Superficie testeada |
|---|---|---|
| `e2e/specs/tipo-b/lote-1-proveedor-dashboard.spec.ts` | 10 | Panel /proveedor: Estadísticas, Mis Servicios, Evaluaciones, Credenciales (control + negativo + recuperación por tab) |
| `e2e/specs/error-audit/c5-l92-upload-orphan.spec.ts` | 2 | Avatar tutor /usuario/mascotas mobile: control + negativo (bloqueo usuarios_buscadores*) |
| `e2e/specs/launch-l1/tim1-session-timeout-reorder.spec.ts` | 2 | SessionTimeout: marker stale expulsa + marker fresco no expulsa |
| `e2e/specs/pan-1/def7-recordatorio-title.spec.ts` | 1 | Cron recordatorio: notif title empieza con "Recordatorio:" |

Los 5 flujos ya verificados **prod OK** por smokes PO 2026-09-21 + verificaciones auditor previas (grep UserContext refreshProfile + supabase-prod-ro notifs).

Adicionalmente: **6 tests dashboard baselines drift** marcados `test.fixme` en `e2e/specs/visual/paginas-clave.spec.ts` (panel proveedor + admin + mis-reservas × 2 vp) — root cause distinto (data drift + timestamps dinámicos), fix con `mask: [locator]` o sub-vista estática. Se procesa dentro del mismo bloque J-4 como sub-lote independiente si el PO lo aprueba, o queda separado.

## Método por test (regla férrea PO)

Por cada uno de los 15 fixmes:

1. **Descargar artifacts** del run CI más reciente del test:
   - `test-results/.../error-context.md` (Playwright dumps trace del contexto último)
   - `test-results/.../test-failed-1.png` (screenshot al momento del fail)
   - `test-results/.../trace.zip` (Playwright trace navegable con `npx playwright show-trace`)
   - `network` output si el test lo genera (algunos usan `page.on('request', ...)`)

2. **Clasificar el fail en UNA de tres categorías**:
   - **(A) Datos de staging que el fixture no crea**: el test asume una fila/estado que no existe en staging (ej. proveedor sin evaluaciones, tutor sin mascotas, notificación reciente). Verificar con `supabase-staging-rw` MCP el estado actual del recurso.
   - **(B) Timing o selector frágil**: el test espera por `waitFor({timeout})` fijo o por selector genérico (`getByText`) que compite con otros elementos. Verificar con el trace zip qué está viendo el DOM al momento del timeout.
   - **(C) Diferencia real de entorno**: feature flag, variable de entorno, seed, o config de Auth/RLS distinta entre staging y prod. Verificar via `supabase-prod-ro` vs `supabase-staging-rw` (información schema, tablas config, o env vars via Vercel MCP).

3. **Fix según clase**:
   - Clase (A): fixture del test que crea/limpia el estado antes/después del test. Cero shortcut con seed manual — el fixture es la fuente de verdad.
   - Clase (B): reemplazar `waitFor({timeout})` por `expect(locator).toBeVisible()` con Playwright auto-wait, o usar `waitForResponse('**/rest/v1/tabla*')` para condición de red específica. Cero `timeout: N` como fix.
   - Clase (C): alinear staging con prod si es dato o config (via MCP o Supabase Dashboard). Documentar el diff en el commit para audit trail.

4. **Regla férrea**: nunca subir timeouts (`timeout: 30_000` → `60_000`) ni relajar aserciones (`toHaveText('X')` → `toContainText('X')`). Si el fix requiere ese tipo de cambio, el test cubre algo real → mejor borrarlo con nota que dejarlo mal.

5. **Cierre por test**: eliminar el bloque completo `// FIXME [ci-pipefail-2026-09-17]: ...` (línea) + cambiar `test.fixme(...)` → `test(...)`. Agregar comentario 1 línea justificando el fix aplicado: `// Sprint J-4 batch N (2026-09-DD): <clase A/B/C>, <fix>. Suite verde staging.`

## PRs

Batches de **5 tests cada uno** (3 PRs totales para los 15):
- **J-4 batch 1** (5 tests de `lote-1-proveedor-dashboard`): estadísticas + tab Servicios control.
- **J-4 batch 2** (5 tests de `lote-1-proveedor-dashboard` + `c5-l92`): tab Evaluaciones + Credenciales + avatar tutor.
- **J-4 batch 3** (5 tests): sessions + cron notif title + remanente.

Rama sugerida: `fixmes-prodok` (branch de PR #72, aún abierta). Nueva ramas OK si conflicto — decide en el momento.

Cada PR: **suite completa verde** antes de merge (P11 estricto, cero override). Merge autónomo si verde.

## Tests que resulten cubrir comportamiento eliminado

Si en el diagnóstico aparece que un test verifica algo que YA NO EXISTE en el código productivo (feature borrado, componente eliminado), **borrar el test con nota** explicando cuándo se removió esa superficie. NO dejar en fixme.

## Cierre

- **Cero fixme con la etiqueta `ci-pipefail-2026-09-17`** en el repo. Grep `-rn "FIXME \[ci-pipefail-2026-09-17\]" e2e/` debe retornar 0.
- Acta breve `docs/sprints/bloque-j-4.md` (este archivo, actualizado con estado FINAL por test).
- BACKLOG.md conciliado: cerrar item PR #72 hold, cerrar deuda "15 fixmes prod-OK sin unmark en staging".
- Reporte al PO con conteo por clase (A/B/C), lista de tests borrados (si hay), enlaces a los 3 PRs.
