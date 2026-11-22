import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 5 de 6.
 *
 * Register carga — GET /register, status < 400, selector tutor/proveedor
 * visible (Step 1 del wizard donde el user elige rol).
 */

test('/register carga con selector tutor/proveedor visible', async ({ page }) => {
    const resp = await page.goto('/register');
    expect(resp?.status(), '/register debe responder 2xx/3xx').toBeLessThan(400);

    // Step 1 del wizard tiene dos botones de rol con role="radio" + texto
    // "Tutor" / "Proveedor". Verificamos que ambos se rendean.
    const bodyText = (await page.locator('body').textContent()) ?? '';
    const bodyLower = bodyText.toLowerCase();

    // "tutor" en algún lugar del selector (normalmente "Soy tutor" o similar).
    expect(bodyLower).toMatch(/tutor/);
    // "proveedor" en algún lugar del selector.
    expect(bodyLower).toMatch(/proveedor/);

    // Y al menos 1 botón en la página (hay 2 del selector + "Atrás" si aplica).
    const buttons = page.locator('button, [role="radio"]');
    const btnCount = await buttons.count();
    expect(btnCount, 'al menos 1 botón visible').toBeGreaterThan(0);
});
