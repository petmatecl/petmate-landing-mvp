// e2e/specs/incidente-usuario-fix/regresion.spec.ts
// ---------------------------------------------------------------------------
// Sprint incidente-usuario-fix (2026-09-24) — 3 casos de regresión para el
// bug del boundary en /usuario capturado como Sentry issue JAVASCRIPT-NEXTJS-9
// (release 6774fbd). Los 3 tests cubren las 2 capas del fix + el redirect
// server-side que siempre estuvo correcto y no debe romperse.
//
// Fix:
//   - Capa 1: pages/mensajes.tsx defaultReturn tutor '/usuario' → '/mis-reservas'
//     + copy dinámico "Volver al Panel" (proveedor) / "Volver a mis reservas"
//     (tutor).
//   - Capa 2: pages/[categoria]/index.tsx guard `if (!categoria) return
//     <NotFoundContent />` para no reventar cuando el slug no matchea el
//     getStaticPaths y el hydrate cliente-side renderiza sin data.
//
// Corren bajo chromium-tutor (storage state tutor de Camila). Los tests 2
// y 3 no requieren auth realmente, pero corren en el mismo project por
// simplicidad — el storage state no interfiere con navegación anónima.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test.describe.serial('incidente-usuario-fix · regresión', () => {
    test('1) botón "Volver a mis reservas" en /mensajes navega a /mis-reservas sin crash', async ({ page }) => {
        // Escuchar console.error del ErrorBoundary — si el fallback UI
        // apareciera, componentDidCatch loguea "ErrorBoundary caught:".
        const boundaryErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('ErrorBoundary caught:')) {
                boundaryErrors.push(msg.text());
            }
        });

        await page.goto('/mensajes');
        // La página carga con auth tutor; el botón "Volver a mis reservas"
        // aparece en el heading.
        const btn = page.getByRole('link', { name: 'Volver a mis reservas' });
        await expect(btn).toBeVisible({ timeout: 10_000 });

        // Verificar el href apunta a /mis-reservas (no /usuario).
        await expect(btn).toHaveAttribute('href', '/mis-reservas');

        // Click SPA → navega a /mis-reservas.
        await btn.click();
        await expect(page).toHaveURL(/\/mis-reservas$/, { timeout: 10_000 });

        // Cero pantalla "Algo salió mal" del boundary — el heading correcto
        // debe estar visible.
        await expect(
            page.getByRole('heading', { name: 'Algo salió mal' }),
        ).toHaveCount(0);

        // Cero console.error del boundary durante el flow.
        expect(
            boundaryErrors.length,
            `esperado 0 boundary catches en el flow /mensajes → /mis-reservas. Vistos: ${boundaryErrors.length}`,
        ).toBe(0);
    });

    test('2) URL directa a /usuario respeta el redirect 307 server-side → /explorar', async ({ page }) => {
        // Navegación desde afuera (URL directa) = request pathname `/usuario`
        // → redirect del next.config.js aplica → destino /explorar.
        await page.goto('/usuario', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/explorar$/, { timeout: 10_000 });
    });

    test('3) SPA navigation a categoría inexistente renderiza NotFoundContent, cero crash del render', async ({ page }) => {
        // Escuchar boundary catches — si el guard `if (!categoria)` faltara,
        // el hydrate del client reventaría sobre `categoria.nombre` y
        // dispararía el fallback UI del ErrorBoundary.
        const boundaryErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('ErrorBoundary caught:')) {
                boundaryErrors.push(msg.text());
            }
        });

        // Arrancar en / y hacer SPA navigation (no goto) a una categoría
        // que NO está en getStaticPaths — mismo path del bug original.
        await page.goto('/');
        await page.evaluate(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            if (w.next?.router?.push) {
                w.next.router.push('/categoria-inexistente-para-regresion');
            } else {
                location.href = '/categoria-inexistente-para-regresion';
            }
        });

        // El NotFoundContent muestra el heading "Página no encontrada" y
        // el CTA "Explorar servicios" DENTRO del main (para discriminar del
        // link del Header nav que también dice "Explorar servicios" y
        // dispara strict mode violation al usar el selector amplio —
        // observado en run 36058976874, corregido con scoping a main).
        await expect(
            page.getByRole('heading', { name: 'Página no encontrada' }),
        ).toBeVisible({ timeout: 10_000 });
        await expect(
            page.getByRole('main').getByRole('link', { name: /Explorar servicios/i }),
        ).toBeVisible();

        // Cero fallback "Algo salió mal" — si aparece, el guard no funcionó.
        await expect(
            page.getByRole('heading', { name: 'Algo salió mal' }),
        ).toHaveCount(0);
        expect(
            boundaryErrors.length,
            `esperado 0 boundary catches. Vistos: ${boundaryErrors.length}`,
        ).toBe(0);
    });
});
