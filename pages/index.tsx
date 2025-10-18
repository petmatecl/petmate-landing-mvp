// pages/index.tsx
import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="container mt-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Tu casa y tus mascotas, <span className="text-brand-600">en buenas manos.</span>
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            PetMate conecta dueños con cuidadores verificados para alojar mascotas en su propio hogar.
            Pagos protegidos, reseñas reales y tranquilidad para disfrutar tus viajes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/solicitud" className="btn btn-primary">Solicitar un PetMate</Link>
            <Link href="/solicitud" className="btn btn-light">Registrarse</Link>
          </div>

          <ul className="mt-6 flex flex-wrap gap-4 text-sm text-zinc-600">
            <li>100% pagos protegidos</li>
            <li>•</li>
            <li>Cuidadores verificados</li>
            <li>•</li>
            <li>Soporte 24/7</li>
          </ul>
        </div>

        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden shadow-card">
          <Image
            src="/hero.jpg"
            alt="Persona en casa con su mascota"
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="container mt-16">
        <h2 className="text-2xl font-semibold mb-6">¿Cómo funciona?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-5">
            <div className="text-brand-600 font-bold text-xl">1</div>
            <h3 className="font-semibold mt-2">Cuéntanos tu viaje</h3>
            <p className="text-sm text-zinc-600 mt-2">
              Indica fechas y comuna. Bloqueamos días que no cumplen la anticipación mínima de 5 días.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-brand-600 font-bold text-xl">2</div>
            <h3 className="font-semibold mt-2">Encuentra el PetMate ideal</h3>
            <p className="text-sm text-zinc-600 mt-2">
              Cuidadores verificados con evaluaciones y reseñas reales.
            </p>
          </div>
          <div className="card p-5">
            <div className="text-brand-600 font-bold text-xl">3</div>
            <h3 className="font-semibold mt-2">Paga y viaja tranquilo</h3>
            <p className="text-sm text-zinc-600 mt-2">
              Pagos protegidos y soporte cuando lo necesites.
            </p>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="container mt-16">
        <h2 className="text-2xl font-semibold mb-6">Beneficios</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-5">Alojamiento cálido en hogares reales.</div>
          <div className="card p-5">Rutinas y cariño para tus mascotas.</div>
          <div className="card p-5">Cuidadores cercanos a tu comuna.</div>
        </div>
      </section>

      {/* CTA final */}
      <section className="container mt-16 mb-20">
        <div className="card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Listo para partir tranquilo?</h3>
            <p className="text-sm text-zinc-600">Solicita un PetMate y deja todo en nuestras manos.</p>
          </div>
          <Link href="/solicitud" className="btn btn-primary">Solicitar ahora</Link>
        </div>
      </section>
    </>
  );
}
