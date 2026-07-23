// e2e/fixtures/servicio-cuidado-listo.ts
// ---------------------------------------------------------------------------
// F2-3-E — crea servicios de cuidado con F2 (agenda por rango de noches)
// activo, listos para que Camila (tutora) los reserve desde el picker.
// Convención de prefijo `e2e-f2-3-` para distinguir de los `e2e-f2-2b-`
// que crea la suite del editor de proveedor.
//
// Opciones al crear:
//   - `cancelacionMinHoras`: default 48. Override para specs s6/s7 que
//     testean la ventana de cancelación.
//   - `blackouts`: array de {fecha, fecha_fin} para pintar días bloqueados
//     en el picker (spec s2).
//   - `minNoches` / `maxNoches`: override para spec s5 (validaciones inline).
//
// Cleanup resiliente (borra excepciones + servicio) — mismo patrón que
// servicio-efimero.ts. cleanupHuerfanosF23 filtra por edad para no pisar
// servicios activos de otros specs paralelos (mismo criterio que F2-2B).
// ---------------------------------------------------------------------------
import { SupabaseClient } from '@supabase/supabase-js';
import { resolverCategoriaIdPorSlug, borrarServicioResiliente } from './servicio-efimero';

export const E2E_F2_3_TITULO_PREFIX = 'e2e-f2-3-';

export type ServicioCuidadoListo = {
    id: string;
    titulo: string;
    proveedorId: string;
    capacidadEstadia: number;
    minNoches: number;
    maxNoches: number | null;
    cancelacionMinHoras: number;
};

export type BlackoutInput = {
    fecha: string;          // YYYY-MM-DD
    fecha_fin: string;      // YYYY-MM-DD (> fecha, semi-abierto)
    motivo?: string | null;
};

export type CrearServicioCuidadoOptions = {
    proveedorId: string;
    capacidadEstadia?: number;      // default 1
    minNoches?: number;             // default 1
    maxNoches?: number | null;      // default null (sin tope)
    cancelacionMinHoras?: number;   // default 48
    checkInHora?: string | null;    // 'HH:MM' o null (default null)
    checkOutHora?: string | null;   // idem
    blackouts?: BlackoutInput[];    // default vacio
};

/**
 * Crea un servicio de cuidado F2-listo: activo, agendamiento_habilitado,
 * capacidad_estadia populada + config del picker + opcionalmente blackouts
 * insertados en excepciones_disponibilidad.
 */
export async function crearServicioCuidadoConF2(
    supabase: SupabaseClient,
    opts: CrearServicioCuidadoOptions,
): Promise<ServicioCuidadoListo> {
    const categoriaId = await resolverCategoriaIdPorSlug(supabase, 'cuidado');
    const titulo = `${E2E_F2_3_TITULO_PREFIX}${Date.now()}`;
    const capacidadEstadia = opts.capacidadEstadia ?? 1;
    const minNoches = opts.minNoches ?? 1;
    const maxNoches = opts.maxNoches ?? null;
    const cancelacionMinHoras = opts.cancelacionMinHoras ?? 48;

    // Snapshot exacto de la config F2 que el picker consulta. Todos los
    // campos requeridos por el fetch de disponibilidad-noches (ver
    // pages/api/servicios/[id]/disponibilidad-noches.ts) + los que
    // consumen los emails F2-3-B (check_in_hora, check_out_hora).
    const { data, error } = await supabase
        .from('servicios_publicados')
        .insert({
            proveedor_id: opts.proveedorId,
            categoria_id: categoriaId,
            titulo,
            descripcion: 'Servicio efímero F2-3 e2e — se elimina automáticamente.',
            precio_desde: 15000,
            unidad_precio: 'por noche',
            acepta_perros: true,
            acepta_gatos: false,
            acepta_otras: false,
            tamanos_aceptados: ['pequeño', 'mediano'],
            fotos: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
            comunas_cobertura: ['Providencia'],
            activo: true,
            agendamiento_habilitado: true,
            // F2-1 schema — config del picker.
            capacidad_estadia: capacidadEstadia,
            min_noches: minNoches,
            max_noches: maxNoches,
            cancelacion_min_horas_antes: cancelacionMinHoras,
            check_in_hora: opts.checkInHora ?? null,
            check_out_hora: opts.checkOutHora ?? null,
            anticipacion_min_dias: 0,   // sin anticipación mínima para tests — evita bloquear "mañana"
            anticipacion_max_dias_estadia: 366,
        })
        .select('id, titulo')
        .single();
    if (error || !data) {
        throw new Error(`[servicio-cuidado-listo] INSERT falló: ${error?.message ?? 'sin data'}`);
    }
    const servicioId = data.id as string;

    // Blackouts opcionales — dominio F2 (fecha_fin NOT NULL, hora_desde
    // NOT NULL check queda como null porque F2 son días completos, matchea
    // el CHECK trilogía shape del schema F2-1).
    if (opts.blackouts && opts.blackouts.length > 0) {
        const { error: blkErr } = await supabase
            .from('excepciones_disponibilidad')
            .insert(opts.blackouts.map(b => ({
                servicio_id: servicioId,
                fecha: b.fecha,
                fecha_fin: b.fecha_fin,
                hora_desde: null,
                hora_hasta: null,
                motivo: b.motivo ?? null,
            })));
        if (blkErr) {
            // Cleanup del servicio si los blackouts fallan.
            await borrarServicioResiliente(supabase, servicioId).catch(() => {});
            throw new Error(`[servicio-cuidado-listo] INSERT blackouts falló: ${blkErr.message}`);
        }
    }

    return {
        id: servicioId,
        titulo: data.titulo as string,
        proveedorId: opts.proveedorId,
        capacidadEstadia,
        minNoches,
        maxNoches,
        cancelacionMinHoras,
    };
}

