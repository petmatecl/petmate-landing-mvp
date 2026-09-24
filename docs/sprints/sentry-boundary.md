# Sprint sentry-boundary · 2026-09-25

**Rama**: `sentry-boundary` (desde `main @ 330a890`) · **mergeada a main en `6774fbd` 2026-09-24** (PR #88).
**Estado**: **CERRADO** — P8 positivo end-to-end confirmado en prod con bug real. Ver sección "8. Cierre".
**Motivación**: incidente prod 2026-09-25 — el PO vio pantalla "Algo salió mal" del ErrorBoundary en cuenta tutor (`user.id aff2a90d`) tras flujo `chat → back → /usuario`, pero el Sentry dashboard no registró evento. Diagnóstico previo mostró que `components/ErrorBoundary.tsx:23-25` solo hacía `console.error`, sin llamar a `Sentry.captureException`. Los errores de render pasaban mudos aunque la pantalla aparecía al usuario.

Clasificación PO: **P0 · BLOQUEA** — cualquier bug de render que aterriza al boundary se pierde sin señal, invalidando la observabilidad cliente durante la ventana de lanzamiento.

## 1. Diagnóstico previo (recap del reporte espejo aceptado por PO 2026-09-25)

- Único wrapper del árbol: `<ErrorBoundary>` en [pages/_app.tsx:111-113](pages/_app.tsx#L111-L113) envolviendo el `<Component {...pageProps} />`.
- Boundary = Component clase propia ([components/ErrorBoundary.tsx](components/ErrorBoundary.tsx)). Cero `Sentry.ErrorBoundary` wrapper (verificado por grep sobre `**/*.{ts,tsx,js}` con patrón `Sentry\.ErrorBoundary|withErrorBoundary` → 0 matches).
- `componentDidCatch(error, errorInfo)` → solo `console.error(...)`. El `console.error` no llega a Sentry por sí solo: para eso haría falta agregar `Sentry.Integrations.CaptureConsole` en el init, decisión que trae ruido masivo (todo `console.error` legítimo del código app pasaría a event). El fix canónico es `captureException` explícito en el boundary.

### GlobalHandlers del SDK v10 — status verificado

El SDK cliente inicializa en [instrumentation-client.ts:60-109](instrumentation-client.ts#L60-L109). Cita del comentario técnico canónico ya presente en el archivo desde `sentry-flush` (2026-08-11):

> **NO usar `integrations: []`. Ese patrón mata TODOS los defaults core de v10**, incluyendo:
> - `globalHandlersIntegration()` — captura `window.onerror` y `unhandledRejection` **AUTOMÁTICAMENTE**. Sin esto, Sentry SOLO recibe `Sentry.captureException(...)` manuales.
> - `browserApiErrorsIntegration()` — envuelve `setTimeout/setInterval/addEventListener` para capturar throws async.
> - `breadcrumbsIntegration()` — trail de console/DOM/xhr/fetch previos al error.
> - `dedupeIntegration()` — colapsa errores duplicados.
> - `inboundFiltersIntegration()` — filtra ruido conocido.
>
> Omitir la propiedad `integrations` deja los defaults activos.

El init de este proyecto **NO define `integrations`** (verificado grep del bloque `Sentry.init(...)` en el archivo — el objeto va desde L60 al L109 sin la clave). **Confirmado: GlobalHandlers activo por default v10**. `window.onerror` y `unhandledrejection` YA capturan automáticamente errores async no manejados. Lo que NO capturan es el error de render de React — ese cae en el `componentDidCatch` del boundary **antes** de propagar al `onerror` global; de ahí que se necesita la llamada explícita en el fix.

**Complemento operacional**: [instrumentation-client.ts:43-58](instrumentation-client.ts#L43-L58) agrega listener `unhandledrejection` para swallowear el rejection del register del service worker (patrón sentry-bot-noise 2026-09-08). Ese listener llama `preventDefault()` antes de que el GlobalHandlers procese el evento, así que ese caso específico NO llega a Sentry — es intencional. Cero conflicto con este sprint.

## 2. Fix aplicado

### 2.1 [components/ErrorBoundary.tsx](components/ErrorBoundary.tsx)

Cambios en el `componentDidCatch`:

```tsx
import * as Sentry from "@sentry/nextjs";

componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
        contexts: {
            react: {
                componentStack: errorInfo.componentStack ?? "(no componentStack)",
            },
        },
        tags: {
            subsystem: "error-boundary",
        },
    });
    console.error("ErrorBoundary caught:", error, errorInfo);
}
```

Nota `user.id`: no se pasa explícito porque `Sentry.setUser({ id })` ya se despacha desde `contexts/UserContext.tsx` en el sprint `cue-1-sentry-user` (PR #82, mergeado 2026-09-24). Todo evento posterior al hidrato lleva `user.id` en el scope automáticamente. Los eventos previos al hidrato (o post-logout) van sin `user.id`, lo cual es correcto.

### 2.2 [components/ErrorBoundary.test.tsx](components/ErrorBoundary.test.tsx) (nuevo) · verificación del contrato

Test unitario mismo patrón que `lib/g1-*.test.ts` (runner `npx tsx` puro con `node:assert`, mocks vía `require.cache`, sin jest / vitest / JSDOM). Mock de `@sentry/nextjs` antes del `require('./ErrorBoundary')` captura las invocaciones a `captureException`. Mock de `next/link` a `function LinkStub(){return null}` para satisfacer el contrato function-component de React sin ejecutar el router.

5 assertions:

| # | assertion | qué prueba |
|---|---|---|
| 1 | `getDerivedStateFromError(err)` → `{ hasError: true, error: err }` | contrato React que el boundary respeta |
| 2 | `componentDidCatch(err, errorInfo)` invoca `Sentry.captureException` **1 vez** con: primer arg = `err`, `opts.contexts.react.componentStack` = `errorInfo.componentStack`, `opts.tags.subsystem = 'error-boundary'` | el fix del sprint aplicado correctamente |
| 3 | `componentDidCatch(err, { componentStack: null })` cae al fallback `'(no componentStack)'` | robustez cuando React no expone stack |
| 4 | `render()` con `hasError=true` produce JSX cuya serialización contiene `"Algo salió mal"` + `"Recargar página"` | el fallback UI está intacto |
| 5 | `render()` con `hasError=false` devuelve `this.props.children` textual | happy path pasa children sin envoltura |

**Corrida**: `npm run test:error-boundary` (nuevo script en `package.json`) → `5 passed, 0 failed`. Corre en CI bajo `ci.yml > job typecheck-and-build > step "Unit tests (ErrorBoundary — Sentry integration)"` — mismo bucket que los tests G-1 del bloque G.

**Por qué no test e2e con una ruta smoke gated**: la iteración previa proponía `pages/staging/error-boundary-smoke.tsx` con `getServerSideProps → notFound:true` en prod. **Corregido por PO 2026-09-25**: la regla del proyecto es cero código productivo de prueba en producción — **aplica también a páginas gated por entorno**. Una página que devuelve 404 en prod sigue siendo código desplegable con superficie de mantenimiento, riesgo de regressión del gate (env vars mal seteadas → ruta activa donde no debería), y contradice el principio de que la verificación en staging se hace con specs / fixtures / tests unitarios, nunca con código productivo condicional. Ver CLAUDE.md > COROLARIO P8 12ª (aclaración ampliada 2026-09-25).

### 2.3 P8 real en producción (post-merge)

El positivo end-to-end del boundary con Sentry productivo **NO** se ejecuta con un error sintético desplegado. Se ejecuta contra el error real que motivó este sprint:

Tras merge + deploy a prod, el PO repite el flujo `chat → back → /usuario` en su cuenta Chrome Windows incógnito. Ese flujo ya revienta al boundary (documentado en el incidente 2026-09-25 con pantalla "Algo salió mal"). Con el fix aterrizado:
- (a) la pantalla sigue apareciendo como antes;
- (b) el evento aparece en el dashboard Sentry con `subsystem=error-boundary`, `contexts.react.componentStack` poblado, y `user.id` = la cuenta del PO (via `Sentry.setUser({id})` de #82).

Ese evento **es** la verificación en producción del boundary integrado con Sentry — con un bug real en el codebase, no un throw fabricado. La contrapartida (bug real no reproducido) es documentación insuficiente hoy del incidente `/usuario` en sí, que se cierra automáticamente cuando el evento aparezca con stack + componentStack: ahí sí hay hipótesis sobre archivo:línea del componente que rompe.

## 3. Scripts de investigación al PR bajo `scripts/`

Los 4 scripts que se usaron para llegar al diagnóstico van al PR (todos leen `.env.local`, cero token hardcoded, cero print de PII bruta):

- [scripts/sentry-query-tutor-incident.ts](scripts/sentry-query-tutor-incident.ts) — busca issues por `user.id:aff2a90d*` en 24h + 14d. Confirmó que solo aparecía el issue `user_context_stuck` del watchdog (ruido), no un evento nuevo del boundary.
- [scripts/sentry-query-cue1-events.ts](scripts/sentry-query-cue1-events.ts) — baja issues `JAVASCRIPT-NEXTJS-5` (hydrate exhausted) y `-8` (login_role_lookup_failed) + query `/security-logout`.
- [scripts/sentry-event-detail.ts](scripts/sentry-event-detail.ts) — fetch de events individuales por ID con contexts + breadcrumbs + tags custom + extra. Fue el que trajo la evidencia `TypeError: Failed to fetch (supabase.co)` del H2.
- [scripts/sentry-security-logout.ts](scripts/sentry-security-logout.ts) — ampliación de query `/security-logout` con 5 patrones distintos. Confirmó que "los 5 de /security-logout" del PO eran distribución de transaction del watchdog (issue `-7`), no eventos distintos.

## 4. P1.1 — output del build

Pendiente ejecutar `npm run build > /tmp/build.log 2>&1` local, con grep por warnings `Sentry|instrumentation|action required|deprecat` sobre el output completo. Reportado en el mensaje de merge junto al SHA.

## 5. Ventana observación post-merge

Tras merge + deploy a prod:
- **24h**: PO repite el flow `chat → back → /usuario` en su cuenta (Chrome Windows incógnito). Con `user.id` en scope del Sentry SDK, el evento debe aparecer en el dashboard con `subsystem:error-boundary` y `contexts.react.componentStack` poblado. Datos → diagnóstico del incidente `/usuario` en sí (bloqueado hoy por falta de stack).
- **72h**: revisar aparición de otros events `subsystem:error-boundary`. Cualquier issue nuevo entra al triage; los preexistentes que estaban pasando mudos por este bug ahora se hacen visibles.

## 6. Enlaces cruzados

- Reporte espejo original (2026-09-25) — chat de coordinación del turno, sección "H1 · SENTRY-BOUNDARY (BLOQUEA)".
- Sprint `sentry-init` (2026-08-11) — R3 SENTRY-1, introdujo `instrumentation.ts` + `instrumentation-client.ts`. Referencia: `docs/sprints/sentry-1.md` / `ACTA_SENTRY_1.md`.
- Sprint `cue-1-sentry-user` (2026-09-24, PR #82) — `Sentry.setUser({ id })` en `UserContext`. Es lo que hace innecesario pasar `user.id` explícito en el `captureException` de este sprint.
- CLAUDE.md > sección `## Observabilidad: Sentry` (referencia del gate a prod).

## 7. Fuera de alcance (documentado, no cerrado por este sprint)

- **Incidente `/usuario` específico del PO**: bloqueado por ausencia del stack en Sentry. Dato registrado: `/usuario` es redirect 307 → `/explorar` ([next.config.js:207-211](next.config.js#L207-L211)), el crash ocurre en el destino. Sin hipótesis en el acta — el PO repetirá el flow con H1 en prod, el stack llegará con `user.id`, y el diagnóstico correrá sobre datos.
- **H2 · CUE-1 evidencia real (issue -5 hydrate exhausted + -8 login_role_lookup_failed)**: cerrado como dispositivo propio del PO — cruce de `user.id 0c2ab509…` (2026-09-25) confirmó cuenta Android del PO, los 5 events son sus pruebas del 08-sep y 21-sep, no usuarios reales. F1+F2 (AbortController + fallback determinístico) archivados como "no aplican" — la causa real es `Failed to fetch` que ya se resuelve con error del fetch y ya dispara los 4 reintentos del hydrate. `cue-1-mobile-toast` queda como CONVIENE post-lanzamiento (aviso al usuario en modo degradado con acción Recargar). Ver [docs/sprints/cue-1-fix.md > Estado 2026-09-25](docs/sprints/cue-1-fix.md) y [BACKLOG.md > CUE-1](BACKLOG.md).
- **"Los 5 de /security-logout"**: cerrado. Query amplia confirmó que eran distribución de transaction del issue `-7` (watchdog `user_context_stuck`) del 22-09 (cue-1.4). Con el stale closure explicado y el fix en #85, esos 5 dejan de significar algo.
- **Regla nueva aplicada de este sprint** (aterrizada a CLAUDE.md > COROLARIO P8 12ª): antes de clasificar un issue Sentry, cruzar `user.id` contra las cuentas conocidas del equipo. Dos semanas de "evidencia CUE-1 BLOQUEA" fueron el PO probándose a sí mismo desde dos dispositivos. La clasificación real solo se pudo hacer cuando el sprint `cue-1-sentry-user` (#82) puso el `user.id` en scope y este sprint hizo el cruce.

## 8. Cierre · P8 positivo end-to-end CONFIRMADO 2026-09-24

**Fix aterrizado en prod** (deploy `dpl_EFUhFPhrBzJezEgWQ6YnEsFNgf8t`, state=READY, SHA `6774fbd61601dbe34067529e487cd9d4f3451e1f`, verificado vía Vercel MCP 2026-09-24).

**Positivo real reproducido por PO 2026-09-24** — flujo `ficha servicio → "Enviar Mensaje" → toast error 1er clic → 2do clic abre /mensajes?id=b439cc90-... → "Volver al Panel" → /usuario → pantalla "Algo salió mal"`.

**Evidencia Sentry** (script `sentry-event-issue9.ts`):

| campo | valor |
|---|---|
| shortId | `JAVASCRIPT-NEXTJS-9` |
| title | `TypeError: Cannot read properties of undefined (reading 'nombre')` |
| culprit | `/[categoria]` |
| user.id | del PO (Chrome Windows) |
| release | `6774fbd61601dbe34067529e487cd9d4f3451e1f` |
| transaction | `/[categoria]` |
| url | `https://pawnecta.com/usuario` |
| **tag `subsystem`** | **`error-boundary`** ← fix aplicado |
| **`contexts.react.componentStack`** | **poblado con stack completo del hijo** ← fix aplicado |
| exception | `at CategoryPage (./pages/[categoria]/index.tsx:?:36)` |

**Ambos elementos del fix presentes**: `tags.subsystem='error-boundary'` (agregado en `componentDidCatch` del sprint) + `contexts.react.componentStack` (agregado en el mismo callsite). El `Sentry.setUser({id})` de PR #82 llenó el `user.id` automáticamente sin intervención del boundary.

**Sin este sprint (pre-#88)**: la misma pantalla del boundary aparecía en producción sin evento Sentry alguno — bug de render invisible.

**Con este sprint (post-#88)**: cada crash del boundary llega al dashboard con stack + user.id + subsystem tag → diagnóstico posible sobre datos reales, no sobre reproducciones manuales.

**Bug real identificado por el evento**: `pages/[categoria]/index.tsx:22-24` accede a `categoria.nombre` sin guard; `getStaticPaths` con `fallback:false` + slug `'usuario'` no listado → `getStaticProps` devuelve `notFound:true`, pero el hydrate client-side renderiza el componente sin la data → TypeError. Sprint dedicado `incidente-usuario-fix` (2026-09-24) aterriza los 2 fixes: (capa 1) enlace correcto en `pages/mensajes.tsx` para tutor `/mis-reservas` en vez de `/usuario`, (capa 2) guard `if (!categoria) return <NotFoundContent />` en el componente para no crashear en cualquier slug inexistente. Ver [docs/sprints/incidente-usuario-fix.md](incidente-usuario-fix.md).

**Ventana observación post-merge** cerrada exitosamente: el positivo llegó en <1h de deploy prod. La sección 5 (24h + 72h monitor de otros events con `subsystem:error-boundary`) sigue viva pero cambia de propósito — ahora es monitoreo estándar, no verificación del fix.
