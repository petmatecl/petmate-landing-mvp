// lib/formatFecha.ts
// ----------------------------------------------------------------------------
// Helpers de formato de fecha consistente. TZ hardcodeada a America/Santiago
// (producto Chile-only).
//
// Reusados por:
//   - pages/proveedor/index.tsx (tab Solicitudes)
//   - pages/mis-solicitudes.tsx (lado tutor)
//   - pages/api/agendamientos/notify-*.ts (emails)
//
// Version 2 (2026-07-22): reemplazo de date-fns/format por Intl con
// timeZone: 'America/Santiago'. Motivo: date-fns/format renderiza en el TZ
// del runtime — en Vercel (UTC) el email pintaba la hora UTC cruda en vez
// de Chile. Bug reportado en prod: reserva con fecha_preferida
// 2026-07-27T20:48+00 (16:48 Chile invierno CLT UTC-4) salia como "20:48"
// en el email. Intl con timeZone constante es la solucion DST-safe (mismo
// patron que lib/slotsAgenda.ts).
//
// Los tests en lib/formatFecha.test.ts (npm run test:formatFecha) validan
// el output vs los strings esperados, incluyendo casos borde de cruce de
// dia UTC↔Chile.
// ----------------------------------------------------------------------------

const CHILE_TZ = 'America/Santiago';

// Extrae partes formateadas de un Date interpretado en Chile TZ. `formatToParts`
// evita issues de string parsing en locales exoticos.
type FechaParts = {
    weekday: string;
    day: string;
    month: string;
    hour: string;
    minute: string;
    year: string;
};

function partsChile(d: Date, includeYear: boolean = false): FechaParts {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: CHILE_TZ,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    };
    if (includeYear) options.year = 'numeric';
    const parts = new Intl.DateTimeFormat('es-CL', options).formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return {
        weekday: get('weekday'),
        day: get('day'),
        month: get('month'),
        hour: get('hour'),
        minute: get('minute'),
        year: get('year'),
    };
}

// Extrae "YYYY-MM-DD" en Chile TZ. Usado para contar noches sin drift de
// TZ (differenceInCalendarDays de date-fns usa el TZ local del runtime).
// Exportado para reuso en pages/api/cron/recordatorio-reserva.ts —
// necesita comparar el día calendario Chile del inicio de la reserva vs
// el "mañana" de hoy sin drift de TZ del runtime Vercel (UTC).
export function ymdChile(d: Date): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: CHILE_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
}