/**
 * Barre huérfanos e2e-f2-3-* del proveedor. Corre en beforeAll para
 * limpiar residuos de corridas abortadas. Filtro por edad (30 min default)
 * evita pisar servicios recién creados de specs paralelos — mismo criterio
 * que cleanupHuerfanos de F2-2B.
 */
export async function cleanupHuerfanosF23(
    supabase: SupabaseClient,
    proveedorId: string,
    opts?: { olderThanMinutes?: number },
): Promise<{ borrados: number; errores: number; titulos: string[] }> {
    const olderThanMinutes = opts?.olderThanMinutes ?? 30;
    const cutoffIso = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
    const { data, error } = await supabase
        .from('servicios_publicados')
        .select('id, titulo')
        .eq('proveedor_id', proveedorId)
        .like('titulo', `${E2E_F2_3_TITULO_PREFIX}%`)
        .lt('created_at', cutoffIso);
    if (error) {
        console.warn('[servicio-cuidado-listo] cleanupHuerfanosF23 SELECT falló:', error.message);
        return { borrados: 0, errores: 1, titulos: [] };
    }
    if (!data || data.length === 0) return { borrados: 0, errores: 0, titulos: [] };

    let borrados = 0;
    let errores = 0;
    const titulos: string[] = [];
    for (const s of data as Array<{ id: string; titulo: string }>) {
        titulos.push(s.titulo);
        try {
            await borrarServicioResiliente(supabase, s.id);
            borrados++;
        } catch {
            errores++;
        }
    }
    return { borrados, errores, titulos };
}

/**
 * Setea temporalmente `cancelacion_min_horas_antes` en un servicio.
 * Usado por spec s7 para forzar ventana cerrada en una reserva cercana.
 * Cero side-effects más allá del UPDATE de esa columna. Retorna el valor
 * original para que el afterAll lo restaure.
 */
export async function setCancelacionMinHoras(
    supabase: SupabaseClient,
    servicioId: string,
    horas: number,
): Promise<void> {
    const { error } = await supabase
        .from('servicios_publicados')
        .update({ cancelacion_min_horas_antes: horas })
        .eq('id', servicioId);
    if (error) {
        throw new Error(`[servicio-cuidado-listo] setCancelacionMinHoras falló: ${error.message}`);
    }
}

/**
 * Pre-inserta un agendamiento confirmado F2 (bypasa el picker del tutor —
 * simula que otro tutor ya reservó esas noches). Usado por spec s4a-race:
 * el tutor real intenta reservar el mismo rango → EXCLUDE rebota 23P01.
 *
 * NOTA: usa el JWT del proveedor (crea reserva "como si viniera del picker"
 * pero salta el ownership natural — es un fixture, no un flow real).
 * `capacidad_snapshot_estadia` populado con el valor pasado.
 */
export type ReservaPreInsertadaOptions = {
    servicioId: string;
    proveedorId: string;
    tutorId: string;
    fechaDesdeIso: string;   // ISO UTC (medianoche Chile del check-in)
    fechaFinIso: string;     // idem check-out
    capacidadSnapshot: number;
};

export async function preInsertarReservaConfirmada(
    supabase: SupabaseClient,
    opts: ReservaPreInsertadaOptions,
): Promise<string> {
    const { data, error } = await supabase
        .from('agendamientos')
        .insert({
            servicio_id: opts.servicioId,
            proveedor_id: opts.proveedorId,
            tutor_id: opts.tutorId,
            fecha_preferida: opts.fechaDesdeIso,
            fecha_fin: opts.fechaFinIso,
            estado: 'confirmada',
            capacidad_snapshot_estadia: opts.capacidadSnapshot,
            tutor_nombre: 'e2e-fixture',
        })
        .select('id')
        .single();
    if (error || !data) {
        throw new Error(`[servicio-cuidado-listo] preInsertarReservaConfirmada falló: ${error?.message ?? 'sin data'}`);
    }
    return data.id as string;
}
