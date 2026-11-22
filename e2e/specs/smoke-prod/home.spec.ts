import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Spec 1 de 5.
 *
 * Verifica que la home de producción (https://www.pawnecta.com/) responde
 * con status 200 + hero visible + al menos una categoría clickeable en el
 * primer viewport.
 *
 * Anónimo (cero sesión). Zero mutación. Smoke público.
 */

test('home carga con hero visible y categorías listadas', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status(), 'home debe responder 2xx/3xx').toBeLessThan(400);

    // Hero principal: el H1 de la landing. Fallback por si el copy cambia —
    // el H1 debe existir y no estar vacío.
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = (await h1.textContent())?.trim() ?? '';
    expect(h1Text.length, 'H1 no vacío').toBeGreaterThan(0);

    // Al menos un link a /explorar o a una categoría, que es el trigger
    // principal del funnel tutor. La home debe tener navegación activa.
    const navLinks = page.locator('a[href*="/explorar"], a[href^="/paseos"], a[href^="/cuidado"], a[href^="/veterinario"]');
    await expect(navLinks.first()).toBeVisible();
});
