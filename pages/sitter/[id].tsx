import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import ReviewList from "../../components/Reviews/ReviewList";
import ReviewFormModal from "../../components/Reviews/ReviewFormModal";
import { getReviewsBySitterId, Review } from "../../lib/reviewsService";

// Props que recibe la página desde getServerSideProps
interface PublicProfileProps {
    petmate: {
        id: string;
        nombre: string;
        apellido_p: string;
        descripcion?: string;
        comuna?: string;
        region?: string;
        price?: number;
        // Campos nuevos
        edad?: number;
        ocupacion?: string;
        tiene_mascotas?: boolean;
        sexo?: string;
        tipo_vivienda?: string;
        max_mascotas_en_casa?: number;
        max_mascotas_domicilio?: number;
        redes_sociales?: {
            instagram?: string;
            tiktok?: string;
            facebook?: string;
            linkedin?: string;
        };
        foto_perfil?: string;
        galeria?: string[];
        // ...
        auth_user_id: string;
        aprobado: boolean;
        calle?: string;
        numero?: string;
    } | null;
    error?: string;
}

export default function PublicProfilePage({ petmate, error }: PublicProfileProps) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    useEffect(() => {
        if (petmate?.id) {
            fetchReviews();
        }
    }, [petmate?.id]);

    const fetchReviews = async () => {
        if (!petmate?.id) return;
        setLoadingReviews(true);
        const { data } = await getReviewsBySitterId(petmate.id);
        if (data) setReviews(data);
        setLoadingReviews(false);
    };

    // Estado de sesión para saber si es el dueño
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setCurrentUserId(session.user.id);
        });
    }, []);

    // 1. Si hay error o no hay data, error 404
    if (error || !petmate) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <h1 className="text-2xl font-bold text-slate-900">Perfil no encontrado 😢</h1>
                <p className="mt-2 text-slate-600">Lo sentimos, no pudimos encontrar al cuidador que buscas.</p>
                <Link href="/explorar" className="mt-6 btn-primary">
                    Volver a explorar
                </Link>
            </div>
        );
    }

    // 2. Si NO está aprobado y NO es el dueño -> 404 (simulado)
    const isOwner = currentUserId === petmate.auth_user_id;
    if (!petmate.aprobado && !isOwner) {
        // Renderizamos "loading" inicial si user aun carga, o 404 si ya cargó y no coincide
        if (currentUserId === null) return null; // Esperando auth
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <h1 className="text-2xl font-bold text-slate-900">Perfil no disponible 🔒</h1>
                <p className="mt-2 text-slate-600">Este perfil aún no está verificado o no es público.</p>
                <Link href="/explorar" className="mt-6 btn-primary">
                    Volver a explorar
                </Link>
            </div>
        );
    }

    // Inicial del apellido para privacidad
    const displayName = petmate.apellido_p ? `${petmate.nombre} ${petmate.apellido_p}` : petmate.nombre;
    const avatarSrc = petmate.foto_perfil || `https://ui-avatars.com/api/?name=${petmate.nombre}+${petmate.apellido_p}&background=random&color=fff&size=256`;

    const averageRating = reviews.length > 0
        ? (reviews.reduce((acc, curr) => acc + curr.calificacion, 0) / reviews.length).toFixed(1)
        : "Nuevo";

    // Helper para redes sociales
    const hasSocials = petmate.redes_sociales && Object.values(petmate.redes_sociales).some(val => val && val.trim() !== "");

    return (
        <>
            <Head>
                <title>{displayName} — Sitter en Pawnecta</title>
                <meta name="description" content={`Conoce el perfil de ${displayName} y reserva su cuidado en Pawnecta.`} />
            </Head>

            <div className="bg-slate-50 min-h-screen pb-20">
                {/* Header simple de vuelta */}
                <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                        <Link href="/explorar" className="text-sm font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                            ← Volver
                        </Link>
                        <Link href="/" className="font-bold text-emerald-600 text-lg">Pawnecta</Link>
                    </div>
                </div>

                {/* Banner de "En Revisión" solo para el dueño */}
                {!petmate.aprobado && isOwner && (
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-3 sticky top-[57px] z-20">
                        <div className="max-w-5xl mx-auto flex items-center gap-3">
                            <span className="text-amber-500 text-xl">🔒</span>
                            <div>
                                <h3 className="text-sm font-bold text-amber-800">Modo Vista Previa Privada</h3>
                                <p className="text-xs text-amber-700">Tu perfil no es visible para el público porque aún no ha sido verificado.</p>
                            </div>
                        </div>
                    </div>
                )}


                <main className="max-w-5xl mx-auto px-4 mt-8">
                    <div className="grid md:grid-cols-12 gap-8">
                        {/* Columna Izquierda: Tarjeta Principal (4 columnas) */}
                        <div className="md:col-span-4 lg:col-span-4">
                            {/* CARD 1: Identidad */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative w-32 h-32 mb-4 group">
                                        <Image
                                            src={avatarSrc}
                                            alt={displayName}
                                            fill
                                            className="rounded-full object-cover border-4 border-emerald-50 shadow-sm"
                                        />
                                        <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Verificado">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Nombre + Estrellas (Juntos) */}
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <h1 className="text-xl font-extrabold text-slate-900">{displayName}</h1>
                                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-100">
                                            <span>★ {averageRating}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-500">{petmate.comuna}, {petmate.region}</p>
                                </div>
                            </div>

                            {/* CARD 2: Servicios y Acción */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-20">
                                <div className="text-left w-full space-y-3 text-sm">
                                    <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-3">
                                        <span className="text-slate-500 font-medium">Hospedaje</span>
                                        <span className="font-bold text-slate-900 text-lg">
                                            ${petmate.price ? petmate.price.toLocaleString('es-CL') : "15.000"}
                                            <span className="text-xs font-normal text-slate-500">/ noche</span>
                                        </span>
                                    </div>
                                    {/* Aquí podríamos agregar más servicios si existieran en la data */}
                                </div>

                                <button className="w-full mt-2 btn-primary py-3 shadow-lg shadow-emerald-100 hover:shadow-xl transition-shadow">
                                    Contactar
                                </button>
                                <p className="text-xs text-slate-400 mt-2 text-center">Sin compromiso de reserva</p>

                                {/* Redes Sociales */}
                                {hasSocials && (
                                    <div className="mt-6 pt-6 border-t border-slate-100 w-full text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sígueme en</p>
                                        <div className="flex justify-center gap-4">
                                            {petmate.redes_sociales?.instagram && (
                                                <a href={`https://instagram.com/${petmate.redes_sociales.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:scale-110 transition-transform bg-pink-50 p-2 rounded-full">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                                </a>
                                            )}
                                            {petmate.redes_sociales?.tiktok && (
                                                <a href={`https://tiktok.com/@${petmate.redes_sociales.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-black hover:scale-110 transition-transform bg-gray-100 p-2 rounded-full">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.03 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.35-1.17 1.09-1.19 1.72-.07.52.03 1.09.41 1.53.68.79 1.55 1.25 2.51 1.24.49 0 1-.09 1.47-.27 2.05-.8 3.52-2.9 3.49-5.11V4.28c-1.6-.2-3.15-.65-4.48-1.57-.04-1.38.03-2.77.03-4.17-.05-.18.01-.36.01-.52z" /></svg>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Detalles (8 columnas) */}
                        <div className="md:col-span-8 lg:col-span-8 space-y-8">

                            {/* Sobre mí */}
                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    Sobre mí
                                </h2>
                                <div className="prose prose-slate text-slate-600 leading-relaxed">
                                    <p>
                                        {petmate.descripcion ||
                                            "¡Hola! Soy un Sitter apasionado por los animales. Aún estoy completando mi perfil, pero me encantaría cuidar de tu mascota con todo el cariño y responsabilidad que se merece."}
                                    </p>
                                </div>
                            </section>

                            {/* Galería */}
                            {petmate.galeria && petmate.galeria.length > 0 && (
                                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                    <h2 className="text-xl font-bold text-slate-900 mb-6">Galería</h2>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {petmate.galeria.map((foto, index) => (
                                            <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <Image src={foto} alt={`Galería ${index}`} fill className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Información Adicional (Grid) */}
                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                <h2 className="text-xl font-bold text-slate-900 mb-6">Detalles</h2>
                                <div className="grid sm:grid-cols-2 gap-y-6 gap-x-12">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">Edad</h3>
                                        <p className="text-slate-900 font-medium">{petmate.edad ? `${petmate.edad} años` : "No especificada"}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">Ocupación</h3>
                                        <p className="text-slate-900 font-medium">{petmate.ocupacion || "No especificada"}</p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">Mascotas propias</h3>
                                        <p className="text-slate-900 font-medium">
                                            {petmate.tiene_mascotas === true ? "Sí, tengo mascotas 🐶" :
                                                petmate.tiene_mascotas === undefined ? "No especificado" : "No tengo mascotas actualmente"}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-1">Vivienda</h3>
                                        <p className="text-slate-900 font-medium capitalize">{petmate.tipo_vivienda || "No especificado"}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Sección de Reseñas */}
                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        Reseñas <span className="text-sm font-normal text-slate-500">({reviews.length})</span>
                                    </h2>
                                    <button
                                        onClick={() => setIsReviewModalOpen(true)}
                                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                                    >
                                        Escribir una reseña
                                    </button>
                                </div>

                                {loadingReviews ? (
                                    <div className="space-y-4">
                                        {[1, 2].map(i => (
                                            <div key={i} className="animate-pulse flex space-x-4">
                                                <div className="rounded-full bg-slate-200 h-10 w-10"></div>
                                                <div className="flex-1 space-y-2 py-1">
                                                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                                                    <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <ReviewList reviews={reviews} />
                                )}
                            </section>

                        </div>
                    </div >
                </main >

                {/* Modales */}
                <ReviewFormModal
                    isOpen={isReviewModalOpen}
                    onClose={() => setIsReviewModalOpen(false)}
                    sitterId={petmate.id}
                    onReviewSubmitted={fetchReviews}
                />
            </div >
        </>
    );
}

export async function getServerSideProps(context: any) {
    const { id } = context.params;

    // Usar Service Role Key para hacer bypass de RLS y poder obtener el perfil aunque no esté aprobado.
    // La seguridad de visualización se manejará en el componente (Client Side) o aqui si tuvieramos cookies.
    // Como no tenemos cookies fáciles aquí, pasamos el dato y el componente decide si mostrarlo.
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
        .from("registro_petmate")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return {
            props: {
                petmate: null,
                error: "Not found"
            }
        };
    }

    return {
        props: {
            petmate: data
        }
    };
}
