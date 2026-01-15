import Link from "next/link";
import {
  HomeIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { Band } from "./Shared/Band"; // Updated Import
import { Card } from "./Shared/Card";
import { useState } from "react";

// --- SECCIÓN 2: CÓMO FUNCIONA (Band: Soft) ---
export function HowItWorks() {
  const steps = [
    {
      id: "01",
      name: "Explora",
      description: "Ingresa tu comuna y fechas. Filtra por tipo de mascota y servicio (hospedaje o visitas).",
      icon: MagnifyingGlassIcon,
    },
    {
      id: "02",
      name: "Conoce",
      description: "Revisa perfiles detallados, fotos de cuidados anteriores y reseñas de otros tutores.",
      icon: ChatBubbleLeftRightIcon,
    },
    {
      id: "03",
      name: "Reserva",
      description: "Coordina detalles por chat y acuerda el servicio. El pago es directo con el sitter.",
      icon: BriefcaseIcon,
    },
  ];

  return (
    <Band variant="soft">
      <div className="mx-auto max-w-2xl lg:text-center mb-16">
        <h2 className="text-emerald-600 font-bold tracking-wide uppercase text-sm">Simple y Rápido</h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          ¿Cómo funciona Pawnecta?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
        {/* Línea conectora (visible solo en desktop) */}
        <div className="hidden md:block absolute top-[3.5rem] left-[16%] right-[16%] h-0.5 bg-slate-300/50 -z-10"></div>

        {steps.map((step) => (
          <div key={step.name} className="relative flex flex-col items-center text-center z-10">
            {/* Círculo del número/ícono (Fuera de Card para que flote sobre la línea) */}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white border-2 border-emerald-100 shadow-sm text-emerald-600 mb-6 group-hover:scale-110 transition-transform duration-300 relative">
              <span className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold border-4 border-white">
                {step.id}
              </span>
              <step.icon className="h-8 w-8" aria-hidden="true" />
            </div>

            <div className="flex flex-col items-center text-center px-4">
              <h3 className="text-xl font-bold text-slate-900">{step.name}</h3>
              <p className="mt-3 text-base text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Band>
  );
}

// --- SECCIÓN 3: CONFIANZA / VALUE PROPS (Band: White) ---
export function TrustSection() {
  const features = [
    {
      name: "Identidad Verificada",
      description: "Validamos la identidad de los cuidadores para que sepas exactamente a quién le confías a tu peludo.",
      icon: ShieldCheckIcon,
    },
    {
      name: "Reseñas de la Comunidad",
      description: "Lee experiencias reales de otros tutores. La transparencia es clave para elegir con confianza.",
      icon: UserGroupIcon,
    },
    {
      name: "Cero Jaulas",
      description: "Olvídate de los caniles fríos. Aquí tu mascota recibe atención personalizada y calor de hogar.",
      icon: HomeIcon,
    },
  ];

  return (
    <Band variant="white">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold leading-7 text-emerald-600">Tranquilidad Total</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
            Más que un cuidador, <br /> un amigo para tu mascota.
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            En Pawnecta priorizamos la seguridad y la confianza. Construimos una comunidad donde el bienestar animal es lo primero.
          </p>

          <div className="mt-8 grid gap-6">
            {features.map((feature) => (
              <div key={feature.name} className="flex gap-4">
                <div className="flex-none pt-1">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{feature.name}</h4>
                  <p className="text-sm text-slate-600 mt-1">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual de Confianza (Single Hero + Badges) */}
        <div className="relative h-[500px] w-full isolate rounded-3xl shadow-xl overflow-hidden group">
          <img
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="/home/trust_hero.jpg"
            alt="Perro descansando en hogar"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

          {/* Badge 1: Verificado */}
          <div className="absolute top-6 left-6 animate-fade-in-up md:delay-100">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-white/50">
              <div className="bg-emerald-100 p-2 rounded-full">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seguridad</span>
                <span className="text-sm font-bold text-slate-900">Perfiles 100% Verificados</span>
              </div>
            </div>
          </div>

          {/* Badge 2: Comunidad (Bottom Right) */}
          <div className="absolute bottom-6 right-6 animate-fade-in-up md:delay-200">
            <Card padding="s" className="!bg-white/95 !backdrop-blur-md !border-white/50 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64",
                    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=64&h=64",
                    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=64&h=64"
                  ].map((url, i) => (
                    <img
                      key={i}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover"
                      src={url}
                      alt="Usuario"
                    />
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-600 flex items-center justify-center text-xs text-white font-bold">
                    +1k
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Comunidad Feliz</div>
                  <div className="text-xs text-slate-500">Reseñas reales</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Band>
  );
}

// --- SECCIÓN 5: Sitter CTA (Band: Dark Full-Width) ---
export function SitterCTA() {
  return (
    <Band variant="dark">
      <div className="mx-auto max-w-4xl flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden">

        {/* Decoración Fondo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex-1 text-center lg:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Convierte tu amor por los animales en ingresos extra
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Únete a la red de cuidadores de Pawnecta. Tú eliges tus horarios, tus tarifas y las mascotas que quieres cuidar.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
            <div className="flex items-center gap-2 text-white bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <CurrencyDollarIcon className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-sm">Define tus precios</span>
            </div>
            <div className="flex items-center gap-2 text-white bg-white/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10">
              <ClockIcon className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-sm">Gestiona tu tiempo</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex-none">
          <Link
            href="/register?role=sitter"
            className="inline-block rounded-xl bg-emerald-500 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-emerald-400 transition-all hover:scale-105"
          >
            Comenzar como Cuidador
          </Link>
        </div>
      </div>
    </Band>
  );
}

// --- SECCIÓN 6: FAQ (Band: Soft) ---
export function FAQSection() {
  const faqs = [
    { q: "¿Cómo elijo al cuidador adecuado?", a: "Recomendamos leer detalladamente su perfil, revisar las fotos de su hogar y leer las reseñas de otros usuarios. También puedes contactarlo antes de reservar para aclarar dudas." },
    { q: "¿Es seguro dejar a mi mascota?", a: "En Pawnecta verificamos la identidad de los cuidadores y fomentamos las reseñas reales. Además, siempre recomendamos un encuentro previo ('Meet & Greet') para ver cómo se lleva tu mascota con el cuidador." },
    { q: "¿Cuándo y cómo se paga?", a: "Por ahora, Pawnecta no procesa pagos dentro de la plataforma. El pago se coordina directamente con el sitter (por ejemplo, transferencia o efectivo) y el detalle se acuerda por chat antes de confirmar el cuidado." },
    { q: "¿Qué pasa si mi mascota necesita cuidados especiales?", a: "Puedes usar los filtros para buscar cuidadores con experiencia en necesidades especiales (medicación, cachorros, seniors) y detallarlo en el chat antes de reservar." },
  ];

  return (
    <Band variant="soft">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 text-center mb-10">
          Preguntas Frecuentes
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-emerald-100 transition-colors">
              <h3 className="font-bold text-slate-900 flex justify-between items-center text-lg">
                {faq.q}
                {/* Icono decorativo estático por simplicidad MVP */}
              </h3>
              <p className="mt-3 text-slate-600 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Band>
  );
}

// --- SECCIÓN 7: CTA FINAL (Band: Brand) ---
export function CTASection() {
  return (
    <Band variant="brand">
      <div className="mx-auto max-w-2xl text-center py-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl text-pretty">
          Tu mascota merece lo mejor.<br />
          <span className="text-emerald-600">Tú, tranquilidad total.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
          Únete a la comunidad de amantes de las mascotas más confiable de Chile.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/explorar"
            className="rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all hover:-translate-y-1"
          >
            Buscar Cuidador
          </Link>
          <Link href="/register?role=sitter" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-1 hover:text-emerald-600 transition-all">
            Soy cuidador <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </Band>
  );
}
