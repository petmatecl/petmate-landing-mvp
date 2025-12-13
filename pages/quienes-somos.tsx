import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

export default function QuienesSomos() {
    return (
        <>
            <Head>
                <title>Quiénes Somos — Pawnecta</title>
                <meta name="description" content="La historia detrás de Pawnecta: una pareja, dos gatitos y la búsqueda del cuidado perfecto." />
            </Head>

            <main className="bg-white">
                {/* Hero Section */}
                <section className="relative isolate overflow-hidden bg-white px-6 py-10 sm:py-16 lg:px-8">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.emerald.100),white)] opacity-20" />
                    <div className="absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] bg-white shadow-xl shadow-emerald-600/10 ring-1 ring-emerald-50 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />

                    <div className="mx-auto max-w-2xl text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl text-pretty">
                            Nacimos de una <span className="text-emerald-600">necesidad personal</span>
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-600">
                            Somos una pareja amante de los animales que, al igual que tú, solo quería lo mejor para su familia de cuatro patas.
                        </p>
                    </div>
                </section>

                {/* Historia */}
                <section className="px-6 py-8 lg:px-8">
                    <div className="mx-auto max-w-5xl text-base leading-7 text-slate-700 space-y-16">

                        {/* BLOQUE 1: Imagen Izquierda - Texto Derecha */}
                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
                            {/* Imagen Gato 1 (Abba o Freddie) */}
                            <div className="w-full lg:w-1/3 flex-shrink-0">
                                <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-lg rotate-2 hover:rotate-0 transition-transform duration-500">
                                    <Image
                                        src="https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=800"
                                        alt="Gato blanco y negro curioso"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>

                            {/* Texto 1 */}
                            <div className="w-full lg:w-2/3">
                                <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-emerald-600 first-letter:float-left first-letter:mr-3 text-lg">
                                    Todo comenzó con <strong>Abba y Freddie</strong>. Somos <strong>Aldo y Camila</strong>, una pareja sin hijos para quienes, al igual que para muchos, nuestras mascotas no son "algo" que tenemos, sino <strong>alguien</strong> con quien compartimos la vida. Ella es la reina indiscutible de la casa, elegante y observadora; él es el regalón travieso que siempre busca un regazo donde dormir.
                                </p>
                                <p className="mt-4">
                                    Cada vez que queríamos salir de viaje o teníamos que ausentarnos, nos enfrentábamos al mismo dilema: <strong>¿Con quién los dejamos?</strong> Las opciones tradicionales como hoteles les causaban estrés, y las visitas rápidas de 15 minutos nos parecían insuficientes para la compañía que ellos necesitan.
                                </p>
                            </div>
                        </div>

                        {/* BLOQUE 2: Texto Izquierda - Imagen Derecha */}
                        <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 items-center">
                            {/* Texto 2 */}
                            <div className="w-full lg:w-2/3">
                                <h2 className="text-2xl font-bold text-slate-900 mt-10">La solución que soñábamos: Pawnecta</h2>
                                <p>
                                    PetMate nació de esa frustración y de ese amor. Queríamos crear una plataforma donde pudiéramos encontrar a alguien de confianza, un verdadero <em>Pawnecta Sitter</em>, que pudiera quedarse en casa o pasar tiempo de calidad con ellos, manteniendo sus rutinas y su tranquilidad intactas.
                                </p>

                                <div className="border-l-4 border-emerald-500 pl-6 py-2 my-6 italic text-slate-600 bg-slate-50 rounded-r-lg">
                                    "No buscábamos un cuidador, buscábamos un compañero temporal que los tratara con el mismo amor que nosotros."
                                </div>

                                <p>
                                    Hoy, Pawnecta conecta a dueños como nosotros con personas verificadas que entienden que el cuidado no es un trabajo, es una vocación.
                                </p>
                            </div>

                            {/* Imagen Gato 2 */}
                            <div className="w-full lg:w-1/3 flex-shrink-0">
                                <div className="aspect-[4/5] relative rounded-2xl overflow-hidden shadow-lg -rotate-2 hover:rotate-0 transition-transform duration-500">
                                    <Image
                                        src="https://images.pexels.com/photos/1741205/pexels-photo-1741205.jpeg?auto=compress&cs=tinysrgb&w=800"
                                        alt="Gato naranja mirando atentamente"
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* CTA */}
                    <div className="mx-auto max-w-2xl text-center mt-16 pt-10 border-t border-slate-200">
                        <h3 className="text-2xl font-bold text-slate-900">¿Te identificas con nuestra historia?</h3>
                        <div className="mt-6 flex items-center justify-center gap-x-6">
                            <Link
                                href="/register"
                                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                            >
                                Únete a Pawnecta
                            </Link>
                            <Link href="/explorar" className="text-sm font-semibold leading-6 text-slate-900">
                                Buscar cuidador <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
