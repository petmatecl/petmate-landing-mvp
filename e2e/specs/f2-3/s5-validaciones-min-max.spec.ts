// e2e/specs/f2-3/s5-validaciones-min-max.spec.ts
// ---------------------------------------------------------------------------
// S5 — Validaciones min_noches / max_noches inline en el picker.
// Fixture: min=3, max=5. Rango de 2 noches → error inline "mínima 3".
// Rango de 6 noches → error inline "máxima 5".
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import {
    abrirModalReservaEstadia,
    seleccionarRangoPorDia,
    fechaFuturoYmd,
    navegarPickerAMes,
} from '../../fixtures/panel-tutor';

test.describe.serial('S5 — Validaciones inline min/max noches', () => {
    let servicio: ServicioCuidadoListo;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        await cleanupHuerfanosF23(supabase, proveedorId);
        servicio = await crearServicioCuidadoConF2(supabase, {
            proveedorId,
            minNoches: 3,
            maxNoches: 5,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('rango 2 noches (menor a min) → error "mínima de 3 noches"', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        // Ambos días caen en el mismo mes calendario: elegimos ventana que no
        // cruce cambio de mes. Rango 2 noches: desde=+10, hasta=+12.
        const desde = fechaFuturoYmd(10);
        const hasta = fechaFuturoYmd(12);
        // Ambos deben quedar en el mismo mes (si no, s5 asume el "hasta" no
        // existe en el mes visible → salta test como no-aplica ese día).
        if (desde.month !== hasta.month) test.skip(true, 'rango cruza cambio de mes — corre spec en otra fecha');
        await navegarPickerAMes(page, desde.month, desde.year);
        await seleccionarRangoPorDia(page, desde.day, hasta.day);
        await expect(page.getByText(/estadía mínima es de 3 noches/i)).toBeVisible();
    });

    test('rango 6 noches (mayor a max) → error "máxima de 5 noches"', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        const desde = fechaFuturoYmd(10);
        const hasta = fechaFuturoYmd(16);
        if (desde.month !== hasta.month) test.skip(true, 'rango cruza cambio de mes — corre spec en otra fecha');
        await navegarPickerAMes(page, desde.month, desde.year);
        await seleccionarRangoPorDia(page, desde.day, hasta.day);
        await expect(page.getByText(/estadía máxima es de 5 noches/i)).toBeVisible();
    });
});
