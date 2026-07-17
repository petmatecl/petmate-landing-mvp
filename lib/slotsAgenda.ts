// lib/slotsAgenda.ts
// ----------------------------------------------------------------------------
// Fase 1 agenda con disponibilidad real — DERIVACION PURA de slots disponibles.
//
// Consumido por GET /api/servicios/[id]/slots. Se extrae a este modulo para
// que la logica de derivacion sea testeable sin montar Next/Supabase.
//
// Zona horaria: America/Santiago (Chile continental). Reglas ISO 8601 para
// dia_semana (1=lunes, 7=domingo). Los timestamptz de agendamientos vienen
// en UTC absoluto — la conversion wall-clock chileno ↔ UTC absoluto usa
// Intl.DateTimeFormat para respetar DST automaticamente.
//
// Casos borde cubiertos:
//   - Franja no divisible exacta por duracion: se truncan al ultimo slot
//     que cabe entero (franja 09:00-10:30 con duracion=60 → 1 slot 09-10).
//   - Excepcion parcial: bloqueo solo los slots que solapan (excepcion
//     09:30-10:00 dentro de franja 09-11 con dur 60 → 09-10 bloqueado,
//     10-11 libre).
//   - Excepcion dia completo: bloquea todos los slots del dia.
//   - Capacidad grupal: `restantes = capacidad - confirmadas_solapantes`,
//     `disponible = restantes > 0`. Multiple confirmadas por slot OK.
//   - Anticipacion min: slot < now + N horas → disponible=false.
//   - Anticipacion max: slot > now + N dias → disponible=false.
//   - DST chileno: uso Intl para resolver offset por fecha (no hardcodeo).
//   - Confirmadas legacy (V1 sin `duracion_min`): NO se consideran — el
//     endpoint las excluye del fetch. El proveedor las maneja fuera de la
//     agenda F1. Documentar en el response header no aplica (schema fijo).
// ----------------------------------------------------------------------------

const CHILE_TZ = 'America/Santiago';

export type FranjaSemanalRow = {
    dia_semana: number;   // 1-7 ISO
    hora_desde: string;   // 'HH:MM' o 'HH:MM:SS' (se trunca)
    hora_hasta: string;
};

export type ExcepcionRow = {
    fecha: string;                      // 'YYYY-MM-DD'
    hora_desde: string | null;          // 'HH:MM' o null (dia completo)
    hora_hasta: string | null;
};

export type ConfirmadaRow = {
    fecha_preferida: string;   // ISO 8601 UTC (timestamptz)
    duracion_min: number;      // minutos, siempre poblada (fetch filtra IS NOT NULL)
};

export type SlotDerivInput = {
    duracionSlotMin: number;
    capacidadSlot: number;
    anticipacionMinHoras: number;
    anticipacionMaxDias: number;
    desde: string;                    // 'YYYY-MM-DD'
    hasta: string;                    // 'YYYY-MM-DD'
    franjas: FranjaSemanalRow[];
    excepciones: ExcepcionRow[];
    confirmadas: ConfirmadaRow[];
    now?: Date;                       // inyectable para tests; default new Date()
};

export type Slot = {
    fecha: string;         // 'YYYY-MM-DD'
    hora_inicio: string;   // 'HH:MM'
    hora_fin: string;      // 'HH:MM'
    disponible: boolean;
    restantes: number;     // 0..capacidad_slot
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers de tiempo — sin librerias externas.
// ────────────────────────────────────────────────────────────────────────────

// ISO dia_semana (1=lunes, 7=domingo) de una fecha 'YYYY-MM-DD'. Parseado
// como UTC midnight — el dow de una fecha es property del dia entero, sin
// ambigüedad de TZ. Adaptador Date.getUTCDay (0=dom, 6=sab) → ISO.
export function getIsoDayOfWeek(fecha: string): number {
    const [y, m, d] = fecha.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return ((dow + 6) % 7) + 1;
}

// Devuelve fechas 'YYYY-MM-DD' de desde a hasta inclusive. Chile no tiene
// dias de 23/25h por DST (el cambio ocurre a las 24:00, no en el medio),
// asi que sumar 86_400_000 ms a UTC midnight avanza correctamente 1 dia
// calendario chileno.
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

// Convierte 'HH:MM' o 'HH:MM:SS' → minutos desde 00:00. Postgres time viene
// como 'HH:MM:SS'; el input type=time frontend usa 'HH:MM'. Ambos ok.
export function parseHoraToMinutes(hora: string): number {
    const parts = hora.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return h * 60 + m;
}

export function minutesToHora(min: number): string {
    const h = String(Math.floor(min / 60)).padStart(2, '0');
    const m = String(min % 60).padStart(2, '0');
    return `${h}:${m}`;
}

export function truncHora(hora: string): string {
    return hora.slice(0, 5);
}

// Wall-clock chileno (fecha + hora local) → Date UTC absoluto. Respeta DST
// automaticamente via Intl. Truco: crear la fecha como UTC, medirla en
// Chile, calcular la diferencia = offset. Corregir.
export function chileWallClockToUtc(fecha: string, hora: string): Date {
    const [y, m, d] = fecha.split('-').map(Number);
    const [h, min] = hora.slice(0, 5).split(':').map(Number);
    const guessUtcMs = Date.UTC(y, m - 1, d, h, min);
    // Interpretar ese momento absoluto EN Chile — el formatter da la wall
    // clock chilena para ese instante.
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    }).formatToParts(new Date(guessUtcMs));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    const chileWallAtGuessMs = Date.UTC(
        get('year'), get('month') - 1, get('day'),
        get('hour'), get('minute'), get('second')
    );
    // Diferencia = offset entre Chile y UTC en ese instante. Aplicarlo con
    // signo invertido para llevar el guess (que estaba en el TZ "erroneo")
    // al momento absoluto correcto.
    const offset = chileWallAtGuessMs - guessUtcMs;
    return new Date(guessUtcMs - offset);
}

