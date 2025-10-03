import { FormEvent, useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Comunas piloto (sector oriente, sin Peñalolén)
  const COMUNAS_ORIENTE = [
    'Vitacura',
    'Las Condes',
    'Lo Barnechea',
    'Providencia',
    'La Reina',
    'Ñuñoa',
  ] as const;

  // Fechas: hoy..+3 meses
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setMonth(maxDateObj.getMonth() + 3);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setOk(false);
    const form = e.currentTarget;

    // Construimos body respetando arrays (pet_types)
    const fd = new FormData(form);
    const data: Record<string, any> = {};
    for (const [k, v] of fd.entries()) {
      if (k === 'pet_types') {
        if (!Array.isArray(data[k])) data[k] = [];
        data[k].push(v);
      } else {
        data[k] = v;
      }
    }

    try {
      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
      form.reset();
    } catch (e: any) {
      setErr(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Tu casa y tus mascotas, en buenas manos.
        </h1>
        <p className="mt-2 text-zinc-300">
          Conecta con cuidadores verificados para tus viajes. Pagos protegidos y reseñas reales.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Formulario */}
          <form onSubmit={onSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-6 space-y-3">
            {/* Nombre + Apellidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="block">
                <span className="sr-only">Nombre</span>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="Nombre"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="sr-only">Apellido paterno</span>
                <input
                  required
                  name="last_name_paternal"
                  type="text"
                  placeholder="Apellido paterno"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block">
                <span className="sr-only">Apellido materno</span>
                <input
                  required
                  name="last_name_maternal"
                  type="text"
                  placeholder="Apellido materno"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>

            {/* Email */}
            <label className="block">
              <span className="sr-only">Email</span>
              <input
                required
                name="email"
                type="email"
                placeholder="Email"
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
              />
            </label>

            {/* Comuna */}
            <label className="block">
              <span className="sr-only">Comuna</span>
              <select
                required
                name="city"
                defaultValue=""
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
              >
                <option value="" disabled>Comuna</option>
                {COMUNAS_ORIENTE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            {/* Rol: botones excluyentes */}
            <fieldset className="flex gap-2" aria-label="Tipo de interés">
              <input type="hidden" name="visible_role" value="necesita" />
              <label className="flex-1">
                <input className="peer sr-only" type="radio" name="visible_role" value="necesita" defaultChecked />
                <div className="w-full text-center select-none rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                  Necesito un Petmate
                </div>
              </label>
              <label className="flex-1">
                <input className="peer sr-only" type="radio" name="visible_role" value="quiere" />
                <div className="w-full text-center select-none rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                  Quiero ser PetMate
                </div>
              </label>
            </fieldset>

            {/* ¿Cuándo viajas? (limitado a 3 meses, sin pasado) */}
            <label className="block">
              <span className="sr-only">¿Cuándo viajas?</span>
              <input
                name="travel_date"
                type="date"
                min={todayStr}
                max={maxDateStr}
                className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
              />
            </label>

            {/* Tipo de propiedad */}
            <fieldset className="flex gap-2" aria-label="Tipo de propiedad">
              <label className="flex-1">
                <input className="peer sr-only" type="radio" name="property_type" value="casa" defaultChecked />
                <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                  Casa
                </div>
              </label>
              <label className="flex-1">
                <input className="peer sr-only" type="radio" name="property_type" value="departamento" />
                <div className="w-full text-center rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white peer-checked:bg-emerald-600 peer-checked:border-emerald-500">
                  Departamento
                </div>
              </label>
            </fieldset>

            {/* Tipo(s) de mascotas + cantidad */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
              <div className="md:col-span-3 flex gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" name="pet_types" value="perro" className="accent-emerald-600" /> Perro
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" name="pet_types" value="gato" className="accent-emerald-600" /> Gato
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" name="pet_types" value="otro" className="accent-emerald-600" /> Otro
                </label>
              </div>
              <label className="block">
                <span className="sr-only">Cantidad</span>
                <input
                  name="pet_count"
                  type="number"
                  min={0}
                  placeholder="Cantidad de mascotas"
                  className="w-full rounded-md bg-zinc-800/60 border border-zinc-700 px-3 py-2 text-sm text-white"
                />
              </label>
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

          {/* Lado derecho: explicación breve */}
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
