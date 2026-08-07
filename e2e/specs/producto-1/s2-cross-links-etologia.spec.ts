// e2e/specs/producto-1/s2-cross-links-etologia.spec.ts
// ---------------------------------------------------------------------------
// PR2 sprint PRODUCTO-1 — cross-links Etología ↔ Adiestramiento en el
// explorador.
//
// Verifica que:
//  (a) `/explorar?categoria=adiestramiento` muestra chip "¿Agresividad,
//      miedos o ansiedad? → Etología y conducta".
//  (b) `/explorar?categoria=etologia` muestra chip "¿Obediencia y hábitos?
//      → Adiestramiento".
//  (c) Click en el chip cambia el filtro `categoria` en la URL sin recargar.
//
// No requiere fixtures de servicios — los chips deben aparecer aunque no
// haya servicios de la categoría (la categoría existe en STATIC_CATEGORIES
// del explorer, y la migration insertó `etologia` en categorias_servicio).
//
// REQUIERE aplicada la migration `migrations/20260731_categoria_etologia.sql`
// en staging DB, para que el filtro `categoria=etologia` no rebote (aunque
// el chip visual funciona sin migration, el segundo assert de navegación
// requiere que la categoría exista en el catálogo cliente).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test.describe('PR2 S2 — cross-links Etología ↔ Adiestramiento en /explorar', () => {
    test('adiestramiento muestra chip → etología, y clickeable cambia el filtro', async ({ page }) => {
        await page.goto('/explorar?categoria=adiestramiento');

        // Chip cross-link visible con label esperado.
        const chip = page.getByTestId('cross-link-categoria');
        await expect(chip).toBeVisible({ timeout: 10_000 });
        await expect(chip).toContainText(/Agresividad, miedos o ansiedad/i);
        await expect(chip).toContainText(/Etología y conducta/i);

        // Click cambia el filtro en la URL (updateQueryParams push).
        await chip.click();
        await expect(page).toHaveURL(/categoria=etologia/, { timeout: 5_000 });

        // Post-navegación: ahora el chip apunta al reverso (adiestramiento).
        await expect(chip).toContainText(/Obediencia y hábitos/i);
        await expect(chip).toContainText(/Adiestramiento/i);
    });

    test('etologia muestra chip → adiestramiento (entrada directa por URL)', async ({ page }) => {
        await page.goto('/explorar?categoria=etologia');

        const chip = page.getByTestId('cross-link-categoria');
        await expect(chip).toBeVisible({ timeout: 10_000 });
        await expect(chip).toContainText(/Obediencia y hábitos/i);
        await expect(chip).toContainText(/Adiestramiento/i);
    });

    test('en otras categorías (ej. paseos) el chip NO aparece', async ({ page }) => {
        await page.goto('/explorar?categoria=paseos');

        // El chip solo aparece cuando la categoría filtro está en CROSS_LINKS.
        // Paseos no tiene cross-link → chip ausente.
        await expect(page.getByTestId('cross-link-categoria')).toHaveCount(0);
    });
});
