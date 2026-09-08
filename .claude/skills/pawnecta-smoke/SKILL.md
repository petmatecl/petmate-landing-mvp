---
name: pawnecta-smoke
description: Ejecutar smokes de UI en preview/staging con Playwright MCP contra Pawnecta. Control positivo obligatorio antes de cualquier negativo (P8). Zero acciones de escritura contra producción sin GO explícito del PO en el mismo mensaje.
---

# pawnecta-smoke

Skill para correr smokes de UI de Pawnecta usando los `mcp__playwright__browser_*` tools disponibles en la sesión. El auditor conduce el browser; el PO revisa la evidencia y ejecuta solo lo que toque datos reales en producción.

## Alcance y hosts

**Staging** (BD, auth, storage): proyecto Supabase `jmtadvdkicyylcwjcmcl.supabase.co`. La app de staging vive en el preview URL de la rama activa en Vercel — patrón `https://pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app`.

**Producción** (BD, auth, storage): proyecto Supabase `ouezpeeiwjwawauidrqq.supabase.co`. App en `https://www.pawnecta.com`.

Los smokes se corren **por default contra staging** (preview de rama). Contra producción solo con GO explícito del PO en el mismo mensaje, y solo para verificaciones read-only (navegación anónima, o bloqueo de red sin escritura). Ver "Regla dura de escrituras" abajo.

## Credenciales

**NUNCA** en el prompt del auditor ni embebidas en este skill. Se leen de archivos gitignoreados:

- `e2e/.env.test` (canónico) — mismo archivo que usa la suite Playwright existente.
- Fallback: `.env.local` si el smoke necesita algo que no está en `.env.test`.

Variables relevantes ya definidas en `e2e/.env.test`:

- `E2E_STAGING_EMAIL` / `E2E_STAGING_PASSWORD` — proveedor + admin (Aldo, `acanocts@gmail.com`).
- `E2E_STAGING_TUTOR_EMAIL` / `E2E_STAGING_TUTOR_PASSWORD` — tutora pura (Camila).
- `PLAYWRIGHT_BYPASS` — token de Vercel Deployment Protection cuando el preview lo requiere.

**En el reporte al PO nunca se citan los valores** — solo el nombre de la variable + el rol usado ("logueado como E2E_STAGING_TUTOR_EMAIL / rol tutor").

## Protocolo por caso

Cada smoke sigue las 3 fases en orden. Saltear cualquiera invalida el resultado.

### Fase 1 — Control positivo obligatorio (regla P8)

Antes de bloquear nada o forzar el caso negativo, correr el mismo gesto contra el estado normal del sistema para confirmar que el path funciona y que la assertion sabe qué buscar. Si el control positivo falla, el smoke se aborta y se reporta como setup roto — NO se pasa a la fase negativa.

Ejemplo: si el caso negativo es "modal de error con bloqueo de query X", el control positivo es "sin bloqueo, la query funciona y el modal de éxito aparece". Solo entonces se activa el bloqueo y se corre la fase negativa.

### Fase 2 — Simulación de fallo de red

Para forzar el caso negativo se usan las siguientes opciones, en orden de preferencia:

1. **Bloqueo por route abort desde Playwright** — la vía preferida por ser determinística. En un test escrito, `page.route('**/rest/v1/<tabla>*', r => r.abort())`. Desde el MCP `mcp__playwright__browser_evaluate` puede setear un `fetch` monkey-patch en `window` como fallback si no hay superficie directa de route.
2. **Request blocking de DevTools** — cuando el auditor no tiene un patrón exacto de URL, o cuando el smoke usa flujos que evaden el intercept de Playwright.
3. **Modificación de env / feature flag** — último recurso, solo si (1) y (2) no aplican; requiere GO explícito.

El patrón canónico de bloqueo es: `https://<staging-supabase-ref>.supabase.co/rest/v1/<tabla>*`. Contra prod, el patrón cambia el host a `ouezpeeiwjwawauidrqq.supabase.co` — pero rara vez se ejercita en prod (regla dura de escrituras).

### Fase 3 — Verificación del efecto observable (no del código)

Todo assert va sobre **efecto observable** (texto visible en pantalla, request presente/ausente en Network, fila en BD, archivo en bucket, evento en dashboard externo), **nunca sobre "el código llamó a X"**. Es P8: `mcp.captureMessage` retornando `sent:true` es señal del emisor, no evidencia de efecto.