// Devuelve 'YYYY-MM-DD' de un momento absoluto interpretado en Chile.
export function chileDateFromUtc(utc: Date): string {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(utc);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
    return `${get('year')}-${get('month')}-${get('day')}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Derivacion principal — funcion pura, testeable.
// ────────────────────────────────────────────────────────────────────────────

export function derivarSlots(input: SlotDerivInput): Slot[] {
    const {
        duracionSlotMin, capacidadSlot,
        anticipacionMinHoras, anticipacionMaxDias,
        desde, hasta,
        franjas, excepciones, confirmadas,
    } = input;
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    const minSlotStartMs = nowMs + anticipacionMinHoras * 3_600_000;
    const maxSlotStartMs = nowMs + anticipacionMaxDias * 86_400_000;

    // Indexar franjas por dia_semana (1..7). Multi-franja por dia soportado.
    const franjasPorDia = new Map<number, FranjaSemanalRow[]>();
    for (const f of franjas) {
        const list = franjasPorDia.get(f.dia_semana) ?? [];
        list.push(f);
        franjasPorDia.set(f.dia_semana, list);
    }

    // Indexar excepciones por fecha. Cada fecha puede tener varias franjas
    // bloqueadas o un unico registro de dia completo.
    const excepcionesPorFecha = new Map<string, ExcepcionRow[]>();
    for (const e of excepciones) {
        const list = excepcionesPorFecha.get(e.fecha) ?? [];
        list.push(e);
        excepcionesPorFecha.set(e.fecha, list);
    }

    // Confirmadas como intervalos [inicio, fin) en ms UTC. Filtramos duracion
    // <=0 defensivo aunque el CHECK de BD ya lo impide.
    const confirmadasIntervalos = confirmadas
        .filter(c => c.duracion_min > 0)
        .map(c => {
            const start = new Date(c.fecha_preferida).getTime();
            const end = start + c.duracion_min * 60_000;
            return { start, end };
        });

    const slots: Slot[] = [];

    for (const fecha of iterateDates(desde, hasta)) {
        const isoDow = getIsoDayOfWeek(fecha);
        const franjasHoy = franjasPorDia.get(isoDow) ?? [];
        if (franjasHoy.length === 0) continue;

        const excsHoy = excepcionesPorFecha.get(fecha) ?? [];
        const diaCompletoBloqueado = excsHoy.some(
            e => e.hora_desde === null && e.hora_hasta === null
        );

        for (const franja of franjasHoy) {
            const franjaDesdeMin = parseHoraToMinutes(truncHora(franja.hora_desde));
            const franjaHastaMin = parseHoraToMinutes(truncHora(franja.hora_hasta));

            // Corte en slots de duracionSlotMin. La condicion de guard
            // `start + duracionSlotMin <= franjaHastaMin` descarta el
            // remainder que no cabe entero (caso borde: franja no divisible).
            for (
                let start = franjaDesdeMin;
                start + duracionSlotMin <= franjaHastaMin;
                start += duracionSlotMin
            ) {
                const slotInicioHora = minutesToHora(start);
                const slotFinHora = minutesToHora(start + duracionSlotMin);
                const slotStartUtc = chileWallClockToUtc(fecha, slotInicioHora);
                const slotEndMs = slotStartUtc.getTime() + duracionSlotMin * 60_000;
                const slotStartMs = slotStartUtc.getTime();

                let disponible = true;

                // 1. Excepcion dia completo → bloquea todo el dia.
                if (diaCompletoBloqueado) {
                    disponible = false;
                }

                // 2. Excepcion de franja → bloquea slots que solapan.
                if (disponible) {
                    for (const e of excsHoy) {
                        if (e.hora_desde === null || e.hora_hasta === null) continue;
                        const eDesde = parseHoraToMinutes(truncHora(e.hora_desde));
                        const eHasta = parseHoraToMinutes(truncHora(e.hora_hasta));
                        // Solape: slot [start, start+dur) vs excepcion [eD, eH).
                        if (start < eHasta && (start + duracionSlotMin) > eDesde) {
                            disponible = false;
                            break;
                        }
                    }
                }

                // 3. Anticipacion minima y maxima.
                if (disponible) {
                    if (slotStartMs < minSlotStartMs) disponible = false;
                    else if (slotStartMs > maxSlotStartMs) disponible = false;
                }

                // 4. Contar confirmadas solapantes → restantes.
                let confirmadasSolapantes = 0;
                for (const c of confirmadasIntervalos) {
                    if (slotStartMs < c.end && slotEndMs > c.start) {
                        confirmadasSolapantes++;
                    }
                }
                const restantes = Math.max(0, capacidadSlot - confirmadasSolapantes);
                if (disponible && restantes === 0) disponible = false;

                slots.push({
                    fecha,
                    hora_inicio: slotInicioHora,
                    hora_fin: slotFinHora,
                    disponible,
                    restantes,
                });
            }
        }
    }

    // Orden estable por (fecha, hora_inicio). Multi-franja + iteracion por
    // franja ya viene aprox. ordenado, pero garantizamos con un sort final.
    slots.sort((a, b) => {
        if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
        return a.hora_inicio.localeCompare(b.hora_inicio);
    });

    return slots;
}