// Dias de calendario Chile entre dos fechas (0 si mismo dia).
//
// Overload: acepta Date (timestamp — se normaliza a fecha civil Chile via
// ymdChile) o string YYYY-MM-DD directo (asume que ya representa una fecha
// civil, como los inputs type=date del browser). El calculo final es puro
// Date.UTC — sin TZ drift, sin dependencia del runtime.
//
// Exportado para reuso en el editor de blackouts F2 y (futuro) el picker
// del tutor F2-4.
export function nochesEntre(desde: Date | string, hasta: Date | string): number {
    const ymdA = typeof desde === 'string' ? desde : ymdChile(desde);
    const ymdB = typeof hasta === 'string' ? hasta : ymdChile(hasta);
    const [y1, m1, d1] = ymdA.split('-').map(Number);
    const [y2, m2, d2] = ymdB.split('-').map(Number);
    return Math.round(
        (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000
    );
}

function capitalizarPrimera(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * "Sábado 15 de junio, 14:00" — formato largo con dia de la semana.
 * Interpretado en TZ Chile independiente del runtime.
 */
export function formatFechaPreferida(input: Date | string | null | undefined): string {
    if (!input) return 'sin fecha';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    const p = partsChile(d);
    return `${capitalizarPrimera(p.weekday)} ${p.day} de ${p.month}, ${p.hour}:${p.minute}`;
}

/**
 * "15 de junio, 14:00" — formato corto sin dia de la semana.
 */
export function formatFechaCorta(input: Date | string | null | undefined): string {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const p = partsChile(d);
    return `${p.day} de ${p.month}, ${p.hour}:${p.minute}`;
}

/**
 * "Del viernes 4 de julio al lunes 7 de julio (3 noches)" — para V2/V4a
 * rango de noches. El conteo de noches usa dias de calendario en Chile TZ
 * (no diferencia UTC), asi que timestamps cerca de medianoche no drifean.
 */
export function formatRangoNoches(
    inicio: Date | string | null | undefined,
    fin: Date | string | null | undefined
): string {
    if (!inicio || !fin) return 'sin fecha';
    const di = inicio instanceof Date ? inicio : new Date(inicio);
    const df = fin instanceof Date ? fin : new Date(fin);
    if (Number.isNaN(di.getTime()) || Number.isNaN(df.getTime())) return 'sin fecha';
    const noches = nochesEntre(di, df);
    if (noches < 1) return 'sin fecha';
    const pi = partsChile(di);
    const pf = partsChile(df);
    const sufijoNoches = noches === 1 ? '1 noche' : `${noches} noches`;
    return `Del ${pi.weekday} ${pi.day} de ${pi.month} al ${pf.weekday} ${pf.day} de ${pf.month} (${sufijoNoches})`;
}

/**
 * Versión partida de `formatRangoNoches` para layouts que necesitan pintar
 * el rango de fechas y el conteo de noches por separado (ej. banda de
 * fecha protagonista del recordatorio, donde el `(N noches)` va debajo
 * en fuente más chica).
 *
 * Retorna `{ principal, sub }`:
 *   principal: "Del viernes 4 de julio al lunes 7 de julio" (sin paréntesis)
 *   sub:       "3 noches"
 *
 * Si input inválido → `{ principal: 'sin fecha', sub: '' }`.
 * Si noches < 1 (fin ≤ inicio) → idem.
 */
export function formatRangoNochesPartes(
    inicio: Date | string | null | undefined,
    fin: Date | string | null | undefined
): { principal: string; sub: string } {
    if (!inicio || !fin) return { principal: 'sin fecha', sub: '' };
    const di = inicio instanceof Date ? inicio : new Date(inicio);
    const df = fin instanceof Date ? fin : new Date(fin);
    if (Number.isNaN(di.getTime()) || Number.isNaN(df.getTime())) return { principal: 'sin fecha', sub: '' };
    const noches = nochesEntre(di, df);
    if (noches < 1) return { principal: 'sin fecha', sub: '' };
    const pi = partsChile(di);
    const pf = partsChile(df);
    const sub = noches === 1 ? '1 noche' : `${noches} noches`;
    return {
        principal: `Del ${pi.weekday} ${pi.day} de ${pi.month} al ${pf.weekday} ${pf.day} de ${pf.month}`,
        sub,
    };
}

/**
 * Frase compacta "del ..." para insertar dentro de una oracion. Ejemplos:
 *   V1 puntual:  "del lunes 27 de julio a las 16:48"
 *   V2/V4a mismo mes: "del sábado 25 al martes 28 de julio"
 *   V2/V4a cruza mes: "del jueves 30 de julio al domingo 2 de agosto"
 *
 * Sin capitalizar (se lee como prefijo dentro del texto). Usado en el email
 * de invitacion a reseñas para identificar la reserva sin agregar un bloque
 * info-box formal.
 */
export function formatFechaServicioInline(
    inicio: Date | string | null | undefined,
    fin: Date | string | null | undefined = null
): string {
    if (!inicio) return '';
    const di = inicio instanceof Date ? inicio : new Date(inicio);
    if (Number.isNaN(di.getTime())) return '';
    const pi = partsChile(di);

    if (!fin) {
        // V1 puntual con hora
        return `del ${pi.weekday} ${pi.day} de ${pi.month} a las ${pi.hour}:${pi.minute}`;
    }

    const df = fin instanceof Date ? fin : new Date(fin);
    if (Number.isNaN(df.getTime())) {
        return `del ${pi.weekday} ${pi.day} de ${pi.month}`;
    }
    const pf = partsChile(df);
    // Optimizar: si el mes coincide, mencionarlo una sola vez al final.
    if (pi.month === pf.month) {
        return `del ${pi.weekday} ${pi.day} al ${pf.weekday} ${pf.day} de ${pi.month}`;
    }
    return `del ${pi.weekday} ${pi.day} de ${pi.month} al ${pf.weekday} ${pf.day} de ${pf.month}`;
}

/**
 * "Jueves 4 de julio, 14:00 · 3 horas" — para V4b (cuidado domicilio por horas).
 */
export function formatPuntualConDuracion(
    fechaHora: Date | string | null | undefined,
    horas: number | null | undefined
): string {
    if (!fechaHora || horas == null || horas < 1) return 'sin fecha';
    const d = fechaHora instanceof Date ? fechaHora : new Date(fechaHora);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    const p = partsChile(d);
    const duracionFmt = horas === 1 ? '1 hora' : `${horas} horas`;
    return `${capitalizarPrimera(p.weekday)} ${p.day} de ${p.month}, ${p.hour}:${p.minute} · ${duracionFmt}`;
}

/**
 * "Viernes 31 de julio" — solo fecha, sin hora ni duración. Para el layout
 * de listado del recordatorio (fila "Fecha" separada de "Hora").
 */
export function formatFechaSinHora(input: Date | string | null | undefined): string {
    if (!input) return 'sin fecha';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    const p = partsChile(d);
    return `${capitalizarPrimera(p.weekday)} ${p.day} de ${p.month}`;
}

/**
 * "14:00" — solo hora corta HH:MM en TZ Chile. Para reservas legacy V1
 * puntuales que solo tienen hora de inicio sin duración.
 */
export function formatHoraCorta(input: Date | string | null | undefined): string {
    if (!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const p = partsChile(d);
    return `${p.hour}:${p.minute}`;
}

/**
 * "de 14:00 a 15:00 · 1 hora" — solo la parte de hora + duración de una
 * reserva F1/V4b. Sin fecha ni día de la semana (esa va en fila separada
 * del listado). El cruce de día local se pinta "23:30 a 00:30" (igual
 * criterio que formatBloqueHorario).
 */
export function formatBloqueHorarioSinFecha(
    fechaInicio: Date | string | null | undefined,
    duracionMin: number | null | undefined
): string {
    if (!fechaInicio || duracionMin == null || duracionMin < 1) return '';
    const inicio = fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio);
    if (Number.isNaN(inicio.getTime())) return '';
    const fin = new Date(inicio.getTime() + Math.floor(duracionMin) * 60_000);
    const pi = partsChile(inicio);
    const pf = partsChile(fin);
    const duracionFmt = formatDuracionMinutos(duracionMin);
    return `de ${pi.hour}:${pi.minute} a ${pf.hour}:${pf.minute} · ${duracionFmt}`;
}

/**
 * Formatea una duración en minutos como legible en español chileno tuteo.
 * Ejemplos:
 *   30 → "30 minutos"
 *   60 → "1 hora"
 *   90 → "1 hora 30 minutos"
 *   120 → "2 horas"
 *   150 → "2 horas 30 minutos"
 *   150.5 → "2 horas 30 minutos" (redondea abajo)
 * Retorna string vacío para input inválido — los callers deciden fallback.
 */
export function formatDuracionMinutos(minutos: number | null | undefined): string {
    if (minutos == null || !Number.isFinite(minutos) || minutos < 1) return '';
    const total = Math.floor(minutos);
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (horas === 0) return `${mins} minutos`;
    const horasFmt = horas === 1 ? '1 hora' : `${horas} horas`;
    if (mins === 0) return horasFmt;
    return `${horasFmt} ${mins} minutos`;
}

/**
 * "Jueves 4 de julio, de 14:00 a 15:00 · 1 hora" — bloque horario con
 * inicio + fin + duración legible, para reservas F1 (`fecha_preferida
 * timestamptz` + `duracion_min integer`) y V4b legacy (`fecha_preferida`
 * + `duracion_horas × 60`).
 *
 * TZ Chile hardcodeada (Intl con timeZone constante = IMMUTABLE, DST-safe).
 * El fin se calcula sumando minutos al timestamp; si cruza medianoche
 * local, el rango se pinta "23:30 a 00:30" — el contexto del recordatorio
 * ("Mañana...") indica el día del inicio; el 00:30 se lee como del día
 * siguiente por continuidad natural. No se marca el cambio de día en el
 * rango para no ensuciar el copy.
 *
 * Fallback: 'sin fecha' si input inválido, para paridad con los otros
 * helpers de este módulo.
 */
export function formatBloqueHorario(
    fechaInicio: Date | string | null | undefined,
    duracionMin: number | null | undefined
): string {
    if (!fechaInicio || duracionMin == null || duracionMin < 1) return 'sin fecha';
    const inicio = fechaInicio instanceof Date ? fechaInicio : new Date(fechaInicio);
    if (Number.isNaN(inicio.getTime())) return 'sin fecha';
    const fin = new Date(inicio.getTime() + Math.floor(duracionMin) * 60_000);
    const pi = partsChile(inicio);
    const pf = partsChile(fin);
    const duracionFmt = formatDuracionMinutos(duracionMin);
    return `${capitalizarPrimera(pi.weekday)} ${pi.day} de ${pi.month}, de ${pi.hour}:${pi.minute} a ${pf.hour}:${pf.minute} · ${duracionFmt}`;
}
