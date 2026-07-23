// lib/nochesAgenda.ts
// ----------------------------------------------------------------------------
// Fase 2 agenda por rango de noches — DERIVACION PURA del calendario diario.
//
// Consumido por GET /api/servicios/[id]/disponibilidad-noches. Espejo
// estructural de lib/slotsAgenda.ts (F1) pero para el modelo Airbnb-like:
// el proveedor de estadias esta DISPONIBLE POR DEFAULT sobre todas las
// fechas futuras, y declara BLACKOUTS (excepciones_disponibilidad.fecha_fin
// NOT NULL) que restan. Ademas resta las confirmadas que ocupan cupo.
//
// Zona horaria: America/Santiago. Las fechas civiles (YYYY-MM-DD) no llevan
// TZ — son "el dia calendario chileno". Los timestamptz de agendamientos
// representan medianoche Chile del check-in/check-out; los convertimos a
// fecha civil chilena con ymdChile via Intl para respetar DST.
//
// ────────────────────────────────────────────────────────────────────────────
// SEMI-ABIERTO [) — la regla que rige TODO en F2:
// ────────────────────────────────────────────────────────────────────────────
//
// Un blackout con {fecha: X, fecha_fin: Y} bloquea las fechas [X, Y). Es
// decir, X, X+1, ..., Y−1 inclusive. El día Y NO esta bloqueado — es el
// "check-out" del blackout, dia libre para que otra estadía haga check-in.
//
// Idéntico para confirmadas: {fecha_preferida: X, fecha_fin: Y} ocupa una
// unidad de capacidad para las fechas [X, Y). Día Y no cuenta.
//
// Cuando la funcion decide si una fecha F esta ocupada por un rango R:
//   R.desde <= F && F < R.hasta      (semi-abierto)
//
// Es idéntico al comportamiento del helper SQL agend_estadia_range() del
// schema F2-1: `daterange(_start::date, _end::date, '[)')`. Con esto,
// cadenas de estadias contiguas (check-out del 15 = check-in del 15) NO
// solapan y ambas caben. Igual que Airbnb.
//
// Casos borde cubiertos:
//   - Fecha antes de today → razon 'pasado'.
//   - Fecha dentro de anticipacion_min_dias → razon 'anticipacion_min'.
//   - Fecha mas alla de anticipacion_max_dias_estadia → razon 'anticipacion_max'.
//   - Blackout que la cubre → razon 'blackout'.
//   - Sin blackout pero capacidad llena → razon 'lleno'.
//   - Confirmada F1 (fecha_fin IS NULL) → NO se considera. El fetch la excluye.
// ----------------------------------------------------------------------------

const CHILE_TZ = 'America/Santiago';

export type BlackoutRow = {
    fecha: string;      // check-in YYYY-MM-DD
    fecha_fin: string;  // check-out YYYY-MM-DD (> fecha, garantizado por CHECK)
};

export type ConfirmadaEstadiaRow = {
    fecha_preferida: string;  // ISO 8601 UTC (timestamptz)
    fecha_fin: string;        // ISO 8601 UTC (timestamptz), > fecha_preferida
};

export type NochesDerivInput = {
    capacidadEstadia: number;               // 1..20
    anticipacionMinDias: number;            // 0..30
    anticipacionMaxDiasEstadia: number;     // 1..730
    desde: string;                          // 'YYYY-MM-DD'
    hasta: string;                          // 'YYYY-MM-DD'
    blackouts: BlackoutRow[];
    confirmadas: ConfirmadaEstadiaRow[];
    now?: Date;                             // inyectable para tests; default new Date()
};

export type RazonDisponibilidad =
    | 'ok'
    | 'pasado'
    | 'anticipacion_min'
    | 'anticipacion_max'
    | 'blackout'
    | 'lleno';

