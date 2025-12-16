
import * as React from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

type Props = {
    value?: Date | string;
    onChange: (d?: Date) => void;
    disabled?: boolean;
    maxDate?: Date; // Fecha máxima permitida (ej: futuro)
    validateDate?: (d: Date) => boolean; // Validar fecha seleccionada
    onValidationFail?: () => void; // Callback si falla validación
};

export default function DatePickerSingle({ value, onChange, disabled, maxDate, validateDate, onValidationFail }: Props) {
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState<Date | undefined>(
        typeof value === "string" && value ? new Date(value) : (value instanceof Date ? value : undefined)
    );
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = React.useState({ top: 0, left: 0 });

    // Sincronizar prop externa
    React.useEffect(() => {
        if (typeof value === "string") {
            setSelected(value ? new Date(value) : undefined);
        } else {
            setSelected(value);
        }
    }, [value]);

    // Actualizar coordenadas al abrir
    React.useLayoutEffect(() => {
        if (open && buttonRef.current) {
            const updatePosition = () => {
                const rect = buttonRef.current?.getBoundingClientRect();
                if (rect) {
                    setCoords({
                        top: rect.bottom + window.scrollY + 8, // 8px de margen
                        left: rect.left + window.scrollX,
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

    const handleSelect = (d?: Date) => {
        if (d && validateDate && !validateDate(d)) {
            // Falló validación
            if (onValidationFail) onValidationFail();
            return;
        }

        setSelected(d);
        onChange(d);
        setOpen(false);
    };

    const formattedDate = selected ? format(selected, "dd/MM/yyyy") : "";

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => setOpen(!open)}
                className={`w-full h-11 text-sm rounded-xl px-3 text-left border transition-all flex items-center justify-between ${open ? "ring-2 ring-emerald-500/20 border-emerald-500" : "border-slate-300 hover:border-emerald-300"
                    } ${disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white text-slate-900"} `}
            >
                <span>{formattedDate || "dd/mm/aaaa"}</span>
                <CalendarIcon className="w-5 h-5 text-slate-400" />
            </button>

            {open && !disabled && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-start justify-start">
                    {/* Backdrop transparente para cerrar al hacer click fuera */}
                    <div className="fixed inset-0 bg-transparent" onClick={() => setOpen(false)} />

                    {/* Popover posicionado */}
                    <div
                        className="relative z-50 p-3 bg-white rounded-xl shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-100"
                        style={{
                            position: "absolute",
                            top: coords.top,
                            left: coords.left,
                        }}
                    >
                        <DayPicker
                            mode="single"
                            selected={selected}
                            onSelect={handleSelect}
                            defaultMonth={selected || maxDate || new Date(2000, 0, 1)}
                            disabled={{ after: new Date() }}
                            weekStartsOn={1}
                            locale={es}

                            // Estilos copiados y adaptados de DateRangeAirbnb
                            classNames={{
                                root: "w-full",
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-2",
                                caption_label: "text-sm font-bold text-slate-900",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent hover:bg-slate-100 p-1 rounded-full transition-colors flex items-center justify-center text-slate-500",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors",
                                day_selected: "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white",
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
