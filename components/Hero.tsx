// components/Hero.tsx
import Image from "next/image";
import Link from "next/link";

// Iconos monocromáticos, mismos del registro
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

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-50">
      {/* Background Decor */}
      <div className="absolute top-0 -left-64 h-96 w-96 rounded-full bg-emerald-100 mix-blend-multiply blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-64 h-96 w-96 rounded-full bg-teal-100 mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-16 lg:pt-12 lg:pb-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy + CTAs */}
          <div>


            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Encuentra un Sitter <br className="hidden lg:block" />
              <span className="text-gradient">de confianza.</span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              El match perfecto existe. Revisa <strong>reseñas reales</strong>, explora sus <strong>experiencias en fotos</strong> y confirma su <strong>disponibilidad</strong> inmediata.
            </p>

            {/* Elecciones rápidas */}
            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              <Link
                href="/register?role=usuario&mode=domicilio"
                className="group card-premium p-5 hover:border-emerald-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                    <BuildingIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">A domicilio</div>
                    <div className="text-sm text-slate-500 mt-1">El cuidador va a tu casa.</div>
                  </div>
                </div>
              </Link>

              <Link
                href="/register?role=usuario&mode=estadia"
                className="group card-premium p-5 hover:border-emerald-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors">
                    <HouseIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">Hospedaje</div>
                    <div className="text-sm text-slate-500 mt-1">En casa del cuidador.</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Login quick access */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">¿Ya eres parte de nuestra comunidad?</span>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
              >
                Iniciar sesión
              </Link>
            </div>

            {/* CTA principal */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              {/* Botón eliminado por feedback */}
              <Link
                href="/register?role=sitter"
                className="text-sm font-semibold leading-6 text-slate-900"
              >
                Quiero ser Pawnecta Sitter <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-4 text-xs font-medium text-slate-500">
              <div className="flex -space-x-2">
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 1" width={32} height={32} />
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 2" width={32} height={32} />
                <Image className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=100" alt="Sitter 3" width={32} height={32} />
              </div>
              <div>
                +200 Cuidadores verificados
              </div>
            </div>
          </div>

          {/* Imagen solo en desktop */}
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
    </section>
  );
}

export default Hero;
