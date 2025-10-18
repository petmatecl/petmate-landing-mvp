// pages/index.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      {/* Header simple (usa tu Header real si ya lo tienes) */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-700">
            <PetMateIcon className="h-6 w-6" />
            <span>PetMate</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/register"
              className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Registrarse
            </Link>
            <Link
              href="/signin"
              className="rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              Iniciar sesión
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero / Propuesta de valor */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20 lg:px-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Tu casa y tus mascotas, <span className="text-emerald-700">en buenas manos</span>.
            </h1>
            <p className="mt-5 text-lg leading-7 text-slate-700">
              PetMate conecta a dueños con cuidadores verificados para alojar mascotas en la{" "}
              <strong>seguridad de tu hogar</strong>. Sin traslados ni estrés para tu mascota. Pagos
              protegidos y reseñas reales para viajar con tranquilidad.
            </p>

            <ul className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <HomeIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span>Mascotas sin estrés, sin traslados — se quedan en su propia casa.</span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span>Cuidadores verificados, pagos protegidos y soporte 24/7.</span>
              </li>
              <li className="flex items-start gap-2">
                <SparkleIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span>Reseñas reales para que elijas con confianza.</span>
              </li>
              <li className="flex items-start gap-2">
                <CoinIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
                <span>
                  <strong>Para PetMates:</strong> gana dinero extra cuidando mascotas cerca de ti.
                </span>
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/solicitud"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Solicitar un PetMate
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                Quiero ser PetMate
                <PawIcon className="h-4 w-4 text-emerald-700" />
              </Link>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              100% pagos protegidos · Cuidadores verificados · Soporte 24/7
            </p>
          </div>

          {/* Ilustración/Mock con mascotas (SVG para no depender de imágenes externas) */}
          <div className="relative order-first aspect-[4/3] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:order-last">
            <div className="absolute inset-0 flex items-center justify-center">
              <HeroPets className="h-full w-full max-w-[540px] text-emerald-600/90" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
          </div>
        </div>
      </section>

      {/* ¿Cómo funciona? */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-900">¿Cómo funciona?</h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <CalendarIcon className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Cuéntanos tu viaje</h3>
              <p className="mt-1 text-sm text-slate-600">
                Indica fechas y comuna. Bloqueamos automáticamente días que no cumplan la
                anticipación mínima (5 días para solicitar PetMate).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <SearchIcon className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Encuentra tu PetMate ideal</h3>
              <p className="mt-1 text-sm text-slate-600">
                Cuidadores verificados con evaluaciones y reseñas reales.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldIcon className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="font-semibold text-slate-900">Reserva con confianza</h3>
              <p className="mt-1 text-sm text-slate-600">
                Pagos protegidos y soporte 24/7. Tu mascota y tu hogar, en buenas manos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios / Doble tarjeta */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-slate-900">Beneficios</h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <HomeIcon className="h-6 w-6 text-emerald-700" />
                <h3 className="text-lg font-semibold">Para dueños</h3>
              </div>
              <ul className="grid gap-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Sin traslados: tu mascota se queda en casa, sin estrés.
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Selección con reseñas y verificación de identidad.
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Pagos protegidos y soporte 24/7.
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/solicitud"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Solicitar un PetMate
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <PawIcon className="h-6 w-6 text-emerald-700" />
                <h3 className="text-lg font-semibold">Para PetMates</h3>
              </div>
              <ul className="grid gap-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Genera dinero extra cuidando mascotas cerca de ti.
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Flexibilidad total: acepta solicitudes cuando quieras.
                </li>
                <li className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Soporte y pagos seguros.
                </li>
              </ul>
              <div className="mt-6">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Quiero ser PetMate
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer simple */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p>© {new Date().getFullYear()} PetMate. Todos los derechos reservados.</p>
            <div className="flex items-center gap-5">
              <Link href="/about" className="hover:text-slate-900">
                Quiénes somos
              </Link>
              <Link href="/como-funciona" className="hover:text-slate-900">
                Cómo funciona
              </Link>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-slate-900"
              >
                <InstagramIcon className="h-4 w-4" />
                Instagram
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ======= ICONOS (SVG inline, sin dependencias) ======= */

function PetMateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M7.5 2.75A2.25 2.25 0 0 1 9.75 5v.25h4.5V5a2.25 2.25 0 1 1 4.5 0v.25h.25A2.25 2.25 0 0 1 21.25 7.5v10A2.25 2.25 0 0 1 19 19.75H5A2.25 2.25 0 0 1 2.75 17.5v-10A2.25 2.25 0 0 1 5 2.75h.25A2.25 2.25 0 0 1 7.5 5v-.25Z" />
    </svg>
  );
}
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5v8A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-8Z" />
      <path strokeWidth="1.8" strokeLinecap="round" d="M9 20v-5a3 3 0 1 1 6 0v5" />
    </svg>
  );
}
function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6a10 10 0 0 1-7 9 10 10 0 0 1-7-9V6l7-3Z" />
      <path strokeWidth="1.8" strokeLinecap="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}
function CoinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <ellipse cx="12" cy="7" rx="7" ry="3.5" strokeWidth="1.8" />
      <path strokeWidth="1.8" d="M5 7v5c0 1.93 3.134 3.5 7 3.5s7-1.57 7-3.5V7" />
    </svg>
  );
}
function SparkleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11 2l1.5 4.5L17 8l-4.5 1.5L11 14l-1.5-4.5L5 8l4.5-1.5L11 2Zm8 8 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
    </svg>
  );
}
function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" strokeWidth="1.8" />
      <path strokeWidth="1.8" d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
      <path strokeWidth="1.8" strokeLinecap="round" d="M20 20l-3.5-3.5" />
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <path d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4A1 1 0 1 1 4.707 9.293L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0Z" />
    </svg>
  );
}
function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}
function PawIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="7" cy="7" r="2.3" /><circle cx="17" cy="7" r="2.3" />
      <circle cx="5.5" cy="12.5" r="1.9" /><circle cx="18.5" cy="12.5" r="1.9" />
      <path d="M12 22c-3 0-6-2.5-6-5.2C6 14 8.6 13 12 13s6 1 6 3.8C18 19.5 15 22 12 22Z" />
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5.8a5.2 5.2 0 1 0 .001 10.401A5.2 5.2 0 0 0 12 7.8Zm0 1.8a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Zm5.7-.9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}
function HeroPets(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 560 420" fill="none" stroke="currentColor" {...props}>
      <rect x="20" y="60" width="520" height="280" rx="20" className="stroke-emerald-600/20" strokeWidth="3" />
      <circle cx="180" cy="220" r="55" className="fill-emerald-50 stroke-emerald-600/40" strokeWidth="3" />
      <circle cx="370" cy="220" r="55" className="fill-emerald-50 stroke-emerald-600/40" strokeWidth="3" />
      <path d="M210 315c0-25 25-45 70-45s70 20 70 45" className="stroke-emerald-600/50" strokeWidth="4" />
      <circle cx="160" cy="190" r="10" className="fill-emerald-600/80" />
      <circle cx="200" cy="170" r="8" className="fill-emerald-600/70" />
      <circle cx="400" cy="190" r="10" className="fill-emerald-600/80" />
      <circle cx="360" cy="170" r="8" className="fill-emerald-600/70" />
    </svg>
  );
}
