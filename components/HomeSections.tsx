// components/HomeSections.tsx
import Link from "next/link";

export function ValueProps() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">¿Por qué PetMate?</h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-2xl mb-3">🏡</div>
            <h3 className="font-semibold text-gray-900">Sin traslados ni jaulas</h3>
            <p className="mt-2 text-sm text-gray-600">
              Tu mascota se queda en un entorno conocido o en un hogar real, no en una
              guardería masiva.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-2xl mb-3">✅</div>
            <h3 className="font-semibold text-gray-900">PetMates verificados</h3>
            <p className="mt-2 text-sm text-gray-600">
              Perfiles con validación, reseñas y experiencia previa con perros y gatos.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-2xl mb-3">📅</div>
            <h3 className="font-semibold text-gray-900">Flexible a tu viaje</h3>
            <p className="mt-2 text-sm text-gray-600">
              Reserva por día, fin de semana o semanas completas. Paga solo por el tiempo
              que necesitas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>

        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          <li className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700">Paso 1</div>
            <h3 className="mt-2 font-semibold text-gray-900">Cuéntanos de tu mascota</h3>
            <p className="mt-2 text-sm text-gray-600">
              Indica tipo de mascota, tamaño, carácter y fechas de tu viaje.
            </p>
          </li>
          <li className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700">Paso 2</div>
            <h3 className="mt-2 font-semibold text-gray-900">
              Elige entre PetMates disponibles
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Revisa perfiles, reseñas y condiciones. Coordina visitas previas si lo deseas.
            </p>
          </li>
          <li className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700">Paso 3</div>
            <h3 className="mt-2 font-semibold text-gray-900">Reserva y relájate</h3>
            <p className="mt-2 text-sm text-gray-600">
              Confirma tu reserva, recibe actualizaciones y fotos durante tu viaje.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="bg-emerald-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16 text-center text-white">
        <h2 className="text-2xl sm:text-3xl font-bold">
          ¿Listo para tu próximo viaje sin preocuparte por tu mascota?
        </h2>
        <p className="mt-3 text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto">
          Deja tus datos y te avisaremos cuando PetMate esté disponible en tu comuna o
          comienza hoy si estás en el sector oriente de la RM.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register?role=cliente"
            className="inline-flex justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            Quiero buscar un PetMate
          </Link>
          <Link
            href="/register?role=petmate"
            className="inline-flex justify-center rounded-xl border border-emerald-200 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Quiero ser PetMate
          </Link>
        </div>
      </div>
    </section>
  );
}
