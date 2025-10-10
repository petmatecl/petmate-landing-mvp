import { FormEvent, useMemo, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { addMonths, isAfter, isBefore, startOfDay } from 'date-fns';

type RoleUI = 'necesita' | 'quiere';

export default function Home() {
  // UI state
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<RoleUI>('necesita');

  // Comunas piloto (sector oriente, sin Peñalolén)
  const COMUNAS_ORIENTE = [
    'Vitacura',
    'Las Condes',
    'Lo Barnechea',
    'Providencia',
    'La Reina',
    'Ñuñoa',
  ] as const;

  // Rango permitido: hoy .. +3 meses
  const today = startOfDay(new Date());
  const maxDate = useMemo(() => startOfDay(addMonths(new Date(), 3)), []);

  // Rango del viaje (un solo calendario)
  const [range, setRange] = useState<DateRange | undefined>();

  // Mascotas
  const [dogOn, setDogOn] = useState(false);
  const [catOn, setCatOn] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOk(false);

    const form = e.currentTarget;

    // Validaciones previas
    if (role === 'necesita') {
      if (!range?.from || !range?.to) {
        setLoading(false);
        setErr('Debes seleccionar fecha de inicio y fin del viaje');
        return;
      }
      if (isAfter(range.from, range.to)) {
        setLoading(false);
        setErr('La fecha fin no puede ser anterior al inicio');
        return;
      }
      if (!dogOn && !catOn) {
        setLoading(false);
        setErr('Selecciona al menos Perro o Gato');
        return;
      }
    }

    // Armamos body
    const fd = new FormData(form);
    const data: Record<string, any> = {};
    fd.forEach((value, key) => (data[key] = typeof value === 'string' ? value : ''));

    data.visible_role = role;
    if (role === 'necesita') {
      data.travel_start = range?.from?.toISOString().slice(0, 10) ?? '';
      data.travel_end = range?.to?.toISOString().slice(0, 10) ?? '';
    } else {
      data.travel_start = '';
      data.travel_end = '';
    }

    data.dog_count = dogOn ? Number(data.dog_count || 0) : 0;
    data.cat_count = catOn ? Number(data.cat_count || 0) : 0;

    try {
      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
      form.reset();
      // Reset UI
      setRole('necesita');
      setRange(undefined);
      setDogOn(false);
      setCatOn(false);
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  // Fechas deshabilitadas (fuera de hoy..+3m)
  const disabledDays = [
    (date: Date) => isBefore(date, today),
    (date: Date) => isAfter(date, maxDate),
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src="/logo.svg" alt="PetMate logo" className="h-8 w-8" />
          <span className="text-lg font-semibold">PetMate</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Tu casa y tus mascotas, en buenas manos.
        </h1>
        <p className="mt-2 text-zinc-300">
          Conecta con cuidadores verificados para tus viajes. Pagos protegidos y reseñas reales.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6 items-start">
          {/* Formulario */}
          <form onSubmit={onSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6 space-y-4">
            {/* Nombre + apellidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="block text-sm mb-1 text-zinc-300">Nombre</span>
                <input
                  required
                  name="name"
                  type="text"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm mb-1 text-zinc-300">Apellido paterno</span>
                <input
                  required
                  name="last_name_paternal"
                  type="text"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm mb-1 text-zinc-300">Apellido materno</span>
                <input
                  required
                  name="last_name_maternal"
                  type="text"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                />
              </label>
            </div>

            {/* Email (pattern) */}
            <label className="block">
              <span className="block text-sm mb-1 text-zinc-300">Email</span>
              <input
                required
                name="email"
                type="email"
                inputMode="email"
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                title="Ingresa un correo válido (ej. nombre@dominio.com)"
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
              />
            </label>

            {/* Comuna */}
            <label className="block">
              <span className="block text-sm mb-1 text-zinc-300">Comuna</span>
              <select
                required
                name="city"
                defaultValue=""
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
              >
                <option value="" disabled>Selecciona tu comuna</option>
                {COMUNAS_ORIENTE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            {/* Rol */}
            <div>
              <span className="block text-sm mb-1 text-zinc-300">¿Qué necesitas?</span>
              <input type="hidden" name="visible_role" value={role} />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="role_ui"
                    value="necesita"
                    checked={role === 'necesita'}
                    onChange={() => setRole('necesita')}
                  />
                  <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                    Necesito un Petmate
                  </div>
                </label>
                <label className="block">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="role_ui"
                    value="quiere"
                    checked={role === 'quiere'}
                    onChange={() => setRole('quiere')}
                  />
                  <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                    Quiero ser PetMate
                  </div>
                </label>
              </div>
            </div>

            {/* Calendario de rango (solo si “necesita”) */}
            {role === 'necesita' && (
              <div>
                <span className="block text-sm mb-1 text-zinc-300">Fechas del viaje</span>
                <div className="rounded-md border border-zinc-700 bg-zinc-800/40 p-2">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    fromMonth={today}
                    toMonth={maxDate}
                    disabled={disabledDays}
                    numberOfMonths={1}
                    className="rdp-dark !text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  * Puedes elegir un rango dentro de los próximos 3 meses.
                </p>
              </div>
            )}

            {/* Tipo de propiedad */}
            <div>
              <span className="block text-sm mb-1 text-zinc-300">Tipo de propiedad</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <input className="peer sr-only" type="radio" name="property_type" value="casa" defaultChecked />
                  <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                    Casa
                  </div>
                </label>
                <label className="block">
                  <input className="peer sr-only" type="radio" name="property_type" value="departamento" />
                  <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                    Departamento
                  </div>
                </label>
              </div>
            </div>

            {/* Mascotas con cantidad por especie */}
            <div className="space-y-2">
              <span className="block text-sm text-zinc-300">Mascotas</span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Perro */}
                <div className="rounded-md border border-zinc-700 p-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-emerald-600"
                      checked={dogOn}
                      onChange={(e) => setDogOn(e.target.checked)}
                    />
                    <span className="text-sm">Perro</span>
                  </label>
                  {dogOn && (
                    <div className="mt-2">
                      <label className="block text-xs mb-1 text-zinc-400">Cantidad de perros</label>
                      <input
                        name="dog_count"
                        type="number"
                        min={0}
                        max={6}
                        defaultValue={1}
                        className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Gato */}
                <div className="rounded-md border border-zinc-700 p-3">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-emerald-600"
                      checked={catOn}
                      onChange={(e) => setCatOn(e.target.checked)}
                    />
                    <span className="text-sm">Gato</span>
                  </label>
                  {catOn && (
                    <div className="mt-2">
                      <label className="block text-xs mb-1 text-zinc-400">Cantidad de gatos</label>
                      <input
                        name="cat_count"
                        type="number"
                        min={0}
                        max={6}
                        defaultValue={1}
                        className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
              {role === 'necesita' && (
                <p className="text-xs text-zinc-400">* Selecciona al menos Perro o Gato.</p>
              )}
            </div>

            {/* Botón + estados */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar solicitud'}
            </button>
            {ok && <p className="text-emerald-400 text-sm">¡Gracias! Te contactaremos pronto.</p>}
            {err && <p className="text-red-400 text-sm">Error: {err}</p>}

            <p className="mt-1 text-xs text-zinc-400">
              * Piloto disponible solo en comunas del sector oriente de la RM.
            </p>
          </form>

          {/* Panel derecho con imagen */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop"
              alt="Persona en casa con su mascota"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
