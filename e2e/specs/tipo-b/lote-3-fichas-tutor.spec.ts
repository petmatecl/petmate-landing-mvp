// e2e/specs/tipo-b/lote-3-fichas-tutor.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 3 (2026-09-09) — ficha de servicio (/servicio/[id])
// como tutor. Callers Tipo B cerrados:
//
//   1. PreguntasSection.tsx — query `preguntas` → banner "No pudimos cargar
//      las preguntas" reemplaza el listado. Form para preguntar sigue
//      visible (no depende del fetch).
//   2. ReviewList.tsx — query principal `evaluaciones` → banner "No pudimos
//      cargar las evaluaciones" reemplaza la lista. Foto hidratación
//      cosmética (silent + log).
//
// Cobertura de gates action-flow del ServiceDetailView.tsx no se testea acá
// (los toasts se disparan solo al click en Escribir mensaje / Dejar reseña
// con la query bloqueada — requeriría estado tutor + botones específicos).
// Los cambios de fail-close aterrizan en el mismo PR con logging Sentry.
//
// Naming `*tutor*` en filename → chromium-tutor project (Camila
// storageState). Test dinámico: navegamos a /explorar, obtenemos el href
// del primer ServiceCard, y usamos ese URL. Evita depender de un id
// hardcoded en staging.
// ---------------------------------------------------------------------------
import { test, expect, type Route, type Page } from '@playwright/test';

/**
 * Obtiene el URL de la primer ficha de servicio disponible en /explorar.
 * Sirve para tests que necesitan una ficha real sin hardcode de id.
 */
async function obtenerUrlPrimeraFicha(page: Page): Promise<string> {
    await page.goto('/explorar');
    await expect(page.locator('a[href^="/servicio/"]').first()).toBeVisible({ timeout: 20_000 });
    const href = await page.locator('a[href^="/servicio/"]').first().getAttribute('href');
    if (!href) throw new Error('[lote-3] no encontramos ningún ServiceCard en /explorar');
    return href;
}

test.describe('tipo-b lote 3 — ficha servicio tutor', () => {

    // 1. PreguntasSection — 3 tests smoke: positivo, negativo, recuperación.
    test.describe('PreguntasSection — preguntas', () => {
        test('1) control positivo: sin bloqueo → sin banner', async ({ page }) => {
            const href = await obtenerUrlPrimeraFicha(page);
            await page.goto(href);
            await expect(page.getByRole('heading', { name: /Preguntas al proveedor/i })).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('No pudimos cargar las preguntas')).not.toBeVisible();
        });

        test('2) negativo: bloqueo preguntas* → banner', async ({ page }) => {
            const href = await obtenerUrlPrimeraFicha(page);
            await page.route('**/rest/v1/preguntas*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto(href);
            await expect(page.getByText('No pudimos cargar las preguntas')).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const href = await obtenerUrlPrimeraFicha(page);
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/preguntas*', handler);
            await page.goto(href);
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' }).first();
            await expect(reintentarBtn).toBeVisible({ timeout: 20_000 });
            await page.unroute('**/rest/v1/preguntas*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar las preguntas')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 2. ReviewList — 2 tests. La query filtra por servicio_id, así que el
    //    pattern de bloqueo es más específico. El primer positivo verifica
    //    que sin bloqueo el banner no aparece.
    test.describe('ReviewList — evaluaciones', () => {
        test('1) control positivo: sin bloqueo → sin banner', async ({ page }) => {
            const href = await obtenerUrlPrimeraFicha(page);
            await page.goto(href);
            await expect(page.getByRole('heading', { name: /Preguntas al proveedor/i })).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('No pudimos cargar las evaluaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner (cuando el servicio tiene reviews o lista intenta)', async ({ page }) => {
            const href = await obtenerUrlPrimeraFicha(page);
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto(href);
            // La ReviewList solo renderiza si servicioId o proveedorId hay.
            // Con evaluaciones bloqueadas, el fetch principal falla → banner.
            // Nota: si el servicio no tiene reviews, sin bloqueo ReviewList
            // devuelve null (no render); con bloqueo, error truthy →
            // <EstadoError> siempre aparece.
            await expect(page.getByText('No pudimos cargar las evaluaciones')).toBeVisible({ timeout: 20_000 });
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });
    });
});
