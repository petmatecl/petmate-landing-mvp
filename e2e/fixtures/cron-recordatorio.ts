// e2e/fixtures/cron-recordatorio.ts
// ---------------------------------------------------------------------------
// R6 — TREN RECORDATORIOS DE CITA. Helpers para specs API del endpoint
// /api/cron/recordatorio-reserva. NO tocan browser; construyen fixtures en
// BD (servicios F2 + agendamientos por familia) y limpian al terminar.
//
// FECHAS RELATIVAS: `fechaFuturoIso(horas)` retorna `now + N horas` como ISO
// UTC. Elegimos +24h para "mañana Chile" — pasa el filtro raw del endpoint
// [now+12h, now+36h] y `ymdChile(now+24h) === ymdChile(mañana)` en cualquier
// hora del día (agregar 24h siempre avanza al día calendario siguiente en
// TZ local — validado en `lib/nochesAgenda.test.ts` para DST invierno/verano).
//
// FAMILIAS SIMULADAS (semáforos canónicos F2-3-B):
//   F2:     capacidad_snapshot_estadia != null + fecha_fin populado
//   F1:     duracion_min != null + capacidad_snapshot_estadia null
//   legacy: ambos null (V1 puntual con hora, V4b con horas puntual, V2/V4a
//           con fecha_fin sin capacidad — cubrimos V1 como representante).
//
// TAG DE LIMPIEZA: `tutor_nombre = '[TEST-cron-{familia}-{ts}]'`. Este prefijo
// hace matchable el residuo por el check Fase 0 del checklist de merge del
// tren (`SELECT count(*) FROM agendamientos WHERE tutor_nombre LIKE '[TEST-%'`).
// cleanupAgendamientosDeTest() lo borra por servicio_id — la suite deja 0
// residuos si termina limpia.
//
// AUTH DEL CLIENTE: TUTOR (JWT del storageState `tutor.json`). La RLS de
// `agendamientos` exige `tutor_id = auth.uid()` en el INSERT — mismo patrón
// que `preInsertarReservaConfirmada` de `servicio-cuidado-listo.ts` que usa
// s4a-race.spec.ts. El proveedor solo participa creando el servicio_publicado
// (crearServicioCuidadoConF2). Los emails los resuelve el endpoint via
// `supabaseAdmin.auth.admin.getUserById()` — usa las cuentas reales del tutor
// y proveedor (Aldo y Camila en staging).
// ---------------------------------------------------------------------------
import { SupabaseClient } from '@supabase/supabase-js';

export type Familia = 'F1' | 'F2' | 'legacy';

export const TAG_TUTOR_NOMBRE_PREFIX = '[TEST-cron-';

export type AgendamientoInput = {
    servicioId: string;
    proveedorId: string;
    tutorId: string;
    familia: Familia;
    /** ISO UTC — inicio del servicio. */
    fechaPreferidaIso: string;
    /** ISO UTC — fin (obligatorio en F2, opcional en legacy V2/V4a, null en F1/V1). */
    fechaFinIso?: string | null;
    /** Duración en minutos (F1 exige > 0). Null para F2/legacy. */
    duracionMin?: number | null;
    /** Capacidad snapshot (F2 exige >= 1, default 1). Null para F1/legacy. */
    capacidadSnapshotEstadia?: number | null;
    /** Estado — default 'confirmada'. Override para tests de no-elegibles. */
    estado?: 'confirmada' | 'pendiente' | 'rechazada' | 'cancelada';
    /** Pre-poblar marca de tutor (test de idempotencia parcial). */
    recordatorioTutorEnviadoAt?: string | null;
    /** Pre-poblar marca de proveedor (test de idempotencia parcial). */
    recordatorioProveedorEnviadoAt?: string | null;
};

/**
 * ISO UTC de `now + N horas`. Con horas=24 el resultado siempre cae en el
 * día calendario "mañana" en TZ Chile (validado por los tests DST del repo),
 * y cae dentro de la ventana raw del endpoint [now+12h, now+36h].
 */
export function fechaFuturoIso(horas: number): string {
    return new Date(Date.now() + horas * 3_600_000).toISOString();
}

/** Cuenta ISO de "mañana Chile" — inicio del servicio, ~24h a futuro. */
export function fechaMananaIso(): string {
    return fechaFuturoIso(24);
}

/** Fin de estadía F2 — 48h a futuro (2 noches). */
export function fechaMananaMas1DiaIso(): string {
    return fechaFuturoIso(48);
}

/**
 * INSERT de un agendamiento simulado. Retorna el id creado.
 *
 * NOTA de compatibilidad de shape: F1 setea `duracion_min` (columna
 * populada), F2 setea `capacidad_snapshot_estadia` + `fecha_fin`, legacy V1
 * setea ambos NULL. El endpoint refina la familia por semáforos, así que
 * los inputs deben respetar ese contrato — sin él, un agendamiento cae en
 * la familia "legacy" por default.
 */
