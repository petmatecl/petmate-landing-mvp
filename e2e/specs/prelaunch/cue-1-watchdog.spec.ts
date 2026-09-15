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

test('[CUE-1] watchdog dispara console.warn user_context_stuck cuando UserContext queda atascado 15s+', async ({ page }) => {
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

    // Esperar >15s para dar tiempo al watchdog. 18s = 15s + 3s de margen
    // para el mount inicial + primer paint.
    await page.waitForTimeout(18_000);

    // Assertion: al menos 1 warning con la clave del watchdog.
    expect(
        warnings.length,
        `[CUE-1] esperado ≥1 console.warn con 'user_context_stuck' tras 18s con queries colgadas. Vistos: ${warnings.length}. Sample: ${warnings.slice(0, 2).join(' | ')}`,
    ).toBeGreaterThan(0);

    // Assertion secundaria: el payload debe incluir contexto mínimo esperado
    // (stuckReason + currentRoute). Playwright serializa objects como texto —
    // buscamos las llaves canónicas del payload.
    const primerWarning = warnings[0];
    expect(primerWarning, 'payload incluye stuckReason').toMatch(/stuckReason/);
    expect(primerWarning, 'payload incluye currentRoute').toMatch(/currentRoute/);
});
