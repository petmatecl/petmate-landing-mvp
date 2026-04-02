import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { mapRpcToServiceResult } from '../../lib/serviceMapper';
import LoginRequiredModal from '../../components/Shared/LoginRequiredModal';
import ReviewModal from '../../components/Service/ReviewModal';
import ReviewForm from '../../components/Service/ReviewForm';
import ReviewSummary from '../../components/Service/ReviewSummary';
import ReviewList from '../../components/Service/ReviewList';
import PreguntasSection from '../../components/Service/PreguntasSection';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import {
    ShieldCheck, Star, User as UserIcon2,
    Home, Sun, PawPrint, Scissors, Truck, Stethoscope, Dumbbell, MapPin, Grid2x2, Camera,
    Briefcase, Award, Globe, Instagram,
    LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { getProxyImageUrl } from '../../lib/utils';

// Label map for category-specific detail fields
const DETALLE_LABELS: Record<string, Record<string, string>> = {
    hospedaje: {
        capacidad: 'Capacidad máxima', tipo_espacio: 'Tipo de espacio', tiene_patio: 'Patio o jardín',
        camara_vigilancia: 'Cámara de vigilancia', incluye_alimentacion: 'Incluye alimentación',
        incluye_paseos: 'Incluye paseos', mascotas_propias: 'Mascotas propias en el hogar',
        ninos_en_hogar: 'Niños en el hogar', fotos_durante_estadia: 'Envía fotos durante la estadía',
    },
    guarderia: {
        horario: 'Horario', capacidad: 'Capacidad máxima', tiene_patio: 'Patio o área exterior',
        actividades: 'Actividades incluidas', camara_vigilancia: 'Cámara de vigilancia',
        fotos_durante: 'Envía fotos / reporte del día',
    },
    paseos: {
        duracion_minutos: 'Duración del paseo', max_perros: 'Máx. perros por paseo',
        zona_paseo: 'Zona de paseo', lleva_gps: 'Usa GPS', envia_fotos: 'Envía fotos',
        razas_fuerza: 'Acepta razas de fuerza',
    },
    peluqueria: {
        modalidad: 'Modalidad', duracion_estimada: 'Duración estimada', que_incluye: 'Qué incluye',
        razas_especiales: 'Razas especiales / doble pelaje', mesa_hidraulica: 'Mesa hidráulica',
    },
    veterinario: {
        servicios_ofrecidos: 'Servicios ofrecidos', atiende_urgencias: 'Atiende urgencias',
        emite_boleta: 'Emite boleta', especialidades: 'Especialidades',
        examenes_disponibles: 'Exámenes disponibles',
    },
    adiestramiento: {
        metodo: 'Método', modalidad: 'Modalidad', duracion_sesion: 'Duración por sesión (min)',
        problemas_que_resuelve: 'Problemas que trabaja', certificaciones: 'Certificaciones',
    },
    traslado: {
        tipo_vehiculo: 'Tipo de vehículo', equipamiento: 'Equipamiento de seguridad',
        mascotas_grandes: 'Acepta mascotas grandes',
    },
    domicilio: {
        visitas_por_dia: 'Visitas por día', duracion_visita: 'Duración por visita (min)',
        que_incluye: 'Qué incluye la visita', envia_foto_reporte: 'Envía foto y reporte',
        administra_medicamentos: 'Administra medicamentos',
    },
    fotografia: {
        tipo_sesion: 'Tipo de sesión', duracion_sesion: 'Duración de la sesión',
        fotos_entregadas: 'Fotos entregadas', incluye_edicion: 'Incluye edición profesional',
        entrega_digitales: 'Entrega digital en alta resolución',
        acepta_multiples_mascotas: 'Sesiones con más de una mascota',
        equipo: 'Equipo fotográfico',
    },
};

interface ServiceDetailProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
}

const SLUG_ICONS: Record<string, LucideIcon> = {
    hospedaje: Home,
    guarderia: Sun,
    paseos: PawPrint,
    peluqueria: Scissors,
    traslado: Truck,
    veterinario: Stethoscope,
    adiestramiento: Dumbbell,
    domicilio: MapPin,
    fotografia: Camera,
};

