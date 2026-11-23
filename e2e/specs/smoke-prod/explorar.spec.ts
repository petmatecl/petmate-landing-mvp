import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 2 de 6.
 *
 * Explorar carga — GET /explorar, status < 400, al menos 1 tarjeta de
 * proveedor (o servicio, que renderiza el nombre del proveedor) visible.
 */

test('/explorar carga con al menos 1 card visible', async ({ page }) => {
    const resp = await page.goto('/explorar');
    expect(resp?.status(), '/explorar debe responder 2xx/3xx').toBeLessThan(400);

    // Las cards de servicio son links a /servicio/[uuid]. Cada card renderiza
    // el nombre del proveedor dentro del contenedor. Verificamos existencia
    // de al menos una. Timeout generoso para cold start de Supabase RPC.
    const cards = page.locator('a[href^="/servicio/"]');
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count, 'al menos 1 card visible').toBeGreaterThan(0);
});
