// components/Hero.tsx
import Image from "next/image";
import Link from "next/link";
import { Card } from "./Shared/Card";
import { Band } from "./Shared/Band"; // Updated import

// Iconos monocromáticos
const HouseIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 11.5l9-7 9 7" />
    <path d="M5 10v9h14v-9" />
    <path d="M10 19v-6h4v6" />
  </svg>
);

const BuildingIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <path d="M18 21V8h2a1 1 0 0 1 1 1v12z" />
    <path d="M7 7h4M7 11h4M7 15h4" />
  </svg>
);

// Icons for Hero
import { ShieldCheckIcon, StarIcon } from "@heroicons/react/24/solid";

export function Hero() {
  return (
    <Band variant="brand" className="overflow-hidden relative">
      {/* Blobs background (Positioned relative to Band) */}
      <div className="absolute top-0 -left-64 h-96 w-96 rounded-full bg-emerald-100 mix-blend-multiply blur-3xl opacity-70 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 -right-64 h-96 w-96 rounded-full bg-teal-100 mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

      <div className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy + CTAs */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Tu mascota en familia, <br className="hidden lg:block" />
              <span className="text-emerald-600">incluso cuando no estás.</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-700">
              Cero jaulas, solo cariño de hogar. Encuentra <strong>cuidadores verificados</strong> en tu comuna, lee reseñas de otros tutores y viaja con total tranquilidad.
            </p>

            {/* CTAs Principales */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/explorar"
                className="inline-flex justify-center items-center rounded-xl bg-slate-900 px-8 py-4 text-base font-bold text-white shadow-lg hover:bg-slate-800 transition-all hover:-translate-y-1"
              >
                Buscar cuidador
              </Link>
              <Link
                href="/register?role=sitter"
                className="inline-flex justify-center items-center rounded-xl bg-white border-2 border-slate-200 px-8 py-4 text-base font-bold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 transition-all"
              >
                Quiero ser cuidador
              </Link>
            </div>

            {/* Trust Signals */}
            <div className="mt-8 flex items-center gap-6 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-emerald-500" />
                <span>Perfiles verificados</span>
              </div>
              <div className="flex items-center gap-2">
                <StarIcon className="w-5 h-5 text-amber-400" />
                <span>Reseñas reales</span>
              </div>
            </div>

            {/* Social Proof Avatars */}
            <div className="mt-6 flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex -space-x-2">
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 1" width={32} height={32} />
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 2" width={32} height={32} />
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 3" width={32} height={32} />
              </div>
              <div>+200 cuidadores listos para ayudar</div>
            </div>
          </div>

          {/* Imagen Hero */}
          <div className="hidden lg:block relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[120%] w-[120%] bg-gradient-to-tr from-emerald-100 to-teal-100 rounded-full blur-3xl opacity-50 -z-10" />
            <Image
              src="https://images.pexels.com/photos/33685207/pexels-photo-33685207.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&dpr=1"
              alt="Gato descansando tranquilo"
              width={720}
              height={720}
              sizes="(min-width:1024px) 50vw, 100vw"
              className="relative rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 border-4 border-white transform rotate-2 hover:rotate-0 transition-transform duration-500 max-h-[500px] w-auto mx-auto object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </Band>
  );
}

export default Hero;
