// lib/puedeCancelarPorVentana.ts
// ---------------------------------------------------------------------------
// Helper puro extraído en Sweep #1 (2026-08-07) tras auditoría #2 finding B3.
// Antes vivía inline como IIFE en pages/mis-solicitudes.tsx:685, imposible
// de testear unitariamente. La extracción permite el contra-test canónico:
// que el caso `fecha_preferida = null` retorne true (permitir la acción),
// el guard defensivo que la implementación previa NUNCA alcanzaba porque
// `?? 0` coerza a `new Date(0)` (epoch) que es un timestamp FINITE.
//
// Semántica: solo aplica ventana de cancelación a reservas F2 confirmadas.
// Para F1/legacy o pendientes/canceladas retorna true (sin restricción UX).
// La ventana enforcement autoritativo vive en el endpoint server-side;
// esta función es solo feedback UX (grey button + tooltip). Ver
// pages/api/agendamientos/cancelar.ts para la validación authoritative.
// ---------------------------------------------------------------------------

export interface PuedeCancelarInput {
    esReservaAgendaF2: boolean;
    isConfirmada: boolean;
    fecha_preferida: string | null;
    cancelacion_min_horas_antes?: number | null;
}

export const CANCELACION_MIN_HORAS_DEFAULT = 48;

/**
 * Determina si el botón "Cancelar reserva" debe estar habilitado según la
 * ventana de cancelación del servicio F2. Función pura, aceptable para
 * unit tests y re-uso desde otros contextos (proveedor view, admin, etc).
 *
 * @param input Datos de la reserva y config del servicio.
 * @param nowMs Timestamp actual (inyectable para tests). Default: Date.now().
 * @returns true si el botón debe estar habilitado, false si greyed por ventana cerrada.
 */
export function puedeCancelarPorVentana(input: PuedeCancelarInput, nowMs: number = Date.now()): boolean {
    // F1/legacy o no-confirmadas: sin ventana → siempre permitir.
    if (!input.esReservaAgendaF2 || !input.isConfirmada) return true;

    // Guard defensivo (finding B3): si NO hay fecha_preferida, no hay
    // ventana que enforce → permitir. El endpoint sigue siendo authoritative.
    if (!input.fecha_preferida) return true;

    // Segundo guard defensivo: fecha inválida en formato (ej. string
    // corrupto). Mismo criterio: permitir la acción, endpoint decide.
    const checkInMs = new Date(input.fecha_preferida).getTime();
    if (!Number.isFinite(checkInMs)) return true;

    const cancelacionMinHoras = input.cancelacion_min_horas_antes ?? CANCELACION_MIN_HORAS_DEFAULT;
    const horasHastaCheckIn = (checkInMs - nowMs) / 3_600_000;
    return horasHastaCheckIn >= cancelacionMinHoras;
}
