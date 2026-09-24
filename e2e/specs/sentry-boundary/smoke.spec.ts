// e2e/specs/sentry-boundary/smoke.spec.ts
// ---------------------------------------------------------------------------
// Sprint sentry-boundary (2026-09-25) — smoke del ErrorBoundary + integración
// con Sentry.
//
// Contexto: en el incidente prod del 2026-09-25 el PO vio la pantalla "Algo
// salió mal" del ErrorBoundary (componentDidCatch fired), pero el Sentry
// dashboard no tenía evento correspondiente. Diagnóstico:
// components/ErrorBoundary.tsx solo hacía `console.error`, cero llamada a
// Sentry.captureException. Los errores de render pasaban mudos.
//
// Fix (mismo PR): componentDidCatch ahora llama Sentry.captureException con
// contexts.react.componentStack y tag subsystem=error-boundary. GlobalHandlers
// del SDK v10 (globalHandlersIntegration, activo por default cuando no se
// pasa `integrations` en Sentry.init — ver instrumentation-client.ts:74-95)
// captura window.onerror y unhandledrejection, pero React render errors caen
// en componentDidCatch antes de propagar al onerror global — de ahí que se
// necesita la llamada explícita.
//
// Assertions en preview (mismo patrón que e2e/specs/prelaunch/cue-1-watchdog):
//   (a) tras click en "Disparar error", la pantalla "Algo salió mal" es
//       visible;
//   (b) console.error se emitió con prefix "ErrorBoundary caught:" — prueba
//       que componentDidCatch corrió;
//   (c) en preview, cero requests al DSN Sentry (SDK enabled=false por gate
//       IS_PROD). Verifica que el gate SDK opera correcto.
//
// Verificación end-to-end (llegada al dashboard Sentry) = P8 manual post-
// deploy: hit /staging/error-boundary-smoke en preview con el mismo config
// productivo, y separadamente en prod tras merge — comprobar tag
// subsystem=error-boundary en Sentry issues.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test('[SENTRY-BOUNDARY] click botón → pantalla "Algo salió mal" + componentDidCatch fired + cero requests DSN en preview', async ({ page }) => {
    // Capturar requests al DSN Sentry. En preview esperado 0 (gate SDK).
    const dsnRequests: string[] = [];
    await page.route('**/*.ingest.sentry.io/**', (route, request) => {
        dsnRequests.push(request.url());
        route.abort();
    });

    // Capturar console.error con prefix "ErrorBoundary caught:" — es la señal
    // de que componentDidCatch corrió en el boundary. El mismo callsite hace
    // Sentry.captureException + console.error, así que si el console.error
    // aparece, la captureException fue llamada milisegundos antes (mismo
    // método, misma línea).
    const boundaryConsoleErrors: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('ErrorBoundary caught:')) {
            boundaryConsoleErrors.push(msg.text());
        }
    });

    // Navegar a la ruta smoke. gSSP bloquea la ruta en prod (404) — este spec
    // solo corre contra preview/staging.
    await page.goto('/staging/error-boundary-smoke');

    // La página smoke debe renderizar el botón antes del click.
    const btn = page.getByTestId('fire-boundary');
    await expect(btn).toBeVisible({ timeout: 10_000 });

    // Click → hijo hace throw en render → ErrorBoundary intercepta →
    // componentDidCatch fired → Sentry.captureException + console.error.
    await btn.click();

    // Assertion (a): pantalla "Algo salió mal" visible.
    await expect(
        page.getByRole('heading', { name: 'Algo salió mal' }),
    ).toBeVisible({ timeout: 5_000 });

    // Assertion (b): console.error con "ErrorBoundary caught:" fue emitido.
    // Wait breve para que el evento drene al listener de Playwright.
    await page.waitForTimeout(500);
    expect(
        boundaryConsoleErrors.length,
        `[SENTRY-BOUNDARY] esperado ≥1 console.error con prefix "ErrorBoundary caught:" tras click. Vistos: ${boundaryConsoleErrors.length}.`,
    ).toBeGreaterThan(0);

    // El console.error debe incluir referencia al mensaje del smoke.
    const firstErr = boundaryConsoleErrors[0];
    expect(
        firstErr,
        `[SENTRY-BOUNDARY] console.error debe reflejar el error de smoke.`,
    ).toMatch(/smoke:error-boundary/);

    // Assertion (c): cero requests al DSN Sentry en preview (SDK enabled=false).
    // Si dsnRequests > 0 con VERCEL_ENV=preview, el gate está roto — bug
    // regresivo del sprint sentry-1 / instrumentation-client.
    expect(
        dsnRequests.length,
        `[SENTRY-BOUNDARY] esperado 0 requests al DSN en preview (gate SDK enabled:false). Vistos: ${dsnRequests.length}.`,
    ).toBe(0);
});
