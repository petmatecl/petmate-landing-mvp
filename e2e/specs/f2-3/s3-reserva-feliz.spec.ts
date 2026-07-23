// e2e/specs/f2-3/s3-reserva-feliz.spec.ts
// ---------------------------------------------------------------------------
// S3 — Camila selecciona rango válido, confirma, ve toast, la reserva
// aparece en /mis-solicitudes con estado confirmada. Verificación BD:
// fecha_preferida + fecha_fin + capacidad_snapshot_estadia + tutor_nombre.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import {
    getSupabaseAsProveedor,
    getSupabaseAsTutor,
    getProveedorId,
    getTutorId,
} from '../../fixtures/supabase';
import {
    crearServicioCuidadoConF2,
    cleanupHuerfanosF23,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import {
    abrirModalReservaEstadia,
    seleccionarRangoPorDia,
    clickConfirmarReserva,
    irAMisSolicitudes,
} from '../../fixtures/panel-tutor';

test.describe.serial('S3 — Reserva feliz + BD', () => {
    let servicio: ServicioCuidadoListo;
    // Fechas dentro del mes actual siempre que sea posible. Usamos días 20
    // y 22 (rango de 2 noches) — asume que hoy es antes del 18 para que
    // ambos estén en el mes actual. Si no, spec navega al mes siguiente.
    const desdeDay = 20;
    const hastaDay = 22;

    test.beforeAll(async () => {
        const supabase = getSupabaseAsProveedor();
        const proveedorId = await getProveedorId();
        const cleanup = await cleanupHuerfanosF23(supabase, proveedorId);
        if (cleanup.borrados > 0) {
            console.log(`[S3 beforeAll] Limpié ${cleanup.borrados} huérfano(s): ${cleanup.titulos.join(', ')}`);
        }
        servicio = await crearServicioCuidadoConF2(supabase, {
            proveedorId,
            minNoches: 1,
            maxNoches: 30,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('rango válido → toast + card en mis-solicitudes + BD verificada', async ({ page }) => {
        await abrirModalReservaEstadia(page, servicio.id);
        await expect(page.locator('.rdp')).toBeVisible();

        // Si el día 20 no está en el mes actual (hoy > 18 ó picker default
        // en otro mes), navegar al mes siguiente.
        const today = new Date().getDate();
        if (today >= desdeDay - 1) {
            const nextBtn = page.getByRole('button', { name: /Go to the Next Month|next month|Mes siguiente|Ir al mes siguiente/i }).first();
            if (await nextBtn.isVisible().catch(() => false)) {
                await nextBtn.click();
            }
        }

        await seleccionarRangoPorDia(page, desdeDay, hastaDay);

        // Preview del rango debe aparecer.
        await expect(page.getByText(/2 noches/)).toBeVisible();

        await clickConfirmarReserva(page);

        // Toast success.
        await expect(page.locator('li[data-sonner-toast]').getByText(/Reserva confirmada/i).first())
            .toBeVisible({ timeout: 15_000 });

        // Redirect / navegación a mis-solicitudes.
        await irAMisSolicitudes(page);

        // Card con el título del servicio efímero visible.
        await expect(page.getByText(servicio.titulo).first()).toBeVisible({ timeout: 15_000 });

        // Verificación BD via Supabase MCP tutor: la reserva existe con los
        // campos F2 esperados.
        const supabaseTutor = getSupabaseAsTutor();
        const tutorId = await getTutorId();
        const { data: reservas, error } = await supabaseTutor
            .from('agendamientos')
            .select('id, estado, fecha_preferida, fecha_fin, capacidad_snapshot_estadia, duracion_min, tutor_nombre')
            .eq('servicio_id', servicio.id)
            .eq('tutor_id', tutorId)
            .eq('estado', 'confirmada')
            .not('fecha_fin', 'is', null);
        expect(error).toBeNull();
        expect(reservas?.length ?? 0).toBeGreaterThanOrEqual(1);
        const r = reservas![0];
        expect(r.estado).toBe('confirmada');
        expect(r.fecha_fin).not.toBeNull();
        expect(r.capacidad_snapshot_estadia).toBe(1);
        expect(r.duracion_min).toBeNull();
        expect(r.tutor_nombre).toBeTruthy();
    });
});