Superficies aceptables por tipo de smoke:

- **UI**: texto en pantalla vía `mcp__playwright__browser_snapshot`, capturado en la fase con el estado esperado + estado inesperado. Screenshots vía `mcp__playwright__browser_take_screenshot` (fullPage cuando el estado escapa el viewport).
- **Network**: `mcp__playwright__browser_network_requests` con `filter: '<patrón>'` para verificar requests presentes/ausentes. Contar bloqueados si el smoke los ejerce.
- **Console**: `mcp__playwright__browser_console_messages` con `level: 'warning'` (nuestros `console.warn` de defensa) o `error` (rejections no atrapadas).
- **BD**: SQL vía `mcp__supabase-staging__execute_sql` (read-only sobre proyecto staging). Contra prod NUNCA — el MCP prod no existe en la sesión, y aunque existiera, aplica la regla dura.
- **Storage**: contar archivos en bucket con `SELECT count(*) FROM storage.objects WHERE bucket_id='<bucket>'` (via MCP staging).
- **Emails / Dashboards externos**: el auditor no puede leer buzón de Gmail ni dashboard de Resend. Verificar el efecto observable más cercano en el sistema propio (llamada HTTP a Resend en Network con status 200, fila en tabla de notificaciones si existe), y **derivar al PO la confirmación del buzón**.

**Antídoto P8 aplicado a este skill**: cuando el smoke reporta "cero X" (cero errors, cero requests, cero filas nuevas), la línea inmediatamente anterior del reporte debe reportar ">0 Y_conocido" con el mismo método — o el resultado negativo no vale como evidencia (puede ser fallo silente del método de verificación).

## Regla dura de escrituras contra producción

**Ninguna acción de escritura contra `www.pawnecta.com` o el proyecto Supabase prod (`ouezpeeiwjwawauidrqq`) sin GO explícito del PO en el mismo mensaje.**

"Escritura" incluye:
- Reservar servicios, cancelar, evaluar.
- Registrar cuentas nuevas.
- Subir fotos, mensajes, favoritos.
- Cualquier POST/PUT/PATCH/DELETE.
- Consumir cuota de Resend con emails prod.
- Consumir cuota de Sentry generando eventos prod.

Contra prod, por default, el skill hace solo:
- Navegación anónima (páginas públicas).
- Lecturas de UI sin login.
- Verificación de deploy Ready por URL (GET a la raíz).

"GO explícito del PO en el mismo mensaje" significa: el PO nombra la acción concreta + el destino + los parámetros específicos en el turno actual. Autorizaciones anteriores ("cuando lances el sprint, corre el smoke completo en prod") NO cuentan — el patrón es el mismo que rige commit+push: acción reversible sin ask, acción irreversible con confirmación del turno.

## Formato de reporte al PO

Cada smoke termina con este bloque, tal cual:

```
### Smoke: <nombre-corto>

Entorno: staging (preview <branch>) | producción
Rol: E2E_STAGING_EMAIL (Aldo, proveedor+admin) | E2E_STAGING_TUTOR_EMAIL (Camila, tutora) | anónimo
Ruta: /<path>
Fecha ejecución: <YYYY-MM-DD HH:MM tz>

| Parte | Esperado | Observado | Evidencia | Veredicto |
|---|---|---|---|---|
| Control positivo | <lo que debía pasar sin bloqueo> | <lo que pasó> | screenshot: `smoke-<nombre>-pos.png` · console: `<warn/log relevante>` · network: `<req filter>` | ✅ verde / ❌ rojo |
| Negativo | <lo que debía pasar con bloqueo/edge> | <lo que pasó> | screenshot: `smoke-<nombre>-neg.png` · console: `<warn>` · network: `<req blocked / present>` | ✅ verde / ❌ rojo |

Veredicto global: ✅ verde / ❌ rojo · <resumen 1 línea>
Deuda observada al pasar (si hay): <bullet corto>
```

Los screenshots se guardan en el scratchpad de la sesión con nombre `smoke-<nombre>-<fase>.png`. En el reporte al PO se citan por nombre — el PO los abre si quiere revisar el frame.

## Antipatrones a evitar

