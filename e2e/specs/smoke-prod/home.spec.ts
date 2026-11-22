import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 1 de 6.
 *
 * Home carga — GET /, status < 400, texto "Pawnecta" visible.
 */

test('Home carga con texto Pawnecta visible', async ({ page }) => {
    const resp = await page.goto('/');
    expect(resp?.status(), 'home debe responder 2xx/3xx').toBeLessThan(400);

    // Texto "Pawnecta" visible en la página (típicamente en el logo del
    // header, pero cualquier ocurrencia es señal válida de que el bundle
    // cargó correctamente).
    await expect(page.getByText('Pawnecta', { exact: false }).first()).toBeVisible();
});
