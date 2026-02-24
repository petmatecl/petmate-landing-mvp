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
                            Somos Pawnecta
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-slate-600 font-medium">
                            El marketplace de servicios para mascotas más confiable de Chile
                        </p>
                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Pawnecta nació de una pregunta simple: ¿por qué es tan difícil encontrar a alguien de confianza para cuidar a tu mascota? Buscadores dispersos, contactos sin verificar, precios opacos. Decidimos cambiar eso.
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

                            <div className="w-full lg:w-2/3">
                                <h2 className="text-3xl font-bold text-emerald-600 mb-6">Nuestra misión</h2>
                                <p className="text-lg">
                                    Conectar a los dueños de mascotas con los mejores profesionales de su comuna — de forma simple, transparente y segura. Creemos que cada mascota merece atención de calidad, y cada dueño merece la tranquilidad de saber con quién la deja.
                                </p>
                            </div>
                        </div>

                        {/* BLOQUE 2: Texto Izquierda - Imagen Derecha */}
                        <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-12 items-center">
                            <div className="w-full lg:w-2/3">
                                <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-6">¿Por qué Pawnecta?</h2>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-700">Proveedores verificados</h3>
                                        <p>Cada persona que ofrece servicios en Pawnecta pasa por verificación de identidad con RUT y documento oficial. Sabes exactamente con quién tratas.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-700">Evaluaciones reales</h3>
                                        <p>Solo los usuarios que contactaron al proveedor pueden dejar una evaluación. Sin bots, sin reseñas compradas. Solo experiencias reales.</p>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-emerald-700">Todos los servicios en un lugar</h3>
                                        <p>Hospedaje, paseos, peluquería, veterinario a domicilio, adiestramiento y más. Ya no necesitas buscar en cinco sitios distintos.</p>
                                    </div>
                                </div>
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

                    <div className="mx-auto max-w-2xl text-center mt-16 pt-10 border-t border-slate-300">
                        <h3 className="text-2xl font-bold text-slate-900">Hecho en Chile, para Chile</h3>
                        <p className="mt-4 text-base text-slate-600">
                            Somos un equipo pequeño con mascotas propias. Entendemos lo que significa confiarle tu peludo a alguien más — porque nosotros también lo hacemos.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-x-6">
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