export type DiaCalendario = {
    fecha: string;              // 'YYYY-MM-DD'
    disponible: boolean;        // ¿se puede empezar una estadía este día?
    restantes: number;          // capacidad_estadia − confirmadas_solapantes
    razon: RazonDisponibilidad;
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers de fecha civil chilena — sin librerias externas.
// ────────────────────────────────────────────────────────────────────────────

// 'YYYY-MM-DD' de un momento absoluto interpretado en Chile. Idéntico al de
// slotsAgenda.ts (mantengo local para que este módulo no dependa de otro).
export function ymdChile(utc: Date): string {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(utc);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

// Suma N dias a una fecha 'YYYY-MM-DD' — devuelve 'YYYY-MM-DD'. Chile no
// tiene dias de 23/25h por DST (el cambio ocurre a las 24:00, no en el
// medio), asi que Date.UTC + 86_400_000 avanza un dia calendario chileno
// exacto sin drift.
export function shiftDateYmd(fecha: string, dias: number): string {
    const [y, m, d] = fecha.split('-').map(Number);
    const t = Date.UTC(y, m - 1, d) + dias * 86_400_000;
    const dt = new Date(t);
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

// Itera fechas 'YYYY-MM-DD' de desde a hasta inclusive.
export function iterateDates(desde: string, hasta: string): string[] {
    const [y1, m1, d1] = desde.split('-').map(Number);
    const [y2, m2, d2] = hasta.split('-').map(Number);
    const start = Date.UTC(y1, m1 - 1, d1);
    const end = Date.UTC(y2, m2 - 1, d2);
    const out: string[] = [];
    for (let t = start; t <= end; t += 86_400_000) {
        const dt = new Date(t);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        out.push(`${y}-${m}-${d}`);
    }
    return out;
}

// Compara dos fechas civiles 'YYYY-MM-DD' — devuelve -1, 0, 1.
// (El orden lexicográfico coincide con el cronológico para ISO 8601.)
function cmpYmd(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Derivacion principal — funcion pura, testeable.
// ────────────────────────────────────────────────────────────────────────────

export function derivarDisponibilidadNoches(input: NochesDerivInput): DiaCalendario[] {
    const {
        capacidadEstadia,
        anticipacionMinDias, anticipacionMaxDiasEstadia,
        desde, hasta,
        blackouts, confirmadas,
    } = input;
    const now = input.now ?? new Date();

    // Fecha civil chilena de "hoy" — base para anticipación mín/máx.
    const todayYmd = ymdChile(now);
    const minFecha = shiftDateYmd(todayYmd, anticipacionMinDias);
    const maxFecha = shiftDateYmd(todayYmd, anticipacionMaxDiasEstadia);

    // Pre-computar confirmadas como pares (desdeYmd, hastaYmd) en fecha civil
    // chilena. Los timestamptz pueden estar en UTC — ymdChile los proyecta
    // al día calendario chileno correcto (donde el check-in / check-out
    // sucedieron según el mental model del proveedor).
    const confirmadasYmd = confirmadas
        .map(c => ({
            desde: ymdChile(new Date(c.fecha_preferida)),
            hasta: ymdChile(new Date(c.fecha_fin)),
        }))
        // Defensivo: hasta > desde (garantizado por CHECK en BD, pero por
        // si viene data anómala). Rango de 0 días no ocupa nada.
        .filter(r => cmpYmd(r.hasta, r.desde) > 0);

    // Blackouts ya vienen en fecha civil (columnas type date).
    // Defensivo: fecha_fin > fecha (garantizado por CHECK trilogía shape).
    const blackoutsValidos = blackouts.filter(b => cmpYmd(b.fecha_fin, b.fecha) > 0);

    const result: DiaCalendario[] = [];

    for (const fecha of iterateDates(desde, hasta)) {
        // 1. Fecha pasada — nunca ofrecible como check-in.
        if (cmpYmd(fecha, todayYmd) < 0) {
            result.push({ fecha, disponible: false, restantes: 0, razon: 'pasado' });
            continue;
        }

        // 2. Anticipación mín — el proveedor no acepta reservas con menos
        //    de N días de anticipación.
        if (cmpYmd(fecha, minFecha) < 0) {
            result.push({ fecha, disponible: false, restantes: 0, razon: 'anticipacion_min' });
            continue;
        }

        // 3. Anticipación máx — más allá de la ventana.
        if (cmpYmd(fecha, maxFecha) > 0) {
            result.push({ fecha, disponible: false, restantes: 0, razon: 'anticipacion_max' });
            continue;
        }

        // 4. Blackout — cualquier blackout que cubra esta fecha con
        //    semi-abierto [b.fecha, b.fecha_fin). El día de check-out del
        //    blackout NO cuenta (está libre para nueva estadía).
        const dentroDeBlackout = blackoutsValidos.some(
            b => cmpYmd(b.fecha, fecha) <= 0 && cmpYmd(fecha, b.fecha_fin) < 0
        );
        if (dentroDeBlackout) {
            result.push({ fecha, disponible: false, restantes: 0, razon: 'blackout' });
            continue;
        }

        // 5. Contar confirmadas solapantes — mismo semi-abierto. Un
        //    check-out del día X no consume cupo el día X (ya se fue).
        let ocupadas = 0;
        for (const c of confirmadasYmd) {
            if (cmpYmd(c.desde, fecha) <= 0 && cmpYmd(fecha, c.hasta) < 0) {
                ocupadas++;
            }
        }
        const restantes = capacidadEstadia - ocupadas;
        if (restantes <= 0) {
            result.push({ fecha, disponible: false, restantes: 0, razon: 'lleno' });
        } else {
            result.push({ fecha, disponible: true, restantes, razon: 'ok' });
        }
    }

    return result;
}
