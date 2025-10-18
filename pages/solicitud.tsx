// pages/solicitud.tsx
import { useMemo, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { addDays } from 'date-fns';

type RoleUI = 'necesita' | 'quiere';

export default function Solicitud() {
  const [role, setRole] = useState<RoleUI>('necesita');

  // Rango de fechas
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  // Anticipación mínima (5 días)
  const minSelectable = useMemo(() => addDays(new Date(), 5), []);

  const disabledDays = useMemo(() => {
    // Sólo aplica al flujo "Necesito un PetMate"
    return role === 'necesita' ? [{ before: minSelectable }] : [];
  }, [role, minSelectable]);

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        {/* Tabs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className={`tab ${role === 'necesita' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setRole('necesita')}
          >
            Necesito un PetMate
          </button>
          <button
            type="button"
            className={`tab ${role === 'quiere' ? 'tab-active' : 'tab-inactive'}`}
            onClick={() => setRole('quiere')}
          >
            Quiero ser PetMate
          </button>
        </div>

        {/* Formulario */}
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Columna formulario */}
          <div className="lg:col-span-2">
            <form className="space-y-6">
              {/* Nombres */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre *</label>
                  <input className="input" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido Paterno *</label>
                  <input className="input" placeholder="Apellido Paterno" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido Materno *</label>
                  <input className="input" placeholder="Apellido Materno" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email *</label>
                <input className="input" placeholder="tunombre@dominio.cl" type="email" />
              </div>

              {/* Comuna: sólo cuando necesita */}
              {role === 'necesita' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Comuna *</label>
                  <select className="select" defaultValue="">
                    <option value="" disabled>Selecciona tu comuna</option>
                    <option>Vitacura</option>
                    <option>Las Condes</option>
                    <option>Lo Barnechea</option>
                    <option>Providencia</option>
                    <option>La Reina</option>
                    <option>Ñuñoa</option>
                  </select>
                </div>
              )}

              {/* Tipo propiedad con iconos */}
              {role === 'necesita' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">Tipo de propiedad *</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="card flex items-center justify-center gap-3 p-5 cursor-pointer hover:shadow">
                      {/* Ícono Casa */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-brand-500">
                        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-6v-6H10v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span className="font-medium text-neutral-800">Casa</span>
                      <input type="radio" name="propiedad" value="casa" className="sr-only" />
                    </label>

                    <label className="card flex items-center justify-center gap-3 p-5 cursor-pointer hover:shadow">
                      {/* Ícono Departamento */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-brand-500">
                        <path d="M4 3h10v18H4V3Zm6 0h10v10H10V3Z" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span className="font-medium text-neutral-800">Departamento</span>
                      <input type="radio" name="propiedad" value="departamento" className="sr-only" />
                    </label>
                  </div>
                </div>
              )}

              {/* Calendario: sólo para “necesita” */}
              {role === 'necesita' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">Fechas del viaje</label>

                  <div className="card p-4">
                    <DayPicker
                      mode="range"
                      numberOfMonths={2}
                      selected={range}
                      onSelect={setRange}
                      disabled={disabledDays}
                      // permite rango de 1 día: start === end
                      // react-day-picker ya lo admite por defecto
                    />
                    <div className="mt-3 text-sm text-neutral-600">
                      {range?.from && range?.to ? (
                        <>Desde <strong>{range.from.toLocaleDateString()}</strong> hasta <strong>{range.to.toLocaleDateString()}</strong></>
                      ) : range?.from ? (
                        <>Inicio: <strong>{range.from.toLocaleDateString()}</strong> — selecciona fin</>
                      ) : (
                        <>Selecciona inicio y fin (mínimo 5 días de anticipación). La duración puede ser 1 día.</>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="pt-2">
                <button className="btn-primary">
                  Enviar solicitud
                </button>
              </div>
            </form>
          </div>

          {/* Columna imagen */}
          <div className="hidden lg:block">
            <img
              src="/hero.jpg"
              alt="Persona en casa con su mascota"
              className="w-full rounded-xl shadow-card object-cover h-[520px]"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
