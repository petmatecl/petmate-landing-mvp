// e2e/specs/prelaunch/cue-1-watchdog.spec.ts
// ---------------------------------------------------------------------------
// Sprint prelaunch CUE-1 (2026-09-15) — watchdog en UserContext que dispara
// Sentry.captureMessage cuando el estado de auth queda atascado 15s+
// (loading nunca resuelve, o !user post-hidratación con sesión en storage).
//
// Fondo: cuelgue intermitente de carga reportado por PO en smokes prod
// desde 2026-08-27 (spinner indefinido, se destraba con Ctrl+Shift+R).
// Sin reproducción confiable → sin fix posible. El watchdog captura
// evidencia cuando ocurra sin necesidad de reproducirlo manualmente —
// hace CUE-1 monitoreado en vez de vivir vivo sin evidencia.
//
// Test único: forzar el estado atascado interceptando las queries a
// Supabase para que nunca resuelvan (ni con 200 ni con error — cuelgan
// indefinidas). El UserContext entra en `hydrateFromSession` pero
// Promise.all de las queries de perfil nunca completa → `isLoading`
// queda true → watchdog dispara a los 15s → `console.warn` visible
// (dual con Sentry.captureMessage; en preview Sentry gate a prod NO
// envía, pero console.warn sí — el spec verifica la llamada, no el
// dashboard).
//
// Wall clock esperado: ~17s (15s watchdog + 2s de margen de navigation +
// dependencias). Muy dentro del timeout default Playwright.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test('[CUE-1] watchdog dispara console.warn + Sentry.captureMessage cuando UserContext queda atascado 15s+', async ({ page }) => {
    // Sprint J-4 cue-1 (2026-09-22, respuesta punto 3 del PO "Enfoque cue-1"):
    // el spec original solo verificaba `console.warn`. El PO pidió verificar
    // también que la señal a Sentry (`Sentry.captureMessage`) es invocada —
    // no solo el warn local — porque en prod el warn está gateado por
    // `!isProd` (contexts/UserContext.tsx:809-813) y la ÚNICA señal es
    // Sentry. Sin verificar Sentry, el spec verifica el path de debug local
    // que NO existe en prod.
    //
    // Enfoque combinado 3 assertions:
    //   (a) console.warn presente (path staging/preview con !isProd gate).
    //   (b) Monkey-patch de window.Sentry.captureMessage — cuenta llamadas
    //       aunque el SDK esté disabled (gate SDK corta después del call).
    //   (c) Requests al DSN de Sentry — en staging (VERCEL_ENV=preview) el
    //       gate del SDK es `enabled: false` → esperado 0 requests. Verifica
    //       que el gate opera correcto (cero envio spam a Sentry desde
    //       preview).
    //
    // En prod la señal real llega a Sentry via el `captureMessage` (SDK
    // enabled=true → request al DSN sí sale). Verificación prod queda en
    // la vía natural: PO/auditor revisa dashboard Sentry con query
    // `message:user_context_stuck`.

    // Contadores de calls al captureMessage — se hidratan via addInitScript.
    // Monkey-patch del SDK Sentry en `window` — el bundle Sentry se carga
    // durante el init de instrumentation-client.ts; interceptamos antes
    // del mount de UserContext para capturar la llamada.
    await page.addInitScript(() => {
        // @ts-expect-error - window custom property for test
        window.__watchdogSentryCalls = [];
        // Interceptar defineProperty para monkey-patch a Sentry cuando aparezca.
        const originalDefineProperty = Object.defineProperty;
        const watch = () => {
            // @ts-expect-error - window.Sentry from bundle
            const s = window.Sentry;
            if (s && typeof s.captureMessage === 'function' && !s.__watchdogPatched) {
                const orig = s.captureMessage.bind(s);
                s.captureMessage = function (msg: string, opts?: unknown) {
                    // @ts-expect-error - custom
                    window.__watchdogSentryCalls.push({ msg, opts: JSON.stringify(opts) });
                    return orig(msg, opts);
                };
                s.__watchdogPatched = true;
            }
        };
        // Poll cada 100ms por 30s buscando window.Sentry disponible.
        let n = 0;
        const poll = setInterval(() => {
            watch();
            if (++n > 300) clearInterval(poll);
        }, 100);
    });

    // Interceptar requests al DSN Sentry — capturamos cualquier envio real.
    // En staging (SDK enabled=false) esperado: 0 requests. Verifica gate SDK.
    const dsnRequests: string[] = [];
    await page.route('**/*.ingest.sentry.io/**', (route, request) => {
        dsnRequests.push(request.url());
        // Cero necesidad de responder real — solo cuenta la request.
        route.abort();
    });

    // Interceptar TODAS las queries a Supabase REST — nunca resuelven.
    // El init de UserContext hace `supabase.auth.getSession()` (que resuelve
    // OK con la sesión de storageState de proveedor) + queries de perfil
    // (`proveedores`, `usuarios_buscadores`) via `runReadQuery`. Al cuelgar
    // las queries de perfil, `hydrateFromSession` nunca termina → isLoading
    // queda true → watchdog dispara a los 15s.
    await page.route('**/rest/v1/proveedores*', () => new Promise(() => { /* pending forever */ }));
    await page.route('**/rest/v1/usuarios_buscadores*', () => new Promise(() => { /* pending forever */ }));

    // Capturar console.warn emitidos por el watchdog. El payload viene
    // stringifieado por Playwright — assertamos substring 'user_context_stuck'.
    const warnings: string[] = [];
    page.on('console', msg => {
        if (msg.type() === 'warning' && msg.text().includes('user_context_stuck')) {
            warnings.push(msg.text());
        }
    });

    // Navegar a ruta protegida (dispara UserContext hydrate). / es suficiente —
    // UserContext se mount al render de _app.tsx en cualquier ruta.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Esperar >15s para dar tiempo al watchdog. 25s = 15s watchdog + 10s
    // margen para el mount inicial + primer paint + event loop saturado bajo
    // carga alta del CI runner (con workers=2 + otras suites concurrentes).
    // Sprint J-4 cue-1 fix umbral: el spec anterior con 18s falló bajo carga
    // (run 35735575685 durante F2-3-CLEANUP diagnostic) porque el event loop
    // del browser saturado retrasaba el setTimeout(15000) por 3-5s extra.
    // 25s da margen razonable sin cambiar el watchdog en producción.
    await page.waitForTimeout(25_000);

    // Assertion (a): al menos 1 console.warn (path !isProd gate).
    expect(
        warnings.length,
        `[CUE-1] Assertion (a): esperado ≥1 console.warn con 'user_context_stuck' tras 25s con queries colgadas. Vistos: ${warnings.length}. Sample: ${warnings.slice(0, 2).join(' | ')}`,
    ).toBeGreaterThan(0);

    // Assertion (b): payload del warn incluye contexto mínimo esperado.
    const primerWarning = warnings[0];
    expect(primerWarning, '[CUE-1] payload incluye stuckReason').toMatch(/stuckReason/);
    expect(primerWarning, '[CUE-1] payload incluye currentRoute').toMatch(/currentRoute/);

    // Assertion (c): Sentry.captureMessage FUE INVOCADO al menos 1 vez con
    // el mensaje del watchdog. Aunque el SDK esté disabled en preview (gate
    // enabled:false), la LLAMADA al captureMessage ocurre — el drop del
    // envelope ocurre DENTRO del SDK, no evita la invocación del método.
    // Esta assertion garantiza que el flujo del watchdog en PROD también
    // invocaría captureMessage (donde el gate SDK enabled:true sí envía).
    const sentryCalls = await page.evaluate(() => {
        // @ts-expect-error - custom
        return window.__watchdogSentryCalls || [];
    });
    const stuckCalls = sentryCalls.filter((c: { msg: string }) => c.msg === 'user_context_stuck');
    expect(
        stuckCalls.length,
        `[CUE-1] Assertion (c): esperado ≥1 Sentry.captureMessage('user_context_stuck', ...) invocado. Vistos calls totales=${sentryCalls.length}, con user_context_stuck=${stuckCalls.length}. Sample calls: ${JSON.stringify(sentryCalls.slice(0, 2))}`,
    ).toBeGreaterThan(0);

    // Assertion (d): en staging (VERCEL_ENV=preview) el SDK gate corta el
    // envelope → esperado dsnRequests=0. Verifica que el gate SDK opera
    // correcto y no ensuciamos dashboard Sentry desde preview.
    // Si dsnRequests > 0, o el gate NO está aplicado (revisitar
    // NEXT_PUBLIC_VERCEL_ENV/VERCEL_ENV env vars en preview), o el DSN es
    // distinto al patron `*.ingest.sentry.io`.
    expect(
        dsnRequests.length,
        `[CUE-1] Assertion (d): esperado 0 requests al DSN Sentry desde preview (gate SDK enabled:false). Vistos: ${dsnRequests.length}. Requests: ${dsnRequests.slice(0, 3).join(', ')}`,
    ).toBe(0);
});