- Reportar "el código llamó a Sentry" como evidencia — es señal, no efecto. Ir al dashboard o al console log real.
- Saltear el control positivo porque "sé que el path funciona" — P8 10ª instancia (el mecanismo de verificación puede fallar mientras la operación verificada está bien).
- Citar credenciales en el reporte — nunca. Solo nombres de variable y roles.
- Ejercer escrituras en prod "porque ya lo hicimos antes" — cada acción irreversible es su propia decisión, requiere GO del turno.
- Cerrar un smoke como "verde" sin evidencia observable — el auditor firma solo lo que vio, no lo que "debería haber pasado según el código".

## MCPs requeridos

Este skill depende de MCPs cargados en la sesión. Sin ellos el skill NO puede operar — reportar al PO en vez de improvisar.

**Obligatorios**:
- `mcp__playwright__browser_*` — ~20 tools bajo este prefijo (navigate, click, type, snapshot, evaluate, wait_for, take_screenshot, network_requests, console_messages, close, etc.). El plugin Playwright de Anthropic-verified los inyecta al arranque de la sesión. Si `ToolSearch` retorna vacío para `select:mcp__playwright__browser_navigate`, el plugin no está cargado — parar y reportar.

**Recomendados** (dependen del smoke específico):
- `mcp__supabase-staging__execute_sql` — read-only sobre proyecto staging (`--read-only` flag). Necesario para queries de verificación (contar filas, cross-check con tabla, verificar bucket via storage.objects). Contra prod NO existe: el MCP prod no está configurado por diseño, coherente con la regla dura de escrituras.

**No usar en un smoke** (aunque estén disponibles):
- MCPs de escritura contra prod (si algún día se cargaran). La regla dura los excluye salvo GO explícito.
- Vercel MCP mutantes (redeploy, env vars). El skill valida behavior de una URL; no muta infra.

**Fallback cuando un MCP falta**:
- Playwright ausente: cero smoke posible desde este skill. Escalar al PO — puede levantar el plugin o correr él manual.
- Supabase MCP ausente: smokes que dependen de la BD (bucket count, contadores) degradan a "verificable solo con acceso separado". Reportar como parcial.

## Suite e2e Playwright

Complementaria a los smokes MCP: los mismos casos que este skill smokea manualmente están en `e2e/specs/error-audit/` (y otras subcarpetas por sprint) como tests automatizados. Cuando existe spec para el caso, el smoke MCP es innecesario — dejarlo para casos NUEVOS aún no automatizados o para verificaciones que la suite no cubre (ver "Cuándo sigue siendo necesario un smoke manual" abajo).

### Correr la suite local

Desde la raíz del repo:
```bash
# Suite completa (todos los projects, todos los sprints)
npm run test:e2e

# Sub-carpeta específica de un sprint (más rápido, focus del día)
npx playwright test e2e/specs/error-audit/ --reporter=list

# Un solo spec
npx playwright test e2e/specs/error-audit/c3-admin-hub.spec.ts --reporter=list

# Contra un preview URL específico (útil cuando staging branch está detrás
# del código a probar — ej. probar main con una rama nueva)
PLAYWRIGHT_BASE_URL="https://pawnecta-landing-mvp-git-<branch>-petmatecls-projects.vercel.app" \
  npx playwright test e2e/specs/error-audit/ --reporter=list
```

Requisitos locales:
- `e2e/.env.test` gitignoreado con `E2E_STAGING_*`, `E2E_STAGING_TUTOR_*`, `PLAYWRIGHT_BYPASS`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`.
- Browsers Playwright instalados (`npx playwright install chromium`).

Reporter útil para debugging:
```bash
# UI mode interactivo
npm run test:e2e:ui

# HTML report tras un run
npm run test:e2e:report
```

### Correr en CI + leer fallos con gh

CI corre bajo `.github/workflows/e2e-error-audit.yml` — triggers `pull_request` a main (con path filters) + `workflow_dispatch` manual. Compone `e2e/.env.test` desde 7 GH Secrets (mismos nombres que las variables locales).

**Cuando un check falla en un PR**:

```bash
# Estado general de los checks
gh pr checks <PR_number>

# Los últimos runs de la rama activa
gh run list --branch <branch> --limit 5

# Log del job fallado (más informativo que ver el UI de GH)
gh run view --log-failed --job <job_id>

