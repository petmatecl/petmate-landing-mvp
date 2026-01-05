// components/DateRangeAirbnb.tsx
import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { es } from "date-fns/locale";

type Props = {
  value?: DateRange;
  onChange: (r?: DateRange) => void;
  minDate?: Date;
  className?: string;
  hideLabel?: boolean;
};

function fmt(d?: Date | null) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function DateRangeAirbnb({ value, onChange, minDate, className, hideLabel }: Props) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(value);

  // sincroniza cuando cambie value desde afuera
  React.useEffect(() => {
    setRange(value);
  }, [value?.from?.getTime?.(), value?.to?.getTime?.()]);

  const apply = () => {
    if (!range?.from || !range?.to) return;
    onChange(range);
    setOpen(false);
  };

  const clear = () => {
    setRange(undefined);
    onChange(undefined);
  };

  const from = range?.from ?? null;
  const to = range?.to ?? null;

  const hasBoth = !!(range?.from && range?.to);

  return (
    <div className={`relative ${className || ""}`}>
      {/* Trigger tipo Airbnb: 2 campos en fila */}
      <div className="space-y-1 max-w-3xl">
        {!hideLabel && (
          <label className="block text-sm font-medium text-slate-900">
            Fechas del viaje
          </label>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left shadow-sm hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Inicio
              </span>
              <span className={from ? "text-slate-900" : "text-slate-400"}>
                {fmt(from) || "Añadir fecha"}
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-200 pl-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Fin
              </span>
              <span className={to ? "text-slate-900" : "text-slate-400"}>
                {fmt(to) || "Añadir fecha"}
              </span>
            </div>
          </div>
        </button>
        <p className="text-xs text-slate-500">
          Selecciona la fecha de inicio y fin de tu viaje.
        </p>
      </div>

      {/* Modal calendario */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          {/* card */}
          <div
            className="relative z-10 w-[min(880px,95vw)] rounded-2xl border bg-white shadow-2xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Selecciona tus fechas
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Primero el día de inicio, luego el de término.
                </p>
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-1 py-2">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={(r) => setRange(r)}
                disabled={{ before: minDate ?? new Date(new Date().setHours(0, 0, 0, 0)) }}
                weekStartsOn={1}
                showOutsideDays={false}
                className="mx-auto"
                classNames={{
                  months:
                    "flex flex-col gap-6 lg:flex-row lg:gap-8 justify-center",
                  month: "space-y-4",
                  caption:
                    "flex items-center justify-between px-3 text-slate-900",
                  caption_label: "text-sm font-semibold",
                  nav: "flex items-center gap-1",
                  nav_button:
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100",
                  head_row: "flex",
                  head_cell:
                    "flex-1 pb-2 text-center text-[11px] font-semibold uppercase text-slate-500",
                  row: "flex w-full",
                  cell: "relative flex-1 p-0 text-center text-sm",

                  // Día base: círculo centrado (como antes)
                  day: "mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-sm text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500",

                  day_today:
                    "border border-emerald-500 text-emerald-700 font-semibold",

                  // Día seleccionado "suelto"
                  day_selected:
                    "bg-slate-900 text-white hover:bg-slate-900",

                  day_disabled:
                    "text-slate-300 hover:bg-transparent cursor-not-allowed",
                  day_outside: "text-slate-300 opacity-50",

                  // --- Todos los días del rango con el mismo estilo de círculo oscuro ---
                  day_range_start:
                    "bg-slate-900 text-white hover:bg-slate-900 rounded-l-full rounded-r-none",
                  day_range_middle:
                    "bg-slate-100 text-slate-900 hover:bg-slate-200 rounded-none",
                  day_range_end:
                    "bg-slate-900 text-white hover:bg-slate-900 rounded-r-full rounded-l-none",
                }}
                locale={es}
              />
            </div>

            <div className="flex items-center justify-end gap-2 px-2 pb-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-700 hover:bg-slate-50"
                onClick={clear}
              >
                Limpiar
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed"
                disabled={!hasBoth}
                onClick={apply}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
