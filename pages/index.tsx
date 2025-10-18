// pages/index.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-white to-neutral-50">
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 lg:flex lg:items-center lg:gap-x-16 lg:px-8 lg:pt-24">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:flex-auto">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
              Tu casa y tus mascotas, en buenas manos.
            </h1>
            <p className="mt-6 text-lg leading-8 text-neutral-600">
              PetMate conecta dueños con cuidadores verificados para alojar mascotas en su propio hogar.
              Pagos protegidos, reseñas reales y tranquilidad para disfrutar tus viajes.
            </p>
            <div className="mt-10 flex items-center gap-x-4">
              <Link
                href="/solicitud"
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-white font-medium shadow-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                Solicitar un PetMate
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-neutral-700 font-medium hover:bg-neutral-50"
              >
                Registrarse
              </Link>
            </div>
            <p className="mt-3 text-sm text-neutral-500">100% pagos protegidos · Cuidadores verificados · Soporte 24/7</p>
          </div>
          <div className="mt-12 lg:mt-0 lg:flex-auto">
            <img
              src="/hero.jpg"
              alt="Persona en casa con su mascota"
              className="w-full rounded-xl shadow-card object-cover h-[360px]"
            />
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h2 className="text-2xl font-semibold text-neutral-900">¿Cómo funciona?</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card p-6">
            <div className="text-brand-500 text-xl font-bold mb-2">1</div>
            <h3 className="font-semibold text-neutral-900">Cuéntanos tu viaje</h3>
            <p className="mt-2 text-neutral-600 text-sm">Indica fechas y comuna. Bloqueamos días que no cumplen la anticipación mínima.</p>
          </div>
          <div className="card p-6">
            <div className="text-brand-500 text-xl font-bold mb-2">2</div>
            <h3 className="font-semibold text-neutral-900">Encuentra un PetMate ideal</h3>
            <p className="mt-2 text-neutral-600 text-sm">Cuidadores verificados con evaluaciones y reseñas reales.</p>
          </div>
          <div className="card p-6">
            <div className="text-brand-500 text-xl font-bold mb-2">3</div>
            <h3 className="font-semibold text-neutral-900">Reserva y relájate</h3>
            <p className="mt-2 text-neutral-600 text-sm">Pagos protegidos, chat y soporte 24/7 durante tu viaje.</p>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <h2 className="text-2xl font-semibold text-neutral-900">Beneficios</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900">Para dueños</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>• Mascotas cuidadas en casas reales</li>
                <li>• Pagos protegidos y seguro</li>
                <li>• Información de viaje clara y validada</li>
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900">Para PetMates</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>• Ingresos extras cuidando mascotas</li>
                <li>• Perfil verificado y reseñas transparentes</li>
                <li>• Asistencia y soporte dedicado</li>
              </ul>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-neutral-900">Comunidad segura</h3>
              <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                <li>• Verificación de identidad</li>
                <li>• Reseñas y ratings reales</li>
                <li>• Políticas claras y comunicación centralizada</li>
              </ul>
            </div>
          </div>
          <div className="mt-10">
            <Link
              href="/solicitud"
              className="btn-primary"
            >
              Empieza ahora → Solicita un PetMate
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}