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
import { test, expect, type Route } from '@playwright/test';

// Servicio real de staging (no es_ejemplo) usado para tests que deben
// ejercer los fetch client-side de PreguntasSection + ReviewList.
// Verificado 2026-09-09 con MCP staging: activo=true, proveedor Eduardo C.
// (`nombre_publico`), es_ejemplo=false. Si en el futuro esta fila se
// borra o desactiva, cambiar por otro id no-ejemplo (`SELECT sp.id FROM
// servicios_publicados sp JOIN proveedores p ON p.id=sp.proveedor_id
// WHERE sp.activo AND p.es_ejemplo IS DISTINCT FROM true LIMIT 1;`).
//
// Motivación del hardcode vs. selector dinámico de /explorar: la ficha
// de un proveedor con `es_ejemplo=true` corta el fetch de PreguntasSection
// (guard `if (isExample) return`) — el positivo pasaría, el negativo no
// dispararía la query bloqueada, banner nunca aparece → falso rojo.
const SERVICIO_STAGING_NO_EJEMPLO = '35c16aee-a471-4517-a0b8-56383dc6b579';
const FICHA_URL = `/servicio/${SERVICIO_STAGING_NO_EJEMPLO}`;

test.describe('tipo-b lote 3 — ficha servicio tutor', () => {

    // 1. PreguntasSection — 3 tests smoke: positivo, negativo, recuperación.
    test.describe('PreguntasSection — preguntas', () => {
        test('1) control positivo: sin bloqueo → sin banner', async ({ page }) => {
            await page.goto(FICHA_URL);
            await expect(page.getByRole('heading', { name: /Preguntas al proveedor/i })).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('No pudimos cargar las preguntas')).not.toBeVisible();
        });

        test('2) negativo: bloqueo preguntas* → banner', async ({ page }) => {
            await page.route('**/rest/v1/preguntas*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto(FICHA_URL);
            await expect(page.getByText('No pudimos cargar las preguntas')).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('Revisa tu conexión y vuelve a intentar.')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
        });

        test('3) recuperación: desbloquear + Reintentar → banner desaparece', async ({ page }) => {
            const handler = async (route: Route) => await route.abort('failed');
            await page.route('**/rest/v1/preguntas*', handler);
            await page.goto(FICHA_URL);
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
            await page.goto(FICHA_URL);
            await expect(page.getByRole('heading', { name: /Preguntas al proveedor/i })).toBeVisible({ timeout: 20_000 });
            await expect(page.getByText('No pudimos cargar las evaluaciones')).not.toBeVisible();
        });

        test('2) negativo: bloqueo evaluaciones* → banner (cuando el servicio tiene reviews o lista intenta)', async ({ page }) => {
            await page.route('**/rest/v1/evaluaciones*', async (route: Route) => {
                await route.abort('failed');
            });
            await page.goto(FICHA_URL);
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
