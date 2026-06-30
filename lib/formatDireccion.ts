// lib/formatDireccion.ts
// ----------------------------------------------------------------------------
// Helpers de formato para direccion estructurada en agendamientos. Ola 1
// del feature "direcciones estructuradas". Reusados por:
//   - pages/proveedor/index.tsx (tab Solicitudes)
//   - pages/mis-solicitudes.tsx (lado tutor)
//   - pages/api/agendamientos/notify-*.ts (emails, Ola 1 commit 3)
//
// Si los campos estructurados (region/comuna/calle/numero) estan poblados,
// se usa el formato nuevo compacto en 1 linea. Sino, fallback al texto libre
// de `direccion_servicio` (legacy Fase 2) para no perder informacion de
// solicitudes historicas. `direccion_info` se renderiza aparte en una linea
// italica opcional (no entra en el string principal porque puede ser
// instrucciones largas).
// ----------------------------------------------------------------------------

export interface DireccionEstructurada {
    region: string | null;
    comuna: string | null;
    calle: string | null;
    numero: string | null;
    direccion_info: string | null;
    /** Legacy text field — fallback cuando los 4 estructurados son null. */
    direccion_servicio: string | null;
}

/**
 * "Mayecura 1290, Las Condes, Metropolitana" — formato compacto 1 linea.
 * Junta calle+numero con espacio, luego comuna, luego region, separados por
 * comas. Si algun componente es null, se omite gracefully (sin coma
 * doble ni espacio sobrante).
 *
 * Si los 4 campos estructurados (region, comuna, calle, numero) son todos
 * null pero direccion_servicio legacy esta poblado, devuelve direccion_servicio
 * tal cual.
 *
 * Si todo es null, devuelve null (caller decide ocultar el bloque).
 *
 * NO incluye direccion_info — esa va en linea italica separada porque puede
 * ser largo (instrucciones para el proveedor) y rompe la legibilidad
 * compacta.
 */
export function formatDireccionLinea(d: DireccionEstructurada): string | null {
    const tieneEstructurada = !!(d.region || d.comuna || d.calle || d.numero);
    if (tieneEstructurada) {
        const calleNumero = [d.calle, d.numero]
            .filter((x): x is string => !!x && x.trim().length > 0)
            .join(' ')
            .trim();
        const partes = [calleNumero, d.comuna, d.region]
            .filter(p => !!p && p.length > 0);
        return partes.length > 0 ? partes.join(', ') : null;
    }
    // Fallback legacy.
    return d.direccion_servicio && d.direccion_servicio.trim().length > 0
        ? d.direccion_servicio
        : null;
}
