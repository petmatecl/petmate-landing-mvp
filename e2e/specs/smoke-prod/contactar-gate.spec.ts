import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Spec 4 de 5.
 *
 * Abre la ficha de un servicio como anónimo, hace click en "Contactar" y
 * verifica que aparece el LoginRequiredModal (gate de auth). Es el CTA más
 * importante del funnel tutor — si el modal no aparece, hay regresión real.
 *
 * Smoke público, cero sesión. Si la ficha carga pero el modal no sale, el
 * spec falla y alerta.
 */

test('CTA "Contactar" en ficha abre LoginRequiredModal para anónimo', async ({ page }) => {
    // 1. Navegar a /explorar y abrir la primera ficha.
    await page.goto('/explorar');
    const firstCard = page.locator('a[href^="/servicio/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.waitForURL(/\/servicio\/[0-9a-f-]{36}/, { timeout: 15_000 });

    // 2. Encontrar el botón "Contactar" (puede aparecer como texto exacto
    //    o dentro de una action sheet mobile). Lo buscamos por texto porque
    //    es el copy canónico del producto.
    const contactarBtn = page.getByRole('button', { name: /contactar/i }).first();
    await expect(contactarBtn).toBeVisible({ timeout: 10_000 });

    // 3. Click + esperar el modal. El LoginRequiredModal tiene role="dialog"
    //    con aria-modal="true" + un título canónico.
    await contactarBtn.click();
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // 4. Verificar que es efectivamente el gate de login (y no otro modal).
    //    El título y los CTAs del gate son fijos.
    const modalText = await modal.textContent() ?? '';
    expect(modalText.toLowerCase()).toMatch(/inicia sesión|ingresar|registrar|cuenta/);
});
