# Sprint sentry-boundary · 2026-09-25

**Rama**: `sentry-boundary` (desde `main @ 330a890`).
**Estado**: PR listo para review PO. Fix + smoke + spec + workflow yml aterrizado. Espera GO.
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

### 2.2 [pages/staging/error-boundary-smoke.tsx](pages/staging/error-boundary-smoke.tsx) (nuevo)

Ruta smoke gated por `getServerSideProps`:
- `NEXT_PUBLIC_VERCEL_ENV === 'production'` **o** `VERCEL_ENV === 'production'` → `notFound: true` (respuesta 404).
- Otro entorno (preview / staging / development) → renderiza página con botón "Disparar error del boundary". Al click, un componente hijo (`<ThrowOnDemand fire={true}/>`) hace `throw new Error('smoke:error-boundary:sentry-integration-verification')` en render.

**Regla vigente respetada**: cero rutas de prueba activas en producción. El gate en gSSP funciona a nivel server (no expone el bundle client de la ruta protegida a usuarios reales de pawnecta.com).

### 2.3 [e2e/specs/sentry-boundary/smoke.spec.ts](e2e/specs/sentry-boundary/smoke.spec.ts) (nuevo)

Tres assertions en preview (mismo patrón que `e2e/specs/prelaunch/cue-1-watchdog.spec.ts`):

| # | assertion | motivo |
|---|---|---|
| (a) | Tras click, `<h1>Algo salió mal</h1>` visible en 5s | prueba que el boundary interceptó el throw y renderizó fallback UI |
| (b) | `console.error` con prefix `"ErrorBoundary caught:"` fue emitido, y su texto contiene `"smoke:error-boundary"` | prueba que `componentDidCatch` corrió sobre el error esperado. Mismo callsite hace `Sentry.captureException` + `console.error` — si el segundo aparece, el primero se ejecutó milisegundos antes |
| (c) | Cero requests a `*.ingest.sentry.io` durante el flow (preview → SDK `enabled=false` por gate `IS_PROD`) | verifica que el gate del SDK opera correcto (no ensuciamos dashboard desde previews) |

**Verificación end-to-end (llegada a dashboard Sentry)**: P8 manual post-deploy con la misma ruta smoke — el PO hit `/staging/error-boundary-smoke` en el preview del PR (funciona porque preview no es prod), verifica pantalla, y separadamente tras merge repite el flow real de su incidente en prod para ver el evento `subsystem:error-boundary` aparecer.

### 2.4 [.github/workflows/e2e-error-audit.yml](.github/workflows/e2e-error-audit.yml)

Agregado `e2e/specs/sentry-boundary/` al comando `e2e-rapido` (L252). Sin ese cambio, el spec no correría en CI del PR.

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
