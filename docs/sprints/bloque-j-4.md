# Bloque J-4 — Kickoff (encolado tras J-2 y LINK-CONFIRM-EMAIL)

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
