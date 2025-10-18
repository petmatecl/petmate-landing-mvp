// pages/solicitud.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { DayPicker, DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import { addDays, differenceInCalendarDays, isAfter } from 'date-fns';

type Mode = 'owner' | 'sitter';

export default function Solicitud() {
  const router = useRouter();
  const initialMode: Mode =
    (router.query.mode as Mode) === 'sitter' ? 'sitter' : 'owner';

  const [mode, setMode] = useState<Mode>(initialMode);

  // Campos comunes
  const [nombre, setNombre] = useState('');
  const [apPat, setApPat] = useState('');
  const [apMat, setApMat] = useState('');
  const [email, setEmail] = useState('');

  // Campos sólo para "owner" (necesito PetMate)
  const [comuna, setComuna] = useState('');
  const [propiedad, setPropiedad] = useState<'casa' | 'departamento' | null>(null);
  const [dogs, setDogs] = useState(0);
  const [cats, setCats] = useState(0);
  const [range, setRange] = useState<DateRange | undefined>();

  // Reglas
  const maxPets = 10;
  const minStart = useMemo(() => addDays(new Date(), 5), []);
  const disabledDays = { before: minStart };

  // Límite combinado perros + gatos
  const canIncDog = dogs + cats < maxPets;
  const canIncCat = dogs + cats < maxPets;
  const decDog = () => setDogs((n) => Math.max(0, n - 1));
  const incDog = () => canIncDog && setDogs((n) => n + 1);
  const decCat = () => setCats((n) => Math.max(0, n - 1));
  const incCat = () => canIncCat && setCats((n) => n + 1);

  // Si llegan ?mode=... por URL
  useEffect(() => {
    if (router.query.mode === 'sitter') setMode('sitter');
    if (router.query.mode === 'owner') setMode('owner');
  }, [router.query.mode]);

  // Fechas legibles
  const selectedSummary = useMemo(() => {
    if (!range?.from || !range?.to) return '';
    const days = differenceInCalendarDays(range.to, range.from) + 1;
    return `${range.from.toLocaleDateString()} – ${range.to.toLocaleDateString()} (${days} día${days > 1 ? 's' : ''})`;
  }, [range]);

  // Validación simple email
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Asegura que to >= from y permite 1 día
  const onSelectRange = (r: DateRange | undefined) => {
    if (!r?.from) return setRange(undefined);
    if (r.to && isAfter(r.from, r.to)) {
      setRange({ from: r.to, to: r.from });
    } else {
      setRange(r);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí podrías llamar a /api/join-waitlist
    alert('¡Solicitud enviada! (demo)');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="sr-only">Solicitud</h1>

      {/* TABS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          className={`tab ${mode === 'owner' ? 'tab-active' : 'tab-inactive'}`}
          onClick={() => setMode('owner')}
          type="button"
        >
          Necesito un PetMate
        </button>
        <button
          className={`tab ${mode === 'sitter' ? 'tab-active' : 'tab-inactive'}`}
          onClick={() => setMode('sitter')}
          type="button"
        >
          Quiero ser PetMate
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input className="form-input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido Paterno *</label>
              <input className="form-input" value={apPat} onChange={(e) => setApPat(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellido Materno *</label>
              <input className="form-input" value={apMat} onChange={(e) => setApMat(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              className={`form-input ${email && !emailOk ? 'ring-2 ring-red-500 border-red-500' : ''}`}
              placeholder="tunombre@dominio.cl"
              value={email}
              onChange={(e) => (e.target.value = e.target.value.trimStart(), setEmail(e.target.value))}
            />
            {email && !emailOk && (
              <p className="mt-1 text-xs text-red-600">Ingresa un email válido (ej: nombre@dominio.cl)</p>
            )}
          </div>

          {/* Controles SOLO para quien necesita PetMate */}
          {mode === 'owner' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Comuna *</label>
                <select className="form-input" value={comuna} onChange={(e) => setComuna(e.target.value)}>
                  <option value="">Selecciona tu comuna</option>
                  {['Vitacura','Las Condes','Lo Barnechea','Providencia','La Reina','Ñuñoa'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Fechas del viaje *</label>
                <div className="card p-3">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={onSelectRange}
                    numberOfMonths={2}
                    locale={es}
                    disabled={disabledDays}
                    styles={{
                      caption: { color: '#065f46' },
                      daySelected: { background: '#10b981', color: 'white' },
                      range_middle: { background: '#a7f3d0' },
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Anticipación mínima: <strong>5 días</strong>. Estadías pueden ser de <strong>1 día</strong> o más.
                  {selectedSummary && <span className="ml-2">Seleccionado: {selectedSummary}</span>}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo de propiedad *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`card p-6 text-center ${propiedad==='casa' ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                    onClick={() => setPropiedad('casa')}
                  >
                    <div className="text-2xl mb-2">🏠</div>
                    Casa
                  </button>
                  <button
                    type="button"
                    className={`card p-6 text-center ${propiedad==='departamento' ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                    onClick={() => setPropiedad('departamento')}
                  >
                    <div className="text-2xl mb-2">🏢</div>
                    Departamento
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Perros</div>
                      <div className="text-xs text-gray-500">Máx. {maxPets} entre perros + gatos</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={decDog} className="btn-secondary w-8" aria-label="menos">–</button>
                      <span className="w-6 text-center">{dogs}</span>
                      <button type="button" onClick={incDog} disabled={!canIncDog} className="btn-secondary w-8" aria-label="más">+</button>
                    </div>
                  </div>
                </div>
                <div className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Gatos</div>
                      <div className="text-xs text-gray-500">Máx. {maxPets} entre perros + gatos</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={decCat} className="btn-secondary w-8" aria-label="menos">–</button>
                      <span className="w-6 text-center">{cats}</span>
                      <button type="button" onClick={incCat} disabled={!canIncCat} className="btn-secondary w-8" aria-label="más">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-2">
            <button className="btn-primary" type="submit">
              Crear cuenta / Registrarse
            </button>
          </div>
        </div>

        {/* Imagen lateral (decorativa) */}
        <aside className="hidden lg:block">
          <div className="card h-full p-4 flex items-center justify-center">
            <img
              src="/hero-pet.svg"
              alt="Persona en casa con su mascota"
              className="w-full max-w-sm"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1558944351-dae1b4d12bf2?auto=format&fit=crop&w=700&q=60';
              }}
            />
          </div>
        </aside>
      </form>
    </div>
  );
}
