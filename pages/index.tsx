// pages/index.tsx
import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DayPicker, DateRange } from 'react-day-picker'
import {
  addMonths,
  isAfter,
  isBefore,
  startOfDay,
  format as formatDate,
} from 'date-fns'
import { es } from 'date-fns/locale'

type RoleUI = 'necesita' | 'quiere'

const COMUNAS_ORIENTE = [
  'Vitacura',
  'Las Condes',
  'Lo Barnechea',
  'Providencia',
  'La Reina',
  'Ñuñoa',
] as const

const MAX_MASCOTAS = 10

export default function Home() {
  /** Tabs */
  const [role, setRole] = useState<RoleUI>('necesita')

  /** Form fields */
  const [nombre, setNombre] = useState('')
  const [apPat, setApPat] = useState('')
  const [apMat, setApMat] = useState('')
  const [email, setEmail] = useState('')
  const [emailOk, setEmailOk] = useState(true)

  const [comuna, setComuna] = useState<string>('')
  const [propiedad, setPropiedad] = useState<'casa' | 'depto' | ''>('')

  /** Contadores tipo Airbnb */
  const [dogs, setDogs] = useState(0)
  const [cats, setCats] = useState(0)

  /** Calendario rango (español) */
  const [showCalendar, setShowCalendar] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>()
  const today = startOfDay(new Date())
  const maxDate = startOfDay(addMonths(today, 3))
  const disabledDays = [
    { before: today },
    { after: maxDate },
  ]

  /** Validación rápida */
  const totalMascotas = dogs + cats
  const mascotaMinOk = totalMascotas >= 1
  const mascotaMaxOk = totalMascotas <= MAX_MASCOTAS

  /** Email inline (mientras escribe) */
  const onEmailChange = (v: string) => {
    setEmail(v)
    // validación simple
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    setEmailOk(ok || v.length === 0) // no mostrar en rojo si está vacío
  }

  /** El calendario solo aplica cuando "Necesito un PetMate" */
  const mustAskComuna = role === 'necesita'
  const mustAskFechas = role === 'necesita'

  /** Cierra calendario solo cuando seleccionó 2 fechas */
  const onSelectRange = (r: DateRange | undefined) => {
    setRange(r)
    if (r?.from && r?.to) setShowCalendar(false)
  }

  const fechaInicioTxt = useMemo(
    () => (range?.from ? formatDate(range.from, 'dd MMM yyyy', { locale: es }) : ''),
    [range?.from]
  )
  const fechaFinTxt = useMemo(
    () => (range?.to ? formatDate(range.to, 'dd MMM yyyy', { locale: es }) : ''),
    [range?.to]
  )

  /** Mínimo 5 días de viaje (si pide petmate) */
  const diasDeViaje = useMemo(() => {
    if (!range?.from || !range?.to) return 0
    const diffMs = Number(range.to) - Number(range.from)
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }, [range])

  const viajeMinOk = !mustAskFechas || diasDeViaje >= 5

  /** Submit (por ahora solo valida y muestra un alert) */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailOk || !email) {
      alert('Por favor, ingresa un email válido.')
      return
    }
    if (!nombre || !apPat || !apMat) {
      alert('Nombre y apellidos son obligatorios.')
      return
    }
    if (mustAskComuna && !comuna) {
      alert('Selecciona una comuna.')
      return
    }
    if (role === 'necesita') {
      if (!mascotaMinOk) return alert('Debes seleccionar al menos 1 mascota.')
      if (!mascotaMaxOk) return alert(`Máximo ${MAX_MASCOTAS} mascotas en total.`)
      if (!viajeMinOk) return alert('La solicitud requiere mínimo 5 días de viaje.')
      if (!propiedad) return alert('Indica el tipo de propiedad.')
      if (!range?.from || !range?.to) return alert('Selecciona fecha de inicio y fin.')
    }
    alert('¡Datos listos! (Aquí iría el flujo de backend/registro)')
  }

  /** Helpers contadores con tope 10 */
  const incDogs = () => {
    if (dogs + cats < MAX_MASCOTAS) setDogs(d => d + 1)
  }
  const decDogs = () => setDogs(d => Math.max(0, d - 1))
  const incCats = () => {
    if (dogs + cats < MAX_MASCOTAS) setCats(c => c + 1)
  }
  const decCats = () => setCats(c => Math.max(0, c - 1))

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero con tabs y foto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2">
          {/* Tabs */}
          <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
            <button
              onClick={() => setRole('necesita')}
              className={`py-3 text-center font-semibold transition ${
                role === 'necesita'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-zinc-50'
              }`}
            >
              Necesito un PetMate
            </button>
            <button
              onClick={() => setRole('quiere')}
              className={`py-3 text-center font-semibold transition ${
                role === 'quiere'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white hover:bg-zinc-50'
              }`}
            >
              Quiero ser PetMate
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {/* Nombre y apellidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido paterno *</label>
                <input
                  value={apPat}
                  onChange={(e) => setApPat(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Apellido materno *</label>
                <input
                  value={apMat}
                  onChange={(e) => setApMat(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 ${
                  emailOk ? 'border-zinc-300' : 'border-red-500'
                }`}
                placeholder="tunombre@dominio.cl"
                required
              />
              {!emailOk && (
                <p className="text-xs text-red-600 mt-1">
                  El formato del email no es válido.
                </p>
              )}
            </div>

            {/* Comuna: solo cuando necesita */}
            {mustAskComuna && (
              <div>
                <label className="block text-sm font-medium mb-1">Comuna *</label>
                <select
                  value={comuna}
                  onChange={(e) => setComuna(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2"
                  required
                >
                  <option value="">Selecciona tu comuna</option>
                  {COMUNAS_ORIENTE.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Tipo propiedad: tarjetas centradas (solo necesita) */}
            {mustAskComuna && (
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de propiedad *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['casa', 'depto'] as const).map(tp => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setPropiedad(tp)}
                      className={`rounded-xl border px-4 py-6 text-center font-medium transition ${
                        propiedad === tp
                          ? 'border-emerald-600 ring-2 ring-emerald-200'
                          : 'border-zinc-300 hover:border-zinc-400'
                      }`}
                    >
                      {tp === 'casa' ? 'Casa' : 'Departamento'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector tipo Airbnb (perros/gatos) */}
            {mustAskComuna && (
              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold">Perros</div>
                    <div className="text-sm text-zinc-500">Cantidad</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={decDogs}
                      className="h-8 w-8 rounded-full border flex items-center justify-center"
                    >
                      –
                    </button>
                    <div className="w-6 text-center">{dogs}</div>
                    <button
                      type="button"
                      onClick={incDogs}
                      className="h-8 w-8 rounded-full border flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <div className="font-semibold">Gatos</div>
                    <div className="text-sm text-zinc-500">Cantidad</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={decCats}
                      className="h-8 w-8 rounded-full border flex items-center justify-center"
                    >
                      –
                    </button>
                    <div className="w-6 text-center">{cats}</div>
                    <button
                      type="button"
                      onClick={incCats}
                      className="h-8 w-8 rounded-full border flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {!mascotaMinOk && (
                  <p className="text-xs text-amber-600 mt-2">
                    Debes seleccionar al menos 1 mascota.
                  </p>
                )}
                {!mascotaMaxOk && (
                  <p className="text-xs text-red-600 mt-2">
                    Máximo {MAX_MASCOTAS} mascotas entre perros + gatos.
                  </p>
                )}
              </div>
            )}

            {/* Calendario (solo necesita). Se abre al tocar cualquiera */}
            {mustAskFechas && (
              <div>
                <label className="block text-sm font-medium mb-2">Fechas del viaje *</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCalendar(true)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-left"
                  >
                    <span className="block text-xs text-zinc-500">Inicio</span>
                    <span className="font-medium">{fechaInicioTxt || 'Selecciona'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCalendar(true)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-left"
                  >
                    <span className="block text-xs text-zinc-500">Fin</span>
                    <span className="font-medium">{fechaFinTxt || 'Selecciona'}</span>
                  </button>
                </div>
                {!viajeMinOk && (
                  <p className="text-xs text-amber-600 mt-2">
                    La solicitud requiere mínimo 5 días de viaje.
                  </p>
                )}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                {role === 'necesita' ? 'Crear cuenta y enviar solicitud' : 'Registrarme como PetMate'}
              </button>
            </div>
          </form>
        </div>

        {/* Imagen lateral */}
        <div className="hidden md:block">
          <div className="rounded-2xl overflow-hidden border border-zinc-200">
            <Image
              src="/dog-house.jpg" // pon cualquier JPG en /public con este nombre
              alt="Persona en casa con su mascota"
              width={900}
              height={1100}
              className="object-cover h-[520px] w-full"
            />
          </div>
        </div>
      </div>

      {/* Calendario overlay */}
      {showCalendar && mustAskFechas && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center px-4">
          <div className="relative bg-white rounded-2xl shadow-xl p-4 md:p-6">
            <button
              onClick={() => setShowCalendar(false)}
              className="absolute -top-3 -right-3 h-10 w-10 rounded-full bg-white shadow flex items-center justify-center text-zinc-700"
              aria-label="Cerrar calendario"
            >
              ✕
            </button>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={onSelectRange}
              fromDate={today}
              toDate={maxDate}
              disabled={disabledDays}
              numberOfMonths={2}
              ISOWeek
              locale={es}
              className="rdp-dark"
            />
            <div className="text-sm text-zinc-500 mt-2">
              Selecciona inicio y fin (mínimo 5 días).
            </div>
          </div>
        </div>
      )}

      {/* Sección “startup” breve */}
      <section className="mt-16 grid md:grid-cols-3 gap-6">
        {[
          { t: '¿Qué es PetMate?', d: 'Conectamos dueños de hogar/mascotas con cuidadores confiables mientras viajas.' },
          { t: '¿Cómo funciona?', d: 'Publica tu necesidad o regístrate como PetMate. Coordinamos, aseguramos y reseñamos.' },
          { t: 'Beneficios', d: 'Seguridad, reputación y pagos protegidos. Comunidad revisada y verificada.' },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-zinc-200 p-5">
            <h3 className="font-semibold text-lg mb-1">{c.t}</h3>
            <p className="text-zinc-600 text-sm">{c.d}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
