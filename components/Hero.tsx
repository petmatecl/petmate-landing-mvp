// components/Hero.tsx
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Copy + CTAs */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-gray-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Nuevo: PetMate a domicilio o estadía en casa del PetMate.
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
              Cuidado de mascotas sin traslados.
              <span className="block text-emerald-700">Seguro, cercano y flexible.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-xl">
              Elige que un <strong>PetMate</strong> vaya a tu hogar o deja a tu peludo en casa de un
              <strong> PetMate verificado</strong>. Reserva por día, fin de semana o todo tu viaje.
            </p>

            {/* Elecciones rápidas */}
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <Link
                href="/register?role=cliente&mode=domicilio"
                className="group rounded-2xl border p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">🏠</span>
                  <div>
                    <div className="font-semibold text-gray-900">PetMate a domicilio</div>
                    <div className="text-sm text-gray-600">El PetMate cuida en tu hogar.</div>
                  </div>
                </div>
              </Link>

              <Link
                href="/register?role=cliente&mode=estadia"
                className="group rounded-2xl border p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">🏡</span>
                  <div>
                    <div className="font-semibold text-gray-900">En casa del PetMate</div>
                    <div className="text-sm text-gray-600">Tu mascota se hospeda con un PetMate.</div>
                  </div>
                </div>
              </Link>
            </div>

            {/* CTA principal */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/register?role=cliente"
                className="inline-flex justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Comenzar
              </Link>
              <Link
                href="/register?role=petmate"
                className="inline-flex justify-center rounded-xl border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Quiero ser PetMate
              </Link>
            </div>

            {/* Social proof / cobertura */}
            <div className="mt-6 text-xs text-gray-500">
              Cobertura inicial: RM – sector oriente. PetMates verificados y con reseñas.
            </div>
          </div>

          {/* Imagen solo en desktop */}
          <div className="hidden lg:block relative">
            <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-emerald-100 blur-3xl opacity-60" />
            <Image
              // Usamos Pexels para no depender de subir un archivo local.
              src="https://images.pexels.com/photos/33685207/pexels-photo-33685207.jpeg?auto=compress&cs=tinysrgb&w=1600&h=1000&dpr=1"
              alt="Gato descansando tranquilo"
              width={720}
              height={720}
              className="relative z-10 rounded-3xl shadow-2xl object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
