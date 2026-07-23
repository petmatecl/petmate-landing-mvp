// e2e/specs/f2-3/s1-picker-render.spec.ts
// ---------------------------------------------------------------------------
// S1 — El picker de rango de noches se renderiza cuando el servicio tiene
// capacidad_estadia populada. Chequea header del modal, hints de config
// (min/max noches, check-in/out) y presencia del DayPicker.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAsProveedor, getProveedorId } from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import { abrirModalReservaEstadia } from '../../fixtures/panel-tutor';

test.describe.serial('S1 — Picker de rango de noches se renderiza con F2 ON', () => {
    let servicio: ServicioCuidadoListo;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanosF23(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S1 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoConF2(supabase, {
            proveedorId,
            capacidadEstadia: 1,
            minNoches: 2,
            maxNoches: 14,
            cancelacionMinHoras: 48,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        });
        console.log(`[S1 beforeAll] Servicio F2 creado: ${servicio.titulo} (${servicio.id})`);
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('modal se abre con título "Reservar estadía" + hint de config + DayPicker visible', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);

        await expect(page.getByRole('heading', { name: /Reservar estadía/i })).toBeVisible();

        // Hint de rango de noches.
        await expect(page.getByText(/Estadía entre 2 y 14 noches/i)).toBeVisible();

        // Hint de check-in/out con las horas exactas.
        await expect(page.getByText(/Check-in:/i)).toBeVisible();
        await expect(page.getByText(/15:00/)).toBeVisible();
        await expect(page.getByText(/11:00/)).toBeVisible();

        // DayPicker presente (root .rdp).
        await expect(page.locator('.rdp')).toBeVisible();

        // Submit btn presente con copy F2.
        await expect(page.getByRole('button', { name: /Confirmar reserva/i })).toBeVisible();

        // Copy del pie: "La reserva queda confirmada al instante en las noches que elijas."
        await expect(page.getByText(/confirmada al instante.*noches/i)).toBeVisible();
    });
});
