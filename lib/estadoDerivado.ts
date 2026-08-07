// lib/estadoDerivado.ts
// ---------------------------------------------------------------------------
// PD1 sprint PRODUCTO-2 — estados DERIVADOS de reservas en UI, cero cambios
// de BD. Reserva la semántica canónica de familia (F2/F1/legacy) y fin
// efectivo del cron `recordatorio-reserva.ts:165-189` — helper puro,
// idempotente, testeable.
//
// Regla del brief (2026-08-04):
//   * `confirmada + fin efectivo pasado`          → `realizada`
//   * `pendiente + fecha_preferida pasada`        → `vencida`
//   * resto (cancelada, rechazada, cancelada_proveedor, confirmada futura,
//     pendiente futura) → sin cambio.
//
// Motivación: hallazgo PO en prod — solicitud pendiente con fecha 24-jul
// aún mostrándose activa, confirmada del 29-jul sin estado terminal. Los
// tutores no debían ver acciones imposibles ("Cancelar reserva" sobre una
// realizada, "Cancelar solicitud" sobre una vencida).
//
// La derivación es 100% client-side / render-time. Ninguna migration,
// ningún trigger, ninguna columna. La BD sigue guardando los 4 estados
// base (pendiente/confirmada/cancelada/rechazada) más `cancelada_proveedor`.
// ---------------------------------------------------------------------------

/**
 * Estados posibles en BD (columna agendamientos.estado).
 * `cancelada_proveedor` fue agregado en F1 agenda (proveedor cancela una
 * reserva confirmada-automática).
 */
export type EstadoBase =
    | 'pendiente'
    | 'confirmada'
    | 'cancelada'
    | 'rechazada'
    | 'cancelada_proveedor';

/**
 * Estados que la UI puede mostrar. Los dos nuevos (realizada / vencida) son
 * DERIVADOS — no viven en BD.
 */
export type EstadoDerivado = EstadoBase | 'realizada' | 'vencida';

/**
 * Familia canónica del agendamiento — misma semántica que el cron
 * (`recordatorio-reserva.ts:166-168`).
 *   F2: rango de noches del picker (capacidad_snapshot_estadia populada).
 *   F1: agenda con slot horario del picker (duracion_min populada).
 *   legacy: solicitudes V1/V2/V4a/V4b previas al schema F2-1.
 */
export type Familia = 'F2' | 'F1' | 'legacy';

/**
 * Input mínimo del helper. Puede recibir un objeto agendamiento directo o
 * un subset — solo lee los campos listados.
 */
export interface ReservaParaDerivar {
    estado: EstadoBase | string;
    fecha_preferida: string | null;             // ISO 8601 (null → no derivar)
    fecha_fin?: string | null;                  // ISO 8601 (F2 / legacy V2/V4a)
    duracion_min?: number | null;               // F1 agenda
    duracion_horas?: number | null;             // legacy V4b
    capacidad_snapshot_estadia?: number | null; // semáforo F2
}

/**
 * Devuelve la familia canónica. F2 tiene precedencia (mismo orden que el
 * cron para no divergir en edge cases donde ambas columnas estén populadas).
 */
export function familia(r: ReservaParaDerivar): Familia {
    if (r.capacidad_snapshot_estadia != null) return 'F2';
    if (r.duracion_min != null) return 'F1';
    return 'legacy';
}

/**
 * Devuelve el timestamp de fin efectivo en ms epoch. Réplica de la lógica
 * canónica del cron `recordatorio-reserva.ts:173-189`:
 *   F2:      fecha_fin (obligatorio).
 *   F1:      fecha_preferida + duracion_min minutos.
 *   legacy:  fecha_fin > (fecha_preferida + duracion_horas) > fecha_preferida.
 *
 * Retorna `null` sólo si F2 sin fecha_fin (dato malformado — el cron
 * hace `continue`, acá dejamos null para que el caller decida).
 */
export function finEfectivoMs(r: ReservaParaDerivar): number | null {
    const fam = familia(r);
    if (fam === 'F2') {
        if (!r.fecha_fin) return null;
        return new Date(r.fecha_fin).getTime();
    }
    if (!r.fecha_preferida) return null;   // sin fecha base no hay derivación
    if (fam === 'F1') {
        return new Date(r.fecha_preferida).getTime() + (r.duracion_min || 0) * 60_000;
    }
    // legacy
    if (r.fecha_fin) return new Date(r.fecha_fin).getTime();
    if (r.duracion_horas) return new Date(r.fecha_preferida).getTime() + r.duracion_horas * 3_600_000;
    return new Date(r.fecha_preferida).getTime();
}

/**
 * Estado a mostrar en la UI. Deriva `realizada` / `vencida` solo cuando
 * la BD dice `confirmada` / `pendiente` y el tiempo corresponde;
 * cualquier otro estado se devuelve tal cual (cancelada/rechazada/
 * cancelada_proveedor son terminales y no dependen del reloj).
 *
 * @param nowMs — reloj inyectable (default Date.now). Testeable puro.
 */
export function estadoDerivado(r: ReservaParaDerivar, nowMs: number = Date.now()): EstadoDerivado {
    // Confirmada + fin efectivo pasado → realizada.
    // El fin efectivo usa la duración del servicio (F1: fecha+duracion_min;
    // F2: fecha_fin; legacy: mejor dato). Sin duración conocida (legacy V1
    // puntual), fecha_preferida es el fin.
    if (r.estado === 'confirmada') {
        const fin = finEfectivoMs(r);
        if (fin != null && fin <= nowMs) return 'realizada';
        return 'confirmada';
    }
    // Pendiente + fecha_preferida pasada → vencida. Semántica del brief:
    // si la fecha del servicio ya llegó sin que el proveedor confirmara,
    // la solicitud caducó. Usa fecha_preferida (no fin efectivo) porque
    // el tutor solicitó "para esa fecha"; no confirmar antes = vencer.
    if (r.estado === 'pendiente') {
        if (!r.fecha_preferida) return 'pendiente'; // sin fecha no puede vencer
        const inicioMs = new Date(r.fecha_preferida).getTime();
        if (inicioMs <= nowMs) return 'vencida';
        return 'pendiente';
    }
    // Resto: cancelada, rechazada, cancelada_proveedor, o cualquier estado
    // desconocido — devolver tal cual. Los cancelados/rechazados no
    // "vencen"; su timeline terminó al cambiar de estado.
    return r.estado as EstadoDerivado;
}
