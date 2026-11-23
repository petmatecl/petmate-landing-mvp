import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Check 3 de 6.
 *
 * Ficha proveedor — toma el primer id dinámico de /explorar, navega a
 * /proveedor/[id], status < 400 + H1 del proveedor visible.
 *
 * En Pawnecta, /proveedor/[id] usa UUIDs. Resolvemos el UUID dinámicamente
 * desde /explorar → abrir primera ficha de servicio → tomar el link al
 * perfil del proveedor. Zero hardcode, resiliente si cambian los datos.
 */

test('Ficha proveedor /proveedor/[id] responde sin error', async ({ page }) => {
    // 1. Explorar + primera card de servicio.
    await page.goto('/explorar');
    const firstCard = page.locator('a[href^="/servicio/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/servicio\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // 2. Desde la ficha de servicio, encontrar el link al perfil público del
    //    proveedor. Las fichas tienen typically un link href="/proveedor/<uuid>"
    //    o un botón "Ver perfil completo" apuntando ahí.
    const proveedorLink = page.locator('a[href^="/proveedor/"]').first();
    await expect(proveedorLink).toBeVisible({ timeout: 10_000 });

    // 3. Capturar el href + navegar + verificar respuesta.
    const href = await proveedorLink.getAttribute('href');
    expect(href, 'link debe ser /proveedor/<uuid>').toMatch(/^\/proveedor\/[0-9a-f-]{36}/i);

    const resp = await page.goto(href!);
    expect(resp?.status(), 'ficha proveedor debe responder 2xx/3xx').toBeLessThan(400);

    // 4. Verificar que NO es la página "no encontrado o inactivo".
    const bodyText = (await page.locator('body').textContent()) ?? '';
    expect(bodyText.toLowerCase()).not.toContain('no encontrado o inactivo');

    // 5. H1 (nombre del proveedor) visible.
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = (await h1.textContent())?.trim() ?? '';
    expect(h1Text.length, 'H1 del proveedor no vacío').toBeGreaterThan(0);
});
