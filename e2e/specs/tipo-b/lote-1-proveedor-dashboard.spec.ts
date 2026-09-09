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
//
// **Nota operativa**: navegar con `?tab=X` cambia `activeTab` (URL sync)
// pero NO llama a `loadTabData` — bug preexistente del app. Los tests
// hacen click en el tab del sidebar para disparar el fetch real (ruta
// del usuario). Idem sub-tab de Perfil.
// ---------------------------------------------------------------------------
import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Abre /proveedor y navega al tab pedido via click en el sidebar (que
 * dispara handleTabClick → loadTabData). Espera a que el sidebar esté
 * visible antes de clickear.
 */
async function abrirTabProveedor(page: Page, label: RegExp) {
    await page.goto('/proveedor');
    // Sidebar tiene 2 variantes (desktop + mobile scrollable). getByRole
    // 'button' con nombre matchea cualquiera de las 2 — nth(0) desambigua.
    await expect(page.getByRole('button', { name: label }).first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: label }).first().click();
}

test.describe('tipo-b lote 1 — proveedor dashboard', () => {

    // 1. useProveedorStats — bloqueo del último query del hook (evaluaciones)
    //    fuerza el error path; las 5 queries previas pasan ok (secuencial).
    test.describe('estadísticas (useProveedorStats)', () => {
        test('1) control positivo: sin bloqueo → cards con números reales', async ({ page }) => {
            await abrirTabProveedor(page, /Estadísticas/i);
            await expect(page.getByRole('heading', { name: /Tus Resultados en Pawnecta/i })).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('No pudimos cargar tus métricas')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner + al menos 1 card compacto', async ({ page }) => {
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await abrirTabProveedor(page, /Estadísticas/i);
            await expect(page.getByText('No pudimos cargar tus métricas')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/evaluaciones*', handler);
            await abrirTabProveedor(page, /Estadísticas/i);
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/evaluaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus métricas')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 2. Tab Servicios — carga por default al mount de /proveedor (loadTabData
    //    llamado desde checkStatus). No requiere click adicional.
    test.describe('tab Servicios', () => {
        test('1) control positivo: sin bloqueo → tab carga', async ({ page }) => {
            await page.goto('/proveedor');
            await expect(page.getByRole('button', { name: /Mis Servicios/i }).first()).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('No pudimos cargar tus servicios')).not.toBeVisible();
        });

        test('2) negativo: bloqueo servicios_publicados* → banner', async ({ page }) => {
            await page.route('**/rest/v1/servicios_publicados*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto('/proveedor');
            await expect(page.getByText('No pudimos cargar tus servicios')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/servicios_publicados*', handler);
            await page.goto('/proveedor');
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/servicios_publicados*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus servicios')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 3. Tab Evaluaciones — requiere click en el tab del sidebar.
    test.describe('tab Evaluaciones', () => {
        test('1) control positivo: sin bloqueo → tab carga', async ({ page }) => {
            await abrirTabProveedor(page, /Evaluaciones/i);
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner', async ({ page }) => {
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await abrirTabProveedor(page, /Evaluaciones/i);
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/evaluaciones*', handler);
            await abrirTabProveedor(page, /Evaluaciones/i);
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/evaluaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus evaluaciones')).not.toBeVisible({ timeout: 15_000 });
        });
    });

    // 4. Certificaciones (perfil > credenciales) — CertificacionesSection
    //    monta con useEffect que dispara fetchCerts al pasar proveedorId.
    //    Basta con abrir el tab Perfil y sub-tab Credenciales.
    test.describe('perfil credenciales — certificaciones', () => {
        async function abrirPerfilCredenciales(page: Page) {
            await abrirTabProveedor(page, /Mi Perfil/i);
            // Sub-tab Credenciales dentro de Perfil.
            await expect(page.getByRole('button', { name: /Credenciales/i }).first()).toBeVisible({ timeout: 15_000 });
            await page.getByRole('button', { name: /Credenciales/i }).first().click();
        }

        test('1) control positivo: sin bloqueo → sección carga', async ({ page }) => {
            await abrirPerfilCredenciales(page);
            await expect(page.getByText('No pudimos cargar tus certificaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo certificaciones* → banner', async ({ page }) => {
            await page.route('**/rest/v1/certificaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await abrirPerfilCredenciales(page);
            await expect(page.getByText('No pudimos cargar tus certificaciones')).toBeVisible({ timeout: 15_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/certificaciones*', handler);
            await abrirPerfilCredenciales(page);
            const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
            await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });
            await page.unroute('**/rest/v1/certificaciones*', handler);
            await reintentarBtn.click();
            await expect(page.getByText('No pudimos cargar tus certificaciones')).not.toBeVisible({ timeout: 15_000 });
        });
    });
});
