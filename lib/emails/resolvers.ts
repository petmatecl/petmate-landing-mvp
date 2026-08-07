// lib/emails/resolvers.ts
// ---------------------------------------------------------------------------
// ZB3 sprint ZONAB-1 — helpers puros para alimentar props `donde` y `fechaSub`
// de los 4 templates de email R7 (ReservaConfirmadaTutor / AgendamientoTutor /
// AgendamientoProveedor / AgendamientoCancelacionTutor).
//
// Lógica canónica compartida entre:
//   - notify-tutor-reserva-confirmada.ts (ReservaConfirmadaTutorEmail)
//   - notify-tutor.ts                    (AgendamientoTutorEmail)
//   - notify-proveedor.ts                (AgendamientoProveedorEmail)
//   - notify-proveedor-cancel.ts         (AgendamientoCancelacionTutorEmail)
//
// La misma lógica vive INLINE en `pages/api/cron/recordatorio-reserva.ts:207-266`.
// Se dejó inline por historial (helpers extraídos post-cron); unificar el cron
// con estos helpers queda como deuda light — el output es idéntico.
// ---------------------------------------------------------------------------
import { formatRangoNochesPartes } from '../formatFecha';
import { formatDireccionLinea } from '../formatDireccion';

/**
 * Devuelve el subtítulo debajo de la banda de fecha en el template.
 * Regla canónica (misma que el cron):
 *   * F2 / V2 / V4a (rango de noches): "(N noches)" — vía formatRangoNochesPartes.sub
 *   * F1 / V1 / V4b puntuales: null (sin sub).
 *
 * "F2 activa" se detecta por `capacidad_snapshot_estadia != null` (semáforo
 * canónico F2-3-B). Sin ese semáforo, `fecha_fin` presente indica legacy V2/V4a
 * (mismo render de rango); `duracion_horas` presente indica V4b (puntual, sin sub).
 */
export function resolverFechaSub(input: {
    fecha_preferida: string;
    fecha_fin: string | null;
    duracion_horas: number | null;
    capacidad_snapshot_estadia: number | null;
}): string | null {
    const esF2 = input.capacidad_snapshot_estadia != null;
    if (esF2 && input.fecha_fin) {
        return formatRangoNochesPartes(input.fecha_preferida, input.fecha_fin).sub || null;
    }
    if (input.duracion_horas != null) {
        // V4b legacy puntual con horas — sin sub.
        // Sweep #2 M8 (2026-08-07): `!= null` en vez de truthy check — evita
        // el falsy-0 trap (Auditoría #2 finding M8). Si un legacy tuviera
        // `duracion_horas === 0` con `fecha_fin` real, el `if (duracion_horas)`
        // caía al siguiente branch V2/V4a y devolvía "N noches" — sub
        // incorrecto para un puntual. Semáforo consistente con `esF2` arriba.
        return null;
    }
    if (input.fecha_fin) {
        // V2/V4a legacy — rango sin picker F2.
        return formatRangoNochesPartes(input.fecha_preferida, input.fecha_fin).sub || null;
    }
    // V1 puntual — sin sub.
    return null;
}

/**
 * Devuelve el string del bloque "Dónde" del email (dirección estructurada,
 * cascada). Regla canónica (misma que el cron):
 *   1. Dirección estructurada Ola 1 (o direccion_servicio legacy) —
 *      formatDireccionLinea. Aplica solo cuando modalidad_elegida='casa_tutor',
 *      pero el helper tolera nulls.
 *   2. Primera comuna de servicios_publicados.comunas_cobertura → "En {comuna}".
 *   3. Fallback: `null` (el caller decide qué copy usar — típicamente
 *      "Se coordina por chat con {otroNombre}").
 *
 * Notas del semáforo cascada:
 *   * Si el proveedor va a casa del tutor: dirección estructurada.
 *   * Si el servicio es en recinto del proveedor (paseos/hospedaje sin domicilio):
 *     primera comuna cubierta.
 *   * Si no hay ni una ni otra (ej. servicio puramente digital, o data
 *     incompleta): null → el caller resuelve fallback.
 */
export function resolverDonde(input: {
    agend: {
        region: string | null;
        comuna: string | null;
        calle: string | null;
        numero: string | null;
        direccion_info: string | null;
        direccion_servicio: string | null;
    };
    servicio: {
        comunas_cobertura?: string[] | null;
    };
}): string | null {
    const direccion = formatDireccionLinea({
        region: input.agend.region,
        comuna: input.agend.comuna,
        calle: input.agend.calle,
        numero: input.agend.numero,
        direccion_info: input.agend.direccion_info,
        direccion_servicio: input.agend.direccion_servicio,
    });
    if (direccion) return direccion;
    const comunasCobertura: string[] = Array.isArray(input.servicio.comunas_cobertura)
        ? input.servicio.comunas_cobertura
        : [];
    if (comunasCobertura.length > 0) return `En ${comunasCobertura[0]}`;
    return null;
}
