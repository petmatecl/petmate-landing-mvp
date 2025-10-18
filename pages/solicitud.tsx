// pages/solicitud.tsx
import { FormEvent, useMemo, useState } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

type RolUI = 'necesita' | 'quiere';
type Propiedad = 'casa' | 'departamento';

const COMUNAS_ORIENTE = [
  'Vitacura',
  'Las Condes',
  'Lo Barnechea',
  'Providencia',
  'La Reina',
  'Ñuñoa',
] as const;

export default function SolicitudPage() {
  const [rol, setRol] = useState<RolUI>('necesita');
  const [nombre, setNombre] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState<string>('');
  const [propiedad, setPropiedad] = useState<Propiedad>('casa');

  const [dogs, setDogs] = useState(0);
  const [cats, setCats] = useState(0);

  const [range, setRange] = useState<DateRange | undefined>();
  const [openCal, setOpenCal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  /* --- Validación email en línea --- */
  const emailValid = useMemo(() => {
    if (!email) return null; // sin mensaje inicial
    // patrón básico con dominio simple
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }, [email]);

  /* --- Calendario: mínimo 5 días de anticipación --- */
  const fromDate = useMemo(() => addDays(new Date(), 5), []);
  // el rango puede ser mismo día (inicio=fin) ⇒ solo 1 día
  const disabledDays = [{ before: fromDate }];

  /* --- sumatoria mascotas --- */
  const totalPets = dogs + cats;
  const canAddDog = totalPets < 10;
  const canAddCat = totalPets < 10;

  function incDog() { if (canAddDog) setDogs(dogs + 1); }
  function decDog() { setDogs(Math.max(0, dogs - 1)); }
  function incCat() { if (canAddCat) setCats(cats + 1); }
  function decCat() { setCats(Math.max(0, cats - 1)); }

  /* --- Handler submit --- */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setOk(null);

    // Reglas mínimas
    if (!nombre || !paterno || !materno) {
      setErr('Nombre y apellidos son obligatorios.');
      return;
    }
    if (!emailValid) {
      setErr('Revisa el formato de tu email.');
      return;
    }
    if (rol === 'necesita' && !comuna) {
      setErr('Selecciona tu comuna.');
      return;
    }
    if (rol === 'necesita' && (!range?.from || !range?.to)) {
      setErr('Selecciona fecha inicio y fin.');
      return;
    }
    if (totalPets < 1) {
      setErr('Debes indicar al menos 1 mascota (perro o gato).');
      return;
    }

    setLoading(true);
    try {
      const body = {
        rol,
        nombre,
        paterno,
        materno,
        email,
        comuna: rol === 'necesita' ? comuna : null,
        propiedad,
        dogs,
        cats,
        fecha_inicio: range?.from ?? null,
        fecha_fin: range?.to ?? range?.from ?? null, // si solo eligió inicio, igual lo guardamos
      };

      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk('¡Gracias! Te contactaremos pronto.');
    } catch (error: any) {
      setErr(error?.message ?? 'Error de servidor');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container my-10">
      {/* TABS */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className={`btn ${rol === 'necesita' ? 'btn-primary' : 'btn-light'} w-full h-12`}
          onClick={() => setRol('necesita')}
        >
          Necesito un PetMate
        </button>
        <button
          className={`btn ${rol === 'quiere' ? 'btn-primary' : 'btn-light'} w-full h-12`}
          onClick={() => setRol('quiere')}
        >
          Quiero ser PetMate
        </button>
      </div>

      {/* FORM */}
      <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna izquierda (inputs) */}
        <div className="md:col-span-2 space-y-5">
          {/* Nombre y apellidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                className="w-full rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500"
                value={nombre} onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido Paterno *</label>
              <input
                className="w-full rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500"
                value={paterno} onChange={(e) => setPaterno(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido Materno *</label>
              <input
                className="w-full rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500"
                value={materno} onChange={(e) => setMaterno(e.target.value)}
              />
            </div>
          </div>

          {/* Email con validación */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              className={`w-full rounded-lg border ${
                emailValid === false ? 'border-red-500' : 'border-zinc-200'
              } focus:border-brand-500 focus:ring-brand-500`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tunombre@dominio.cl"
            />
            {emailValid === false && (
              <p className="text-xs text-red-600 mt-1">El email no cumple con el formato.</p>
            )}
          </div>

          {/* Comuna (solo si necesita un PetMate) */}
          {rol === 'necesita' && (
            <div>
              <label className="block text-sm font-medium mb-1">Comuna *</label>
              <select
                className="w-full rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500"
                value={comuna} onChange={(e) => setComuna(e.target.value)}
              >
                <option value="">Selecciona tu comuna</option>
                {COMUNAS_ORIENTE.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tipo de propiedad (tarjetas con icono) */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de propiedad *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPropiedad('casa')}
                className={`card p-5 flex items-center justify-center gap-3 ${
                  propiedad === 'casa' ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                {/* Icono casa */}
                <svg width="22" height="22" viewBox="0 0 24 24" className="text-brand-600" fill="currentColor">
                  <path d="M12 3l8 7h-2v8h-4v-5H10v5H6v-8H4l8-7z" />
                </svg>
                Casa
              </button>
              <button
                type="button"
                onClick={() => setPropiedad('departamento')}
                className={`card p-5 flex items-center justify-center gap-3 ${
                  propiedad === 'departamento' ? 'ring-2 ring-brand-500' : ''
                }`}
              >
                {/* Icono departamento */}
                <svg width="22" height="22" viewBox="0 0 24 24" className="text-brand-600" fill="currentColor">
                  <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 2h3v3H8V7zm0 5h3v3H8v-3zm5-5h3v3h-3V7zm0 5h3v3h-3v-3z" />
                </svg>
                Departamento
              </button>
            </div>
          </div>

          {/* Calendario: fechas (solo despliega si “necesita”) */}
          {rol === 'necesita' && (
            <div>
              <label className="block text-sm font-medium mb-2">Fechas del viaje</label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  readOnly
                  placeholder="Inicio"
                  value={range?.from ? format(range.from, 'dd/MM/yyyy') : ''}
                  onClick={() => setOpenCal(true)}
                  className="rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <input
                  readOnly
                  placeholder="Fin"
                  value={range?.to ? format(range.to, 'dd/MM/yyyy') : ''}
                  onClick={() => setOpenCal(true)}
                  className="rounded-lg border-zinc-200 focus:border-brand-500 focus:ring-brand-500 cursor-pointer"
                />
                <button type="button" className="btn btn-light" onClick={() => { setRange(undefined); }}>
                  Limpiar
                </button>
              </div>

              {openCal && (
                <div className="relative mt-3">
                  {/* Panel flotante de calendario */}
                  <div className="card p-4 inline-block">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-zinc-600">Selecciona inicio y fin (mín. 5 días desde hoy)</div>
                      <button className="btn btn-light py-1" onClick={() => setOpenCal(false)}>✕</button>
                    </div>

                    <DayPicker
                      mode="range"
                      selected={range}
                      onSelect={setRange}
                      fromDate={fromDate}
                      disabled={disabledDays}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contadores tipo Airbnb */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Counter label="Perros" value={dogs} onDec={decDog} onInc={incDog} canInc={canAddDog} />
            <Counter label="Gatos" value={cats} onDec={decCat} onInc={incCat} canInc={canAddCat} />
          </div>

          {/* Mensajes */}
          {err && <p className="text-sm text-red-600">{err}</p>}
          {ok && <p className="text-sm text-green-600">{ok}</p>}

          {/* Submit */}
          <div className="pt-2">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando…' : 'Crear cuenta / Registrar'}
            </button>
          </div>
        </div>

        {/* Columna derecha (imagen) */}
        <aside className="hidden md:block">
          <div className="card h-full p-0 overflow-hidden">
            <img
              src="/hero.jpg"
              alt="Persona en casa con su mascota"
              className="w-full h-full object-cover"
            />
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ---------- Subcomponente Counter ---------- */
function Counter({
  label, value, onInc, onDec, canInc = true,
}: { label: string; value: number; onInc: () => void; onDec: () => void; canInc?: boolean; }) {
  return (
    <div className="card p-4 flex items-center justify-between">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-zinc-500">Máx. 10 en total entre perros + gatos</div>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="btn btn-light w-8 h-8" onClick={onDec} aria-label={`Quitar ${label}`}>−</button>
        <div className="w-6 text-center">{value}</div>
        <button
          type="button"
          className="btn btn-light w-8 h-8 disabled:opacity-40"
          onClick={onInc}
          disabled={!canInc}
          aria-label={`Agregar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
