// e2e/specs/f2-3/s8-bypass-rls-cerrado.spec.ts
// ---------------------------------------------------------------------------
// S8 — Verifica que la migration 20260723_agendamientos_cancel_rls_f2.sql
// bloquea el bypass del endpoint via anon UPDATE. Como Camila, intentar
// UPDATE directo sobre una reserva F2 confirmada suya → 0 filas afectadas
// (política filtra el USING).
//
// Este spec automatiza la V2 de la migration que originalmente quedó como
// verificación manual de Aldo.
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

test.describe.serial('S8 — Bypass RLS cerrado post-migration F2-3-D', () => {
    let servicio: ServicioCuidadoListo;
    let reservaF2Id: string;

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

        // Reserva F2 confirmada. INSERT como Camila — RLS exige el tutor_id
        // pertenezca al auth.uid() del caller.
        reservaF2Id = await preInsertarReservaConfirmada(supabaseTutor, {
            servicioId: servicio.id,
            proveedorId,
            tutorId,
            fechaDesdeIso: chileMidnightUtcIso(ymdEnFuturo(15)),
            fechaFinIso: chileMidnightUtcIso(ymdEnFuturo(17)),
            capacidadSnapshot: 1,
        });
    });

    test.afterAll(async () => {
        if (!servicio) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicio.id);
    });

    test('UPDATE directo como tutor sobre reserva F2 confirmada → 0 filas', async () => {
        const supabaseTutor = getSupabaseAsTutor();

        // Attempt bypass: mismo query que un tutor con devtools ejecutaría.
        const { data, error } = await supabaseTutor
            .from('agendamientos')
            .update({ estado: 'cancelada' })
            .eq('id', reservaF2Id)
            .select();

        // No debe haber error de permisos (RLS es silente — filtra USING).
        expect(error).toBeNull();
        // Cero filas afectadas — la política excluye F2 confirmadas del USING.
        expect(data?.length ?? 0).toBe(0);

        // Verificar que la reserva sigue confirmada (defensa doble).
        const { data: verify } = await supabaseTutor
            .from('agendamientos')
            .select('estado')
            .eq('id', reservaF2Id)
            .single();
        expect(verify?.estado).toBe('confirmada');
    });
});
