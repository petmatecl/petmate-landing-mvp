// e2e/specs/tipo-b/lote-4-admin-notificaciones.spec.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b lote 4 (2026-09-09) — /admin/notificaciones. 4 callers
// Tipo B cubiertos:
//
//   * Stats "Proveedores Pendientes" (count proveedores) → <EstadoErrorCompacto>
//     "—" cuando el count query falla.
//   * Stats "Contactos esta semana" (count eventos_tracking) → misma pantalla,
//     mismo compacto.
//   * Actividad reciente (proveedores + usuarios_buscadores) → banner
//     "No pudimos cargar la actividad reciente" reemplaza la lista.
//
// Corre bajo project `chromium` (Aldo = proveedor+admin storageState).
// El filename NO tiene "tutor", así que hereda el project default.
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

test.describe('tipo-b lote 4 — admin notificaciones', () => {
    test('1) control positivo: sin bloqueo → sin banners', async ({ page }) => {
        await page.goto('/admin/notificaciones');
        await expect(page.getByRole('heading', { name: /Centro de Notificaciones/i })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('No pudimos cargar este dato.')).not.toBeVisible();
        await expect(page.getByText('No pudimos cargar la actividad reciente')).not.toBeVisible();
    });

    test('2) negativo: bloqueo proveedores* → compacto "—" en pendientes + banner de actividad', async ({ page }) => {
        // Bloquear proveedores* rompe: (a) count proveedoresPendientes,
        // (b) recentProveedores del feed. Espero ambos síntomas.
        await page.route('**/rest/v1/proveedores*', async (route: Route) => {
            await route.abort('failed');
        });
        await page.goto('/admin/notificaciones');
        await expect(page.getByRole('heading', { name: /Centro de Notificaciones/i })).toBeVisible({ timeout: 15_000 });
        // Compacto: "—" en el card de Proveedores Pendientes.
        await expect(page.getByText('—').first()).toBeVisible({ timeout: 15_000 });
        // Banner de actividad (una de las 2 queries del feed falló).
        await expect(page.getByText('No pudimos cargar la actividad reciente')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    });

    test('3) recuperación: desbloquear + Reintentar del banner → banner desaparece', async ({ page }) => {
        const handler = async (route: Route) => await route.abort('failed');
        await page.route('**/rest/v1/proveedores*', handler);
        await page.goto('/admin/notificaciones');
        await expect(page.getByText('No pudimos cargar la actividad reciente')).toBeVisible({ timeout: 15_000 });
        await page.unroute('**/rest/v1/proveedores*', handler);
        // Reintentar del banner refetchea todo (fetchData). El compacto
        // también se limpia porque comparten fetchData.
        await page.getByRole('button', { name: 'Reintentar' }).click();
        await expect(page.getByText('No pudimos cargar la actividad reciente')).not.toBeVisible({ timeout: 15_000 });
    });

    test('4) negativo específico: bloqueo eventos_tracking* → compacto "—" solo en contactos', async ({ page }) => {
        // Este bloqueo NO rompe el feed (proveedores + usuarios_buscadores),
        // solo el segundo count. Verificamos que el banner de actividad NO
        // aparece (aisla el error a stats).
        await page.route('**/rest/v1/eventos_tracking*', async (route: Route) => {
            await route.abort('failed');
        });
        await page.goto('/admin/notificaciones');
        await expect(page.getByText('—').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('No pudimos cargar la actividad reciente')).not.toBeVisible();
    });
});
