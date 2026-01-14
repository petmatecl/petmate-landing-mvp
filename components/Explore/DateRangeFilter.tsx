import * as React from "react";
import { createPortal } from "react-dom";
import { DayPicker, DateRange } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";

type Props = {
    dateRange: DateRange | undefined;
    onDateRangeChange: (range: DateRange | undefined) => void;
    placeholder?: string;
};

export default function DateRangeFilter({ dateRange, onDateRangeChange, placeholder = "Fechas" }: Props) {
    const [open, setOpen] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = React.useState({ top: 0, left: 0 });

    // Actualizar coordenadas al abrir
    React.useLayoutEffect(() => {
        if (open && buttonRef.current) {
            const updatePosition = () => {
                const rect = buttonRef.current?.getBoundingClientRect();
                if (rect) {
                    setCoords({
                        top: rect.bottom + 8, // 8px de margen
                        left: rect.left,
                    });
                }
            };
            updatePosition();
            window.addEventListener("resize", updatePosition);
            window.addEventListener("scroll", updatePosition, true);

            return () => {
                window.removeEventListener("resize", updatePosition);
                window.removeEventListener("scroll", updatePosition, true);
            };
        }
    }, [open]);

    const handleSelect = (range: DateRange | undefined) => {
        onDateRangeChange(range);
        // No cerramos automáticamente para permitir seleccionar rango completo
        if (range?.from && range?.to) {
            setOpen(false);
        }
    };

    let displayText = placeholder;
    if (dateRange?.from) {
        if (dateRange.to) {
            displayText = `${format(dateRange.from, "d MMM", { locale: es })} - ${format(dateRange.to, "d MMM", { locale: es })}`;
        } else {
            displayText = format(dateRange.from, "d MMM", { locale: es });
        }
    }

    const hasSelection = !!dateRange?.from;

    return (
        <>
            <div className="relative inline-block">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition-colors
                        ${hasSelection
                            ? "bg-slate-900 border-slate-900 text-white"
                            : "bg-white border-slate-400 text-slate-700 hover:bg-slate-50"}`}
                >
                    <CalendarIcon className="w-4 h-4" />
                    <span>{displayText}</span>
                </button>
                {hasSelection && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDateRangeChange(undefined);
                        }}
                        className="absolute -top-1 -right-1 bg-slate-200 text-slate-600 rounded-full p-0.5 hover:bg-red-100 hover:text-red-500 transition-colors"
                        title="Borrar fechas"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {open && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-start justify-start">
                    {/* Backdrop transparente para cerrar al hacer click fuera */}
                    <div className="fixed inset-0 bg-transparent" onClick={() => setOpen(false)} />

                    {/* Popover posicionado */}
                    <div
                        className="relative z-50 p-3 bg-white rounded-xl shadow-xl border-2 border-slate-400 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            position: "absolute",
                            top: coords.top,
                            left: coords.left,
                        }}
                    >
                        <DayPicker
                            mode="range"
                            selected={dateRange}
                            onSelect={handleSelect}
                            disabled={{ before: new Date() }} // No permitir fechas pasadas
                            weekStartsOn={1}
                            locale={es}
                            numberOfMonths={2} // Mostrar 2 meses
                            pagedNavigation

                            // Estilos
                            classNames={{
                                root: "w-full",
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2",
                                caption_label: "text-sm font-medium",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent hover:bg-slate-100 p-1 rounded-full transition-colors flex items-center justify-center text-slate-500",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center",
                                day_range_start: "day-range-start bg-slate-900 text-white hover:bg-slate-900 hover:text-white rounded-l-md rounded-r-none",
                                day_range_end: "day-range-end bg-slate-900 text-white hover:bg-slate-900 hover:text-white rounded-r-md rounded-l-none",
                                day_selected: "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white rounded-md", // Default selected style
                                day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900 rounded-none",
                                day_today: "bg-slate-100 text-accent-foreground",
                                day_outside: "text-slate-300 opacity-50",
                                day_disabled: "text-slate-300 opacity-50 cursor-not-allowed hover:bg-transparent",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
