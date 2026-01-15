import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

// --- Iconos Inline ---
const PawIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 2C8 2 8 6 8 8c0 1.66 1.34 3 3 3s3-1.34 3-3c0-2 0-6-4-6z" />
        <path d="M4 10c-2 0-2 4-2 6 0 2.21 2.24 4 5 4 1.5 0 2.82-.5 3.7-1.3.88.8 2.2 1.3 3.7 1.3 2.76 0 5-1.79 5-4 0-2 0-6-2-6-1.5 0-3 1-3 3 0 .4.04.8.1 1.2-.5-.1-1-.2-1.6-.2s-1.1.1-1.6.2C11.96 11.8 12 11.4 12 11c0-2-1.5-3-3-3H4z" />
    </svg>
);
const SofaIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
        <path d="M2 17v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
        <path d="M4 21v-4" />
        <path d="M20 21v-4" />
        <path d="M4 11h16" />
    </svg>
);
const CameraIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);
const HeartIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
);

export default function ServicioHospedaje() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <>
            <Head>
                <title>Hospedaje Pawnecta — Vacaciones para ellos</title>
                <meta name="description" content="Alojamiento familiar para tus mascotas en casa de un Pawnecta Sitter verificado. Sin jaulas, solo cariño y diversión." />
            </Head>

            <main className="bg-white">
                {/* --- HERO SECTION --- */}
                <div className="relative isolate overflow-hidden bg-slate-900 pb-16 pt-14 sm:pb-20">
                    <img
                        src="https://images.pexels.com/photos/4000095/pexels-photo-4000095.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                        alt="Perro en sofá"
                        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-900 via-slate-900/40"></div>

                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
                            <div className="text-center">
                                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                                    Siéntete como en casa
                                    <span className="block text-emerald-400 text-3xl sm:text-5xl mt-2 font-medium">(literalmente)</span>
                                </h1>
                                <p className="mt-6 text-lg leading-8 text-gray-300">
                                    Aquí no hay jaulas ni suelos fríos. Tus mascotas se hospedan en hogares reales de cuidadores amorosos que los tratan como parte de su familia.
                                </p>
                                <div className="mt-10 flex items-center justify-center gap-x-6">
                                    <Link
                                        href="/register?role=cliente&mode=estadia"
                                        className="rounded-full bg-emerald-500 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                                    >
                                        Buscar Hospedaje
                                    </Link>
                                    <Link href="/explorar" className="text-sm font-semibold leading-6 text-white group">
                                        Explorar anfitriones <span aria-hidden="true" className="group-hover:ml-1 transition-all">→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- QUÉ INCLUYE (Features) --- */}
                <div className="py-24 sm:py-32 bg-white">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-emerald-600">Experiencia 5 Estrellas</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Vacaciones para ti, vacaciones para ellos
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                                <div className="flex flex-col items-center text-center">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 mb-2">
                                            <SofaIcon className="h-8 w-8" />
                                        </div>
                                    </dt>
                                    <dt className="text-xl font-bold text-slate-900">Sin jaulas, puro confort</dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">Tu perro dormirá en una cama cómoda (¡o en el sillón si se lo permiten!) y tendrá libertad para moverse.</p>
                                    </dd>
                                </div>
                                <div className="flex flex-col items-center text-center">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <div className="rounded-lg bg-purple-100 p-2 text-purple-600 mb-2">
                                            <HeartIcon className="h-8 w-8" />
                                        </div>
                                    </dt>
                                    <dt className="text-xl font-bold text-slate-900">Atención 24/7</dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">Ideal para mascotas que sufren ansiedad por separación o que simplemente aman la compañía humana.</p>
                                    </dd>
                                </div>
                                <div className="flex flex-col items-center text-center">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600 mb-2">
                                            <CameraIcon className="h-8 w-8" />
                                        </div>
                                    </dt>
                                    <dt className="text-xl font-bold text-slate-900">Reportes Diarios</dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">Recibe fotos y videos todos los días para ver cómo tu peludo disfruta sus propias vacaciones.</p>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* --- PREGUNTAS (Mini) --- */}
                <div className="bg-slate-50 py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-4xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-8">
                                ¿Mi perro se llevará bien con las mascotas del Sitter?
                            </h2>
                            <p className="text-lg text-slate-600 mb-12">
                                Entendemos tu preocupación. Por eso, en <b>Pawnecta</b> promovemos un encuentro previo (Meet & Greet) gratuito para asegurar que haya química entre todos antes de confirmar.
                            </p>

                            <Link
                                href="/explorar"
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
                            >
                                <PawIcon className="mr-2 h-5 w-5" />
                                Buscar Sitter Perfecto
                            </Link>
                        </div>
                    </div>
                </div>

            </main>
        </>
    );
}
