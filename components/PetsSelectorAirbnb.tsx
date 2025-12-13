// components/PetsSelectorAirbnb.tsx
import * as React from "react";

export type PetsValue = {
  dogs: number;
  cats: number;
};

type Props = {
  value: PetsValue;
  onChange: (value: PetsValue) => void;
  className?: string;
  hideLabel?: boolean;
};

export default function PetsSelectorAirbnb({ value, onChange, className, hideLabel }: Props) {
  const [open, setOpen] = React.useState(false);

  const total = value.dogs + value.cats;
  const label =
    total === 0
      ? "Sin mascotas"
      : [
        value.dogs > 0
          ? `${value.dogs} perro${value.dogs > 1 ? "s" : ""}`
          : null,
        value.cats > 0
          ? `${value.cats} gato${value.cats > 1 ? "s" : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

  const updateDogs = (delta: number) => {
    const next = Math.max(0, value.dogs + delta);
    onChange({ ...value, dogs: next });
  };

  const updateCats = (delta: number) => {
    const next = Math.max(0, value.cats + delta);
    onChange({ ...value, cats: next });
  };
  return (
    <div className={`relative ${className || ""}`}>
      {!hideLabel && (
        <label className="block text-sm font-medium text-slate-900">
          Mascotas
        </label>
      )}

      {/* Trigger tipo Airbnb */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-sm shadow-sm hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Mascotas
          </span>
          <span className={total === 0 ? "text-slate-400" : "text-slate-900"}>
            {label}
          </span>
        </div>
        <span className="text-xs text-slate-500">Editar</span>
      </button>

      <p className="mt-1 text-xs text-slate-500">
        Indica cuántos perros y gatos se quedarán en casa.
      </p>

      {/* Panel tipo dropdown */}
      {open && (
        <>
          {/* overlay para click fuera */}
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute z-50 mt-2 w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            {/* Perros */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Perros</p>
                <p className="text-xs text-slate-500">
                  Sociables con otras mascotas.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateDogs(-1)}
                  disabled={value.dogs === 0}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg ${value.dogs === 0
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-slate-400 text-slate-700 hover:border-slate-600"
                    }`}
                >
                  −
                </button>
                <span className="w-5 text-center text-sm text-slate-900">
                  {value.dogs}
                </span>
                <button
                  type="button"
                  onClick={() => updateDogs(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 text-lg text-slate-700 hover:border-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            <div className="my-1 h-px bg-slate-100" />

            {/* Gatos */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Gatos</p>
                <p className="text-xs text-slate-500">
                  Considera si son indoor o salen al exterior.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateCats(-1)}
                  disabled={value.cats === 0}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-lg ${value.cats === 0
                    ? "border-slate-200 text-slate-300 cursor-not-allowed"
                    : "border-slate-400 text-slate-700 hover:border-slate-600"
                    }`}
                >
                  −
                </button>
                <span className="w-5 text-center text-sm text-slate-900">
                  {value.cats}
                </span>
                <button
                  type="button"
                  onClick={() => updateCats(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-400 text-lg text-slate-700 hover:border-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <button
                type="button"
                onClick={() => onChange({ dogs: 0, cats: 0 })}
                className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
              >
                Vaciar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Listo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
