import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Spec 2 de 5.
 *
 * Verifica que /explorar en producción responde + renderiza al menos una
 * card de servicio en el primer viewport. Smoke público, cero sesión.
 *
 * Es el landing principal del tráfico pagado — si rompe, los ads queman
 * budget sobre una página vacía.
 */

test('/explorar renderiza cards de servicios', async ({ page }) => {
    const resp = await page.goto('/explorar');
    expect(resp?.status(), '/explorar debe responder 2xx/3xx').toBeLessThan(400);

    // El H1 debe existir y referirse a cuidadores/profesionales.
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Al menos una card de servicio. Las cards tienen links a /servicio/[uuid].
    // Esperamos hasta 15s porque la RPC buscar_servicios puede tardar en
    // cold start de Supabase.
    const serviceCards = page.locator('a[href^="/servicio/"]');
    await expect(serviceCards.first()).toBeVisible({ timeout: 15_000 });

    // Debe haber al menos 1 card. En prod hoy hay ~22 servicios activos.
    const count = await serviceCards.count();
    expect(count, 'al menos 1 card de servicio').toBeGreaterThan(0);
});
