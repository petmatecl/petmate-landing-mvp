# Bloque J-4 — Kickoff (ampliado 2026-09-22 con ítems del sprint AUTH-MAIL-PHISH)

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
