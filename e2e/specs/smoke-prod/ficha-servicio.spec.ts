import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Spec 3 de 5.
 *
 * Abre /explorar, click en la primera card, verifica que la ficha de
 * servicio carga sin 404. El UUID se resuelve dinámicamente — si el
 * servicio 1 se borra, el smoke sigue trabajando con el siguiente.
 *
 * Smoke público, cero sesión.
 */

test('ficha de servicio abre desde /explorar sin 404', async ({ page }) => {
    // 1. Ir a /explorar y esperar la primera card.
    await page.goto('/explorar');
    const firstCard = page.locator('a[href^="/servicio/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });

    // 2. Capturar el href para verificar la URL post-click.
    const href = await firstCard.getAttribute('href');
    expect(href, 'card debe tener href /servicio/<uuid>').toMatch(/^\/servicio\/[0-9a-f-]{36}$/i);

    // 3. Click + esperar navegación.
    await firstCard.click();
    await page.waitForURL(/\/servicio\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // 4. Verificar que la ficha NO es 404. La página de servicio renderiza
    //    H1 con el título + un precio visible.
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = (await h1.textContent())?.trim() ?? '';
    expect(h1Text.length, 'H1 del servicio no vacío').toBeGreaterThan(0);
    // Convención del producto: títulos y copy de la ficha no dicen "404" ni
    // "no encontrado" cuando el servicio existe.
    const bodyText = await page.locator('body').textContent() ?? '';
    expect(bodyText.toLowerCase()).not.toContain('404');
    expect(bodyText.toLowerCase()).not.toContain('no encontrado o inactivo');
});
