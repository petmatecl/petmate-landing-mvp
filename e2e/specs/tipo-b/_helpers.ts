// e2e/specs/tipo-b/_helpers.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b (2026-09-09) — helpers reusables para specs de la suite.
// Cada caller Tipo B agrega su smoke con pocas líneas via runTipoBSmoke().
//
// El nombre del archivo comienza con `_` para excluirlo del testMatch de
// Playwright (patrón `.spec.ts` en playwright.config.ts:109). Es solo
// helpers, no tests propios.
//
// Estructura canónica de un caller Tipo B smoke:
//   Test 1 — control positivo (sin bloqueo): la vista renderea normal,
//     sin EstadoError visible.
//   Test 2 — negativo (con bloqueo): EstadoError visible con título +
//     sublínea + botón Reintentar.
//   Test 3 — recuperación (unblock + Reintentar): EstadoError desaparece,
//     vista carga sin recarga de página.
//
// Uso canónico en un spec por caller:
//   import { runTipoBSmoke } from './_helpers';
//   test.describe('tipo-b — favoritos servicios', () => {
//     runTipoBSmoke({
//       route: '/favoritos',
//       blockPattern: '**\/rest/v1/favoritos*',
//       expectedErrorTitle: 'No pudimos cargar tus favoritos',
//     });
//   });
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

export interface TipoBSmokeOptions {
    /** Ruta relativa a probar (ej. '/favoritos', '/proveedor'). */
    route: string;
    /**
     * Pattern glob para bloquear en page.route (ej.
     * '**\/rest/v1/favoritos*'). Debe ser específico a la query del caller,
     * no bloquear más de la cuenta (evita romper otras queries de la misma
     * ruta).
     */
    blockPattern: string;
    /**
     * Texto exacto del EstadoError esperado (ej. "No pudimos cargar tus
     * favoritos"). Debe matchear el `titulo` prop del <EstadoError /> del
     * caller.
     */
    expectedErrorTitle: string;
    /**
     * (Opcional) Texto que debe estar visible en el control positivo cuando
     * la vista carga normal. Si no se pasa, control positivo solo verifica
     * que el EstadoError NO aparece.
     */
    expectedPositiveMarker?: string;
    /**
     * (Opcional) Título del describe. Default: `"tipo-b: <route>"`.
     */
    describeTitle?: string;
}

/**
 * Genera los 3 tests estándar (control positivo, negativo, recuperación)
 * para un caller Tipo B. Se llama desde dentro de un test.describe.
 */
export function runTipoBSmoke(opts: TipoBSmokeOptions) {
    const title = opts.describeTitle ?? `tipo-b: ${opts.route}`;
    test.describe(title, () => {
        test('1) control positivo: sin bloqueo → vista carga sin EstadoError', async ({ page }) => {
            await page.goto(opts.route);
            await expect(page.getByText(opts.expectedErrorTitle)).not.toBeVisible();
            if (opts.expectedPositiveMarker) {
                await expect(page.getByText(opts.expectedPositiveMarker)).toBeVisible({ timeout: 15_000 });
            }
        });

        test('2) negativo: con bloqueo → EstadoError visible + Reintentar', async ({ page }) => {
            await page.route(opts.blockPattern, async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto(opts.route);
            await expect(page.getByText(opts.expectedErrorTitle)).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → EstadoError desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route(opts.blockPattern, handler);
            await page.goto(opts.route);
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute(opts.blockPattern, handler);
            await reintentarBtn.click();
            await expect(page.getByText(opts.expectedErrorTitle)).not.toBeVisible({ timeout: 15_000 });
        });
    });
}
