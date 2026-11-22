import { test, expect } from '@playwright/test';

/**
 * Sprint SMOKE-PROD-DIARIO (2026-11-23) — Spec 5 de 5.
 *
 * Carga /register?rol=usuario en prod, verifica que la página responde +
 * los campos de registro están visibles. Cero submit real (smoke, no signup).
 *
 * Esta página recibe tráfico directo desde ads Meta/Google. Si rompe, los
 * registros se frenan y el funnel completo se cae.
 */

test('/register?rol=usuario carga con campos visibles', async ({ page }) => {
    const resp = await page.goto('/register?rol=usuario');
    expect(resp?.status(), '/register debe responder 2xx/3xx').toBeLessThan(400);

    // El wizard de tutor empieza en step 2 cuando ?rol=usuario viene en query.
    // Debe haber inputs visibles para email + password al mínimo.
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput.first()).toBeVisible({ timeout: 10_000 });

    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });

    // Un botón submit / continuar debe existir. Lo buscamos por role sin
    // depender del copy exacto porque puede variar entre "Crear cuenta",
    // "Continuar", "Siguiente".
    const submitBtn = page.locator('button[type="submit"], button:has-text("Crear"), button:has-text("Continuar"), button:has-text("Siguiente")').first();
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
});
