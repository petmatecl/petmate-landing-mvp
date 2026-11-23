import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 4 de 6.
 *
 * Login carga — GET /login, status < 400, campo email visible.
 */

test('/login carga con campo email visible', async ({ page }) => {
    const resp = await page.goto('/login');
    expect(resp?.status(), '/login debe responder 2xx/3xx').toBeLessThan(400);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
});
