// e2e/specs/f2-2b/s8-mobile-380.spec.ts
// ---------------------------------------------------------------------------
// S8 — Viewport móvil 380×800. El grid de 8 campos de config F2 debe
// colapsar a 1 columna (sm:grid-cols-2 → grid-cols-1), y las filas de
// bloqueos deben quedar usables (los inputs no se salen del viewport).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoEfimero,
    borrarServicioResiliente,
    cleanupHuerfanos,
    ServicioEfimero,
} from '../../fixtures/servicio-efimero';
import { abrirEditorServicio, activarF2 } from '../../fixtures/panel-proveedor';

test.describe('S8 — Mobile 380px', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S8 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test.use({ viewport: { width: 380, height: 800 } });

    test('grid config F2 colapsa a 1 columna y bloqueos son usables', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);

        const minInput = page.locator('#estadia-min-noches');
        const maxInput = page.locator('#estadia-max-noches');

        // En viewport móvil (<640px), min y max noches deben estar en filas
        // distintas del layout — min encima de max (grid colapsa a 1 col).
        await minInput.scrollIntoViewIfNeeded();
        const minBox = await minInput.boundingBox();
        const maxBox = await maxInput.boundingBox();
        expect(minBox, 'min noches debe tener bounding box').not.toBeNull();
        expect(maxBox, 'max noches debe tener bounding box').not.toBeNull();
        // En 1 columna: max.y > min.y + min.height (uno debajo del otro)
        expect(maxBox!.y).toBeGreaterThan(minBox!.y + minBox!.height - 5);
        // Ambos anchos casi ocupan el viewport. Umbral 280 tolera padding
        // real del modal (2×p-3 = 24px, más padding externo, más scrollbar).
        expect(minBox!.width).toBeGreaterThanOrEqual(280);
        expect(maxBox!.width).toBeGreaterThanOrEqual(280);

        // Agregar bloqueo — la fila debe ser usable en 380px
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();
        const fila = page.locator('#blackout-row-0');
        await fila.scrollIntoViewIfNeeded();
        const filaBox = await fila.boundingBox();
        expect(filaBox).not.toBeNull();
        // La fila no debe overflowear el viewport horizontalmente
        expect(filaBox!.width).toBeLessThanOrEqual(380);

        // Los inputs de fecha son clickeables
        const dateInputs = fila.locator('input[type="date"]');
        await expect(dateInputs.first()).toBeVisible();
        await expect(dateInputs.nth(1)).toBeVisible();

        // Motivo también accesible
        await expect(fila.getByPlaceholder(/Motivo/i)).toBeVisible();
    });
});
