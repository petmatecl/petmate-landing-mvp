// e2e/specs/f2-3/s6-cancelacion-dentro-ventana.spec.ts
// ---------------------------------------------------------------------------
// S6 — Cancelación de reserva F2 confirmada DENTRO de la ventana. Reserva
// a >48h del check-in con cancelacion_min_horas_antes=48. Camila cancela
// desde /mis-solicitudes → endpoint /api/agendamientos/cancelar → toast
// success + estado=cancelada en BD.
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
    preInsertarReservaConfirmada,
    type ServicioCuidadoListo,
} from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente } from '../../fixtures/servicio-efimero';
import { irAMisSolicitudes } from '../../fixtures/panel-tutor';

function chileMidnightUtcIso(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const guessUtcMs = Date.UTC(y, m - 1, d, 0, 0);
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(new Date(guessUtcMs));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    const chileWallMs = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return new Date(guessUtcMs - (chileWallMs - guessUtcMs)).toISOString();
}

function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

test.describe.serial('S6 — Cancelación dentro de ventana vía endpoint', () => {
    let servicio: ServicioCuidadoListo;
    let reservaId: string;

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();
        await cleanupHuerfanosF23(supabaseProv, proveedorId);

        servicio = await crearServicioCuidadoConF2(supabaseProv, {
            proveedorId,
            cancelacionMinHoras: 48,
        });

        // Reserva a +10 días (bien dentro de la ventana). INSERT como Camila
        // — RLS `agendamientos_tutor_insert` exige tutor_id ∈ tutores del
        // auth.uid(); el proveedor no puede insertar con tutor_id ajeno.
        const desdeYmd = ymdEnFuturo(10);
        const hastaYmd = ymdEnFuturo(12);
        reservaId = await preInsertarReservaConfirmada(supabaseTutor, {
            servicioId: servicio.id,
            proveedorId,
            tutorId,
            fechaDesdeIso: chileMidnightUtcIso(desdeYmd),
            fechaFinIso: chileMidnightUtcIso(hastaYmd),
            capacidadSnapshot: 1,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('cancelar reserva a +10 días → toast success + BD estado=cancelada', async ({ page }) => {
        await irAMisSolicitudes(page);

        // Card de la reserva con el título del servicio efímero.
        const card = page.locator('article').filter({ hasText: servicio.titulo }).first();
        await expect(card).toBeVisible({ timeout: 15_000 });

        // Click "Cancelar reserva".
        await card.getByRole('button', { name: /Cancelar reserva/i }).click();

        // Dialog abre con copy "Cancelar reserva" (sweep #3 taxonomía —
        // toda confirmada F1/F2/legacy usa el mismo título).
        await expect(page.getByRole('heading', { name: /Cancelar reserva/i })).toBeVisible({ timeout: 5_000 });

        // Confirmar en el dialog.
        await page.getByRole('button', { name: /^Cancelar reserva$/i }).click();

        // Toast success.
        await expect(page.locator('li[data-sonner-toast]').getByText(/Cancelación enviada/i).first())
            .toBeVisible({ timeout: 15_000 });

        // BD via MCP tutor: la reserva está cancelada.
        const supabaseTutor = getSupabaseAsTutor();
        const { data: r, error } = await supabaseTutor
            .from('agendamientos')
            .select('estado')
            .eq('id', reservaId)
            .single();
        expect(error).toBeNull();
        expect(r?.estado).toBe('cancelada');
    });
});
