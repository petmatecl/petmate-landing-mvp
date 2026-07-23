// e2e/specs/f2-2b/s2-preview-noches.spec.ts
// ---------------------------------------------------------------------------
// S2 — Preview "(N noches)" reactivo mientras se editan las fechas del
// bloqueo. Valida el helper nochesEntre() aplicado en la UI: 1 noche
// singular, N noches plural, respuesta inmediata al cambio de input.
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

/** YYYY-MM-DD a `d` días en el futuro (base UTC, safe para input type=date). */
function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

test.describe.serial('S2 — Preview reactivo de noches', () => {
    let servicio: ServicioEfimero;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanos(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S2 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoEfimero(supabase, proveedorId);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('agregar bloqueo muestra "(1 noche)" con default mañana → pasado', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();

        // Default = mañana → pasado mañana = 1 noche.
        const fila = page.locator('#blackout-row-0');
        await expect(fila).toBeVisible();
        await expect(fila.getByText('(1 noche)')).toBeVisible();
    });

    test('preview actualiza reactivo al mover fecha_fin', async ({ page }) => {
        await abrirEditorServicio(page, servicio.titulo);
        await activarF2(page);
        await page.getByRole('button', { name: '+ Agregar bloqueo' }).click();

        const fila = page.locator('#blackout-row-0');
        const [inputFecha, inputFechaFin] = await fila.locator('input[type="date"]').all();

        // Setear rango 7 noches
        await inputFecha.fill(ymdEnFuturo(1));
        await inputFechaFin.fill(ymdEnFuturo(8));
        await expect(fila.getByText('(7 noches)')).toBeVisible();

        // Ampliar a 30 noches — preview debe actualizar sin recargar
        await inputFechaFin.fill(ymdEnFuturo(31));
        await expect(fila.getByText('(30 noches)')).toBeVisible();

        // Reducir a 2 noches — plural correcto
        await inputFechaFin.fill(ymdEnFuturo(3));
        await expect(fila.getByText('(2 noches)')).toBeVisible();

        // Volver a 1 noche — singular
        await inputFechaFin.fill(ymdEnFuturo(2));
        await expect(fila.getByText('(1 noche)')).toBeVisible();
    });
});