# Descargar los artifacts (HTML report, screenshots, videos)
gh run download <run_id>
```

Los uploads del workflow:
- `playwright-report-<run_id>` — HTML report siempre.
- `playwright-test-results-<run_id>` — solo en fallo. Contiene `test-results/*/error-context.md` (mensaje + snapshot del DOM al fallar) + `test-failed-1.png` (screenshot) + `video.webm` + `trace.zip` (usable con `npx playwright show-trace <path>`).

Patrón canónico para diagnosticar un fail rápido:
1. `gh pr checks <n>` → identificar el `job_id` del rojo.
2. `gh run view --log-failed --job <job_id>` → leer los últimos ~40 logs del step que falló.
3. Si el mensaje pinta a red o env o compose (falla temprana, <30s), es setup del workflow — corregir el workflow o secrets. Si es dentro del test (falla tarde, >60s), es aserción real — descargar artifacts.
4. Si es aserción real: `gh run download <run_id> --name playwright-test-results-<run_id>` y leer `error-context.md`.

### Cuándo sigue siendo necesario un smoke manual (no reemplazable por spec)

Los tests automatizados cubren la mayoría de los casos determinísticos con datos de staging + browser. **Pero hay categorías donde el smoke manual con este skill sigue siendo el único camino honesto**:

1. **Escrituras contra producción real** — validar comportamiento con el proyecto Supabase prod (`ouezpeeiwjwawauidrqq`) requiere GO explícito del PO en el turno y datos reales. La suite e2e tiene guards anti-prod (`e2e/setup/guard.ts`) que rechazan cualquier baseURL con host de prod: correr contra prod requeriría comentar/borrar los guards, que es imposible por accidente. Todo test contra prod es smoke manual del PO, no test automatizado.

2. **Verificación de buzón real de email** — el auditor no tiene MCP de Gmail autenticado. Cuando un smoke necesita confirmar que un email llegó (asunto exacto, contenido, timestamp), el spec puede verificar hasta el borde del sistema (endpoint 200, log en Resend dashboard si hay MCP), pero **el buzón lo confirma el PO manualmente**. Es la split de responsabilidad del skill: auditor firma lo observable en el sistema propio, PO firma el efecto downstream.

3. **Criterio de producto subjetivo** — "¿la copy suena bien?", "¿el color contrasta lo suficiente?", "¿este flow es intuitivo?". Los specs verifican asserts binarios sobre texto/DOM/network; no juzgan calidad UX. Cualquier duda de producto va a smoke manual + decisión del PO.

4. **Casos con setup complejo no reproducible en test** — ejemplo: reproducir un race condition real, verificar comportamiento con un dataset específico de producción, validar interacción con un servicio de terceros que no responde en staging. Cuando el setup del spec supera al valor de la aserción, smoke manual gana.

5. **Verificaciones únicas post-deploy (checklist Sentry, verificación de tag)** — verificar que un evento nuevo llega al dashboard Sentry en prod es one-shot post-deploy, no rutinario. El skill Sentry post-prod checklist en las actas es el patrón para esto.

**Regla operativa**: si el caso encaja en alguna de las 5 categorías → smoke manual con este skill. Si es determinístico + browser-verifiable + staging-friendly → spec Playwright bajo `e2e/specs/`.

### Convención de aterrizaje

**Todo fix Tipo A/B futuro entra con su spec en el mismo PR**. La regla nueva del proyecto (acordada 2026-09-08 con PO en cierre e2e-error-audit): un fix del backlog Tipo A o Tipo B se merge junto con el spec Playwright que valida el fix, no en PRs separados. Motivación: evitar que el spec quede en backlog indefinido tras el merge del fix (patrón observado con los 5 Tipo A del sprint error-audit, que necesitaron sprint dedicado para automatizarse). Excepción: fixes de docs / typos / config sin superficie funcional no requieren spec.

## Auto-invocación

Este skill se invoca cuando el PO pide un smoke de UI ("corre el smoke de X", "verifica el flujo de reserva en staging", etc.). Fuera de eso, la ejecución manual mediante `mcp__playwright__browser_*` sin el protocolo anterior está permitida para exploración (mirar cómo se ve una pantalla, entender un flow), pero cualquier verificación reportada como evidencia debe seguir el protocolo del skill.
