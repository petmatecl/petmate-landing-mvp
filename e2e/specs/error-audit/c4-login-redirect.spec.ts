// e2e/specs/error-audit/c4-login-redirect.spec.ts
// ---------------------------------------------------------------------------
// Sprint e2e-error-audit-2 — Case 4: login.tsx role lookup post-auth.
//
// Cubre el fix de commit 5da5289 (sprint error-audit) — destructurar .error
// de la query a proveedores post-signInWithPassword. Antes: fallo de red en
// esa query devolvía provData=null (indistinguible de "tutor legítimo sin
// fila") → cae al /explorar. Post-fix: si provError truthy, console.warn +
// Sentry.captureMessage con tags subsystem/route/errorCode. Redirect a
// /explorar SIGUE siendo el mismo (fallback seguro documentado).
//
// Los 2 tests corren SIN storageState — cada test hace login fresh. Se
// override el storageState del project (chromium/proveedor.json) via
// test.use({ storageState: { cookies: [], origins: [] } }).
//
// Se establece el Vercel bypass cookie en cada beforeEach via query param
// en la primera navegación a /login (patrón idéntico al de
// e2e/setup/authenticate.ts, único lugar del framework donde el bypass
// se pasa por URL en vez de header).
//
// Protocolo P8:
//   Test 1 (control positivo) — Aldo login sin bloqueo → aterriza en
//     /proveedor. Verifica que el path por-rol funciona.
//   Test 2 (negativo) — Aldo login con bloqueo antes del submit →
//     aterriza en /explorar (fallback seguro) + console.warn capturado
//     con el objeto de error. En preview Sentry no envía (gate a prod)
//     — la evidencia observable es el warn, no el evento en dashboard.
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

const PROVEEDORES_PATTERN = '**/rest/v1/proveedores*';

// Fresh storage por test — se testea el flow de login desde cero, cero
// cookies previas de Supabase Auth. El bypass de Vercel se re-establece
// en el primer goto de cada test via query param (ver comentario del
// helper e2e/setup/authenticate.ts:27-37).
test.use({ storageState: { cookies: [], origins: [] } });

const bypassToken = process.env.PLAYWRIGHT_BYPASS ?? '';
const bypassQuery = bypassToken
    ? `?x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}&x-vercel-set-bypass-cookie=samesitenone`
    : '';

test.describe('e2e-error-audit C4 — login role lookup fallback', () => {
    test('1) control positivo: Aldo login sin bloqueo → aterriza en /proveedor', async ({ page }) => {
        await page.goto(`/login${bypassQuery}`);
        await page.waitForLoadState('networkidle');

        await page.locator('#email').fill(process.env.E2E_STAGING_EMAIL ?? '');
        await page.locator('#password').fill(process.env.E2E_STAGING_PASSWORD ?? '');
        await page.getByRole('button', { name: /Ingresar/i }).click();

        // Post-login exitoso: query a proveedores devuelve la fila de Aldo
        // (que es proveedor+admin), decisión por rol → /proveedor.
        await page.waitForURL(/\/proveedor(?:$|\/|\?)/, { timeout: 15_000 });
        expect(page.url()).toContain('/proveedor');
    });

    test('2) negativo: bloqueo proveedores* antes del submit → aterriza en /explorar + console.warn', async ({ page }) => {
        // Capturar console.warn ANTES de cualquier navegación.
        const warnings: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text());
            }
        });

        await page.goto(`/login${bypassQuery}`);
        await page.waitForLoadState('networkidle');

        // Activar bloqueo ANTES del submit — la query a proveedores post-
        // signIn debe abortarse.
        await page.route(PROVEEDORES_PATTERN, async (route: Route) => {
            await route.abort('failed');
        });

        await page.locator('#email').fill(process.env.E2E_STAGING_EMAIL ?? '');
        await page.locator('#password').fill(process.env.E2E_STAGING_PASSWORD ?? '');
        await page.getByRole('button', { name: /Ingresar/i }).click();

        // Post-login con provError truthy: cae al else → /explorar (fallback
        // seguro documentado en el comentario in-code del fix).
        await page.waitForURL(/\/explorar(?:$|\?)/, { timeout: 15_000 });
        expect(page.url()).toContain('/explorar');

        // Aldo NO aterriza en /proveedor (comportamiento de control positivo).
        expect(page.url()).not.toContain('/proveedor');

        // Console.warn del fix: "[login] role lookup failed: <PostgrestError>".
        // La evidencia que en preview reemplaza al evento Sentry (Sentry en
        // preview está gated a prod, no envía).
        await expect
            .poll(() => warnings.some(w => w.includes('[login] role lookup failed')), {
                message: 'console.warn del fix debe dispararse cuando la query falla',
                timeout: 10_000,
            })
            .toBe(true);
    });
});
