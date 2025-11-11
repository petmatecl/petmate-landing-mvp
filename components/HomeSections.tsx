// components/HomeSections.tsx

// Sección: ¿Por qué PetMate?
export function ValueProps() {
  const items = [
    {
      title: "Sin estrés y sin traslados",
      desc:
        "Evita mover a tu mascota: nosotros vamos a tu hogar o la alojas con un PetMate cercano.",
    },
    {
      title: "PetMates verificados",
      desc: "Perfiles con validaciones, reseñas y cobertura de seguridad.",
    },
    {
      title: "Flexible por días",
      desc: "Reserva por día, fin de semana o todo tu viaje.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
        ¿Por qué PetMate?
      </h2>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="rounded-2xl border p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                {/* Check inline (sin librerías) */}
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <div className="font-semibold text-gray-900">{it.title}</div>
            </div>
            <p className="mt-3 text-sm text-gray-600">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Sección: Cómo funciona
export function HowItWorks() {
  const steps = [
    {
      n: 1,
      t: "Cuéntanos de tu mascota",
      d: "Edad, rutinas y si prefieres domicilio o estadía.",
    },
    {
      n: 2,
      t: "Elige un PetMate",
      d: "Revisa reseñas y disponibilidad.",
    },
    {
      n: 3,
      t: "Reserva y ¡listo!",
      d: "Pagas en línea y quedas cubierto.",
    },
  ];

  return (
    <section className="bg-gray-50 border-y">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
          Cómo funciona
        </h2>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border bg-white p-6">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                {s.n}
              </div>
              <div className="mt-3 font-semibold text-gray-900">{s.t}</div>
              <p className="mt-2 text-sm text-gray-600">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Sección: CTA final
export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
      <div className="rounded-3xl bg-emerald-600 p-8 sm:p-12 text-white">
        <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          ¿Listo para comenzar?
        </h3>
        <p className="mt-2 text-emerald-50">
          Crea tu solicitud en minutos y consigue un PetMate cercano.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href="/register?role=cliente"
            className="inline-flex justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Comenzar
          </a>
          <a
            href="/register?role=petmate"
            className="inline-flex justify-center rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Quiero ser PetMate
          </a>
        </div>
      </div>
    </section>
  );
}

export default {};
