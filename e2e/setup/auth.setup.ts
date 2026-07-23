// e2e/setup/auth.setup.ts
// ---------------------------------------------------------------------------
// Setup project — corre una sola vez, autentica al usuario staging y guarda
// storageState en e2e/.auth/admin.json. El resto de tests (project "chromium")
// depende de este via dependencies: ['setup'] en playwright.config.ts.
//
// Si login falla, TODOS los tests fallan con el mensaje claro de este setup
// (no cascadas de "unauthorized" en cada spec).
//
// Requisitos en e2e/.env.test (gitignored):
//   E2E_STAGING_EMAIL      — email del usuario admin+proveedor en staging
//   E2E_STAGING_PASSWORD   — su password
//   PLAYWRIGHT_BYPASS      — token de Vercel protection bypass
// ---------------------------------------------------------------------------
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.resolve(__dirname, '../.auth/admin.json');

setup('authenticate as admin+proveedor', async ({ page }) => {
    const email = process.env.E2E_STAGING_EMAIL;
    const password = process.env.E2E_STAGING_PASSWORD;
    if (!email || !password) {
        throw new Error(
            '[auth.setup] Faltan credenciales. Setea E2E_STAGING_EMAIL y ' +
            'E2E_STAGING_PASSWORD en e2e/.env.test (ver e2e/.env.test.example).'
        );
    }

    await page.goto('/login');

    // El campo autofocus es #email; llenamos ambos y submit.
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // El login real es client-side (supabase.auth.signInWithPassword) y luego
    // redirige. Esperamos a estar fuera de /login como señal de éxito.
    // Timeout generoso: la app puede tardar en resolver la sesión + redirect
    // + fetch inicial del panel.
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 15_000 });

    // Sanity check: el header logueado debe estar visible (nombre del usuario
    // o link a /proveedor). Si el redirect llevó a /explorar (rol solo tutor)
    // el test que requiere proveedor va a fallar más abajo con mensaje claro,
    // no acá — este setup solo verifica que hay sesión válida.
    await expect(page).not.toHaveURL(/\/login/);

    await page.context().storageState({ path: AUTH_FILE });
});
