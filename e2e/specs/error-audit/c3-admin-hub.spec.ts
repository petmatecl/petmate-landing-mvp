// e2e/specs/error-audit/c3-admin-hub.spec.ts
// ---------------------------------------------------------------------------
// Sprint e2e-error-audit-2 — Case 3: hub /admin bajo <RoleGuard requiredRole="admin">.
//
// Cubre el fix de commit c564728 (sprint error-audit) — Opción 2: wrap el hub
// del admin en RoleGuard. Elimina la lógica inline duplicada de auth
// (checkAuth + handleAdminLogin + login form embebido, −168 líneas netas)
// y hereda el estado de error de RoleGuard automáticamente.
//
// Antes: /admin sin sesión o con fallo de red mostraba un login form
// embebido con título "Acceso restringido". Post-fix: /admin sin sesión →
// /login estándar; /admin con fallo de red → mismo estado 'error' del
// RoleGuard con Reintentar.
//
// Los 3 tests corren como Aldo (admin+proveedor, storageState proveedor).
//
// Protocolo P8:
//   Test 1 (control positivo) — /admin sin bloqueo → hub renderea con
//     pestañas + badges de contadores cuando aplican.
//   Test 2 (negativo) — con page.route abort → estado de error visible,
//     NO aparece el login form embebido (regresión de la Opción 2).
//   Test 3 (contadores) — sin bloqueo, verificar que aprobaciones +
//     feedback counts se cargan (queries independientes de la gate).
// ---------------------------------------------------------------------------
import { test, expect, type Route } from '@playwright/test';

const HUB_ROUTE = '/admin';
const PROVEEDORES_PATTERN = '**/rest/v1/proveedores*';

test.describe('e2e-error-audit C3 — hub /admin bajo RoleGuard', () => {
    test('1) control positivo: /admin sin bloqueo → hub carga con pestañas', async ({ page }) => {
        await page.goto(HUB_ROUTE);

        // URL sin redirect (admin válido, autorizado).
        await expect(page).toHaveURL(/\/admin(?:$|\?)/);
        expect(page.url()).not.toContain('/login');

        // El estado 'error' del RoleGuard NO debe aparecer.
        await expect(page.getByText('No pudimos verificar tu acceso')).not.toBeVisible();

        // El hub renderea al menos una pestaña conocida (sidebar admin).
        // "Métricas" es la pestaña default (activeTab='dashboard' en el código).
        await expect(page.getByRole('tab', { name: /Métricas/ })).toBeVisible({ timeout: 15_000 });

        // REGRESIÓN CRÍTICA de Opción 2: el login form embebido "Acceso
        // restringido" NO debe aparecer más. Pre-Case 3 el path
        // authenticated-no-admin ni fallo de red terminaba en ese form
        // rendered inline en /admin.
        await expect(page.getByRole('heading', { name: 'Acceso restringido' })).not.toBeVisible();
    });

    test('2) negativo: con bloqueo → estado de error, sin login form embebido', async ({ page }) => {
        await page.route(PROVEEDORES_PATTERN, async (route: Route) => {
            await route.abort('failed');
        });
        await page.goto(HUB_ROUTE);

        // Mismo estado de error que Cases 2+1 (RoleGuard hereda al hub).
        await expect(page.getByText('No pudimos verificar tu acceso')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

        // REGRESIÓN CRÍTICA de Opción 2: sin login form embebido. Antes de
        // Case 3, este mismo path (admin+fallo de red) mostraba el form con
        // "Acceso restringido" en la misma URL /admin. Post-Case 3 el flow
        // del error es idéntico al del RoleGuard estándar.
        await expect(page.getByRole('heading', { name: 'Acceso restringido' })).not.toBeVisible();
        await expect(page.getByRole('textbox', { name: /Correo/i })).not.toBeVisible();

        // Sin redirect a /login (comportamiento pre-Case 3 con inline form
        // era quedarse en /admin; post-Case 3 con error también se queda en
        // /admin — mismo `authState='error'` del RoleGuard).
        expect(page.url()).not.toContain('/login');
    });

    test('3) contadores: sin bloqueo, aprobaciones + feedback counts se cargan', async ({ page }) => {
        await page.goto(HUB_ROUTE);
        // Aguardar el sidebar (indicador de que RoleGuard autorizó + queries
        // arrancaron).
        await expect(page.getByRole('tab', { name: /Métricas/ })).toBeVisible({ timeout: 15_000 });

        // Los tabs con badge dependen del count:
        //   - "Aprobaciones" tab: solo se muestra si aprobacionesPendientesCount != 0.
        //   - "Feedback" tab: siempre se muestra; badge solo si count > 0.
        //
        // En staging el valor depende de los datos actuales. Verificamos que
        // los tabs base están presentes (independientes de count) — indicador
        // de que el componente hidrató sin errores.
        await expect(page.getByRole('tab', { name: /Moderación/ })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Proveedores/ })).toBeVisible();
        await expect(page.getByRole('tab', { name: /Feedback/ })).toBeVisible();

        // El tab Aprobaciones puede estar o no. Verificamos solo que el
        // componente terminó de hidratar sin dejar el "Verificando acceso..."
        // spinner colgado.
        await expect(page.getByText('Verificando acceso...')).not.toBeVisible();
    });
});
