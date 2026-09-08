// e2e/specs/error-audit/c5-perfil.spec.ts
// ---------------------------------------------------------------------------
// Sprint e2e-error-audit-2 — Case 5 líneas 40+51: fetchClientProfile en
// ClientLayout.tsx distingue "error de red" vs "sin perfil legítimo".
//
// Cubre el fix de commit da06fbc (sprint error-audit) — las 2 queries de
// fetchClientProfile (usuarios_buscadores + proveedores) destructuran
// `{ data, error }`. Si ANY .error → setProfileError + Sentry log + banner
// en el header con Reintentar. Badge "Usuario Verificado" condicionado a
// clientProfile !== null (antes era texto fijo → afirmación falsa).
//
// Los 4 tests corren bajo project `chromium-tutor-mobile` (Pixel 5 viewport
// + storageState tutor). Motivo: el badge y el avatar-upload trigger son
// `md:hidden` (mobile-only por diseño), fuera del viewport mobile no
// rendean.
//
// Protocolo P8:
//   Test 1 (control positivo) — sin bloqueo, banner ausente + badge presente.
//   Test 2 (negativo) — con bloqueo usuarios_buscadores*, banner + badge
//     ausente + children siguen rendering (layout es chrome, no gate).
//   Test 3 (retry con bloqueo) — click Reintentar re-invoca la query
//     (evidencia: counter de aborts sube).
//   Test 4 (recuperación) — desbloquear + Reintentar → banner desaparece,
//     badge aparece, sin recarga de página.
// ---------------------------------------------------------------------------
import { test, expect, type Page, type Route } from '@playwright/test';

const USUARIO_MASCOTAS_ROUTE = '/usuario/mascotas';
const USUARIOS_BUSCADORES_PATTERN = '**/rest/v1/usuarios_buscadores*';

async function blockBuscadoresQuery(page: Page): Promise<() => Promise<void>> {
    const handler = async (route: Route) => {
        await route.abort('failed');
    };
    await page.route(USUARIOS_BUSCADORES_PATTERN, handler);
    return async () => {
        await page.unroute(USUARIOS_BUSCADORES_PATTERN, handler);
    };
}

test.describe('e2e-error-audit C5-perfil — banner + badge condicionado', () => {
    test('1) control positivo: sin bloqueo → banner ausente, badge presente', async ({ page }) => {
        await page.goto(USUARIO_MASCOTAS_ROUTE);

        // Banner de error AUSENTE.
        await expect(page.getByText('No pudimos cargar tu perfil')).not.toBeVisible();

        // Badge "Usuario Verificado" PRESENTE (clientProfile cargado).
        // Tolerancia amplia para el fetch inicial en cold preview.
        await expect(page.getByText('Usuario Verificado')).toBeVisible({ timeout: 15_000 });
    });

    test('2) negativo: con bloqueo → banner + badge ausente + children rendean', async ({ page }) => {
        await blockBuscadoresQuery(page);
        await page.goto(USUARIO_MASCOTAS_ROUTE);

        // Banner del fix (fetchClientProfile Case 5-perfil):
        //   Título: "No pudimos cargar tu perfil"
        //   Sublínea: "Revisa tu conexión y vuelve a intentar."
        //   Botón: "Reintentar"
        await expect(page.getByText('No pudimos cargar tu perfil')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

        // Badge "Usuario Verificado" AUSENTE (clientProfile null → condicional
        // NO renderea — antes del fix era texto fijo, afirmación falsa).
        await expect(page.getByText('Usuario Verificado')).not.toBeVisible();

        // Layout NO bloquea children. La ruta /usuario/mascotas renderea su
        // propio contenido (título "Mis Mascotas" o placeholder). No verifica
        // texto específico del hijo (puede cambiar según diseño), solo que
        // la URL sigue siendo /usuario/mascotas + no hay redirect a /login.
        await expect(page).toHaveURL(/\/usuario\/mascotas/);
        expect(page.url()).not.toContain('/login');
    });

    test('3) retry con bloqueo activo → query re-ejecutada', async ({ page }) => {
        let blockedCount = 0;
        await page.route(USUARIOS_BUSCADORES_PATTERN, async (route: Route) => {
            blockedCount += 1;
            await route.abort('failed');
        });

        await page.goto(USUARIO_MASCOTAS_ROUTE);
        const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
        await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });

        const blockedAfterMount = blockedCount;
        expect(blockedAfterMount, 'mount debe ejercer al menos 1 query a usuarios_buscadores').toBeGreaterThan(0);

        // Click Reintentar → re-ejecuta fetchClientProfile via retryTrigger
        // en las deps del useEffect.
        await reintentarBtn.click();

        // Banner sigue visible (bloqueo aún activo, query aborta de nuevo).
        await expect(reintentarBtn).toBeVisible({ timeout: 10_000 });

        // Verificable por incremento del counter — evidencia observable de
        // que el retry re-invocó la query.
        await expect
            .poll(() => blockedCount, {
                message: 'Reintentar debe re-invocar usuarios_buscadores*',
                timeout: 10_000,
            })
            .toBeGreaterThan(blockedAfterMount);
    });

    test('4) recuperación: desbloquear + Reintentar → banner desaparece, badge aparece', async ({ page }) => {
        const unblock = await blockBuscadoresQuery(page);
        await page.goto(USUARIO_MASCOTAS_ROUTE);

        const reintentarBtn = page.getByRole('button', { name: 'Reintentar' });
        await expect(reintentarBtn).toBeVisible({ timeout: 15_000 });

        // Quitar el bloqueo — próxima query pasa a 200.
        await unblock();
        await reintentarBtn.click();

        // Banner desaparece.
        await expect(page.getByText('No pudimos cargar tu perfil')).not.toBeVisible({ timeout: 15_000 });

        // Badge reaparece (clientProfile cargado ok).
        await expect(page.getByText('Usuario Verificado')).toBeVisible({ timeout: 10_000 });

        // Sin recarga de página (mismo URL, mismo document — el retry es
        // in-place, no F5).
        await expect(page).toHaveURL(/\/usuario\/mascotas/);
    });
});
