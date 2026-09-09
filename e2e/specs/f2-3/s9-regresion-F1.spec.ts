// e2e/specs/f2-3/s9-regresion-F1.spec.ts
// ---------------------------------------------------------------------------
// S9 — Regresión F1. Camila cancela una reserva F1 (picker de bloque
// horario, capacidad_snapshot_estadia NULL). Debe seguir funcionando por
// UPDATE client como siempre — la migration del RLS F2-3-D NO afecta F1
// porque el USING excluye SOLO F2 (capacidad_snapshot_estadia NOT NULL).
//
// Este spec asegura que el fix del RLS no regresionó las cancelaciones
// F1 legacy.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import {
    getSupabaseAsProveedor,
    getSupabaseAsTutor,
    getProveedorId,
    getTutorId,
} from '../../fixtures/supabase';
import { E2E_F2_3_TITULO_PREFIX, cleanupHuerfanosF23 } from '../../fixtures/servicio-cuidado-listo';
import { borrarServicioResiliente, resolverCategoriaIdPorSlug } from '../../fixtures/servicio-efimero';

function ymdEnFuturo(dias: number): string {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

function chileMidnightUtcIso(ymd: string, horaHHMM: string = '10:00'): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const [hh, mm] = horaHHMM.split(':').map(Number);
    const guessUtcMs = Date.UTC(y, m - 1, d, hh, mm);
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

test.describe.serial('S9 — Regresión F1: UPDATE client de cancelación sigue OK', () => {
    let servicioF1Id: string;
    let reservaF1Id: string;

    test.beforeAll(async () => {
        const supabaseProv = getSupabaseAsProveedor();
        const supabaseTutor = getSupabaseAsTutor();
        const proveedorId = await getProveedorId();
        const tutorId = await getTutorId();
        await cleanupHuerfanosF23(supabaseProv, proveedorId);

        // Servicio de PASEOS con F1 activo (duracion_slot_min NOT NULL).
        // Lo crea el proveedor (RLS permite al owner INSERT en servicios_publicados).
        const categoriaId = await resolverCategoriaIdPorSlug(supabaseProv, 'paseos');
        const titulo = `${E2E_F2_3_TITULO_PREFIX}${Date.now()}-F1`;
        const { data: servicioData, error: servErr } = await supabaseProv
            .from('servicios_publicados')
            .insert({
                proveedor_id: proveedorId,
                categoria_id: categoriaId,
                titulo,
                descripcion: 'Servicio F1 efímero e2e — se elimina automáticamente.',
                precio_desde: 10000,
                unidad_precio: 'por paseo',
                acepta_perros: true,
                acepta_gatos: false,
                acepta_otras: false,
                tamanos_aceptados: ['pequeño', 'mediano'],
                fotos: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
                comunas_cobertura: ['Providencia'],
                activo: true,
                agendamiento_habilitado: true,
                duracion_slot_min: 60,   // F1 bandera
                capacidad_slot: 1,
                anticipacion_min_horas: 0,
                anticipacion_max_dias: 60,
            })
            .select('id')
            .single();
        if (servErr || !servicioData) {
            throw new Error(`[S9 beforeAll] INSERT servicio F1 falló: ${servErr?.message ?? 'sin data'}`);
        }
        servicioF1Id = servicioData.id as string;

        // Reserva F1 confirmada (duracion_min NOT NULL, capacidad_snapshot NOT NULL,
        // capacidad_snapshot_estadia NULL — bandera F1). INSERT como Camila —
        // RLS `agendamientos_tutor_insert` exige tutor_id ∈ auth.uid().
        const { data: reservaData, error: reservaErr } = await supabaseTutor
            .from('agendamientos')
            .insert({
                servicio_id: servicioF1Id,
                proveedor_id: proveedorId,
                tutor_id: tutorId,
                fecha_preferida: chileMidnightUtcIso(ymdEnFuturo(10), '10:00'),
                estado: 'confirmada',
                duracion_min: 60,
                capacidad_snapshot: 1,
                tutor_nombre: 'e2e-fixture-F1',
            })
            .select('id')
            .single();
        if (reservaErr || !reservaData) {
            throw new Error(`[S9 beforeAll] INSERT reserva F1 falló: ${reservaErr?.message ?? 'sin data'}`);
        }
        reservaF1Id = reservaData.id as string;
    });

    test.afterAll(async () => {
        if (!servicioF1Id) return;
        const supabase = getSupabaseAsProveedor();
        await borrarServicioResiliente(supabase, servicioF1Id);
    });

    test('UPDATE directo como tutor sobre reserva F1 confirmada → 1 fila, cancelada', async () => {
        const supabaseTutor = getSupabaseAsTutor();

        // Camila cancela SU reserva F1 vía UPDATE anon key. La política del
        // baseline `agendamientos_tutor_cancel` (post-migration F2-3-D)
        // sigue permitiendo esto porque el USING excluye SOLO F2
        // (capacidad_snapshot_estadia NOT NULL).
        const { data, error } = await supabaseTutor
            .from('agendamientos')
            .update({ estado: 'cancelada' })
            .eq('id', reservaF1Id)
            .select();
        expect(error).toBeNull();
        expect(data?.length ?? 0).toBe(1);

        const { data: verify } = await supabaseTutor
            .from('agendamientos')
            .select('estado')
            .eq('id', reservaF1Id)
            .single();
        expect(verify?.estado).toBe('cancelada');
    });
});
