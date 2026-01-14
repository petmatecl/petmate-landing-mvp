import Link from "next/link";
import {
  HomeIcon,
  ShieldCheckIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon
} from "@heroicons/react/24/outline";
import { SectionContainer } from "./Shared/Section";
import { Card } from "./Shared/Card";

// --- SECCIÓN 1: PROPUETA DE VALOR (Fondo Claro) ---
export function ValueProps() {
  const features = [
    {
      name: "Reseñas y Experiencia",
      description: "No elijas a ciegas. Lee opiniones genuinas de otros dueños y mira fotos de sus cuidados anteriores para decidir con bases reales.",
      icon: ShieldCheckIcon,
    },
    {
      name: "Disponibilidad Real",
      description: "Filtra por fechas exactas y encuentra cuidadores listos para recibir a tu peludo cuando tú lo necesitas, sin falsas expectativas.",
      icon: AdjustmentsHorizontalIcon,
    },
    {
      name: "Hogar, dulce hogar",
      description: "Tu mascota disfruta del calor de un hogar real. Cero jaulas, cero estrés. Solo mimos y una rutina familiar adaptada a ellos.",
      icon: HomeIcon,
    },
  ];

  return (
    <SectionContainer band="none">
      <div className="mx-auto max-w-2xl lg:text-center">
        <h2 className="text-base font-semibold leading-7 text-emerald-600">Beneficios</h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
          ¿Por qué elegir Pawnecta?
        </p>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          Olvídate de los hoteles masivos. Aquí tu mascota es un miembro más de la familia.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.name} className="flex flex-col h-full" padding="l">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <feature.icon className="h-8 w-8" aria-hidden="true" />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className="text-xl font-bold leading-7 text-slate-900">
                  {feature.name}
                </h3>
                <p className="mt-4 flex-auto text-base leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}

// --- SECCIÓN 2: CÓMO FUNCIONA (Standardized Block) ---
export function HowItWorks() {
  const steps = [
    {
      id: "01",
      name: "Publica tu solicitud",
      description: "Cuéntanos qué necesitas (fechas, mascotas, servicios) y recibe postulaciones de cuidadores verificados.",
      icon: MagnifyingGlassIcon,
    },
    {
      id: "02",
      name: "Elige con confianza",
      description: "Revisa sus fotos y lee lo que otros dueños dicen de ellos. Cuando encuentres el match perfecto, contáctalo directamente para coordinar.",
      icon: ChatBubbleLeftRightIcon,
    },
    {
      id: "03",
      name: "Reserva y relájate",
      description: "Confirma la reserva a través de Pawnecta y viaja tranquilo recibiendo fotos y reportes diarios.",
      icon: BriefcaseIcon,
    },
  ];

  return (
    <SectionContainer band="slate">
      {/* Decoración de fondo suave en lugar de Dark Mode */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-50 blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full bg-teal-50 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <div className="mx-auto max-w-2xl lg:text-center mb-16">
          <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm">Paso a paso</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Tu tranquilidad en 3 pasos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Línea conectora (visible solo en desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>

          {steps.map((step) => (
            <Card key={step.name} className="relative flex flex-col items-center text-center z-10" padding="l">
              {/* Círculo del número/ícono */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                <step.icon className="h-8 w-8" aria-hidden="true" />
              </div>

              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-2">
                  Paso {step.id}
                </span>

                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.name}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}

// --- SECCIÓN 3: CTA FINAL ---
export function CTASection() {
  return (
    <SectionContainer band="mint">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
          ¿Listo para encontrar al Pawnecta Sitter ideal?
          <br />
          <span className="text-emerald-600">Tu mascota te lo agradecerá.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
          Regístrate hoy y obtén un descuento en tu primera reserva. Cupos limitados por lanzamiento.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/register"
            className="rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all hover:-translate-y-1"
          >
            Comenzar ahora
          </Link>
          <Link href="/explorar" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-1 hover:gap-2 transition-all">
            Solo quiero mirar <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </SectionContainer>
  );
}
