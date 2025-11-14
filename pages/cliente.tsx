// pages/cliente.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";

export default function ClienteDashboard() {
  // Más adelante esto vendrá del login / backend
  const nombreDemo = "Aldo";

  return (
    <>
      <Head>
        <title>Mi espacio — Cliente | PetMate</title>
      </Head>

      <main className="min-h-[calc(100vh-200px)] bg-slate-50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Header del dashboard */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-600 font-semibold">
                Panel de cliente
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                Hola, {nombreDemo} 👋
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Desde aquí podrás crear y seguir tus solicitudes de PetMate para tus mascotas.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/register?role=cliente"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Nueva solicitud
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Editar perfil
              </button>
            </div>
          </div>

          {/* Layout principal */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            {/* Columna izquierda */}
            <div className="space-y-4">
              {/* Próxima solicitud */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Tu próxima solicitud
                    </h2>
                    <p className="text-xs text-slate-500">
                      Aquí verás el detalle de tu próximo viaje y el PetMate asignado.
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                    Próximamente
                  </span>
                </div>

                {/* Estado vacío */}
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-sm font-semibold text-slate-800">
                    Aún no tienes solicitudes activas
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Crea tu primera solicitud indicando fechas, comuna y mascota para buscar el mejor PetMate.
                  </p>
                  <Link
                    href="/register?role=cliente"
                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                  >
                    Crear primera solicitud
                  </Link>
                </div>
              </section>

              {/* Historial (demo) */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Historial de solicitudes
                  </h2>
                  <span className="text-[11px] text-slate-500">
                    Próximamente conectaremos tus datos reales
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <p>
                      Aquí verás solicitudes pasadas, el PetMate que te ayudó y la evaluación que le diste.
                    </p>
                  </div>

                  {/* Fila ejemplo */}
                  <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Ejemplo: Viaje a La Serena
                      </p>
                      <p className="text-xs text-slate-500">
                        12–18 de febrero · 1 perro, 1 gato · Comuna: Las Condes
                      </p>
                    </div>
                    <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 sm:mt-0">
                      Estado: Completado (demo)
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna derecha */}
            <aside className="space-y-4">
              <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-emerald-900">
                  Cómo funciona PetMate para ti
                </h2>
                <ol className="mt-3 space-y-2 text-xs text-emerald-900">
                  <li>
                    <span className="font-semibold">1.</span> Completa tu registro con comuna y tipo de servicio.
                  </li>
                  <li>
                    <span className="font-semibold">2.</span> Crea una solicitud con fechas y mascotas.
                  </li>
                  <li>
                    <span className="font-semibold">3.</span> Te mostramos PetMates que calzan con tu perfil.
                  </li>
                  <li>
                    <span className="font-semibold">4.</span> Confirmas al PetMate y coordinan los últimos detalles.
                  </li>
                </ol>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">
                  Resumen rápido
                </h2>
                <dl className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Solicitudes activas</dt>
                    <dd className="font-semibold text-slate-900">0</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Mascotas registradas</dt>
                    <dd className="font-semibold text-slate-900">
                      {petsLabelDemo(2, 1)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-500">Evaluación promedio</dt>
                    <dd className="font-semibold text-slate-900">—</dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] text-slate-500">
                  Por ahora estos datos son de ejemplo. Luego se conectarán a tu información real de uso.
                </p>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

// helper simple solo para demo
function petsLabelDemo(dogs: number, cats: number) {
  const p = dogs > 0 ? `${dogs} perro${dogs > 1 ? "s" : ""}` : null;
  const g = cats > 0 ? `${cats} gato${cats > 1 ? "s" : ""}` : null;

  return [p, g].filter(Boolean).join(", ") || "Sin mascotas";
}