export async function insertarAgendamientoTest(
    supabase: SupabaseClient,
    opts: AgendamientoInput,
): Promise<string> {
    const familiaTag = opts.familia;
    const tutorNombre = `${TAG_TUTOR_NOMBRE_PREFIX}${familiaTag}-${Date.now()}]`;

    const row: Record<string, unknown> = {
        servicio_id: opts.servicioId,
        proveedor_id: opts.proveedorId,
        tutor_id: opts.tutorId,
        fecha_preferida: opts.fechaPreferidaIso,
        estado: opts.estado ?? 'confirmada',
        tutor_nombre: tutorNombre,
        recordatorio_tutor_enviado_at: opts.recordatorioTutorEnviadoAt ?? null,
        recordatorio_proveedor_enviado_at: opts.recordatorioProveedorEnviadoAt ?? null,
    };

    if (opts.familia === 'F2') {
        row.fecha_fin = opts.fechaFinIso ?? null;
        row.capacidad_snapshot_estadia = opts.capacidadSnapshotEstadia ?? 1;
    } else if (opts.familia === 'F1') {
        row.duracion_min = opts.duracionMin ?? 60;
    } else {
        // legacy V1 puntual (fecha_fin null + capacidad null + duracion_min null).
        if (opts.fechaFinIso) row.fecha_fin = opts.fechaFinIso;
    }

    const { data, error } = await supabase
        .from('agendamientos')
        .insert(row)
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(`[cron-recordatorio] INSERT (${familiaTag}) falló: ${error?.message ?? 'sin data'}`);
    }
    return data.id as string;
}

/**
 * Borra todos los agendamientos de un servicio (fixture). Resiliente —
 * loguea el error pero no throwea. Usado en `afterAll` de cada spec.
 */
export async function cleanupAgendamientosDeTest(
    supabase: SupabaseClient,
    servicioId: string,
): Promise<{ borrados: number; error: string | null }> {
    try {
        const { data, error } = await supabase
            .from('agendamientos')
            .delete()
            .eq('servicio_id', servicioId)
            .select('id');
        if (error) {
            console.warn(`[cron-recordatorio] cleanupAgendamientosDeTest ${servicioId} error:`, error.message);
            return { borrados: 0, error: error.message };
        }
        return { borrados: data?.length ?? 0, error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[cron-recordatorio] cleanupAgendamientosDeTest ${servicioId} throw:`, msg);
        return { borrados: 0, error: msg };
    }
}

/**
 * Actualiza una marca de un agendamiento (usado por specs de idempotencia
 * para "resetear" tras la 1ª corrida). Bypasa el endpoint; INSERT/UPDATE
 * directo con JWT del proveedor (RLS permite UPDATE de agendamientos del
 * propio proveedor).
 */
export async function setMarcasAgendamiento(
    supabase: SupabaseClient,
    agendamientoId: string,
    marcas: { tutor?: string | null; proveedor?: string | null },
): Promise<void> {
    const patch: Record<string, unknown> = {};
    if ('tutor' in marcas) patch.recordatorio_tutor_enviado_at = marcas.tutor;
    if ('proveedor' in marcas) patch.recordatorio_proveedor_enviado_at = marcas.proveedor;
    const { error } = await supabase
        .from('agendamientos')
        .update(patch)
        .eq('id', agendamientoId);
    if (error) throw new Error(`[cron-recordatorio] setMarcasAgendamiento falló: ${error.message}`);
}

/**
 * Lee las 2 marcas de un agendamiento post-corrida. Retorna raw ISO strings
 * o null. El assert de idempotencia usa este helper.
 */
export async function getMarcasAgendamiento(
    supabase: SupabaseClient,
    agendamientoId: string,
): Promise<{ tutor: string | null; proveedor: string | null }> {
    const { data, error } = await supabase
        .from('agendamientos')
        .select('recordatorio_tutor_enviado_at, recordatorio_proveedor_enviado_at')
        .eq('id', agendamientoId)
        .single();
    if (error || !data) {
        throw new Error(`[cron-recordatorio] getMarcasAgendamiento falló: ${error?.message ?? 'sin data'}`);
    }
    return {
        tutor: (data as { recordatorio_tutor_enviado_at: string | null }).recordatorio_tutor_enviado_at,
        proveedor: (data as { recordatorio_proveedor_enviado_at: string | null }).recordatorio_proveedor_enviado_at,
    };
}

/**
 * Construye la URL absoluta del endpoint cron contra staging.
 * `dryRun`, `bypassEnv` son opcionales — cada spec pasa lo que necesita.
 */
export function endpointUrl(
    baseURL: string,
    opts?: { dryRun?: boolean; bypassEnv?: boolean },
): string {
    const url = new URL('/api/cron/recordatorio-reserva', baseURL);
    if (opts?.dryRun) url.searchParams.set('dryRun', '1');
    if (opts?.bypassEnv ?? true) url.searchParams.set('bypassEnv', '1');
    return url.toString();
}

/**
 * Lee el CRON_SECRET desde el env de la suite. Throwea con un mensaje claro
 * si no está seteado — evita 401 confusos en los tests.
 */
export function requireCronSecret(): string {
    const s = process.env.E2E_STAGING_CRON_SECRET;
    if (!s || s.trim().length === 0 || s === 'cambiame') {
        throw new Error(
            '[cron-recordatorio] E2E_STAGING_CRON_SECRET no está seteado en e2e/.env.test. ' +
            'Copialo desde Vercel Dashboard → Settings → Environment Variables → CRON_SECRET (Preview scope) ' +
            'y pegalo en e2e/.env.test.'
        );
    }
    return s;
}
