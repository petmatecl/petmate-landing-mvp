// e2e/specs/tipo-b/lote-2-tutor-panel.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 2 (2026-09-09) — 4 callers del panel tutor cubiertos
// con EstadoError:
//
//   1. /favoritos — tab Servicios: 3 queries encadenadas (favoritos +
//      servicios_publicados + hidratación proveedores). Cualquier fallo
//      en favoritos o servicios_publicados dispara banner "No pudimos
//      cargar tus favoritos" reemplazando la grilla.
//   2. /favoritos — tab Proveedores: 2 queries (favoritos + proveedores_
//      publicos). Mismo banner.
//   3. /usuario (DashboardContent) — sección Mensajes: query conversations
//      con embed messages. Banner "No pudimos cargar tus mensajes" dentro
//      del box de la sidebar.
//   4. /usuario — sección Servicios consultados: query conversations con
//      embed servicios_publicados!inner. Banner "No pudimos cargar tus
//      servicios consultados" reemplaza el empty state + listado.
//
// Reseñas pendientes: no probamos aquí — es bloque condicional (nudge) y
// aplica silent + log Sentry por diseño (no afirma ausencia).
//
// Todos corren bajo project `chromium-tutor` (Camila = tutor storageState).
// Routing configurado en playwright.config.ts:213 via filename convention
// (`*tutor*.spec.ts` → chromium-tutor project).
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

test.describe('tipo-b lote 2 — tutor panel', () => {

    // 1+2. /favoritos — banner cubre ambos tabs con el mismo copy.
    //      Bloqueamos `favoritos*` (primera query siempre corre — ambos tabs
    //      la ejercen). Verificamos por tab que arrancó el fetch.
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

    // 3. /usuario dashboard — sección Mensajes (conversations query).
    //    Bloquear conversations* rompe también la sección Servicios consultados
    //    (misma tabla en 2 queries distintas). Ambas secciones muestran su
    //    propio banner por diseño (error state por sección independiente).
    test.describe('dashboard tutor — mensajes + servicios consultados', () => {
        test('1) control positivo: sin bloqueo → sin banners', async ({ page }) => {
            await page.goto('/usuario');
            await expect(page.getByRole('heading', { name: /Servicios que has consultado/i })).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('No pudimos cargar tus mensajes')).not.toBeVisible();
            await expect(page.getByText('No pudimos cargar tus servicios consultados')).not.toBeVisible();
        });

        test('2) negativo: bloqueo conversations* → ambos banners visibles', async ({ page }) => {
            await page.route('**/rest/v1/conversations*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/usuario');
            await expect(page.getByText('No pudimos cargar tus mensajes')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('No pudimos cargar tus servicios consultados')).toBeVisible();
            // Ambos banners tienen su propia sublinea + Reintentar.
            const sublineas = page.getByText('Revisa tu conexión y vuelve a intentar.');
            await expect(sublineas.first()).toBeVisible();
            const reintentarBtns = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtns.first()).toBeVisible();
        });

        test('3) recuperación mensajes: desbloquear + Reintentar en el banner de mensajes → ese banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/conversations*', handler);
            await page.goto('/usuario');
            await expect(page.getByText('No pudimos cargar tus mensajes')).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/conversations*', handler);
            // Cada sección tiene su propio Reintentar. Click en el banner de
            // mensajes (segunda ocurrencia — el primer Reintentar es de la
            // sección servicios consultados, arriba en el DOM order).
            // Alternativa robusta: locator del banner específico + botón anidado.
            const bannerMensajes = page.locator('div', { hasText: 'No pudimos cargar tus mensajes' }).first();
            await bannerMensajes.getByRole('button', { name: 'Reintentar' }).click();
            await expect(page.getByText('No pudimos cargar tus mensajes')).not.toBeVisible({ timeout: 15_000 });
        });
    });
});
