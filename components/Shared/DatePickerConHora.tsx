// components/Shared/DatePickerConHora.tsx
// ---------------------------------------------------------------------------
// Sprint agenda-categorias (2026-09-11) — decisión PO 2026-09-09 punto 3:
// reemplazar `<input type="datetime-local">` nativo del modal legacy
// "Solicitar servicio" por el date picker del proyecto (react-day-picker,
// ya en uso en F2) + selector de hora en pasos de 30 min.
//
// CONTRATO INVIOLABLE: el `value` (string) que produce este componente y
// el que consume por prop mantienen el **mismo formato** que datetime-local
// nativo: `"YYYY-MM-DDTHH:MM"` (ISO 8601 local, sin timezone offset). Esto
// preserva el contrato con:
//   - endpoints (`agendamientos.fecha_preferida` timestamp con timezone en
//     BD; el server hace `new Date(fecha_preferida)` que interpreta local
//     time del browser correctamente).
//   - templates de email (formatea con `formatFechaPreferida` que también
//     hace `new Date(...)`).
// Cero cambio del `state.fechaPreferida` del caller — el helper es
// intercambiable con el input nativo desde el punto de vista del state.
//
// Reglas de UX:
//   - Fecha: DayPicker con locale es-CL, primer día de la semana lunes.
//   - Hora: `<select>` con opciones cada 30 min de 00:00 a 23:30.
//   - `min` en formato `YYYY-MM-DDTHH:MM` — el helper interpreta y aplica
//     tanto `disabled` a fechas pasadas como filter a horas del día del
//     `min` (si `min` = "2026-09-15T10:00", fechas < 15-09 disabled y para
//     el 15-09 el select oculta las opciones < 10:00).
//   - Cuando el user cambia fecha, si la hora previa quedó fuera del rango,
//     resetea a la primera hora válida (o vacío si no hay).
//
// Cero deps más allá de react-day-picker (ya en package.json). Este helper
// no usa portal ni fixed — el DayPicker renderiza inline dentro del popover
// del caller (que se maneja con state `showPicker` local).
// ---------------------------------------------------------------------------
import React, { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

type Props = {
    id?: string;
    /** Formato `YYYY-MM-DDTHH:MM` (idem datetime-local). Vacío = no seleccionado. */
    value: string;
    /** Recibe el nuevo `value` en `YYYY-MM-DDTHH:MM` o vacío. */
    onChange: (v: string) => void;
    /** Mínimo aceptado, en `YYYY-MM-DDTHH:MM`. Filtra fechas pasadas + horas del día mismo. */
    min?: string;
    /** Requerido; el caller controla el badge de required. */
    required?: boolean;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Convierte Date local a string `YYYY-MM-DD`. */
function toYmd(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse "YYYY-MM-DDTHH:MM" a `{ymd, hhmm}` o null si vacío/inválido. */
function parseValue(v: string): { ymd: string; hhmm: string } | null {
    if (!v) return null;
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(v);
    if (!m) return null;
    return { ymd: m[1], hhmm: m[2] };
}

/** Genera opciones "00:00", "00:30", ..., "23:30". */
function opcionesHora(): string[] {
    const out: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 30]) {
            out.push(`${pad2(h)}:${pad2(m)}`);
        }
    }
    return out;
}

export default function DatePickerConHora({ id, value, onChange, min, required }: Props) {
    const parsed = parseValue(value);
    const minParsed = parseValue(min ?? '');
    const [showCal, setShowCal] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cierra el calendario al click fuera. Estilo consistente con otros
    // pickers del proyecto (Solicitud dropdown, MobileActionSheet).
    useEffect(() => {
        if (!showCal) return;
        const handler = (e: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) setShowCal(false);
        };
        window.addEventListener('mousedown', handler);
        return () => window.removeEventListener('mousedown', handler);
    }, [showCal]);

    const selectedDate = parsed ? new Date(`${parsed.ymd}T00:00`) : undefined;
    const hoy = new Date();
    const hoyYmd = toYmd(hoy);
    const disabledDates = { before: minParsed ? new Date(`${minParsed.ymd}T00:00`) : hoy };

    const onDaySelect = (d: Date | undefined) => {
        if (!d) return;
        const ymd = toYmd(d);
        // Si había hora previa y sigue válida en el nuevo día, mantenerla.
        // Si no había hora previa, seleccionar la primera válida.
        let hhmm = parsed?.hhmm ?? '';
        if (minParsed && ymd === minParsed.ymd && hhmm && hhmm < minParsed.hhmm) hhmm = ''; // hora inválida en día mín
        if (!hhmm) {
            const horas = opcionesHora().filter(h =>
                !(minParsed && ymd === minParsed.ymd && h < minParsed.hhmm)
            );
            hhmm = horas[0] ?? '00:00';
        }
        onChange(`${ymd}T${hhmm}`);
        setShowCal(false);
    };

    const onHoraChange = (nueva: string) => {
        const ymd = parsed?.ymd ?? hoyYmd;
        onChange(`${ymd}T${nueva}`);
    };

    // Filtrar opciones de hora si estamos en día mín.
    const horasVisibles = opcionesHora().filter(h => {
        if (!parsed || !minParsed) return true;
        if (parsed.ymd !== minParsed.ymd) return true;
        return h >= minParsed.hhmm;
    });

    // Display label: "15 sep 2026" formato compacto humano.
    const displayFecha = selectedDate
        ? selectedDate.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Elegir fecha';

    return (
        <div ref={containerRef} className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                    id={id}
                    type="button"
                    onClick={() => setShowCal(v => !v)}
                    className="h-11 px-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm text-left flex items-center gap-2 hover:bg-white focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 transition-colors"
                    aria-haspopup="dialog"
                    aria-expanded={showCal}
                    aria-required={required || undefined}
                >
                    <CalendarIcon size={16} className="text-slate-500 shrink-0" />
                    <span className={parsed ? 'text-slate-900' : 'text-slate-400'}>{displayFecha}</span>
                </button>
                <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select
                        value={parsed?.hhmm ?? ''}
                        onChange={e => onHoraChange(e.target.value)}
                        disabled={!parsed}
                        className="w-full h-11 pl-9 pr-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 focus:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-required={required || undefined}
                    >
                        <option value="" disabled>Elegir hora</option>
                        {horasVisibles.map(h => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                </div>
            </div>
            {showCal && (
                <div className="absolute z-20 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={onDaySelect}
                        disabled={disabledDates}
                        locale={es}
                        weekStartsOn={1}
                        showOutsideDays={false}
                    />
                </div>
            )}
        </div>
    );
}
