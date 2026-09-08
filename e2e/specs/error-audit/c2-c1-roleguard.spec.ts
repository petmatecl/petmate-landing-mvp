// e2e/specs/error-audit/c2-c1-roleguard.spec.ts
// ---------------------------------------------------------------------------
// Sprint e2e-error-audit — Cases 2 + 1: RoleGuard distingue "error de red"
// vs "no autorizado".
//
// Cubre el fix de commit 3aeb627 (sprint error-audit) — el gate del
// RoleGuard destructura .error de la query fallback a proveedores. Antes:
// fallo transitorio de red caía al mismo router.push('/login') que "sin
// rol", expulsando admins reales igual que a un tutor sin permiso. Ahora:
// error truthy → estado 'error' con Reintentar + Sentry.captureMessage;
// sin error y sin fila → unauthorized flow (redirect a /login) intacto.
//
// Los 4 tests corren como Aldo (admin+proveedor, storageState proveedor).
// El control negativo con Camila (tutora → /login) va en otro spec para
// no mezclar storageStates (chromium vs chromium-tutor).
//
// Protocolo P8:
//   Test 1 (control positivo) — sin bloqueo, ruta renderea normal.
//   Test 2 (negativo) — con page.route abort, estado de error visible.
//   Test 3 (retry con bloqueo) — Reintentar re-ejecuta la query.
//   Test 4 (recuperación) — desbloquear + Reintentar → hub carga.
// ---------------------------------------------------------------------------
import { test, expect, type Page, type Route } from '@playwright/test';

// Cualquier subruta admin sirve — todas usan <RoleGuard requiredRole="admin">.
// /admin/servicios elegida porque es la más ejercitada en smokes manuales
// (verified en ACTA_ERROR_AUDIT.md §4.3 evidencia del smoke Cases 2+1).
const ADMIN_ROUTE = '/admin/servicios';

// Patrón de bloqueo: la query fallback del RoleGuard hace GET a
// /rest/v1/proveedores?select=roles,estado&auth_user_id=eq.<uuid>.
// El pattern **/rest/v1/proveedores* atrapa esa call (y cualquier otra a la
// tabla — aceptable, el hub /admin/servicios no depende de esa tabla para
// su render funcional post-gate, solo del gate mismo).
const PROVEEDORES_PATTERN = '**/rest/v1/proveedores*';

// Helper: activa route abort sobre la query de proveedores. Devuelve un
// desactivador que el test que quiera restaurar (ej. Test 4) puede llamar.
async function blockProveedoresQuery(page: Page): Promise<() => Promise<void>> {
    const handler = async (route: Route) => {
        await route.abort('failed');
    };
    await page.route(PROVEEDORES_PATTERN, handler);
    return async () => {
        await page.unroute(PROVEEDORES_PATTERN, handler);
    };
}

test.describe('e2e-error-audit C2+C1 — RoleGuard admin', () => {
    test('1) control positivo: /admin/servicios sin bloqueo → hub carga como admin', async ({ page }) => {
        await page.goto(ADMIN_ROUTE);

        // Sanity: URL NO redirigió a /login (el path de auth funciona).
        await expect(page).toHaveURL(/\/admin\/servicios/);
        expect(page.url()).not.toContain('/login');

        // El estado 'error' del RoleGuard NO debe aparecer.
        await expect(page.getByText('No pudimos verificar tu acceso')).not.toBeVisible();

        // El spinner "Verificando acceso..." se disipa. Tolerancia generosa
        // (15s) por cold-start del preview Vercel.
        await expect(page.getByText('Verificando acceso...')).not.toBeVisible({ timeout: 15_000 });
    });

    test('2) negativo: con bloqueo → estado de error + botón Reintentar, sin redirect', async ({ page }) => {
        await blockProveedoresQuery(page);
        await page.goto(ADMIN_ROUTE);

        // Estado 'error' esperado: 3 elementos del componente RoleGuard.tsx §170-179.
        await expect(page.getByText('No pudimos verificar tu acceso')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

        // Cero redirect a /login (comportamiento pre-fix era expulsar acá).
        expect(page.url()).not.toContain('/login');
        await expect(page).toHaveURL(/\/admin\/servicios/);
    });

    test('3) retry con bloqueo activo → estado repetido, query re-ejecutada', async ({ page }) => {
        let blockedCount = 0;
        await page.route(PROVEEDORES_PATTERN, async (route: Route) => {
            blockedCount += 1;
            await route.abort('failed');
        });

        await page.goto(ADMIN_ROUTE);
        const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
        await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });

        const blockedAfterMount = blockedCount;
        expect(blockedAfterMount, 'mount debe ejercer al menos 1 query a proveedores').toBeGreaterThan(0);

        // Click Reintentar → debe re-ejecutar la query fallback (evidencia:
        // el counter de aborts sube). El bloqueo sigue activo, así que el
        // estado UI se mantiene visible.
        await reintentarBtn.click();

        // Wait para que el retry gatille el useEffect (retryTrigger en deps).
        await expect(reintentarBtn).toBeVisible({ timeout: 10_000 });

        // Poll suave: en algunos runs Vercel el retry demora ~1-2s.
        await expect
            .poll(() => blockedCount, {
                message: 'blockedCount debe subir tras Reintentar',
                timeout: 10_000,
            })
            .toBeGreaterThan(blockedAfterMount);
    });

    test('4) recuperación: desbloquear + Reintentar → hub carga', async ({ page }) => {
        const unblock = await blockProveedoresQuery(page);
        await page.goto(ADMIN_ROUTE);

        const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
        await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });

        // Quitar el bloqueo — la próxima query a proveedores completa 200.
        await unblock();

        // Reintentar → useEffect re-corre → query pasa → authState='authorized'
        // → children del RoleGuard rendean → hub aparece.
        await reintentarBtn.click();

        // El estado de error debe desaparecer.
        await expect(page.getByText('No pudimos verificar tu acceso')).not.toBeVisible({ timeout: 15_000 });

        // Y NO redirect a /login (autorizado, no unauthorized).
        await expect(page).toHaveURL(/\/admin\/servicios/);
        expect(page.url()).not.toContain('/login');
    });
});
