// e2e/specs/tipo-b/lote-1-proveedor-dashboard.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 1 (2026-09-09) — 4 callers del panel proveedor cubiertos
// con EstadoError / EstadoErrorCompacto:
//
//   1. useProveedorStats (métricas del dashboard) — 6 stat cards muestran
//      <EstadoErrorCompacto> "—" cuando cualquier query del hook falla +
//      banner arriba con "No pudimos cargar tus métricas". Bloqueamos
//      evaluaciones* (última query del hook — al fallar setea error hook-
//      level; las 5 queries anteriores pasaron ok).
//   2. Tab Servicios — banner "No pudimos cargar tus servicios" cuando la
//      query a servicios_publicados falla. Bloqueamos servicios_publicados*.
//   3. Tab Evaluaciones — banner "No pudimos cargar tus evaluaciones".
//      Bloqueamos evaluaciones*.
//   4. Certificaciones (perfil > credenciales) — banner "No pudimos cargar
//      tus certificaciones". Bloqueamos certificaciones*.
//
// Todos corren bajo project chromium (Aldo = proveedor+admin storageState).
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

test.describe('tipo-b lote 1 — proveedor dashboard', () => {

    // 1. useProveedorStats — bloqueo del último query del hook (evaluaciones)
    //    fuerza el error path; las 5 queries previas pasan ok (secuencial).
    test.describe('estadísticas (useProveedorStats)', () => {
        test('1) control positivo: sin bloqueo → cards con números reales', async ({ page }) => {
            await page.goto('/proveedor?tab=estadisticas');
            await expect(page.getByRole('heading', { name: /Tus Resultados en Pawnecta/i })).toBeVisible({ timeout: 15_000 });
            // Banner de error NO debe aparecer.
            await expect(page.getByText('No pudimos cargar tus métricas')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner + al menos 1 card compacto', async ({ page }) => {
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/proveedor?tab=estadisticas');
            await expect(page.getByText('No pudimos cargar tus métricas')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/evaluaciones*', handler);
            await page.goto('/proveedor?tab=estadisticas');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/evaluaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus métricas')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 2. Tab Servicios — query servicios_publicados.
    test.describe('tab Servicios', () => {
        test('1) control positivo: sin bloqueo → tab carga', async ({ page }) => {
            await page.goto('/proveedor?tab=servicios');
            // Espera hasta que aparezca el heading de la sección o el
            // contenido del tab (button "Publicar" o listado o empty state).
            await expect(page.getByText('No pudimos cargar tus servicios')).not.toBeVisible();
        });

        test('2) negativo: bloqueo servicios_publicados* → banner', async ({ page }) => {
            await page.route('**/rest/v1/servicios_publicados*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/proveedor?tab=servicios');
            await expect(page.getByText('No pudimos cargar tus servicios')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/servicios_publicados*', handler);
            await page.goto('/proveedor?tab=servicios');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/servicios_publicados*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus servicios')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 3. Tab Evaluaciones — query evaluaciones.
    test.describe('tab Evaluaciones', () => {
        test('1) control positivo: sin bloqueo → tab carga', async ({ page }) => {
            await page.goto('/proveedor?tab=evaluaciones');
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner', async ({ page }) => {
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/proveedor?tab=evaluaciones');
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/evaluaciones*', handler);
            await page.goto('/proveedor?tab=evaluaciones');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/evaluaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 4. Certificaciones (perfil > credenciales).
    test.describe('perfil credenciales — certificaciones', () => {
        test('1) control positivo: sin bloqueo → sección carga', async ({ page }) => {
            await page.goto('/proveedor?tab=perfil&seccion=credenciales');
            await expect(page.getByText('No pudimos cargar tus certificaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo certificaciones* → banner', async ({ page }) => {
            await page.route('**/rest/v1/certificaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/proveedor?tab=perfil&seccion=credenciales');
            await expect(page.getByText('No pudimos cargar tus certificaciones')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/certificaciones*', handler);
            await page.goto('/proveedor?tab=perfil&seccion=credenciales');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/certificaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus certificaciones')).not.toBeVisible({ timeout: 15_000 });
        });
    });
});
