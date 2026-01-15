import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

// --- Iconos Inline ---
const CheckIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const HomeIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);
const PlantIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 10a6 6 0 0 0-6-6h-3v2a6 6 0 0 0 6 6h3" />
        <path d="M12 22v-12" />
        <path d="M12 10a6 6 0 0 1 6-6h3v2a6 6 0 0 1-6 6h-3" />
    </svg>
);
const CatIcon = (props: any) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M12 5c.67 0 1.28.09 1.86.26 1.76-2.16 4.77-2.67 4.77-2.67-.34 2.21.09 4.97 1.25 6.46 1.05 1.35 1.76 3.1 1.76 5.09 C21.64 18.25 17.5 21 12 21S2.36 18.25 2.36 14.14c0-2 .71-3.74 1.76-5.09C5.28 7.59 5.71 4.83 5.37 2.62c0 0 3.01.51 4.77 2.67.58-.17 1.19-.26 1.86-.26z" />
        <path d="M9 14v2" /><path d="M15 14v2" /><path d="M9 10h.01" /><path d="M15 10h.01" />
    </svg>
);
const SearchIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const ChatIcon = (props: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

export default function ServicioDomicilio() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const toggleFaq = (i: number) => {
        setOpenFaq(openFaq === i ? null : i);
    };

    return (
        <>
            <Head>
                <title>Pawnecta a Domicilio — Cuidado experto en tu hogar</title>
                <meta name="description" content="Tus mascotas felices en su propia casa. Sitters verificados van a tu hogar para alimentarlos, jugar y cuidarlos mientas no estás." />
            </Head>

            <main className="bg-white">
                {/* --- HERO SECTION --- */}
                <div className="relative isolate overflow-hidden">
                    {/* Background Image Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/1726074/pexels-photo-1726074.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                            alt="Perro feliz en casa"
                            className="h-full w-full object-cover opacity-10"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                    </div>

                    <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pb-32 lg:flex lg:px-8 lg:py-40">
                        <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
                            <div className="mt-24 sm:mt-32 lg:mt-16">
                                <span className="inline-flex items-center rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/10">
                                    Servicio Premium
                                </span>
                            </div>
                            <h1 className="mt-10 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                                Cuidado experto <br />
                                <span className="text-emerald-600">sin salir de casa</span>
                            </h1>
                            <p className="mt-6 text-lg leading-8 text-slate-600">
                                Olvídate del estrés de mover a tus mascotas. Un <b>Pawnecta Sitter</b> verificado va a tu hogar para mantener su rutina, sus olores y su felicidad intacta.
                            </p>
                            <div className="mt-10 flex items-center gap-x-6">
                                <Link
                                    href="/register?role=cliente&mode=domicilio"
                                    className="rounded-full bg-emerald-600 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all transform hover:scale-105"
                                >
                                    Reservar Sitter
                                </Link>
                                <Link href="/explorar" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-2 group">
                                    Ver perfiles <span aria-hidden="true" className="group-hover:translate-x-1 transition-transform">→</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CÓMO FUNCIONA --- */}
                <div className="bg-slate-50 py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center">
                            <h2 className="text-base font-semibold leading-7 text-emerald-600">Proceso Simple</h2>
                            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Tu tranquilidad en 3 pasos
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
                                <div className="relative pl-16">
                                    <dt className="text-base font-bold leading-7 text-slate-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                                            <SearchIcon className="h-6 w-6 text-white" />
                                        </div>
                                        1. Encuentra tu Sitter
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-slate-600">
                                        Filtra por comuna y revisa perfiles verificados con reseñas reales de otros dueños.
                                    </dd>
                                </div>
                                <div className="relative pl-16">
                                    <dt className="text-base font-bold leading-7 text-slate-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                                            <ChatIcon className="h-6 w-6 text-white" />
                                        </div>
                                        2. Conoce y Reserva
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-slate-600">
                                        Chatea gratis para coordinar detalles y acuerda el pago directamente con el sitter.
                                    </dd>
                                </div>
                                <div className="relative pl-16">
                                    <dt className="text-base font-bold leading-7 text-slate-900">
                                        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600">
                                            <HomeIcon className="h-6 w-6 text-white" />
                                        </div>
                                        3. Viaja tranquilo
                                    </dt>
                                    <dd className="mt-2 text-base leading-7 text-slate-600">
                                        Tu sitter cuidará de tu hogar y tus mascotas. Recibe fotos y actualizaciones diarias.
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* --- BENEFICIOS --- */}
                <div className="bg-white py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:mx-0">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">¿Por qué elegir el servicio a domicilio?</h2>
                            <p className="mt-6 text-lg leading-8 text-slate-600">
                                Es la opción ideal para mantener la estabilidad emocional de tus mascotas y la seguridad de tu hogar.
                            </p>
                        </div>
                        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                                <div className="flex flex-col">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <CatIcon className="h-5 w-5 flex-none text-emerald-600" />
                                        Ideal para gatos y tímidos
                                    </dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">Los gatos y mascotas nerviosas sufren mucho con los cambios de ambiente. En su casa, son los reyes.</p>
                                    </dd>
                                </div>
                                <div className="flex flex-col">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <HomeIcon className="h-5 w-5 flex-none text-emerald-600" />
                                        Casa habitada = Casa segura
                                    </dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">La presencia de un cuidador disuade robos. Tu casa no estará sola mientras viajas.</p>
                                    </dd>
                                </div>
                                <div className="flex flex-col">
                                    <dt className="flex items-center gap-x-3 text-base font-bold leading-7 text-slate-900">
                                        <PlantIcon className="h-5 w-5 flex-none text-emerald-600" />
                                        Servicios extra incluidos
                                    </dt>
                                    <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-600">
                                        <p className="flex-auto">Nuestros sitters también pueden regar tus plantas, recoger la correspondencia y sacar la basura.</p>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* --- FAQ SECTION --- */}
                <div className="bg-slate-50 py-24 sm:py-32">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl lg:text-center mb-16">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Preguntas Frecuentes</h2>
                        </div>
                        <div className="mx-auto max-w-2xl divide-y divide-gray-900/10">
                            {[
                                { q: "¿El Sitter se queda a dormir?", a: "Tú decides. Puedes contratar visitas diarias (de 30 a 60 minutos) o servicio de House Sitting donde el cuidador pernocta en tu casa." },
                                { q: "¿Es seguro darle las llaves a un extraño?", a: "Todos nuestros Pawnecta Sitters pasan por un riguroso proceso de validación de identidad y antecedentes. Además, puedes conocerlos antes en una entrevista gratuita." },
                                { q: "¿Qué pasa si mi mascota se enferma?", a: "El Sitter te contactará de inmediato y la llevará a tu veterinaria de confianza o a la clínica de urgencia más cercana, manteniéndote informado en todo momento." },
                            ].map((faq, i) => (
                                <div key={i} className="py-2">
                                    <button onClick={() => toggleFaq(i)} className="flex w-full items-start justify-between text-left py-4">
                                        <span className="text-base font-semibold leading-7 text-slate-900">{faq.q}</span>
                                        <span className="ml-6 flex h-7 items-center">
                                            {openFaq === i ? (
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" /></svg>
                                            ) : (
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>
                                            )}
                                        </span>
                                    </button>
                                    {openFaq === i && (
                                        <p className="pr-12 pb-4 text-base leading-7 text-slate-600">{faq.a}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- CTA FINAL --- */}
                <div className="bg-emerald-900 py-16 sm:py-24">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                ¿Listo para viajar tranquilo?
                            </h2>
                            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-emerald-100">
                                Encuentra hoy mismo al cuidador perfecto para tu hogar y tus mascotas.
                            </p>
                            <div className="mt-10 flex items-center justify-center gap-x-6">
                                <Link
                                    href="/register?role=cliente&mode=domicilio"
                                    className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-emerald-900 shadow-sm hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all transform hover:scale-105"
                                >
                                    Comenzar ahora
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </>
    );
}
