// lib/eventosFormat.ts
// ----------------------------------------------------------------------------
// Sprint EVENTOS-TESTS (2026-11-24) — helpers compartidos entre el widget
// home (components/Home/EventosWidget.tsx) y el listado (pages/eventos/
// index.tsx). Antes vivían duplicados en ambos archivos; esta extracción
// permite unit tests sin montar DOM + un único lugar donde actualizar
// labels de tipo.
// ----------------------------------------------------------------------------

export const TIPO_LABELS: Record<string, string> = {
    feria: 'Feria',
    jornada: 'Jornada',
    charla: 'Charla',
    competencia: 'Competencia',
    meetup: 'Meetup',
};

/**
 * Label human-readable del tipo de evento. Fallback: devuelve el slug sin
 * transformar cuando el tipo no está mapeado (no inventa, no revienta).
 */
export function tipoLabel(tipo: string | null | undefined): string {
    if (!tipo) return '';
    return TIPO_LABELS[tipo] ?? tipo;
}

/**
 * Formato corto para card: "4 nov", "27 dic".
 * Input: ISO date string 'YYYY-MM-DD' (columna `eventos.fecha` es `date`).
 * Anchor T12:00:00 local evita cruzar fecha por TZ cuando el runtime no
 * es Chile (Vercel = UTC: 'YYYY-MM-DDT00:00:00Z' + locale es-CL renderiza
 * el día anterior en algunos borde). `T12:00:00` sin Z queda en local time
 * del runtime, pero el toLocaleDateString con es-CL retorna el día que
 * corresponde en es-CL ignorando TZ del runtime.
 */
export function formatFechaCortaEvento(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

/**
 * Formato largo para card de listado: "4 de noviembre de 2026".
 * Mismo pattern de anchor T12:00:00 para evitar drift TZ.
 */
export function formatFechaLargaEvento(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Formato completo con weekday para página detalle: "miércoles, 4 de
 * noviembre de 2026" (es-CL). Mismo anchor T12:00:00.
 */
export function formatFechaCompletaEvento(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

/**
 * Formato de hora HH:MM desde string 'HH:MM:SS' (postgres `time`).
 */
export function formatHoraEvento(h: string | null | undefined): string | null {
    if (!h) return null;
    return h.slice(0, 5);
}
