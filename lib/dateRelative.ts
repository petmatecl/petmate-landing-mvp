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
// Contract MODO 'creacion' (default, aprobado por PO 2026-09-01):
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
//                             formato nuevo.
//   - `D de MMMM de YYYY`   — distinto año (sin hora — evento distante,
//                             detalle horario es ruido en ese contexto).
//
// Contract MODO 'evento' (agregado sprint notifs-panel C4, 2026-09-01):
//
//   - `Fue ayer a las HH:MM`          — pasado, ayer.
//   - `Fue el D de MMMM, HH:MM`       — pasado, mismo año, > 1 día atrás.
//   - `Fue el D de MMMM de YYYY`      — pasado, distinto año.
//   - `Hoy a las HH:MM`               — mismo día (mayúscula standalone).
//   - `Mañana a las HH:MM`            — día siguiente.
//   - `El D de MMMM, HH:MM`           — futuro, mismo año, > 1 día.
//   - `El D de MMMM de YYYY`          — futuro, distinto año.
//
//   Motivación: reservas y eventos calendarizados necesitan marcar
//   explícitamente si YA PASARON o están POR VENIR. El modo 'creacion'
//   deja ambiguo el pasado ("11 de agosto, 14:30" ¿ya pasó?); el modo
//   'evento' lo marca con "Fue el" (pasado) / "El" (futuro), y con
//   mayúscula inicial standalone en "Hoy" / "Mañana" / "Fue ayer"
//   (no ambiguo con prefix de oración). Cierra completamente el
//   defecto 7 del sprint notificaciones (PO 2026-09-01, aprobado con
//   ajuste de "línea aparte, no parcheo de title").
//
//   El modo 'evento' NO usa `hace unos segundos` ni `hace X min` — para
//   un evento calendarizado (reserva a las 14:30), la hora exacta es
//   más útil que la proximidad relativa. Si el evento es HOY y "hace 3
//   min", "Hoy a las 14:30" comunica mejor.
//
// Contexto edge MODO 'creacion':
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
    /**
     * Modo del formato. Ver contract extenso arriba.
     *   'creacion' (default) — cuándo se emitió el dato ("hace 3 min",
     *     "hoy a las 14:30", "el 12 de septiembre, 14:30"). Usa "hace X"
     *     para pasado reciente. Prefijo "el" ambiguo-neutral para futuro.
     *   'evento' — cuándo ocurrirá/ocurrió un evento calendarizado
     *     ("Mañana a las 10:00", "Fue el 11 de agosto, 14:30"). Marca
     *     pasado con "Fue el/Fue ayer", futuro con "El"/"Mañana".
     *     Cierra defecto 7 del sprint notificaciones — al leer una
     *     tarjeta de recordatorio, queda explícito si la reserva ya
     *     pasó o está por venir.
     */
    modo?: 'creacion' | 'evento';
}

/**
 * Formatea una fecha ISO como string relativa a "ahora" (o al `opts.now`
 * inyectado). Ver contract completo (ambos modos) en el comentario
 * extenso al inicio del archivo.
 *
 * @param iso ISO 8601 string (`2026-09-01T14:30:00Z` o con offset).
 *            Cualquier string parseable por `new Date(...)` funciona.
 * @param opts.now Referencia temporal. Default `new Date()`.
 * @param opts.modo `'creacion'` (default) o `'evento'`. Ver contract.
 * @returns String en español chileno, ejemplo: `"hoy a las 14:30"`,
 *          `"el 12 de septiembre, 14:30"`, `"hace 3 min"`,
 *          `"Fue el 11 de agosto, 14:30"`, `"Mañana a las 10:00"`.
 */
export function formatFechaRelativa(iso: string, opts: FormatOpts = {}): string {
    const now = opts.now ?? new Date();
    const modo = opts.modo ?? 'creacion';
    const d = new Date(iso);

    // Diff en segundos. Positivo = fecha en pasado, negativo = en futuro.
    const diffSec = (now.getTime() - d.getTime()) / 1000;
    const absDiffSec = Math.abs(diffSec);

    const dayDelta = calendarDayDelta(now, d);
    const dia = d.getDate();
    const mes = MESES[d.getMonth()];
    const anio = d.getFullYear();
    const hora = hhmm(d);

    if (modo === 'evento') {
        // Modo 'evento' — NO usa "hace unos segundos" ni "hace X min".
        // Para un evento calendarizado, la hora exacta importa más que
        // la proximidad. Marca pasado/futuro con "Fue"/"El".
        if (dayDelta === 0) return `Hoy a las ${hora}`;
        if (dayDelta === 1) return `Mañana a las ${hora}`;
        if (dayDelta === -1) return `Fue ayer a las ${hora}`;

        // Distinto año — sin hora (evento distante, ruido).
        if (anio !== now.getFullYear()) {
            return dayDelta > 0
                ? `El ${dia} de ${mes} de ${anio}`
                : `Fue el ${dia} de ${mes} de ${anio}`;
        }

        // Mismo año, > 1 día.
        return dayDelta > 0
            ? `El ${dia} de ${mes}, ${hora}`
            : `Fue el ${dia} de ${mes}, ${hora}`;
    }

    // Modo 'creacion' (default) — comportamiento original.

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

    if (dayDelta === 0) return `hoy a las ${hora}`;
    if (dayDelta === 1) return `mañana a las ${hora}`;
    if (dayDelta === -1) return `ayer a las ${hora}`;

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
