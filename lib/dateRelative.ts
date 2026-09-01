// ============================================================================
// lib/dateRelative.ts
// ----------------------------------------------------------------------------
// Sprint notifs-panel C2/F5 (2026-09-01) — helper compartido de fecha
// relativa. Fuente única de la lógica "hoy / ayer / mañana / hace X min /
// fecha absoluta" para notificaciones y cualquier otro consumer futuro que
// necesite el mismo formato en la UI.
//
// Motivación: hasta ahora cada consumer llamaba `toLocaleString('es-CL')`
// o formateaba fecha absoluta inline. La misma lógica duplicada en tres
// lugares es garantía de que se desincronicen (decisión D5 aprobada por PO
// 2026-09-01).
//
// Contract (aprobado por PO 2026-09-01 con caso futuro agregado):
//
//   - `hace unos segundos` — pasado, < 60s desde now.
//   - `hace X min`          — pasado, ≥ 60s y < 1h desde now (X entero).
//   - `hoy a las HH:MM`     — mismo día calendario en tz local del browser
//                             (pasado o futuro dentro del día).
//   - `mañana a las HH:MM`  — día siguiente calendario en tz local.
//   - `ayer a las HH:MM`    — día anterior calendario en tz local.
//   - `D de MMMM, HH:MM`    — pasado, mismo año, > 1 día atrás.
//   - `el D de MMMM, HH:MM` — futuro, mismo año, > 1 día adelante.
//                             El prefijo "el" marca futuro sin inventar
//                             formato nuevo — resuelve el defecto 7 del
//                             sprint notificaciones ("mañana congelado"):
//                             una notif que decía "12 de septiembre, 14:30"
//                             para dentro de 2 semanas era ambigua ("¿ya
//                             pasó?"); con "el 12 de septiembre, 14:30"
//                             queda explícito.
//   - `D de MMMM de YYYY`   — distinto año (sin hora — evento distante,
//                             detalle horario es ruido en ese contexto).
//
// Contexto edge:
//   - Cuando el pasado es < 1h pero cruza el borde de "mismo día", igual
//     mostramos "hace X min" porque el usuario lee la relativa como
//     "recién" y "hoy" pierde valor (ej: notif de las 23:59 leída a las
//     00:01 — "hace 2 min" es más útil que "ayer a las 23:59").
//
//   - Cuando el futuro cae dentro de la próxima hora (raro para notifs
//     pero posible con crons pre-ejecución), NO se muestra "en X min"
//     porque el contract no lo pidió — cae directo a "hoy a las HH:MM"
//     que sigue siendo correcto para un evento del mismo día.
//
// Timezone: usa la timezone LOCAL del browser (todas las operaciones de
// Date sin flag UTC operan en local). Consistente con el resto de la
// app. "Mismo día calendario" y "HH:MM" reflejan lo que el usuario ve
// en su reloj.
//
// Localización: español chileno con tuteo (regla del proyecto, cero
// voseo). Meses en minúscula sin tildes (enero/febrero/... — regla RAE
// para nombres de mes).
//
// Testeabilidad: `opts.now` inyectable permite tests deterministas sin
// mockear `Date`. Cero I/O, cero side-effects — función pura.
// ============================================================================

const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

const hhmm = (d: Date): string => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

/**
 * Días calendario entre `from` y `to` en timezone local del browser.
 * Positivo si `to` está en el futuro respecto a `from` (mañana=1, ayer=-1,
 * mismo día=0). Compara midnight-a-midnight — cero drift por horas.
 */
function calendarDayDelta(from: Date, to: Date): number {
    const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
    return Math.round((toMidnight - fromMidnight) / (24 * 3600 * 1000));
}

interface FormatOpts {
    /**
     * Referencia temporal para el cálculo. Default: `new Date()` al momento
     * de la llamada. Inyectable para tests deterministas — cero mock de
     * `Date` global necesario.
     */
    now?: Date;
}

/**
 * Formatea una fecha ISO como string relativa a "ahora" (o al `opts.now`
 * inyectado). Ver contract completo en el comentario extenso al inicio
 * del archivo.
 *
 * @param iso ISO 8601 string (`2026-09-01T14:30:00Z` o con offset). Cualquier
 *            string parseable por `new Date(...)` funciona.
 * @param opts.now Referencia temporal. Default `new Date()`.
 * @returns String en español chileno, ejemplo: `"hoy a las 14:30"`,
 *          `"el 12 de septiembre, 14:30"`, `"hace 3 min"`.
 */
export function formatFechaRelativa(iso: string, opts: FormatOpts = {}): string {
    const now = opts.now ?? new Date();
    const d = new Date(iso);

    // Diff en segundos. Positivo = fecha en pasado, negativo = en futuro.
    const diffSec = (now.getTime() - d.getTime()) / 1000;
    const absDiffSec = Math.abs(diffSec);

    // Pasado reciente: < 1 minuto → "hace unos segundos". Futuro reciente
    // NO cae acá (no tiene sentido "hace unos segundos" para un evento
    // que aún no ocurrió).
    if (diffSec >= 0 && absDiffSec < 60) {
        return 'hace unos segundos';
    }

    // Pasado dentro de la última hora → "hace X min" (X entero ≥ 1).
    if (diffSec >= 0 && absDiffSec < 3600) {
        const min = Math.floor(absDiffSec / 60);
        return `hace ${min} min`;
    }

    // Comparación calendario (independiente de horas — cruza midnight bien).
    const dayDelta = calendarDayDelta(now, d);

    if (dayDelta === 0) return `hoy a las ${hhmm(d)}`;
    if (dayDelta === 1) return `mañana a las ${hhmm(d)}`;
    if (dayDelta === -1) return `ayer a las ${hhmm(d)}`;

    // Más allá de ±1 día calendario.
    const dia = d.getDate();
    const mes = MESES[d.getMonth()];
    const anio = d.getFullYear();
    const hora = hhmm(d);

    // Distinto año → formato absoluto sin hora (evento distante).
    if (anio !== now.getFullYear()) {
        return `${dia} de ${mes} de ${anio}`;
    }

    // Mismo año, > 1 día. Distinción pasado/futuro por prefijo "el".
    if (dayDelta > 0) {
        return `el ${dia} de ${mes}, ${hora}`;
    }
    return `${dia} de ${mes}, ${hora}`;
}
