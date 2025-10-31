// components/DateRangeAirbnb.tsx
import * as React from "react";
import { DayPicker, type DateRange } from "react-day-picker";

type Props = {
  value?: DateRange;
  onChange: (r?: DateRange) => void;
  minDate?: Date;
};

function fmt(d?: Date | null) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function DateRangeAirbnb({ value, onChange, minDate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>(value);

  React.useEffect(() => {
    setRange(value);
  }, [value?.from?.getTime?.(), value?.to?.getTime?.()]);

  const apply = () => {
    onChange(range);
    setOpen(false);
  };

  const clear = () => {
    setRange(undefined);
    onChange(undefined);
  };

  const from = range?.from ?? null;
  const to = range?.to ?? null;

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2 max-w-md">
        <button type="button" onClick={() => setOpen(true)}
                className="h-11 rounded-xl border border-slate-300 px-3 text-left bg-white">
          <div className="text-xs text-slate-500">Inicio</div>
          <div className="font-medium">{fmt(from) || "dd/mm/aaaa"}</div>
        </button>
        <button type="button" onClick={() => setOpen(true)}
                className="h-11 rounded-xl border border-slate-300 px-3 text-left bg-white">
          <div className="text-xs text-slate-500">Fin</div>
          <div className="font-medium">{fmt(to) || "dd/mm/aaaa"}</div>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
             onClick={() => setOpen(false)}>
          <div className="bg-white w-[min(880px,95vw)] rounded-2xl border shadow-2xl p-3"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-2 py-1">
              <div className="font-extrabold text-slate-800">Selecciona tus fechas</div>
              <button type="button" className="w-8 h-8 rounded-lg border text-slate-600"
                      onClick={() => setOpen(false)} aria-label="Cerrar">×</button>
            </div>

            <div className="px-1 py-2">
              <DayPicker
                mode="range"
                numberOfMonths={2}
                selected={range}
                onSelect={setRange}
                disabled={{ before: minDate ?? new Date() }}
                weekStartsOn={1}
              />
            </div>

            <div className="flex items-center justify-end gap-2 px-2 pb-2">
              <button type="button" className="h-10 px-4 rounded-lg border bg-white" onClick={clear}>
                Limpiar
              </button>
              <button type="button" className="h-10 px-4 rounded-lg bg-slate-900 text-white font-bold"
                      disabled={!range?.from || !range?.to} onClick={apply}>
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
