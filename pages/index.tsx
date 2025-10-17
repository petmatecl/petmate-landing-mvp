// pages/index.tsx
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { DayPicker, DateRange, Matcher } from 'react-day-picker';
import { addMonths, startOfDay } from 'date-fns';

type Mode = 'need' | 'be'; // tabs
type RoleUI = 'necesita' | 'quiere';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const COMUNAS_ORIENTE = [
  'Vitacura',
  'Las Condes',
  'Lo Barnechea',
  'Providencia',
  'La Reina',
  'Ñuñoa',
] as const;

const MAX_PETS = 10;
const TODAY = startOfDay(new Date());
const MAX_MONTH = addMonths(TODAY, 3);

export default function Home() {
  // TAB (formularios)
  const [mode, setMode] = useState<Mode>('need');

  // email live validation
  const [email, setEmail] = useState('');
  const emailValid = EMAIL_RE.test(email);

  // comuna (solo para NEED)
  const [comuna, setComuna] = useState<string>('');

  // property & pets (solo NEED)
  const [propType, setPropType] = useState<'casa' | 'departamento' | ''>('');
  const [dogs, setDogs] = useState<number>(0);
  const [cats, setCats] = useState<number>(0);

  // rango de fechas (solo NEED)
  const [range, setRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState<null | 'start' | 'end'>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // loading & feedback
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // totales y validaciones pets
  const petsTotal = dogs + cats;
  const petsError =
    mode === 'need' && (petsTotal < 1 || petsTotal > MAX_PETS);

  // disabled days del calendario (pasadas)
  const disabledDays: Matcher[] = [{ before: TODAY }];

  // calendario
  const onSelectRange = (next?: DateRange) => {
    setRange(next);
    const bothSelected = next?.from && next?.to;
    if (bothSelected) setCalendarOpen(null);
  };

  const minRequirementsError = useMemo(() => {
    if (!emailValid) return 'Ingresa un correo válido.';
    if (mode === 'need') {
      if (!comuna) return 'Selecciona tu comuna.';
      if (!range?.from || !range?.to) return 'Selecciona las fechas de inicio y fin.';
      if (!propType) return 'Indica el tipo de propiedad.';
      if (petsError) {
        if (petsTotal < 1) return 'Debes indicar al menos 1 mascota.';
        return `El máximo permitido es ${MAX_PETS} entre perros y gatos.`;
      }
    }
    return '';
  }, [emailValid, mode, comuna, range, propType, petsError, petsTotal]);

  // envío
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(false);

    if (minRequirementsError) {
      setErr(minRequirementsError);
      return;
    }

    try {
      setLoading(true);
      const fd = new FormData(e.currentTarget);

      const body: Record<string, any> = {
        role: (mode === 'need' ? 'necesita' : 'quiere') satisfies RoleUI,
        nombre: fd.get('nombre'),
        apellido_p: fd.get('apellido_p'),
        apellido_m: fd.get('apellido_m'),
        email,
      };

      if (mode === 'need') {
        body.comuna = comuna;
        body.propiedad = propType;
        body.dogs = dogs;
        body.cats = cats;
        body.when_from = range?.from?.toISOString();
        body.when_to = range?.to?.toISOString();
      }

      const res = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Error al enviar el formulario');
      }

      setOk(true);
      e.currentTarget.reset();
      setEmail('');
      setComuna('');
      setPropType('');
      setDogs(0);
      setCats(0);
      setRange(undefined);
    } catch (er: any) {
      setErr(er.message || 'Error de servidor');
    } finally {
      setLoading(false);
    }
  }

  // clases de los tabs: full-width, grandes, selección muy evidente
  const baseTab =
    'w-full text-center font-bold tracking-wide transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';
  const selectedTab =
    'bg-emerald-500 text-zinc-900 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400';
  const unselectedTab =
    'bg-zinc-800/70 text-zinc-200 hover:bg-zinc-700';

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500">
              <span className="text-zinc-900 font-extrabold">PM</span>
            </div>
            <span className="font-semibold tracking-wide">PetMate</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800"
            >
              Iniciar sesión
            </a>
            <a
              href="#"
              className="hidden sm:inline rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-400"
            >
              Registrarse
            </a>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[1fr_420px]">
        <section className="space-y-6">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Tu casa y tus mascotas, en buenas manos.
          </h1>
          <p className="text-zinc-300">
            Conecta con cuidadores verificados para tus viajes. Pagos protegidos y reseñas reales.
          </p>

          {/* TABS — full width */}
          <div className="rounded-xl border border-zinc-800 p-1">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                aria-pressed={mode === 'need'}
                onClick={() => setMode('need')}
                className={`${baseTab} ${mode === 'need' ? selectedTab : unselectedTab} rounded-lg py-3 text-base sm:py-4 sm:text-lg`}
              >
                Necesito un PetMate
              </button>
              <button
                type="button"
                aria-pressed={mode === 'be'}
                onClick={() => setMode('be')}
                className={`${baseTab} ${mode === 'be' ? selectedTab : unselectedTab} rounded-lg py-3 text-base sm:py-4 sm:text-lg`}
              >
                Quiero ser PetMate
              </button>
            </div>
          </div>

          {/* FORM */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Base fields */}
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm text-zinc-300">Nombre*</label>
                <input
                  name="nombre"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm text-zinc-300">Apellido paterno*</label>
                <input
                  name="apellido_p"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm text-zinc-300">Apellido materno*</label>
                <input
                  name="apellido_m"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm text-zinc-300">Email*</label>
                <input
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 outline-none ${
                    email.length === 0
                      ? 'border-zinc-700 bg-zinc-900 focus:border-emerald-500'
                      : emailValid
                      ? 'border-emerald-500 bg-zinc-900'
                      : 'border-red-500 bg-zinc-900'
                  }`}
                  placeholder="tucorreo@dominio.com"
                />
                {email.length > 0 && !emailValid && (
                  <p className="mt-1 text-xs text-red-400">
                    El correo no cumple con el formato.
                  </p>
                )}
              </div>

              {/* Solo para NEED */}
              {mode === 'need' && (
                <>
                  {/* Comuna */}
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-sm text-zinc-300">Comuna*</label>
                    <select
                      value={comuna}
                      onChange={(e) => setComuna(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                      required={mode === 'need'}
                    >
                      <option value="">Selecciona tu comuna</option>
                      {COMUNAS_ORIENTE.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Propiedad */}
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-sm text-zinc-300">Tipo de propiedad*</label>
                    <div className="flex gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          className="accent-emerald-500"
                          checked={propType === 'casa'}
                          onChange={() => setPropType('casa')}
                        />
                        Casa
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          className="accent-emerald-500"
                          checked={propType === 'departamento'}
                          onChange={() => setPropType('departamento')}
                        />
                        Departamento
                      </label>
                    </div>
                  </div>

                  {/* Mascotas */}
                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">
                      Perros (0–{MAX_PETS})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_PETS}
                      value={dogs}
                      onChange={(e) =>
                        setDogs(Math.max(0, Math.min(MAX_PETS, Number(e.target.value) || 0)))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">
                      Gatos (0–{MAX_PETS})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={MAX_PETS}
                      value={cats}
                      onChange={(e) =>
                        setCats(Math.max(0, Math.min(MAX_PETS, Number(e.target.value) || 0)))
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                    />
                    <p className="mt-1 text-xs text-zinc-400">
                      Máximo total {MAX_PETS}. Actual: {petsTotal}
                    </p>
                  </div>

                  {/* Fechas */}
                  <div>
                    <label className="mb-1 block text-sm text-zinc-300">Inicio*</label>
                    <input
                      readOnly
                      onClick={() => setCalendarOpen('start')}
                      value={range?.from ? new Date(range.from).toLocaleDateString() : ''}
                      placeholder="Selecciona fecha de inicio"
                      className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <label className="mb-1 block text-sm text-zinc-300">Fin*</label>
                    <input
                      readOnly
                      onClick={() => setCalendarOpen('end')}
                      value={range?.to ? new Date(range.to).toLocaleDateString() : ''}
                      placeholder="Selecciona fecha de término"
                      className="w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none focus:border-emerald-500"
                    />

                    {/* Popover calendario */}
                    {calendarOpen && (
                      <div
                        ref={calendarRef}
                        className="absolute right-0 top-full z-50 mt-2 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl"
                      >
                        <DayPicker
                          className="rdp-dark"
                          mode="range"
                          selected={range}
                          onSelect={onSelectRange}
                          fromMonth={TODAY}
                          toMonth={MAX_MONTH}
                          disabled={disabledDays}
                          numberOfMonths={1}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mensajes */}
              <div className="sm:col-span-2">
                {err && <p className="text-sm text-red-400">{err}</p>}
                {ok && (
                  <p className="text-sm text-emerald-400">
                    ¡Gracias! Recibimos tu solicitud.
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <button
                  disabled={loading}
                  className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-zinc-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {loading ? 'Enviando…' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Panel derecho — imagen de mascotas */}
        <aside className="hidden md:block">
          <div className="sticky top-20">
            <div className="overflow-hidden rounded-xl border border-zinc-800 p-1">
              <img
                src="https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=1200&auto=format&fit=crop"
                alt="Mascotas felices en casa"
                className="h-[460px] w-full rounded-lg object-cover"
              />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
