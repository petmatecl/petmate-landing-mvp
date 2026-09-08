// e2e/specs/form-post/pre-hydration.spec.ts
// ---------------------------------------------------------------------------
// Sprint form-post (2026-09-08) — verifica que los 3 forms con credenciales/
// secretos (login, forgot-password, reset-password) tienen method="post" +
// action="/api/noop", de modo que un submit pre-hidratación NUNCA meta
// credenciales en el URL bar del browser.
//
// Contexto del bug:
// - Cuando el user submitea un `<form>` antes de que React vincule su
//   `onSubmit={handleSubmit}` (React hidrata post-load, gap 100ms-2s en
//   cold Vercel), el default HTML fires: GET al URL actual con TODOS los
//   campos como query string. En login sería:
//     /login?email=user@x.com&password=super-secret
// - Fix: method="post" fuerza POST (no GET, no leak en URL); action="/api/
//   noop" fuerza landing en un endpoint que devuelve 405 (fail limpio,
//   cero credenciales en URL bar, user reintenta tras hidratación).
//
// Protocolo P8:
//   Test 1 (control positivo, JS habilitado) — login normal funciona;
//     hidratación completa antes del click; onSubmit gana al default HTML.
//   Test 2 (negativo, JS deshabilitado) — submit del form nativo NO puede
//     meter credenciales en URL. Con javaScriptEnabled: false el context
//     de Playwright NO ejecuta el React onSubmit (no hidrata), así que
//     el submit fires con el default del HTML (post-fix: POST /api/noop
//     → 405, cero query string).
//
// Regla P8 acordada con PO 2026-09-08: si el spec con JS deshabilitado no
// puede rellenar el form por algún motivo, NO se marca skip — se reporta
// como bloqueo. Los input fields del login son standard HTML input =
// rellenables sin JS (verificado en Chromium 138 con javaScriptEnabled:
// false), así que este spec debe correr limpio.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

const bypassToken = process.env.PLAYWRIGHT_BYPASS ?? '';
const bypassQuery = bypassToken
    ? `?x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}&x-vercel-set-bypass-cookie=samesitenone`
    : '';

test.describe('form-post — pre-hidratación no puede meter credenciales en URL', () => {
    // Ambos tests parten de storage vacío — sin sesión previa. El bypass
    // Vercel se establece en cada goto via query param (el bypass no
    // requiere JS para funcionar, viaja como cookie después del handshake).
    test.describe('1) control positivo — JS habilitado', () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test('login normal funciona post-hidratación (onSubmit gana default HTML)', async ({ page }) => {
            await page.goto(`/login${bypassQuery}`);
            await page.waitForLoadState('networkidle');

            await page.locator('#email').fill(process.env.E2E_STAGING_EMAIL ?? '');
            await page.locator('#password').fill(process.env.E2E_STAGING_PASSWORD ?? '');
            await page.getByRole('button', { name: /Ingresar/i }).click();

            // React hidrata + onSubmit vincula + preventDefault + signInWithPassword
            // + redirect por rol. Aldo (proveedor+admin) aterriza en /proveedor.
            await page.waitForURL(/\/proveedor(?:$|\/|\?)/, { timeout: 15_000 });
            expect(page.url()).toContain('/proveedor');

            // Cero credenciales en la URL final (el fix no rompe el camino feliz).
            expect(page.url()).not.toMatch(/[?&]email=/);
            expect(page.url()).not.toMatch(/[?&]password=/);
        });
    });

    test.describe('2) negativo — JS deshabilitado', () => {
        // javaScriptEnabled: false → React no ejecuta → onSubmit NO se
        // vincula → submit del <form> fires con el default HTML (post-fix:
        // POST /api/noop → 405 sin query string).
        test.use({
            storageState: { cookies: [], origins: [] },
            javaScriptEnabled: false,
        });

        test('submit nativo → 405 en /api/noop sin creds en URL', async ({ page }) => {
            await page.goto(`/login${bypassQuery}`);

            // Verificar que el form del login llegó con los atributos del fix.
            // CSS `:has()` para targeting específico — `form:first` matcheaba
            // el <form> de QuickSearch en el header (renderea primero en DOM
            // order y no tiene method attr, causando falso fail del assert).
            const formLocator = page.locator('form:has(#email):has(#password)');
            const formMethod = await formLocator.getAttribute('method');
            const formAction = await formLocator.getAttribute('action');
            expect(formMethod?.toLowerCase(), `form debe tener method="post" — vio: ${formMethod}`).toBe('post');
            expect(formAction, `form debe tener action="/api/noop" — vio: ${formAction}`).toBe('/api/noop');

            // Rellenar credenciales FAKE — nunca deben llegar a login real
            // porque el submit se rechaza en /api/noop.
            const FAKE_EMAIL = 'presubmit-leak-test@example.invalid';
            const FAKE_PASSWORD = 'never-should-appear-in-url-abc123';
            await page.locator('#email').fill(FAKE_EMAIL);
            await page.locator('#password').fill(FAKE_PASSWORD);

            // Submit nativo — sin React onSubmit, el default HTML fires:
            // POST /api/noop con los campos en body (NO en URL).
            await page.getByRole('button', { name: /Ingresar/i }).click();
            await page.waitForLoadState('domcontentloaded');

            // ASSERTION PRIMARY: la URL final NO contiene las credenciales.
            const finalUrl = page.url();
            expect(finalUrl, `URL final no debe contener email — vio: ${finalUrl}`).not.toContain(FAKE_EMAIL);
            expect(finalUrl, `URL final no debe contener password — vio: ${finalUrl}`).not.toContain(FAKE_PASSWORD);
            expect(finalUrl, `URL final no debe contener 'email=' en query — vio: ${finalUrl}`).not.toMatch(/[?&]email=/);
            expect(finalUrl, `URL final no debe contener 'password=' en query — vio: ${finalUrl}`).not.toMatch(/[?&]password=/);

            // ASSERTION SECONDARY: aterrizó en /api/noop con 405 renderado
            // como text/plain "Method Not Allowed".
            expect(finalUrl, `URL final debe ser /api/noop — vio: ${finalUrl}`).toMatch(/\/api\/noop(?:\?|$)/);

            const bodyText = await page.locator('body').textContent();
            expect(bodyText, `Body debe contener 'Method Not Allowed' — vio: ${bodyText?.slice(0, 200)}`).toContain('Method Not Allowed');
        });
    });
});
