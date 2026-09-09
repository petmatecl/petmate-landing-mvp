// e2e/specs/tipo-b/lote-2-tutor-panel.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 2 (2026-09-09) — tutor panel.
//
// Alcance efectivo cubierto acá:
//   1. /favoritos — tab Servicios: 3 queries encadenadas (favoritos +
//      servicios_publicados + hidratación proveedores). Cualquier fallo
//      en favoritos o servicios_publicados dispara banner "No pudimos
//      cargar tus favoritos" reemplazando la grilla.
//   2. /favoritos — tab Proveedores: 2 queries (favoritos + proveedores_
//      publicos). Mismo banner.
//
// Alcance NO cubierto (hallazgo del lote):
//   * DashboardContent.tsx (imported solo desde pages/usuario.tsx) es DEAD
//     CODE en runtime: next.config.js:207-210 redirige 307 /usuario →
//     /explorar antes de que la página renderice. Los 4 callers Tipo B
//     listados en el BACKLOG (`components/Client/DashboardContent.tsx:87,
//     181, 191, 203`) están inalcanzables. Los cambios de código a
//     runReadQuery + EstadoError en ese archivo aterrizan en este PR de
//     todas formas por dos razones: (a) el diseño futuro correcto queda
//     documentado si el redirect se levanta; (b) el helper compartido
//     `fetchProveedoresPublicosByIds` gana logging Sentry aprovechando la
//     revisión. Reporte al PO en el body del PR para decidir: (i) borrar
//     el par pages/usuario.tsx + components/Client/DashboardContent.tsx en
//     un sprint housekeeping, o (ii) levantar el redirect y ejercer la
//     superficie tutor. Sin tests acá — no hay surface accesible desde el
//     browser para hacerlos verdes.
//
// Todos los tests corren bajo project `chromium-tutor` (Camila = tutor
// storageState). Routing configurado en playwright.config.ts:213 via
// filename convention (`*tutor*.spec.ts` → chromium-tutor project).
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

test.describe('tipo-b lote 2 — tutor panel', () => {

    // /favoritos — 4 tests cubren tab Servicios + Proveedores.
    //
    // Bloqueamos `favoritos*` (primera query siempre corre — ambos tabs la
    // ejercen). El banner es único para toda la vista; el título y las
    // tabs no dependen del fetch, siguen visibles bajo error state
    // (regla de diseño Fase 0 sprint tipo-b).
    test.describe('/favoritos', () => {
        test('1) control positivo tab Servicios: sin bloqueo → tabs visibles, sin banner', async ({ page }) => {
            await page.goto('/favoritos');
            await expect(page.getByRole('heading', { name: /Mis favoritos/i })).toBeVisible({ timeout: 15_000 });
            await expect(page.getByRole('tab', { name: /Servicios/i })).toBeVisible();
            await expect(page.getByText('No pudimos cargar tus favoritos')).not.toBeVisible();
        });

        test('2) negativo tab Servicios: bloqueo favoritos* → banner', async ({ page }) => {
            await page.route('**/rest/v1/favoritos*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/favoritos');
            await expect(page.getByText('No pudimos cargar tus favoritos')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación tab Servicios: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/favoritos*', handler);
            await page.goto('/favoritos');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/favoritos*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus favoritos')).not.toBeVisible({ timeout: 15_000 });
        });

        test('4) negativo tab Proveedores: bloqueo favoritos* → banner', async ({ page }) => {
            await page.route('**/rest/v1/favoritos*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/favoritos?tipo=proveedor');
            await expect(page.getByText('No pudimos cargar tus favoritos')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });
    });
});
