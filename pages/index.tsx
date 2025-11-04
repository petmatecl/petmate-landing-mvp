// pages/index.tsx
import Link from 'next/link';
import Image from "next/image";

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
              <Link href="/register?role=cliente" className="btn-primary">
                Solicitar un PetMate
              </Link>
              <Link href="/register?role=petmate" className="btn-secondary">
                Quiero ser PetMate
              </Link>
            </div>
          </div>

         <div className="card flex items-center justify-center p-6">
  <div className="relative w-full max-w-2xl aspect-[16/10] rounded-3xl overflow-hidden">
    <Image
      src="https://images.pexels.com/photos/33685207/pexels-photo-33685207.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&dpr=1"
      alt="Elegante gato Maine Coon relajándose en el interior"
      fill
      priority
      sizes="(min-width:1024px) 50vw, 100vw"
      className="object-cover"
    />
  </div>
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
