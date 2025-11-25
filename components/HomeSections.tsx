// components/HomeSections.tsx
import Link from "next/link";

/* ---------- Íconos monocromáticos ---------- */

const HomeHeartIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <path d="M4 10.5C4 7.46 6.3 5 9.2 5c1.38 0 2.7.62 3.8 1.82C14.1 5.62 15.42 5 16.8 5 19.7 5 22 7.46 22 10.5c0 4.38-3.76 7.24-8.93 11.09a1.1 1.1 0 0 1-1.14 0C7.76 17.74 4 14.88 4 10.5z" />
  </svg>
);

const CheckBadgeIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <path d="M8.5 3.5 12 2l3.5 1.5 3 2.5.5 4-1.5 3.5-2.5 3-3.5 1.5-3.5-1.5-2.5-3L3 10l.5-4z" />
    <path d="m9 11.5 2 2 4-4.5" />
  </svg>
);

const CalendarIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path d="M8 2v4M16 2v4M3 9h18" />
    <path d="M8 13h3v3H8z" />
  </svg>
);

const PawIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <circle cx="7" cy="7" r="2.1" />
    <circle cx="17" cy="7" r="2.1" />
    <circle cx="9" cy="13" r="2.1" />
    <circle cx="15" cy="13" r="2.1" />
    <path d="M9 16.5c.8-.7 1.8-1.1 3-1.1s2.2.4 3 1.1c.7.6 1.2 1.6 1.2 2.5 0 1.1-.9 2-2 2H9.8c-1.1 0-2-.9-2-2 0-.9.5-1.9 1.2-2.5z" />
  </svg>
);

const SearchIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <circle cx="11" cy="11" r="5.5" />
    <path d="m15.5 15.5 3.5 3.5" />
  </svg>
);

const MessageIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4.5 3.5V6a1 1 0 0 1 1-1z" />
    <path d="M7 9h10M7 12h6" />
  </svg>
);

/* ---------- ¿Por qué PetMate? (ValueProps) ---------- */

export function ValueProps() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">¿Por qué PetMate?</h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <HomeHeartIcon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Sin traslados ni jaulas</h3>
            <p className="mt-2 text-sm text-gray-600">
              Tu mascota se queda en un entorno conocido o en un hogar real, no en una guardería masiva.
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <CheckBadgeIcon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">PetMates verificados</h3>
            <p className="mt-2 text-sm text-gray-600">
              Perfiles con validación, reseñas y experiencia previa con perros y gatos.
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Flexible a tu viaje</h3>
            <p className="mt-2 text-sm text-gray-600">
              Reserva por día, fin de semana o semanas completas. Paga solo por el tiempo que necesitas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- ¿Cómo funciona? ---------- */

export function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: "Cuéntanos de tu mascota",
      description: "Indica tipo de mascota, tamaño, carácter y fechas de tu viaje.",
      Icon: PawIcon,
    },
    {
      id: 2,
      title: "Elige entre PetMates disponibles",
      description: "Revisa perfiles, reseñas y condiciones. Coordina visitas previas si lo deseas.",
      Icon: SearchIcon,
    },
    {
      id: 3,
      title: "Reserva y relájate",
      description: "Confirma tu reserva, recibe actualizaciones y fotos durante tu viaje.",
      Icon: MessageIcon,
    },
  ];

  return (
    <section className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map(({ id, title, description, Icon }) => (
            <div
              key={id}
              className="relative rounded-3xl border bg-white p-6 shadow-sm"
            >
              {/* línea de conexión entre cards en desktop */}
              {id !== steps.length && (
                <div className="hidden md:block absolute right-[-24px] top-1/2 h-px w-10 bg-emerald-100" />
              )}

              <div className="flex items-start gap-3">
                {/* Icono */}
                <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                  <Icon className="h-5 w-5" />
                </span>

                {/* Contenido */}
                <div>
                  {/* Pill "Paso 1" en una sola línea */}
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    Paso {id}
                  </span>

                  <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA final (igual que antes) ---------- */

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
