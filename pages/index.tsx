import { FormEvent, useMemo, useState } from 'react';

export default function Home() {
  // UI state
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<'necesita' | 'quiere'>('necesita');

  // Comunas piloto (sector oriente, sin Peñalolén)
  const COMUNAS_ORIENTE = [
    'Vitacura',
    'Las Condes',
    'Lo Barnechea',
    'Providencia',
    'La Reina',
    'Ñuñoa',
  ] as const;

  // Fechas: hoy..+3 meses (rango)
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateStr = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  }, []);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  // Mascotas
  const [dogOn, setDogOn] = useState(false);
  const [catOn, setCatOn] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOk(false);

    const form = e.currentTarget;

    // Armamos body primario desde FormData
    const fd = new FormData(form);
    const data: Record<string, any> = {};
    fd.forEach((value, key) => {
      const val = typeof value === 'string' ? value : '';
      data[key] = val;
    });

    // Campos derivados
    data.visible_role = role;
    if (role === 'necesita') {
      data.travel_start = start;
      data.travel_end = end;
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
      setRole('necesita');
      setStart('');
      setEnd('');
      setDogOn(false);
      setCatOn(false);
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  const endMin = start || todayStr;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      {/* Header con logo */}
      <header className="border-b border-zinc-800/70 bg-zinc-950/60 backdrop-blur">
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

            {/* Email */}
            <label className="block">
              <span className="block text-sm mb-1 text-zinc-300">Email</span>
              <input
                required
                name="email"
                type="email"
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

            {/* Rango de fechas (solo si “necesita”) */}
            {role === 'necesita' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-sm mb-1 text-zinc-300">Fecha inicio</span>
                  <input
                    required
                    name="travel_start"
                    type="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={start}
                    onChange={(e) => {
                      setStart(e.target.value);
                      if (end && e.target.value && end < e.target.value) setEnd(e.target.value);
                    }}
                    className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm mb-1 text-zinc-300">Fecha fin</span>
                  <input
                    required
                    name="travel_end"
                    type="date"
                    min={start || todayStr}
                    max={maxDateStr}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                  />
                </label>
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
                        defaultValue={1}
                        className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
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

          {/* Lado derecho */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-6">
            <h3 className="font-medium mb-2">¿Cómo funciona?</h3>
            <ol className="list-decimal list-inside text-sm text-zinc-300 space-y-1">
              <li>Publica tu viaje o postula como cuidador/a.</li>
              <li>Charlas, verificas perfiles y confirmas la reserva.</li>
              <li>Check-in en la casa (llaves / Chekky). Checkout.</li>
            </ol>
            <p className="mt-3 text-xs text-zinc-400">
              Beta: Durante el MVP, PetMate se enfoca en comunas del sector oriente y con pagos resguardados.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
