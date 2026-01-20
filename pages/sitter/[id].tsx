import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import ReviewList from "../../components/Reviews/ReviewList";
import ReviewFormModal from "../../components/Reviews/ReviewFormModal";
import { getReviewsBySitterId, Review } from "../../lib/reviewsService";
import { Trash2, Share2, Home, Hotel, Maximize, CheckCircle2, XCircle } from "lucide-react";

// Props que recibe la página desde getServerSideProps
import { useRouter } from "next/router";

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
        // Campos nuevos
        fotos_vivienda?: string[];
        tiene_patio?: boolean;
        tiene_malla?: boolean;
        tiene_ninos?: boolean;
        fumador?: boolean;
        dimensiones_vivienda?: string;
        auth_user_id: string;
        aprobado: boolean;
        calle?: string;
        numero?: string;
        // Map and Video props
        latitud?: number;
        longitud?: number;
        videos?: string[];
        cuida_perros?: boolean;
        cuida_gatos?: boolean;
        tarifa_servicio_a_domicilio?: number;
        servicio_a_domicilio?: boolean;
        servicio_en_casa?: boolean;
        telefono?: string;
        email?: string;
    } | null;
    error?: string;
    id?: string;
}

import BookingModal from "../../components/Sitter/BookingModal";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import ContactSitterButton from "../../components/Shared/ContactSitterButton";

const LocationMap = dynamic(() => import("../../components/Shared/LocationMap"), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl" />
});

