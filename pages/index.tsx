// pages/index.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              Tu casa y tus mascotas, <span className="text-emerald-700">en buenas manos.</span>
            </h1>
            <p className="mt-4 text-gray-700 text-lg">
              PetMate conecta a dueños con cuidadores verificados para alojar mascotas en la
              <strong> seguridad de tu hogar</strong>. Sin traslados ni estrés para tu mascota.
              Pagos protegidos y reseñas reales para viajar con tranquilidad.
            </p>

            <ul className="mt-6 space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-emerald-600">✓</span>
                Mascotas sin estrés, se quedan en su casa.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-emerald-600">✓</span>
                Cuidadores verificados, pagos protegidos y soporte 24/7.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-emerald-600">✓</span>
                Para PetMates: gana dinero extra cuidando mascotas.
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/solicitud?mode=owner" className="btn-primary">
                Solicitar un PetMate →
              </Link>
              <Link href="/solicitud?mode=sitter" className="btn-secondary">
                Quiero ser PetMate →
              </Link>
            </div>
          </div>

          <div className="card flex items-center justify-center p-6">
            {/* Coloca un SVG en /public/hero-pet.svg o deja el placeholder */}
            <img
              src="/hero-pet.svg"
              alt="Persona en casa con su mascota"
              className="w-full max-w-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1558944351-dae1b4d12bf2?auto=format&fit=crop&w=900&q=60';
              }}
            />
          </div>
        </div>
      </section>

      {/* SECCIONES RESUMEN (opcional) */}
      <section id="como-funciona" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold">¿Cómo funciona?</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="card p-5">
            <h3 className="font-semibold">1. Cuéntanos tu viaje</h3>
            <p className="mt-2 text-sm text-gray-600">
              Indica fechas y comuna. Bloqueamos fechas que no cumplan la anticipación mínima.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">2. Encuentra tu PetMate ideal</h3>
            <p className="mt-2 text-sm text-gray-600">
              Cuidadores verificados, con evaluaciones y reseñas reales.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold">3. Viaja tranquilo</h3>
            <p className="mt-2 text-sm text-gray-600">
              Pagos protegidos y soporte 24/7. Tu mascota en casa, sin estrés.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