export default function ServicioPage({ service, reviews, otrosServicios }: ServiceDetailProps) {
    const router = useRouter();
    const [fotoActiva, setFotoActiva] = useState(0);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [imgError, setImgError] = useState(false);

    // Use shared UserContext — avoids double session fetch
    const { user, isLoading: isUserLoading } = useUser();

    // Check if this user already reviewed this service
    const [yaEvaluo, setYaEvaluo] = useState(false);
    React.useEffect(() => {
        if (!user || !service?.id) return;
        supabase
            .from('evaluaciones')
            .select('id')
            .eq('servicio_id', service.id)
            .eq('usuario_id', user.id)
            .maybeSingle()
            .then(({ data }) => setYaEvaluo(!!data));
    }, [user, service?.id]);

    // Tracking: registrar vista al entrar a la pagina
    React.useEffect(() => {
        if (!service?.id) return;
        // Fire-and-forget — no bloquea el render
        void supabase.from('eventos_tracking').insert({
            tipo: 'vista_servicio',
            servicio_id: service.id,
            metadata: { source: typeof document !== 'undefined' ? document.referrer : '' },
        });
        // Incrementar contador de vistas en servicios_publicados
        void supabase.rpc('incrementar_vistas', { p_servicio_id: service.id });
    }, [service?.id]);

    // Derived state
    const proveedor = service.proveedores;
    const categoria = service.categorias_servicio;
    const coverImage = service.fotos?.[0] || proveedor.foto_perfil || 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1200';

    const totalReviews = reviews.length;

    // Track contact event (non-blocking)
    const trackContacto = (canal: 'mensaje' | 'whatsapp' | 'llamada' | 'email_copiado') => {
        if (!user) return;
        fetch('/api/contactos/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                auth_user_id: user.id,
                servicio_id: service.id,
                proveedor_id: proveedor.id,
                canal,
            }),
        }).catch(() => {}); // fire and forget
    };

    const handleChatClick = async () => {
        // Si el contexto aún está cargando la sesión, no actuar
        if (isUserLoading) return;

        // Verificar login con el contexto (ya cargado, sin latencia de red)
        if (!user) {
            setLoginModalOpen(true);
            return;
        }

        setIsChatLoading(true);
        trackContacto('mensaje');
        try {
            const userId = user.id;

            // Registrar evento click_chat
            void supabase.from('eventos_tracking').insert({
                tipo: 'click_chat',
                user_id: userId,
                servicio_id: service.id,
            });

            // Look for existing conversation
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('client_id', userId)
                .eq('sitter_id', proveedor.id)
                .eq('servicio_id', service.id)
                .maybeSingle();

            if (existingConv) {
                router.push(`/mensajes?id=${existingConv.id}`);
                return;
            }

            // Rate limit: max 10 new conversations per 24h
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count: convCount } = await supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', userId)
                .gte('created_at', since24h);

            const CONV_LIMIT = Number(process.env.NEXT_PUBLIC_CONV_DAILY_LIMIT ?? 10);
            if ((convCount ?? 0) >= CONV_LIMIT) {
                toast.error('Has iniciado muchas conversaciones hoy. Intenta de nuevo mañana.');
                return;
            }

            // Create new conversation
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    client_id: userId,
                    sitter_id: proveedor.id,
                    servicio_id: service.id,
                    proveedor_auth_id: proveedor.auth_user_id
                })
                .select()
                .single();

            if (error) throw error;
            if (newConv) {
                router.push(`/mensajes?id=${newConv.id}`);
            }

        } catch (error) {
            console.error('Error starting conversation:', error);
            toast.error('Hubo un error al intentar abrir el chat. Intenta de nuevo.');
        } finally {
            setIsChatLoading(false);
        }
    };

    const handleWhatsApp = (e?: React.MouseEvent) => {
        e?.preventDefault();
        if (!user) {
            setLoginModalOpen(true);
            return;
        }
        if (!proveedor.telefono) return;
        // Registrar evento click_whatsapp
        void supabase.from('eventos_tracking').insert({
            tipo: 'click_whatsapp',
            servicio_id: service.id,
            user_id: user.id,
            metadata: { proveedor_id: proveedor.id },
        });
        trackContacto('whatsapp');
        const phone = proveedor.telefono.replace(/\D/g, '');
        const text = encodeURIComponent(`Hola ${proveedor.nombre}, te contacto desde Pawnecta por tu servicio de "${service.titulo}".`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    const handleProtectedLinkClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            setLoginModalOpen(true);
        }
    };

    const handleCallClick = (e: React.MouseEvent) => {
        if (!user) { e.preventDefault(); setLoginModalOpen(true); return; }
        trackContacto('llamada');
    };

    const handleLeaveReview = async () => {
        if (yaEvaluo) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoginModalOpen(true);
            return;
        }

        // Verificar si ha contactado al proveedor (por chat)
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', session.user.id)
            .eq('sitter_id', proveedor.id)
            .limit(1)
            .maybeSingle();

        // Verificar si clickeó WhatsApp (si aplica)
        let hasWs = false;
        if (!conv) {
            const { data: ws } = await supabase
                .from('eventos_tracking')
                .select('id')
                .eq('tipo', 'click_whatsapp')
                .eq('user_id', session.user.id)
                .eq('servicio_id', service.id)
                .limit(1)
                .maybeSingle();
            hasWs = !!ws;
        }

        if (!conv && !hasWs) {
            toast.error('Solo puedes evaluar a proveedores que hayas contactado previamente (por mensaje o WhatsApp).');
            return;
        }

        setReviewModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{service.titulo} - {proveedor.nombre} | Pawnecta</title>
                <meta name="description" content={service.descripcion?.substring(0, 160)} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Service',
                            name: service.titulo,
                            description: service.descripcion,
                            provider: {
                                '@type': 'Person',
                                name: `${proveedor.nombre} ${proveedor.apellido_p}`,
                                image: proveedor.foto_perfil || undefined,
                            },
                            areaServed: { '@type': 'City', name: proveedor.comuna },
                            offers: {
                                '@type': 'Offer',
                                price: service.precio_desde,
                                priceCurrency: 'CLP',
                            },
                            ...(service.total_evaluaciones > 0 ? {
                                aggregateRating: {
                                    '@type': 'AggregateRating',
                                    ratingValue: service.rating_promedio,
                                    reviewCount: service.total_evaluaciones,
                                }
                            } : {}),
                        })
                    }}
                />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Back Link */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-medium transition-colors mb-6"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    Volver
                </button>

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* COLUMNA IZQUIERDA: DETALLES */}
                    <div className="w-full lg:w-2/3 flex flex-col gap-8">

                        {/* Galeria / Portada */}
                        <div className="relative">
                            {/* Foto principal */}
                            <div className="w-full h-[340px] md:h-[500px] bg-slate-200 rounded-none lg:rounded-2xl overflow-hidden relative shadow-sm -mx-4 sm:-mx-6 lg:mx-0 w-screen sm:w-[calc(100%+3rem)] lg:w-full">
                                {imgError ? (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                        {(() => { const I = SLUG_ICONS[categoria?.slug] ?? Grid2x2; return <I size={64} className="text-slate-300" />; })()}
                                    </div>
                                ) : (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={service.fotos?.[fotoActiva] || proveedor.foto_perfil || coverImage}
                                        alt={service.titulo}
                                        className="w-full h-full object-cover transition-opacity duration-200"
                                        onError={() => setImgError(true)}
                                    />
                                )}

                                {/* Overlay título */}
                                {!imgError && (
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-6 pt-16 pb-5">
                                        <h1 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow">
                                            {service.titulo}
                                        </h1>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-white/80 text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            {proveedor.comuna}
                                        </div>
                                    </div>
                                )}

                                {/* Badge categoría */}
                                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10 bg-white/90 backdrop-blur-md text-slate-800 text-sm font-bold px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                                    {(() => { const I = SLUG_ICONS[categoria?.slug] ?? Grid2x2; return <I size={16} className="text-slate-600" />; })()}
                                    <span>{categoria.nombre}</span>
                                </div>

                                {/* Flechas de navegación — solo si hay más de 1 foto */}
                                {service.fotos?.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setFotoActiva(i => (i - 1 + service.fotos.length) % service.fotos.length)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-colors z-10"
                                            aria-label="Foto anterior"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setFotoActiva(i => (i + 1) % service.fotos.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-colors z-10"
                                            aria-label="Foto siguiente"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>

                                        {/* Contador */}
                                        <div className="absolute bottom-4 right-4 z-10 bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                            {fotoActiva + 1} / {service.fotos.length}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Thumbnails — solo si hay 2+ fotos */}
                            {service.fotos?.length > 1 && (
                                <div className="flex gap-2 mt-3 overflow-x-auto pb-1 px-4 sm:px-6 lg:px-0">
                                    {service.fotos.map((foto: string, i: number) => (
                                        <button
                                            key={i}
                                            onClick={() => setFotoActiva(i)}
                                            className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${fotoActiva === i ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-90'
                                                }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={foto} alt="" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Encabezado del Servicio */}
                        {imgError && (
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
                                    {service.titulo}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-slate-600 text-sm md:text-base font-medium">
                                    <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-lg">
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        {proveedor.comuna}
                                    </span>
                                    {totalReviews > 0 && (
                                        <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-lg">
                                            <Star size={14} className="text-emerald-500 fill-emerald-500" />
                                            {totalReviews} evaluaci{totalReviews !== 1 ? 'ones' : 'ón'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mascotas Aceptadas */}
                        {service.tipos_mascota && service.tipos_mascota.length > 0 && (
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Tipos de mascota</h3>
                                <div className="flex flex-wrap gap-2">
                                    {service.tipos_mascota.map((tm: string) => (
                                        <div key={tm} className="bg-slate-50 text-slate-700 font-medium border border-slate-200 px-4 py-2 rounded-full uppercase text-sm tracking-wide">
                                            {tm === 'perros' && '🐕 Perros'}
                                            {tm === 'gatos' && '🐈 Gatos'}
                                            {tm === 'exoticos' && '🦜 Exóticos'}
                                            {!['perros', 'gatos', 'exoticos'].includes(tm) && `🐾 ${tm}`}
                                        </div>
                                    ))}
                                    {service.tamanos_permitidos?.length > 0 && (
                                        <div className="bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 px-4 py-2 rounded-full text-sm">
                                            Tallas: {service.tamanos_permitidos.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Descripcion */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Acerca del Servicio
                            </h3>
                            <div className="prose prose-slate prose-emerald max-w-none break-words whitespace-pre-wrap text-slate-600 leading-relaxed">
                                {service.descripcion}
                            </div>
                        </div>

                        {/* Detalles específicos de categoría */}
                        {service.detalles && Object.keys(service.detalles).length > 0 && (() => {
                            const slug = categoria?.slug ?? '';
                            const labels = DETALLE_LABELS[slug] ?? {};
                            const entries = Object.entries(service.detalles).filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== 0);
                            if (entries.length === 0) return null;
                            return (
                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-2">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        Información del servicio
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {entries.map(([key, val]) => {
                                            const label = labels[key] || key.replace(/_/g, ' ');
                                            const isBoolean = typeof val === 'boolean';
                                            if (isBoolean && !val) return null;
                                            return (
                                                <div key={key} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                                    {isBoolean ? (
                                                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 font-medium capitalize">{label}</p>
                                                        {!isBoolean && <p className="text-sm text-slate-800 font-semibold mt-0.5 break-words">{String(val)}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Comunas de cobertura */}
                        {service.comunas_cobertura && service.comunas_cobertura.length > 0 && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <MapPin size={22} className="text-emerald-500" />
                                    Zona de cobertura
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {service.comunas_cobertura.map((c: string) => (
                                        <span key={c} className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-medium px-3 py-1.5 rounded-full">
                                            <MapPin size={12} />
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Disponibilidad */}
                        {service.disponibilidad && (() => {
                            // Try parsing as JSON (new structured format)
                            let parsed: Record<string, any> | null = null;
                            try { parsed = JSON.parse(service.disponibilidad); } catch {}

                            if (parsed && typeof parsed === 'object') {
                                const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                                const activeDays = days.filter(d => parsed![d]?.activo);
                                if (activeDays.length === 0) return null;
                                return (
                                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Disponibilidad
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {days.map(dia => {
                                                const d = parsed![dia];
                                                if (!d?.activo) return null;
                                                return (
                                                    <div key={dia} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                        <span className="text-sm font-semibold text-slate-700">{dia}</span>
                                                        <span className="text-sm text-slate-500">{d.desde} — {d.hasta}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }
                            // Fallback: plain text
                            return (
                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        Disponibilidad
                                    </h3>
                                    <p className="text-sm text-slate-600">{service.disponibilidad}</p>
                                </div>
                            );
                        })()}

                        {/* Que Incluye */}
                        {service.que_incluye && service.que_incluye.length > 0 && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    ¿Qué incluye?
                                </h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {service.que_incluye.map((inc: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-slate-600">
                                            <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            <span>{inc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {proveedor.galeria && proveedor.galeria.length > 0 && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    {/* Icono cámara */}
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                    Fotos del espacio
                                </h3>

                                {proveedor.galeria.length === 1 ? (
                                    // Una foto — full width
                                    <div className="w-full h-64 rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proveedor.galeria[0]} alt="Espacio del proveedor"
                                            className="w-full h-full object-cover" />
                                    </div>
                                ) : proveedor.galeria.length <= 3 ? (
                                    // 2-3 fotos — grid horizontal
                                    <div className={`grid gap-2 ${proveedor.galeria.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                        {proveedor.galeria.map((url: string, i: number) => (
                                            <div key={i} className="h-48 rounded-xl overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    // 4+ fotos — 1 grande izquierda + grid 2x2 derecha
                                    <div className="grid grid-cols-2 gap-2 h-64">
                                        <div className="rounded-xl overflow-hidden">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={proveedor.galeria[0]} alt=""
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        </div>
                                        <div className="grid grid-rows-2 gap-2">
                                            <div className="rounded-xl overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={proveedor.galeria[1]} alt=""
                                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                            </div>
                                            <div className="relative rounded-xl overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={proveedor.galeria[2]} alt=""
                                                    className="w-full h-full object-cover" />
                                                {proveedor.galeria.length > 3 && (
                                                    <Link href={`/proveedor/${proveedor.id}`}
                                                        className="absolute inset-0 bg-black/55 flex items-center justify-center hover:bg-black/65 transition-colors">
                                                        <span className="text-white font-bold text-lg">
                                                            +{proveedor.galeria.length - 3} fotos
                                                        </span>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Link href={`/proveedor/${proveedor.id}`}
                                    className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">
                                    Ver perfil completo de {proveedor.nombre}
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                </Link>
                            </div>
                        )}

                        {/* Evaluaciones */}

                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Evaluaciones
                                </h3>
                                <button
                                    onClick={handleLeaveReview}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-4 rounded-xl transition-colors text-sm"
                                >
                                    Dejar mi evaluación
                                </button>
                            </div>

                            <div className="mb-10">
                                <ReviewSummary servicioId={service.id} />
                            </div>

                            {totalReviews > 0 ? (
                                <div>
                                    {/* Lista de Reviews */}
                                    <ReviewList servicioId={service.id} />
                                </div>
                            ) : null}

                        </div>

                        {/* Formulario de Evaluación (Solo Autenticados) */}
                        {user && (
                            <div className="mt-8">
                                {yaEvaluo ? (
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
                                        <Star size={16} className="fill-emerald-500 text-emerald-500" />
                                        Ya dejaste una evaluación para este servicio
                                    </div>
                                ) : (
                                    <ReviewForm
                                        servicioId={service.id}
                                        proveedorId={proveedor.id}
                                        servicioTitulo={service.titulo}
                                        onSuccess={() => {
                                            setYaEvaluo(true);
                                        }}
                                    />
                                )}
                            </div>
                        )}

                        {/* Preguntas al proveedor */}
                        <PreguntasSection
                            servicioId={service.id}
                            proveedorId={proveedor.id}
                            proveedorAuthId={proveedor.auth_user_id}
                        />

                    </div>

                    {/* COLUMNA DERECHA: SIDEBAR (Sticky) */}
                    <div className="w-full lg:w-1/3 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 flex flex-col gap-5">

                            {/* PRECIO — protagonista */}
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Desde</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-emerald-700">
                                        ${service.precio_desde?.toLocaleString("es-CL")}
                                    </span>
                                    <span className="text-slate-500 font-medium text-sm">/{service.unidad_precio}</span>
                                </div>
                                {/* Rating inline si hay evaluaciones */}
                                {totalReviews > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                        <span className="text-sm font-bold text-slate-800">
                                            {(reviews.reduce((a: number, r: any) => a + r.rating, 0) / totalReviews).toFixed(1)}
                                        </span>
                                        <span className="text-sm text-slate-500">({totalReviews} evaluaciones)</span>
                                    </div>
                                )}
                            </div>

                            {service.descripcion && (
                                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 pb-1">
                                    {service.descripcion}
                                </p>
                            )}

                            {/* CTAs — inmediatos */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleChatClick}
                                    disabled={isChatLoading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-base disabled:opacity-60"
                                >
                                    {isChatLoading
                                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Enviar Mensaje</>
                                    }
                                </button>

                                {proveedor.mostrar_whatsapp && proveedor.telefono && (
                                    <button onClick={handleWhatsApp}
                                        className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        WhatsApp
                                    </button>
                                )}

                                {proveedor.mostrar_telefono && proveedor.telefono && (
                                    <a href={`tel:${proveedor.telefono}`}
                                        onClick={handleCallClick}
                                        className="w-full border-2 border-slate-200 hover:border-emerald-400 text-slate-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        Llamar
                                    </a>
                                )}
                            </div>

                            {/* ── PROVEEDOR ─────────────────────────────────────── */}
                            <div className="border-t border-slate-100 pt-6 space-y-4">

                                {/* Foto + nombre — protagonista */}
                                <div className="flex flex-col items-center text-center">
                                    <Link href={`/proveedor/${proveedor.id}`} className="group">
                                        <div className="w-24 h-24 rounded-full border-3 border-emerald-200 overflow-hidden bg-slate-100 mb-4 group-hover:border-emerald-400 transition-colors shadow-md">
                                            {proveedor.foto_perfil
                                                ? <img src={getProxyImageUrl(proveedor.foto_perfil) || ''} alt={proveedor.nombre} className="w-full h-full object-cover" />
                                                : <svg className="w-full h-full text-slate-400 p-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            }
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="font-bold text-slate-900 text-base">
                                            {proveedor.nombre} {proveedor.apellido_p}
                                        </span>
                                        {proveedor.rut_verificado && (
                                            <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">{proveedor.comuna}</p>
                                    <Link
                                        href={`/proveedor/${proveedor.id}`}
                                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-5 py-2 rounded-full transition-colors"
                                    >
                                        Ver perfil completo
                                    </Link>
                                </div>

                                {/* Sobre el proveedor — siempre visible, con fallback */}
                                <div className="space-y-2">
                                    {proveedor.anios_experiencia && parseInt(proveedor.anios_experiencia) > 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="font-medium">{proveedor.anios_experiencia} años de experiencia</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>Proveedor verificado en Pawnecta</span>
                                        </div>
                                    )}

                                    {proveedor.certificaciones && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <span className="font-medium leading-tight">{proveedor.certificaciones}</span>
                                        </div>
                                    )}

                                    {proveedor.primera_ayuda && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-[9px] font-black">+</span>
                                            <span className="font-medium">Primeros Auxilios</span>
                                        </div>
                                    )}

                                    {proveedor.tipo_entidad === 'empresa' && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <Briefcase size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-bold text-slate-800 block">{proveedor.nombre_fantasia || proveedor.razon_social}</span>
                                                {proveedor.giro && <span className="text-xs text-slate-400">{proveedor.giro}</span>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                        <span>En Pawnecta desde {new Date(proveedor.created_at ?? Date.now()).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {/* Contacto y redes */}
                                {(proveedor.email_publico || proveedor.sitio_web || proveedor.instagram) && (
                                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                        {proveedor.email_publico && proveedor.mostrar_email && (
                                            <a href={`mailto:${proveedor.email_publico}`}
                                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-600 transition-colors font-medium truncate">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                                {proveedor.email_publico}
                                            </a>
                                        )}
                                        {proveedor.sitio_web && (
                                            <a href={proveedor.sitio_web.startsWith('http') ? proveedor.sitio_web : `https://${proveedor.sitio_web}`}
                                                target="_blank" rel="noopener noreferrer" onClick={handleProtectedLinkClick}
                                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-600 transition-colors font-medium truncate">
                                                <Globe size={14} className="shrink-0" />
                                                {proveedor.sitio_web.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                        {proveedor.instagram && (
                                            <a href={`https://instagram.com/${proveedor.instagram.replace('@', '')}`}
                                                target="_blank" rel="noopener noreferrer" onClick={handleProtectedLinkClick}
                                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-pink-500 transition-colors font-medium">
                                                <Instagram size={14} className="shrink-0" />
                                                @{proveedor.instagram.replace('@', '')}
                                            </a>
                                        )}
                                    </div>
                                )}

                            </div>

                        </div>

                    </div>
                </div>

                {/* Otros proveedores — ancho completo */}
                {otrosServicios && otrosServicios.length > 0 && (
                    <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">
                            Otros proveedores de {categoria.nombre} en {proveedor.comuna}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {otrosServicios.map(s => (
                                <ServiceCard key={s.servicio_id} service={s} />
                            ))}
                        </div>
                    </section>
                )}
            </div>

            <LoginRequiredModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
            />
            <ReviewModal
                isOpen={reviewModalOpen}
                onClose={() => setReviewModalOpen(false)}
                servicioId={service.id}
                proveedorId={proveedor.id}
                serviceTitle={service.titulo}
            />
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        // Fetch Service details
        const { data: service, error: serviceError } = await supabase
            .from('servicios_publicados')
            .select(`
                *,
                proveedores!inner(
                    id, auth_user_id, nombre, apellido_p, rut_verificado, foto_perfil, comuna, mostrar_whatsapp, mostrar_telefono, telefono, created_at,
                    tipo_entidad, razon_social, rut_empresa, nombre_fantasia, giro, anios_experiencia, certificaciones, sitio_web, instagram, primera_ayuda, miembro_asociacion, galeria
                ),
                categorias_servicio!inner(
                    nombre, slug, icono
                )
            `)
            .eq('id', id)
            .eq('activo', true)
            .eq('proveedores.estado', 'aprobado')
            .maybeSingle();

        if (serviceError || !service) {
            console.error("Servicio no encontrado o inactivo", serviceError);
            return {
                redirect: {
                    destination: '/explorar',
                    permanent: false,
                },
            };
        }

        // Fetch Reviews
        const { data: reviews, error: reviewsError } = await supabase
            .from('evaluaciones')
            .select(`
                *,
                usuarios_buscadores(nombre)
            `)
            .eq('servicio_id', id)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false });

        // Fetch servicios similares: misma categoría, misma comuna, distinto proveedor
        const categoriaSlug = service.categorias_servicio?.slug;
        const comuna = service.proveedores?.comuna;
        const proveedorId = service.proveedores?.id;
        let otrosServicios: ServiceResult[] = [];

        if (categoriaSlug && comuna) {
            const { data: similarRaw } = await supabase.rpc('buscar_servicios', {
                p_categoria_slug: categoriaSlug,
                p_comuna: comuna,
                p_limit: 6,
                p_offset: 0,
            });

            otrosServicios = (similarRaw || [])
                .filter((s: any) => s.proveedor_id !== proveedorId && s.id !== id)
                .slice(0, 3)
                .map(mapRpcToServiceResult);
        }

        return {
            props: {
                service,
                reviews: reviews || [],
                otrosServicios,
            }
        };

    } catch (e) {
        console.error("Error en getServerSideProps de servicio", e);
        return {
            redirect: {
                destination: '/explorar',
                permanent: false,
            },
        };
    }
};