export default function PublicProfilePage({ petmate: initialPetmate, error, id }: PublicProfileProps) {
    const router = useRouter();
    const returnTo = router.query.returnTo as string;

    const [profileData, setProfileData] = useState(initialPetmate);
    const [loadingProfile, setLoadingProfile] = useState(!initialPetmate && !error); // If no data & no error, we need to fetch
    const [fetchError, setFetchError] = useState(error);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    // Estado de sesión para saber si es el dueño
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setCurrentUserId(session.user.id);
        });
    }, []);

    // Effect: Client-side fetch if SSR missed (Hybrid Fetching)
    useEffect(() => {
        if (!profileData && id && !error) {
            setLoadingProfile(true);
            const fetchProfile = async () => {
                // 1. Try by ID
                let { data, error } = await supabase
                    .from("registro_petmate")
                    .select("*")
                    .eq("id", id)
                    .single();

                // 2. Fallback: Try by Auth ID
                if (!data || error) {
                    const { data: authData, error: authError } = await supabase
                        .from("registro_petmate")
                        .select("*")
                        .eq("auth_user_id", id)
                        .single();

                    if (authData) {
                        data = authData;
                        error = null;
                    }
                }

                if (data) {
                    setProfileData(data);
                    setFetchError(undefined);
                } else {
                    setFetchError("Perfil no encontrado o privado.");
                }
                setLoadingProfile(false);
            };
            fetchProfile();
        } else if (initialPetmate) {
            setLoadingProfile(false); // Already have data
        }
    }, [id, profileData, initialPetmate, error]);


    useEffect(() => {
        if (profileData?.id) {
            fetchReviews();
        }
    }, [profileData?.id]);

    const fetchReviews = async () => {
        if (!profileData?.id) return;
        setLoadingReviews(true);
        const { data } = await getReviewsBySitterId(profileData.id);
        if (data) setReviews(data);
        setLoadingReviews(false);
    };

    // --- NEW LOGIC: Check for Pending Applications from Sitter ---
    const [pendingApplication, setPendingApplication] = useState<any>(null);

    useEffect(() => {
        if (currentUserId && profileData?.auth_user_id) {
            checkPendingApplication();
        }
    }, [currentUserId, profileData?.auth_user_id]);

    const checkPendingApplication = async () => {
        // Find if THERE IS an application from this sitter TO me (the user)
        // Linking postulaciones -> viajes -> user_id = me
        const { data, error } = await supabase
            .from('postulaciones')
            .select(`
                *,
                viajes!inner(*)
            `)
            .eq('sitter_id', profileData?.auth_user_id) // The sitter applying
            .eq('viajes.user_id', currentUserId)    // Me receiving
            .eq('estado', 'pendiente')
            .maybeSingle();

        if (data) {
            setPendingApplication(data);
        }
    };

    const handleAcceptApplication = async () => {
        if (!pendingApplication) return;

        triggerConfirm(
            "Aceptar Solicitud",
            `¿Deseas aceptar la postulación de ${profileData?.nombre} por $${pendingApplication.precio_oferta.toLocaleString('es-CL')} / noche?`,
            async () => {
                try {
                    // 1. Update Postulacion -> aceptada
                    const { error: postError } = await supabase
                        .from('postulaciones')
                        .update({ estado: 'aceptada' })
                        .eq('id', pendingApplication.id);

                    if (postError) throw postError;

                    // 2. Update Viaje -> asigando/programado + set sitter_id
                    const { error: tripError } = await supabase
                        .from('viajes')
                        .update({
                            estado: 'programado',
                            sitter_id: profileData?.auth_user_id
                        })
                        .eq('id', pendingApplication.viaje_id);

                    if (tripError) throw tripError;

                    // 3. Fetch Client Info for Email
                    const { data: clientData, error: clientError } = await supabase
                        .from('profiles') // Assuming profiles table stores user info
                        .select('nombre, apellido_p, email') // Assuming columns
                        .eq('auth_user_id', pendingApplication.viajes.user_id)
                        .single();

                    if (!clientError && clientData) {
                        // 4. Send Booking Confirmation Email
                        const sitterName = `${profileData?.nombre} ${profileData?.apellido_p || ''}`;
                        const clientName = `${clientData.nombre} ${clientData.apellido_p || ''}`;

                        await fetch('/api/send-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'booking_confirmation',
                                to: clientData.email,
                                data: {
                                    applicationId: pendingApplication.id,
                                    serviceType: pendingApplication.viajes.servicio,
                                    startDate: new Date(pendingApplication.viajes.fecha_inicio).toLocaleDateString('es-CL'),
                                    endDate: pendingApplication.viajes.fecha_fin ? new Date(pendingApplication.viajes.fecha_fin).toLocaleDateString('es-CL') : null,
                                    price: pendingApplication.precio_oferta || 0,
                                    clientName: clientName,
                                    sitterName: sitterName,
                                    sitterPhone: profileData?.telefono || 'No registrado',
                                    sitterEmail: profileData?.email || 'No registrado',
                                    dashboardUrl: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://www.pawnecta.com/dashboard',
                                }
                            }),
                        });
                    }


                    // Refresh
                    setPendingApplication(null);
                    fetchMyTripsWithSitter();
                    closeConfirm();
                    // Optional toast
                    alert("¡Solicitud aceptada exitosamente! Se ha enviado la ficha del servicio al cliente.");

                } catch (err) {
                    console.error("Error accepting application:", err);
                    alert("Hubo un error al aceptar la solicitud.");
                }
            }
        );
    };

    // Tab State
    const [activeTab, setActiveTab] = useState<'profile' | 'requests'>('profile');

    // Estado para "Mis Viajes con este Sitter"
    const [myTripsWithSitter, setMyTripsWithSitter] = useState<any[]>([]);
    const [loadingTrips, setLoadingTrips] = useState(false);

    useEffect(() => {
        if (currentUserId && profileData?.auth_user_id) {
            fetchMyTripsWithSitter();
        }
    }, [currentUserId, profileData?.auth_user_id]);

    const fetchMyTripsWithSitter = async () => {
        if (!profileData) return;
        setLoadingTrips(true);
        const { data } = await supabase
            .from("viajes")
            .select("*")
            .eq("user_id", currentUserId)
            .eq("sitter_id", profileData.auth_user_id)
            .neq("estado", "cancelado")
            .order("fecha_inicio", { ascending: false });

        if (data) setMyTripsWithSitter(data);
        setLoadingTrips(false);
    };

    // Confirmation Modal State (Same as before...)
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { }
    });

    const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmConfig({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteTrip = (tripId: string) => {
        triggerConfirm(
            "Eliminar Solicitud",
            "¿Estás seguro de que deseas eliminar o cancelar esta solicitud? Esta acción no se puede deshacer.",
            async () => {
                try {
                    const { error } = await supabase.from("viajes").delete().eq("id", tripId);
                    if (error) throw error;
                    // Update local state
                    setMyTripsWithSitter(prev => prev.filter(t => t.id !== tripId));
                    closeConfirm();
                } catch (err) {
                    console.error("Error deleting trip:", err);
                    alert("Hubo un error al eliminar la solicitud.");
                }
            }
        );
    };

    // --- RENDER LOGIC ---

    if (loadingProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <p className="text-slate-500">Cargando perfil...</p>
            </div>
        );
    }

    // 1. Si hay error o no hay data, error 404
    if (fetchError || !profileData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <h1 className="text-2xl font-bold text-slate-900">Perfil no encontrado 😢</h1>
                <p className="mt-2 text-slate-600">Lo sentimos, no pudimos encontrar al cuidador que buscas.</p>
                <Link href={returnTo || "/explorar"} className="mt-6 btn-primary">
                    Volver
                </Link>
            </div>
        );
    }

    // 2. Si NO está aprobado y NO es el dueño -> 404 (simulado)
    const isOwner = currentUserId === profileData.auth_user_id;
    if (!profileData.aprobado && !isOwner) {
        // Renderizamos "loading" inicial si user aun carga, o 404 si ya cargó y no coincide
        if (currentUserId === null) return null; // Esperando auth
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
                <h1 className="text-2xl font-bold text-slate-900">Perfil no disponible 🔒</h1>
                <p className="mt-2 text-slate-600">Este perfil aún no está verificado o no es público.</p>
                <Link href={returnTo || "/explorar"} className="mt-6 btn-primary">
                    Volver
                </Link>
            </div>
        );
    }

    // Use profileData instead of petmate for the rest
    const petmate = profileData;

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
                <meta name="description" content={`Conoce el perfil de ${displayName} y reserva su cuidado en Pawnecta. ${petmate.comuna}, ${petmate.region}.`} />

                {/* Facebook / Open Graph */}
                <meta property="og:type" content="profile" />
                <meta property="og:url" content={`https://www.pawnecta.cl/sitter/${id}`} />
                <meta property="og:title" content={`${displayName} — Sitter en Pawnecta`} />
                <meta property="og:description" content={`¡Reserva con ${displayName}! Sitter verificado en ${petmate.comuna}. ${averageRating} ★ de calificación. Cuida ${petmate.cuida_perros ? 'perros' : ''} ${petmate.cuida_gatos ? 'y gatos' : ''}.`} />
                <meta property="og:image" content={petmate.foto_perfil || "https://www.pawnecta.cl/og-sitter-default.jpg"} />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={`https://www.pawnecta.cl/sitter/${id}`} />
                <meta property="twitter:title" content={`${displayName} — Sitter en Pawnecta`} />
                <meta property="twitter:description" content={`¡Reserva con ${displayName}! Sitter verificado en ${petmate.comuna}.`} />
                <meta property="twitter:image" content={petmate.foto_perfil || "https://www.pawnecta.cl/og-sitter-default.jpg"} />
            </Head>

            <div className="bg-slate-50 min-h-screen pb-20">
                {/* Header simple de vuelta */}
                <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
                    <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
                        <Link href={returnTo || "/explorar"} className="text-sm font-semibold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors">
                            ← {returnTo === '/usuario' ? 'Volver al Panel' : 'Volver a explorar'}
                        </Link>
                        <Link href="/" className="font-bold text-emerald-600 text-lg hidden sm:block">Pawnecta</Link>
                        <button
                            onClick={() => {
                                if (navigator.share) {
                                    navigator.share({
                                        title: `${displayName} — Sitter en Pawnecta`,
                                        text: `Mira el perfil de ${displayName} en Pawnecta`,
                                        url: window.location.href,
                                    }).catch(console.error);
                                } else {
                                    navigator.clipboard.writeText(window.location.href);
                                    // Simple alert fallback, could be toast
                                    alert('Enlace copiado al portapapeles');
                                }
                            }}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all"
                            title="Compartir perfil"
                        >
                            <Share2 size={20} />
                        </button>
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
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-4">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative w-32 h-32 mb-4 group">
                                        <Image
                                            src={avatarSrc}
                                            alt={displayName}
                                            fill
                                            className="rounded-full object-cover border-4 border-white shadow-sm"
                                            unoptimized
                                        />
                                        <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white shadow-sm" title="Verificado">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Nombre + Estrellas (Juntos) */}
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <h1 className="text-xl font-extrabold text-slate-900">
                                            {displayName} {petmate.apellido_p ? `${petmate.apellido_p.charAt(0)}.` : ''}
                                        </h1>
                                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-100">
                                            <span>★ {averageRating}</span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-500">{petmate.comuna}, {petmate.region}</p>
                                </div>
                            </div>

                            {/* CARD 2: Servicios y Acción */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sticky top-20">
                                <div className="text-left w-full space-y-3 text-sm">
                                    {/* Servicios Domicilio y Hospedaje */}
                                    {petmate.servicio_en_casa !== false && (
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-3">
                                            <span className="text-slate-500 font-medium">Hospedaje</span>
                                            <span className="font-bold text-slate-900 text-lg">
                                                ${petmate.price ? petmate.price.toLocaleString('es-CL') : "15.000"}
                                                <span className="text-xs font-normal text-slate-500">/ noche</span>
                                            </span>
                                        </div>
                                    )}

                                    {petmate.servicio_a_domicilio && (
                                        <div className="flex justify-between items-center border-b border-slate-50 pb-3 mb-3">
                                            <span className="text-slate-500 font-medium">A Domicilio</span>
                                            <span className="font-bold text-slate-900 text-lg">
                                                ${petmate.tarifa_servicio_a_domicilio ? petmate.tarifa_servicio_a_domicilio.toLocaleString('es-CL') : "15.000"}
                                                <span className="text-xs font-normal text-slate-500">/ noche</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {pendingApplication ? (
                                    <div className="w-full mt-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                        <p className="text-sm text-emerald-800 mb-2 font-medium">
                                            Este cuidador te ha enviado una solicitud.
                                        </p>
                                        <button
                                            onClick={handleAcceptApplication}
                                            className="w-full btn-primary py-3 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                                        >
                                            Aceptar Solicitud <span className="font-normal text-sm ml-1">(${pendingApplication.precio_oferta?.toLocaleString('es-CL')})</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (currentUserId) {
                                                setIsBookingModalOpen(true);
                                            } else {
                                                // Redirigir a login si no está logueado
                                                window.location.href = `/login?redirect=/sitter/${petmate.id}`;
                                            }
                                        }}
                                        className="w-full mt-2 btn-primary py-3 shadow-lg shadow-emerald-100 hover:shadow-xl transition-shadow"
                                    >
                                        Solicitar Cuidado / Contactar
                                    </button>
                                )}
                                <div className="mt-3">
                                    <ContactSitterButton
                                        sitterId={petmate.auth_user_id} // Use auth_user_id for chat, as conversations link to auth.users
                                        className="w-full btn-secondary py-3 flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-colors rounded-xl font-bold text-slate-700"
                                        label="Enviar Mensaje"
                                        currentUserId={currentUserId}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 text-center">Coordinación directa - Sin cobro online</p>

                                {/* Redes Sociales */}
                                {hasSocials && (
                                    <div className="mt-6 pt-6 border-t border-slate-300 w-full text-center">
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

                        {/* Columna Derecha: Detalles (8 columnas) con TABS */}
                        <div className="md:col-span-8 lg:col-span-8">

                            {/* Tabs Header */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 mb-6 flex gap-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile'
                                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                        : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Perfil del Sitter
                                </button>
                                {currentUserId && (
                                    <button
                                        onClick={() => setActiveTab('requests')}
                                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'requests'
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                            : 'bg-transparent text-slate-500 hover:bg-slate-50'
                                            }`}
                                    >
                                        Mis Solicitudes
                                        {myTripsWithSitter.length > 0 && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === 'requests' ? 'bg-emerald-400/30 text-white' : 'bg-emerald-100 text-emerald-600'
                                                }`}>
                                                {myTripsWithSitter.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Contenido TABS */}
                            <div className="space-y-8">

                                {/* TAB 1: PERFIL */}
                                {activeTab === 'profile' && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {/* Galería (Prioridad solicitada por el usuario) */}
                                        {petmate.galeria && petmate.galeria.length > 0 && (
                                            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                    <div className="p-1.5 bg-rose-100 rounded-lg text-rose-500">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    Galería de Fotos
                                                </h2>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                    {petmate.galeria.map((foto, index) => (
                                                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                                            <Image
                                                                src={foto}
                                                                alt={`Galería ${index}`}
                                                                fill
                                                                className="object-cover group-hover:scale-105 transition-transform"
                                                                unoptimized
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Sobre mí */}
                                        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
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

                                        {/* Videos Section */}
                                        {petmate.videos && petmate.videos.length > 0 && (
                                            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                    Videos
                                                    <span className="text-xs font-normal text-white bg-rose-500 px-2 py-0.5 rounded-full">NUEVO</span>
                                                </h2>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {petmate.videos.map((vid, i) => (
                                                        <div key={i} className="rounded-xl overflow-hidden bg-slate-100 aspect-video relative group">
                                                            {(vid.includes('youtube') || vid.includes('youtu.be')) ? (
                                                                <iframe
                                                                    src={`https://www.youtube.com/embed/${vid.split('v=')[1]?.split('&')[0] || vid.split('/').pop()}`}
                                                                    className="w-full h-full"
                                                                    allowFullScreen
                                                                    title={`Video ${i}`}
                                                                />
                                                            ) : (vid.includes('tiktok')) ? (
                                                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                                                    <a href={vid} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-rose-500">
                                                                        <span>Ver en TikTok</span> <span className="text-lg">↗</span>
                                                                    </a>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                                                    <a href={vid} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600">Ver Video</a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Detalles del Hogar */}
                                        {(petmate.tipo_vivienda || petmate.dimensiones_vivienda) && (
                                            <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                    <Home className="text-emerald-500" />
                                                    Espacio y Hogar
                                                </h2>

                                                <div className="space-y-6 mb-6">
                                                    {/* Row 1: Key Specs (Vivienda & Dimensiones) */}
                                                    <div className="grid sm:grid-cols-2 gap-4">
                                                        {petmate.tipo_vivienda && (
                                                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm border border-slate-100">
                                                                    {petmate.tipo_vivienda === 'casa' ? <Home size={24} /> : <Hotel size={24} />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Vivienda</p>
                                                                    <p className="text-slate-900 font-bold capitalize text-lg">{petmate.tipo_vivienda}</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {petmate.dimensiones_vivienda && (
                                                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm border border-slate-100">
                                                                    <Maximize size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dimensiones</p>
                                                                    <p className="text-slate-900 font-bold text-lg">{petmate.dimensiones_vivienda}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Row 2: Features Grid (2x2) */}
                                                    <div className="grid sm:grid-cols-2 gap-3">
                                                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${petmate.tiene_patio ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                                                            {petmate.tiene_patio ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} />}
                                                            <span className="font-medium">Patio o Jardín</span>
                                                        </div>
                                                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${petmate.tiene_malla ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                                                            {petmate.tiene_malla ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} />}
                                                            <span className="font-medium">Mallas de Seguridad</span>
                                                        </div>
                                                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${petmate.tiene_ninos ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                                                            {petmate.tiene_ninos ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} />}
                                                            <span className="font-medium">Niños en Casa</span>
                                                        </div>
                                                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${petmate.fumador ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                                                            {petmate.fumador ? <CheckCircle2 size={20} className="text-emerald-500" /> : <XCircle size={20} />}
                                                            <span className="font-medium">Fumador en Casa</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Fotos del Hogar */}
                                                {petmate.fotos_vivienda && petmate.fotos_vivienda.length > 0 && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                                        {petmate.fotos_vivienda.map((foto, i) => (
                                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group">
                                                                <Image
                                                                    src={foto}
                                                                    alt={`Foto hogar ${i}`}
                                                                    fill
                                                                    className="object-cover group-hover:scale-105 transition-transform"
                                                                    unoptimized
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        )}

                                        {/* Location Map Section */}
                                        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                Ubicación Aproximada
                                            </h2>
                                            {petmate.latitud && petmate.longitud ? (
                                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                                    <LocationMap
                                                        lat={petmate.latitud}
                                                        lng={petmate.longitud}
                                                        approximate={true}
                                                        radius={800}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                                    <p className="text-slate-500">
                                                        {petmate.comuna ? `Este sitter se encuentra en ${petmate.comuna}, ${petmate.region || ''}.` : "Ubicación no especificada."}
                                                    </p>
                                                </div>
                                            )}
                                        </section>

                                        {/* Información Adicional (Grid) */}
                                        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
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
                                        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                            <div className="flex items-center justify-between mb-6">
                                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                    Reseñas <span className="text-sm font-normal text-slate-500">({reviews.length})</span>
                                                </h2>
                                                {/* Button removed by user request: Reviews only after service */}
                                                {/* 
                                                <button
                                                    onClick={() => setIsReviewModalOpen(true)}
                                                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                                                >
                                                    Escribir una reseña
                                                </button> 
                                                */}
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
                                )}

                                {/* TAB 2: MIS SOLICITUDES */}
                                {activeTab === 'requests' && currentUserId && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {(myTripsWithSitter.length > 0 || loadingTrips) ? (
                                            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                                                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                                        </svg>
                                                    </div>
                                                    Mis Solicitudes con {petmate.nombre}
                                                </h2>

                                                {loadingTrips ? (
                                                    <div className="animate-pulse space-y-2">
                                                        <div className="h-10 bg-slate-100 rounded w-full"></div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {myTripsWithSitter.map(trip => (
                                                            <div key={trip.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors">
                                                                <div>
                                                                    <div className="font-bold text-slate-800">
                                                                        {trip.fecha_inicio && new Date(trip.fecha_inicio + "T12:00:00").toLocaleDateString("es-CL", { day: 'numeric', month: 'long' })}
                                                                        {" - "}
                                                                        {trip.fecha_fin && new Date(trip.fecha_fin + "T12:00:00").toLocaleDateString("es-CL", { day: 'numeric', month: 'long' })}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md uppercase text-[10px] font-bold tracking-wide text-slate-600">
                                                                            {trip.servicio}
                                                                        </span>
                                                                        {trip.perros > 0 && <span>{trip.perros} 🐶</span>}
                                                                        {trip.gatos > 0 && <span>{trip.gatos} 🐱</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end gap-2">
                                                                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${trip.estado === 'completado' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                        'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                                        }`}>
                                                                        {trip.estado === 'pendiente' || trip.estado === 'solicitado' ? 'ASIGNADO' : trip.estado.toUpperCase()}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleDeleteTrip(trip.id)}
                                                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                                        title="Eliminar solicitud"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        ) : (
                                            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                                <p className="text-slate-500">No tienes solicitudes activas con este cuidador.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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

                <BookingModal
                    isOpen={isBookingModalOpen}
                    onClose={() => setIsBookingModalOpen(false)}
                    sitterAuthId={petmate.auth_user_id}
                    sitterName={displayName || "el sitter"}
                    onSuccess={() => {
                        fetchMyTripsWithSitter();
                        // Opcional: toast success message handled in modal or here
                    }}
                />

                {/* Confirmation Modal */}
                {confirmConfig.isOpen && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6 text-center animate-in fade-in zoom-in duration-200">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{confirmConfig.title}</h3>
                            <p className="text-sm text-slate-500 mb-6">{confirmConfig.message}</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={closeConfirm}
                                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmConfig.onConfirm}
                                    className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-100 transition-colors"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </>
    );
}

export async function getServerSideProps(context: any) {
    const { id } = context.params;
    const soupUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!soupUrl) {
        return { props: { petmate: null, error: "Configuration Error: Missing API URL" } };
    }

    let supabaseAdmin;

    // Intentar usar Service Key para bypass RLS (necesario para "Vista Previa" de dueños)
    if (serviceKey) {
        try {
            supabaseAdmin = createClient(soupUrl, serviceKey);
        } catch (e) {
            console.error("Error creating Service Client:", e);
        }
    }

    // Fallback: Usar Anon Key (solo verá perfiles públicos/aprobados)
    if (!supabaseAdmin && anonKey) {
        console.warn("Service Role Key missing or invalid. Falling back to Anon Key.");
        try {
            supabaseAdmin = createClient(soupUrl, anonKey);
        } catch (e) {
            console.error("Error creating Anon Client:", e);
        }
    }

    if (!supabaseAdmin) {
        return { props: { petmate: null, error: "Configuration Error: No valid Supabase Key found" } };
    }

    // 1. Try fetching by ID (PK)
    let { data, error } = await supabaseAdmin
        .from("registro_petmate")
        .select("*")
        .eq("id", id)
        .single();

    // 2. If not found, try fetching by auth_user_id (Fallback for legacy links)
    if (!data && !error) {
        // Only try if id looks like a UUID to avoid syntax errors, though param is usually string
        const { data: authData, error: authError } = await supabaseAdmin
            .from("registro_petmate")
            .select("*")
            .eq("auth_user_id", id)
            .single();

        if (authData) {
            data = authData;
        }
    } else if (error && error.code === 'PGRST116') {
        // PGRST116 = JSON object requested, multiple (or no) rows returned
        // Try by auth_user_id
        const { data: authData } = await supabaseAdmin
            .from("registro_petmate")
            .select("*")
            .eq("auth_user_id", id)
            .single();

        if (authData) {
            data = authData;
            error = null;
        }
    }

    // If error is "No rows found" (PGRST116) AND we still rely on RLS/Client fetch:
    // We return null data but NO error string, so the client can try fetching with their session.
    if (error || !data) {
        console.log("SSR Fetch failed or empty (RLS or Wrong ID):", error?.message);
        return {
            props: {
                petmate: null,
                id: id,
                // Only return 'error' if it's NOT a "not found" issue, to allow client retry.
                error: null
            }
        };
    }

    // 4. Calculate Age if missing
    if (data && !data.edad && data.fecha_nacimiento) {
        try {
            const birthDate = new Date(data.fecha_nacimiento);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (!isNaN(age)) {
                data.edad = age;
            }
        } catch (e) {
            console.error("Error calculating age:", e);
        }
    }

    return {
        props: {
            petmate: data,
            id: id
        }
    };
}
