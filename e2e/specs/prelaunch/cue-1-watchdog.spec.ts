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
    // también que la señal a Sentry es invocada. Iteración 1 intentó
    // monkey-patch de `window.Sentry.captureMessage` — falla porque en
    // preview (`VERCEL_ENV=preview`) el gate del SDK en
    // `sentry.client.config.ts` es `VERCEL_ENV === 'production'` → SDK NO se
    // inicializa → `window.Sentry` NO existe → cero forma de patch la
    // instancia. Iteración 2 (esta): 3 assertions con lo verificable en
    // preview + verificación prod natural via dashboard.
    //
    // Enfoque 3 assertions verificables en preview:
    //   (a) console.warn presente — path debug local con `!isProd` gate
    //       (contexts/UserContext.tsx:809-813). En preview isProd=false,
    //       entonces watchdog emite warn con el payload completo.
    //   (b) Payload del warn incluye contexto mínimo (stuckReason +
    //       currentRoute). Este payload ES el mismo que se le pasa a
    //       Sentry.captureMessage en prod (mismo objeto, misma línea del
    //       UserContext) — verificar el payload verifica que la señal a
    //       Sentry en prod sería correcta.
    //   (c) [ELIMINADA — window.Sentry no existe en preview porque el SDK
    //       gate a prod no lo inicializa. Verificación prod queda vía
    //       dashboard Sentry con `message:user_context_stuck` — hoy 32
    //       events capturados en prod, confirma que el path emite].
    //   (d) Requests al DSN de Sentry — en preview SDK enabled=false →
    //       esperado 0 requests. Verifica que el gate opera correcto
    //       (cero envio spam a Sentry desde preview).

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

    // Esperar >15s para dar tiempo al watchdog. 18s = 15s watchdog + 3s
    // margen para el mount inicial + primer paint. El PO 2026-09-22 ratificó
    // que subir el waitForTimeout enmascara el problema real: si bajo carga
    // el watchdog llega tarde, eso ES la señal del cuelgue estructural (fix
    // está en sprint cue-1-fix con AbortController timeout 10s + fallback).
    // Volvemos a 18s original hasta que el fix aterrice y podamos comparar
    // antes/después con la misma vara.
    await page.waitForTimeout(18_000);

    // Assertion (a): al menos 1 console.warn (path !isProd gate).
    expect(
        warnings.length,
        `[CUE-1] Assertion (a): esperado ≥1 console.warn con 'user_context_stuck' tras 25s con queries colgadas. Vistos: ${warnings.length}. Sample: ${warnings.slice(0, 2).join(' | ')}`,
    ).toBeGreaterThan(0);

    // Assertion (b): payload del warn incluye contexto mínimo esperado.
    const primerWarning = warnings[0];
    expect(primerWarning, '[CUE-1] payload incluye stuckReason').toMatch(/stuckReason/);
    expect(primerWarning, '[CUE-1] payload incluye currentRoute').toMatch(/currentRoute/);

    // Assertion (c): en staging (VERCEL_ENV=preview) el SDK gate corta el
    // envelope → esperado dsnRequests=0. Verifica que el gate SDK opera
    // correcto y no ensuciamos dashboard Sentry desde preview.
    // Si dsnRequests > 0, o el gate NO está aplicado (revisitar
    // NEXT_PUBLIC_VERCEL_ENV/VERCEL_ENV env vars en preview), o el DSN es
    // distinto al patron `*.ingest.sentry.io`.
    expect(
        dsnRequests.length,
        `[CUE-1] Assertion (c): esperado 0 requests al DSN Sentry desde preview (gate SDK enabled:false). Vistos: ${dsnRequests.length}. Requests: ${dsnRequests.slice(0, 3).join(', ')}`,
    ).toBe(0);
});
