import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import LoginRequiredModal from '../Shared/LoginRequiredModal';
import ExampleCTAModal, { ExampleAction } from './ExampleCTAModal';
import EmptyFieldState from './EmptyFieldState';
import VisitCounter from '../Shared/VisitCounter';
import PhoneRevealButton from './PhoneRevealButton';
import FavoritoButton from '../Shared/FavoritoButton';
import ReviewModal from '../Service/ReviewModal';
import ReviewForm from '../Service/ReviewForm';
import ReviewSummary from '../Service/ReviewSummary';
import ReviewList from '../Service/ReviewList';
import PreguntasSection from '../Service/PreguntasSection';
import ServiceCard, { ServiceResult } from '../Explore/ServiceCard';
import Breadcrumb from '../Shared/Breadcrumb';
import { instagramUsernameFromUrl } from '../../lib/validators';
import { CAMPOS_POR_CATEGORIA, getCampoMeta, formatValorCampo } from '../../lib/camposPorCategoria';
import {
    ShieldCheck, Star, User as UserIcon2,
    Home, Sun, PawPrint, Scissors, Truck, Stethoscope, Dumbbell, MapPin, Grid2x2, Camera,
    Briefcase, Award, Globe, Instagram, BadgeCheck, Sparkles, X,
    Dog, Cat, FileText, Pencil,
    LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { getProxyImageUrl } from '../../lib/utils';

// Sprint 4 Fase 1: el mapa local DETALLE_LABELS desaparecio. La fuente unica
// de labels/tipos por (categoria, key) vive en lib/camposPorCategoria.ts; el
// render usa getCampoMeta + formatValorCampo. Si el campo no existe en la
// definicion canonica (key legacy o de otra categoria), getCampoMeta devuelve
// undefined y caemos a `key.replace(/_/g, ' ')` para el label.

export interface ServiceDetailViewProps {
    service: any;
    reviews: any[];
    otrosServicios: ServiceResult[];
    isExample?: boolean;
}

const SLUG_ICONS: Record<string, LucideIcon> = {
    cuidado: Home,
    guarderia: Sun,
    paseos: PawPrint,
    peluqueria: Scissors,
    traslado: Truck,
    veterinario: Stethoscope,
    adiestramiento: Dumbbell,
    fotografia: Camera,
    // Aliases backwards-compat para servicios legacy con slug viejo.
    hospedaje: Home,
    domicilio: MapPin,
};

// Helper local: texto con toggle expand/collapse. Patron char-based (no
// DOM measurement) — predictible. Threshold por defecto 400 chars,
// override-eable per-call. Mismo patron que BioExpandible de
// pages/proveedor/[id].tsx; se duplica intencionalmente para no acoplar
// los dos archivos por un wrapper trivial.
function ExpandibleText({ text, maxChars = 400 }: { text: string; maxChars?: number }) {
    const [expanded, setExpanded] = useState(false);
    const needsToggle = text.length > maxChars;
    const shown = expanded || !needsToggle ? text : text.slice(0, maxChars).trimEnd() + '…';
    return (
        <div>
            <div className="prose prose-slate prose-emerald max-w-none break-words whitespace-pre-wrap text-slate-600 leading-relaxed">
                {shown}
            </div>
            {needsToggle && (
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                    {expanded ? 'Ver menos ↑' : 'Ver más ↓'}
                </button>
            )}
        </div>
    );
}

export default function ServiceDetailView({ service, reviews, otrosServicios, isExample = false }: ServiceDetailViewProps) {
    const router = useRouter();
    const [fotoActiva, setFotoActiva] = useState(0);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [exampleModalAction, setExampleModalAction] = useState<ExampleAction | null>(null);
    const [exampleBannerVisible, setExampleBannerVisible] = useState(true);

    // Reset banner visibility when navigating to a different service
    React.useEffect(() => {
        setExampleBannerVisible(true);
    }, [service?.id]);

    // Use shared UserContext — avoids double session fetch
    const { user, isLoading: isUserLoading } = useUser();

    // Check if this user already reviewed this service
    const [yaEvaluo, setYaEvaluo] = useState(false);
    React.useEffect(() => {
        if (isExample || !user || !service?.id) return;
        supabase
            .from('evaluaciones')
            .select('id')
            .eq('servicio_id', service.id)
            .eq('usuario_id', user.id)
            .maybeSingle()
            .then(({ data }) => setYaEvaluo(!!data));
    }, [isExample, user, service?.id]);

    // Tracking: registrar vista al entrar a la pagina
    React.useEffect(() => {
        if (isExample || !service?.id) return;
        // Fire-and-forget — no bloquea el render
        void supabase.from('eventos_tracking').insert({
            tipo: 'vista_servicio',
            servicio_id: service.id,
            metadata: { source: typeof document !== 'undefined' ? document.referrer : '' },
        });
        // Incrementar contador de vistas en servicios_publicados
        void supabase.rpc('incrementar_vistas', { p_servicio_id: service.id });
    }, [isExample, service?.id]);

    // Derived state
    const proveedor = service.proveedores;
    const categoria = service.categorias_servicio;
    const isOwner = !isExample && !!user && user.id === proveedor.auth_user_id;
    const coverImage = service.fotos?.[0] || proveedor.foto_perfil || 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=1200';

    const totalReviews = reviews.length;

    // Track contact event (non-blocking)
    const trackContacto = async (canal: 'mensaje' | 'whatsapp' | 'llamada' | 'email_copiado') => {
        if (!user) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            fetch('/api/contactos/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    servicio_id: service.id,
                    proveedor_id: proveedor.id,
                    canal,
                }),
            }).catch(() => {});
        } catch {}
    };

    const handleChatClick = async () => {
        if (isExample) { setExampleModalAction('mensaje'); return; }
        setIsChatLoading(true);

        // Fresh session check — context might be stale
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            setIsChatLoading(false);
            setLoginModalOpen(true);
            return;
        }

        trackContacto('mensaje');
        try {
            const userId = session.user.id;

            // Registrar evento click_chat
            void supabase.from('eventos_tracking').insert({
                tipo: 'click_chat',
                user_id: userId,
                servicio_id: service.id,
            });

            // Look for existing conversation (sitter_id = auth_user_id, not proveedores.id)
            const proveedorAuthId = proveedor.auth_user_id;
            const { data: existingConv } = await supabase
                .from('conversations')
                .select('id')
                .eq('client_id', userId)
                .eq('sitter_id', proveedorAuthId)
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

            // Create new conversation (sitter_id must be auth.users.id)
            const { data: newConv, error } = await supabase
                .from('conversations')
                .insert({
                    client_id: userId,
                    sitter_id: proveedorAuthId,
                    servicio_id: service.id,
                    proveedor_auth_id: proveedorAuthId
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

    const handleWhatsApp = async (e?: React.MouseEvent) => {
        e?.preventDefault();
        if (isExample) { setExampleModalAction('whatsapp'); return; }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            setLoginModalOpen(true);
            return;
        }
        if (!proveedor.telefono) return;
        void supabase.from('eventos_tracking').insert({
            tipo: 'click_whatsapp',
            servicio_id: service.id,
            user_id: session.user.id,
            metadata: { proveedor_id: proveedor.id },
        });
        trackContacto('whatsapp');
        const phone = proveedor.telefono.replace(/\D/g, '');
        const text = encodeURIComponent(`Hola ${proveedor.nombre}, te contacto desde Pawnecta por tu servicio de "${service.titulo}".`);
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    const handleProtectedLinkClick = (e: React.MouseEvent) => {
        if (isExample) { e.preventDefault(); setExampleModalAction('mensaje'); return; }
        if (!user) {
            e.preventDefault();
            setLoginModalOpen(true);
        }
    };

    const handleLeaveReview = async () => {
        if (isExample) { setExampleModalAction('evaluar'); return; }
        if (yaEvaluo) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            setLoginModalOpen(true);
            return;
        }

        // Verificar si ha contactado al proveedor (por chat)
        // sitter_id references auth.users.id, not proveedores.id
        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', session.user.id)
            .eq('sitter_id', proveedor.auth_user_id)
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
        // min-h-screen ya lo aplica el wrapper de _app.tsx (`min-h-screen flex
        // flex-col`); duplicarlo aca + pb-20 dejaba ~80-160px extra de gris
        // entre el contenido y el footer (el footer ya tiene mt-20 propio).
        // Mantengo bg-slate-50 porque es el background visual de la ficha.
        // pb-24 lg:pb-0 reserva espacio para el sticky CTA bar mobile
        // (h ~64px + safe area) que se monta abajo; en desktop no hay bar.
        <div className="bg-slate-50 pb-24 lg:pb-0">
            {isExample && exampleBannerVisible && (
                <div role="region" aria-label="Aviso proveedor de ejemplo" style={{ top: 'var(--header-height, 105px)' }} className="sticky z-30 bg-amber-100 text-amber-900 border-b border-amber-300 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Sparkles size={16} aria-hidden="true" className="shrink-0" />
                            <p className="text-sm truncate">
                                <strong className="font-semibold uppercase tracking-widest text-xs">Ejemplo:</strong>{' '}
                                Este proveedor es ficticio. Para contactar a uno real, regístrate. Es gratis.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Link
                                href="/register?rol=usuario"
                                className="inline-flex items-center bg-amber-900 text-amber-50 font-medium text-xs uppercase tracking-widest px-3 py-1.5 rounded-md hover:bg-amber-800 transition-colors whitespace-nowrap"
                            >
                                Registrarme →
                            </Link>
                            <button
                                type="button"
                                onClick={() => setExampleBannerVisible(false)}
                                aria-label="Cerrar aviso de ejemplo"
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-amber-700 hover:text-amber-900 transition-colors"
                            >
                                <X size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isOwner && (
                <div role="region" aria-label="Vista de previsualización del proveedor" className="sticky top-0 z-30 bg-slate-700 text-white border-b border-slate-600 shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm sm:text-base font-medium text-center sm:text-left">
                            Estás viendo tu servicio como lo ven los tutores. Los cambios se hacen desde tu panel.
                        </p>
                        <Link
                            href="/proveedor?tab=servicios"
                            className="shrink-0 inline-flex items-center bg-white text-slate-700 font-medium text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors whitespace-nowrap"
                        >
                            Editar mi servicio →
                        </Link>
                    </div>
                </div>
            )}
            <Head>
                <title>{service.titulo} - {proveedor.nombre_publico || proveedor.nombre} | Pawnecta</title>
                <meta name="description" content={service.descripcion?.substring(0, 160)} />
                <link rel="canonical" href={`https://www.pawnecta.com/servicio/${service.id}`} />
                <meta property="og:title" content={`${service.titulo} | Pawnecta`} />
                <meta property="og:description" content={service.descripcion?.substring(0, 160)} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={`https://www.pawnecta.com/servicio/${service.id}`} />
                <meta property="og:image" content={service.fotos?.[0] || 'https://www.pawnecta.com/og-image.jpg'} />
                <meta property="og:locale" content="es_CL" />
                <meta property="og:site_name" content="Pawnecta" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={`${service.titulo} | Pawnecta`} />
                <meta name="twitter:description" content={service.descripcion?.substring(0, 160)} />
                <meta name="twitter:image" content={service.fotos?.[0] || 'https://www.pawnecta.com/og-image.jpg'} />
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
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            itemListElement: [
                                { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.pawnecta.com/' },
                                { '@type': 'ListItem', position: 2, name: 'Explorar', item: 'https://www.pawnecta.com/explorar' },
                                { '@type': 'ListItem', position: 3, name: categoria.nombre, item: `https://www.pawnecta.com/explorar?categoria=${categoria.slug}` },
                                { '@type': 'ListItem', position: 4, name: service.titulo },
                            ],
                        })
                    }}
                />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Breadcrumb */}
                <Breadcrumb items={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Explorar', href: '/explorar' },
                    { label: categoria.nombre, href: `/explorar?categoria=${categoria.slug}` },
                    { label: service.titulo },
                ]} />

                <div className="flex flex-col lg:flex-row gap-8">

                    {/* COLUMNA IZQUIERDA: DETALLES */}
                    <div className="w-full lg:w-2/3 flex flex-col gap-8">

                        {/* Galeria / Portada */}
                        <section
                            role="region"
                            aria-roledescription="carousel"
                            aria-label="Fotos del servicio"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (!service.fotos || service.fotos.length <= 1) return;
                                if (e.key === 'ArrowLeft') {
                                    e.preventDefault();
                                    setFotoActiva(i => (i - 1 + service.fotos.length) % service.fotos.length);
                                } else if (e.key === 'ArrowRight') {
                                    e.preventDefault();
                                    setFotoActiva(i => (i + 1) % service.fotos.length);
                                }
                            }}
                            className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:rounded-2xl"
                        >
                            {/* Foto principal */}
                            <div
                                id="gallery-main-image"
                                aria-live="polite"
                                className="w-full h-[340px] md:h-[500px] bg-slate-200 rounded-none lg:rounded-2xl overflow-hidden relative shadow-sm -mx-4 sm:-mx-6 lg:mx-0 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] lg:w-full"
                            >
                                {imgError ? (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                        {(() => { const I = SLUG_ICONS[categoria?.slug] ?? Grid2x2; return <I size={64} className="text-slate-300" />; })()}
                                    </div>
                                ) : (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={service.fotos?.[fotoActiva] || proveedor.foto_perfil || coverImage}
                                        alt={service.fotos?.length > 1 ? `Foto ${fotoActiva + 1} de ${service.fotos.length} — ${service.titulo}` : service.titulo}
                                        className="w-full h-full object-cover transition-opacity duration-200"
                                        onError={() => setImgError(true)}
                                    />
                                )}

                                {/* Overlay título */}
                                {!imgError && (
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-6 pt-16 pb-5">
                                        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight drop-shadow">
                                            {service.titulo}
                                        </h1>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-white/80 text-sm font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            {proveedor.comuna}
                                        </div>
                                    </div>
                                )}

                                {/* Overlay para owner sin fotos del servicio */}
                                {isOwner && (!service.fotos || service.fotos.length === 0) && (
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 px-6 text-center">
                                        <Link
                                            href="/proveedor?tab=servicios"
                                            className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-700 text-sm font-semibold px-5 py-3 rounded-xl shadow-lg hover:bg-white transition-colors"
                                        >
                                            Agrega fotos para destacar tu servicio →
                                        </Link>
                                    </div>
                                )}

                                {/* Flechas de navegación — solo si hay más de 1 foto */}
                                {service.fotos?.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setFotoActiva(i => (i - 1 + service.fotos.length) % service.fotos.length)}
                                            aria-controls="gallery-main-image"
                                            aria-label="Foto anterior"
                                            className="absolute left-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-colors z-10"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setFotoActiva(i => (i + 1) % service.fotos.length)}
                                            aria-controls="gallery-main-image"
                                            aria-label="Foto siguiente"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-colors z-10"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                        </button>

                                        {/* Contador */}
                                        <div className="absolute bottom-4 right-4 z-10 bg-black/50 text-white text-xs font-medium px-3 py-1.5 rounded-full">
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
                                            aria-label={`Ver foto ${i + 1}`}
                                            aria-current={fotoActiva === i ? 'true' : undefined}
                                            className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${fotoActiva === i ? 'border-emerald-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-90'
                                                }`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={foto} alt={`Miniatura foto ${i + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Contador de visitas + botón favorito */}
                        <div className="flex items-center justify-between gap-3 px-1">
                            {(service.visitas_total ?? 0) > 0 ? (
                                <VisitCounter
                                    total={service.visitas_total ?? 0}
                                    mes={service.visitas_mes ?? 0}
                                    variant="full"
                                />
                            ) : <div />}
                            <FavoritoButton
                                entidad_tipo="servicio"
                                entidad_id={service.id}
                                contador_inicial={service.favoritos_total ?? 0}
                                es_ejemplo={!!isExample}
                                variant="icon-with-count"
                            />
                        </div>

                        {/* Encabezado del Servicio */}
                        {imgError && (
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight tracking-tight mb-4">
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

                        {/* Mascotas Aceptadas — lee booleans acepta_perros/gatos/
                            otras de la BD. Antes era un card completo con heading
                            "Tipos de mascota" para contener solo 1-2 chips —
                            overkill visual. Ahora es una linea inline compacta
                            tipo "Atiende:  Perros · Gatos", sin card ni heading
                            (la info es trivial, no requiere protagonismo). */}
                        {(service.acepta_perros || service.acepta_gatos || service.acepta_otras || service.tamanos_permitidos?.length > 0) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600 px-1">
                                <span className="font-semibold text-slate-700">Atiende:</span>
                                {service.acepta_perros && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Dog size={15} strokeWidth={1.5} className="text-slate-500" /> Perros
                                    </span>
                                )}
                                {service.acepta_gatos && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Cat size={15} strokeWidth={1.5} className="text-slate-500" /> Gatos
                                    </span>
                                )}
                                {service.acepta_otras && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <PawPrint size={15} strokeWidth={1.5} className="text-slate-500" /> Otras
                                    </span>
                                )}
                                {service.tamanos_permitidos?.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="text-slate-400">·</span>
                                        <span>Tallas: <span className="text-slate-700">{service.tamanos_permitidos.join(', ')}</span></span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Descripcion */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                Acerca del Servicio
                            </h3>
                            {service.descripcion ? (
                                <ExpandibleText text={service.descripcion} maxChars={400} />
                            ) : (
                                <EmptyFieldState
                                    label="descripción"
                                    isOwner={isOwner}
                                    ownerCTA={{ text: 'Agregar descripción', href: '/proveedor?tab=servicios' }}
                                />
                            )}
                        </div>

                        {/* Sobre el proveedor (bio) */}
                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <UserIcon2 size={22} className="text-emerald-500" />
                                Sobre {proveedor.nombre_publico || proveedor.nombre}
                            </h3>
                            {proveedor.bio ? (
                                <ExpandibleText text={proveedor.bio} maxChars={400} />
                            ) : (
                                <EmptyFieldState
                                    label="información personal"
                                    isOwner={isOwner}
                                    ownerCTA={{ text: 'Cuéntale a los tutores quién eres', href: '/proveedor?tab=perfil' }}
                                    tutorMessage="Este proveedor no agregó información personal aún"
                                />
                            )}
                        </div>

                        {/* Inclusiones — chips dedicados (Sprint 4 Fase 2 Commit C).
                            Renderizamos el multiselect `inclusiones` aparte del grid
                            de campos para darle protagonismo visual y reusar el
                            estilo de chips emerald que ya tienen idiomas / comunas
                            en la ficha proveedor. */}
                        {Array.isArray(service.detalles?.inclusiones) && service.detalles.inclusiones.length > 0 && (() => {
                            const slug = categoria?.slug ?? '';
                            const campo = getCampoMeta(slug, 'inclusiones');
                            const chips: string[] = service.detalles.inclusiones.map((slugInc: string) => (
                                campo?.opciones?.find(o => String(o.value) === String(slugInc))?.label ?? String(slugInc)
                            ));
                            return (
                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12" /></svg>
                                        Incluye
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {chips.map((label, i) => (
                                            <span key={i} className="bg-emerald-50 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full border border-emerald-100">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Detalles adicionales — textarea libre por servicio
                            (campo `notas` en jsonb; label visible renombrado para
                            que no se confunda con "Incluye"). Heading alineado
                            con el patron de las otras secciones: text-xl +
                            FileText icon + flex items-center. */}
                        {service.detalles && typeof service.detalles.notas === 'string' && service.detalles.notas.trim() && (
                            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <FileText size={22} className="text-emerald-500" />
                                    Detalles adicionales
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {service.detalles.notas}
                                </p>
                            </div>
                        )}

                        {/* Detalles especificos de categoria — itera SOLO los campos
                            definidos en CAMPOS_POR_CATEGORIA[categoria] (no las keys
                            crudas del jsonb). Asi las keys legacy huerfanas
                            (envia_foto_reporte, administra_medicamentos, etc.
                            absorbidas a `inclusiones` en Fase 2) no rinden mas como
                            texto snake_case suelto. `inclusiones` y `notas` van en
                            secciones dedicadas arriba; los demas campos del set
                            canonico van aqui. */}
                        {(() => {
                            const slug = categoria?.slug ?? '';
                            const campos = CAMPOS_POR_CATEGORIA[slug] || [];
                            const visibles = campos.filter(campo => {
                                if (campo.tipo === 'info') return false;
                                if (campo.tipo === 'multiselect') return false; // chips arriba
                                if (campo.key === 'notas') return false; // seccion arriba
                                const v = service.detalles?.[campo.key];
                                if (v === null || v === undefined || v === '') return false;
                                if (campo.tipo === 'boolean' && !v) return false; // booleans false no aportan
                                // Defensa contra datos legacy: hay campos declarados
                                // como 'text' (ej. razas_especiales) que en una fase
                                // anterior eran boolean — ver comentario en
                                // lib/camposPorCategoria.ts L37. Filas legacy pueden
                                // tener un boolean en lugar de string. Tratamos
                                // bool false como "no aporta" (skip) y bool true
                                // como bool (icono check, sin valor textual).
                                if (typeof v === 'boolean' && !v) return false;
                                return true;
                            });
                            if (visibles.length === 0) return null;
                            return (
                                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        Información del servicio
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {visibles.map(campo => {
                                            const val = service.detalles?.[campo.key];
                                            // `isBoolean` cubre dos casos: (a) el campo
                                            // esta declarado como boolean en el meta;
                                            // (b) el campo es text pero la fila legacy
                                            // tiene boolean en el jsonb (ver filtro
                                            // arriba). Sin (b), el render caia a
                                            // formatValorCampo -> String(true) y mostraba
                                            // "true" literal.
                                            const isBoolean = campo.tipo === 'boolean' || typeof val === 'boolean';
                                            const displayValue = isBoolean ? null : formatValorCampo(campo, val);
                                            return (
                                                <div key={campo.key} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                                                    {isBoolean ? (
                                                        <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                    ) : (
                                                        <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs text-slate-500 font-medium">{campo.label}</p>
                                                        {displayValue && <p className="text-sm text-slate-700 mt-0.5 break-words">{displayValue}</p>}
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
                                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
                                        <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            Disponibilidad
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {days.map(dia => {
                                                const d = parsed![dia];
                                                if (!d?.activo) return null;
                                                return (
                                                    <div key={dia} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                                        <span className="text-sm text-slate-700">{dia}</span>
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
                                    <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
                                <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
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

                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                {/* Icono cámara */}
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                Fotos del espacio
                            </h3>

                            {!proveedor.galeria || proveedor.galeria.length === 0 ? (
                                <EmptyFieldState
                                    label="fotos del espacio"
                                    isOwner={isOwner}
                                    ownerCTA={{ text: 'Sube fotos', href: '/proveedor?tab=perfil' }}
                                    tutorMessage="Sin fotos del espacio agregadas"
                                />
                            ) : proveedor.galeria.length === 1 ? (
                                    // Una foto — full width
                                    <div className="w-full aspect-[16/9] rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proveedor.galeria[0]} alt="Espacio del proveedor"
                                            className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    // 2+ fotos — grid uniforme con aspect-ratio consistente
                                    <div className={`grid gap-2 ${proveedor.galeria.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                        {proveedor.galeria.slice(0, 3).map((url: string, i: number) => (
                                            <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                                {i === 2 && proveedor.galeria.length > 3 && (
                                                    <Link href={`/proveedor/${proveedor.id}`}
                                                        className="absolute inset-0 bg-black/55 flex items-center justify-center hover:bg-black/65 transition-colors">
                                                        <span className="text-white font-semibold text-lg">
                                                            +{proveedor.galeria.length - 3} fotos
                                                        </span>
                                                    </Link>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                        </div>

                        {/* Evaluaciones */}

                        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Evaluaciones
                                </h3>
                                <button
                                    onClick={handleLeaveReview}
                                    className="inline-flex items-center gap-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold py-1.5 px-3.5 rounded-lg transition-colors text-sm"
                                >
                                    <Pencil size={14} aria-hidden="true" />
                                    Dejar mi evaluación
                                </button>
                            </div>

                            <div className="mb-10">
                                <ReviewSummary servicioId={service.id} reviewsOverride={isExample ? reviews : undefined} bare />
                            </div>

                            {totalReviews > 0 ? (
                                <div>
                                    {/* Lista de Reviews */}
                                    <ReviewList servicioId={service.id} reviewsOverride={isExample ? reviews : undefined} />
                                </div>
                            ) : null}

                        </div>

                        {/* Formulario de Evaluación (Solo Autenticados) */}
                        {user && (
                            <div className="mt-8">
                                {yaEvaluo ? (
                                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl">
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
                            isExample={isExample}
                            onExampleAction={() => setExampleModalAction('pregunta')}
                        />

                    </div>

                    {/* COLUMNA DERECHA: SIDEBAR (Sticky) */}
                    <div className="w-full lg:w-1/3 space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 flex flex-col gap-5">

                            {/* PRECIO — protagonista */}
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Desde</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-bold text-emerald-700">
                                        ${service.precio_desde?.toLocaleString("es-CL")}
                                    </span>
                                    <span className="text-slate-500 font-medium text-sm">/{service.unidad_precio}</span>
                                </div>
                                {/* Rating inline si hay evaluaciones */}
                                {totalReviews > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                        <span className="text-sm font-semibold text-slate-700">
                                            {(reviews.reduce((a: number, r: any) => a + r.rating, 0) / totalReviews).toFixed(1)}
                                        </span>
                                        <span className="text-sm text-slate-500">({totalReviews} evaluaciones)</span>
                                    </div>
                                )}
                            </div>

                            {/* CTAs — Jerarquia explicita: Mensaje (primario,
                                fill) > WhatsApp (secundario, outline) > Telefono
                                (terciario, text-link via PhoneRevealButton).
                                Antes ambos eran fill y competian por primary. */}
                            <div className="flex flex-col gap-3">
                                {/* Gate de login — visible ARRIBA de los CTAs
                                    cuando user no esta autenticado. Da contexto
                                    antes del click (previo: redirect a login sin
                                    explicacion). isExample no muestra el hint
                                    porque tiene su propio ExampleCTAModal. */}
                                {!user && !isExample && (
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        Inicia sesión para contactar al proveedor.
                                    </p>
                                )}

                                <button
                                    onClick={handleChatClick}
                                    disabled={isChatLoading}
                                    aria-label={`Enviar mensaje a ${proveedor.nombre_publico || proveedor.nombre}`}
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-base disabled:opacity-60"
                                >
                                    {isChatLoading
                                        ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Enviar Mensaje</>
                                    }
                                </button>

                                {proveedor.mostrar_whatsapp && proveedor.telefono && (
                                    <button onClick={handleWhatsApp}
                                        aria-label={`Contactar a ${proveedor.nombre_publico || proveedor.nombre} por WhatsApp`}
                                        className="w-full bg-white hover:bg-[#25D366]/5 border-2 border-[#25D366] text-[#25D366] font-medium tracking-wide py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        WhatsApp
                                    </button>
                                )}

                                {proveedor.mostrar_telefono && proveedor.telefono && (
                                    <PhoneRevealButton
                                        telefono={proveedor.telefono}
                                        nombre={proveedor.nombre_publico || proveedor.nombre}
                                        isExample={!!isExample}
                                        isLoggedIn={!!user}
                                        onExampleClick={() => setExampleModalAction('llamar')}
                                        onLoginRequired={() => setLoginModalOpen(true)}
                                        onCallTracked={() => trackContacto('llamada')}
                                    />
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
                                        <span className="font-semibold text-slate-900 text-base">
                                            {proveedor.nombre} {proveedor.apellido_p}
                                        </span>
                                        {proveedor.rut_verificado && (
                                            <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mb-3">{proveedor.comuna}</p>
                                    {proveedor.perfil_completo && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 mb-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-xs font-medium">
                                            <BadgeCheck size={12} /> Perfil completo
                                        </span>
                                    )}
                                    <Link
                                        href={`/proveedor/${proveedor.id}`}
                                        className="text-sm font-medium tracking-wide text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 px-5 py-2 rounded-full transition-colors"
                                    >
                                        Ver perfil completo
                                    </Link>
                                </div>

                                {/* Sobre el proveedor — siempre visible, con fallback */}
                                <div className="space-y-2">
                                    {proveedor.anios_experiencia && parseInt(proveedor.anios_experiencia) > 0 ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span>{proveedor.anios_experiencia} años de experiencia</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-sm">
                                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <EmptyFieldState
                                                label="años de experiencia"
                                                isOwner={isOwner}
                                                ownerCTA={{ text: 'Agrega tu experiencia', href: '/proveedor?tab=perfil' }}
                                                tutorMessage="Experiencia no especificada"
                                                variant="inline"
                                            />
                                        </div>
                                    )}

                                    {proveedor.certificaciones ? (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <span className="leading-tight">{proveedor.certificaciones}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-2 text-sm">
                                            <ShieldCheck size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                            <EmptyFieldState
                                                label="certificaciones"
                                                isOwner={isOwner}
                                                ownerCTA={{ text: 'Agrega una', href: '/proveedor?tab=perfil' }}
                                                tutorMessage="Sin certificaciones agregadas"
                                                variant="inline"
                                            />
                                        </div>
                                    )}

                                    {proveedor.primera_ayuda && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0 text-[9px] font-black">+</span>
                                            <span>Primeros Auxilios</span>
                                        </div>
                                    )}

                                    {proveedor.tipo_entidad === 'empresa' && (
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <Briefcase size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                            <div>
                                                <span className="font-medium text-slate-700 block">{proveedor.nombre_fantasia || proveedor.razon_social}</span>
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
                                {(() => {
                                    const showEmail = proveedor.email_publico && proveedor.mostrar_email;
                                    const hasAny = showEmail || proveedor.sitio_web || proveedor.instagram;
                                    return (
                                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                                            {hasAny ? (
                                                <>
                                                    {showEmail && (
                                                        <a href={`mailto:${proveedor.email_publico}`}
                                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-700 transition-colors font-medium truncate">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                                            {proveedor.email_publico}
                                                        </a>
                                                    )}
                                                    {proveedor.sitio_web && (
                                                        <a href={proveedor.sitio_web.startsWith('http') ? proveedor.sitio_web : `https://${proveedor.sitio_web}`}
                                                            target="_blank" rel="noopener noreferrer" onClick={handleProtectedLinkClick}
                                                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-emerald-700 transition-colors font-medium truncate">
                                                            <Globe size={14} className="shrink-0" />
                                                            {proveedor.sitio_web.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    )}
                                                    {proveedor.instagram && (() => {
                                                        const igUser = instagramUsernameFromUrl(proveedor.instagram);
                                                        if (!igUser) return null;
                                                        const igHref = proveedor.instagram.startsWith('http')
                                                            ? proveedor.instagram
                                                            : `https://instagram.com/${igUser}`;
                                                        return (
                                                            <a href={igHref}
                                                                target="_blank" rel="noopener noreferrer" onClick={handleProtectedLinkClick}
                                                                className="flex items-center gap-2 text-xs text-slate-500 hover:text-pink-500 transition-colors font-medium">
                                                                <Instagram size={14} className="shrink-0" />
                                                                @{igUser}
                                                            </a>
                                                        );
                                                    })()}
                                                </>
                                            ) : (
                                                <EmptyFieldState
                                                    label="canales de contacto"
                                                    isOwner={isOwner}
                                                    ownerCTA={{ text: 'Agrega tus redes', href: '/proveedor?tab=perfil' }}
                                                    isGuest={!user}
                                                    guestCTA={{ text: 'Inicia sesión para ver el contacto', href: `/login?redirect=${encodeURIComponent(router.asPath)}` }}
                                                    tutorMessage="Sin canales de contacto agregados"
                                                />
                                            )}
                                        </div>
                                    );
                                })()}

                            </div>

                        </div>

                    </div>
                </div>

                {/* Otros proveedores — ancho completo. Grid columns adaptado al
                    count para evitar celdas vacias visibles. 1 card → 1 col;
                    2 cards → 2 cols (sin tercera vacia); 3+ cards → 3 cols
                    (tope, antes era xl:4 pero sobre-densificaba en wide). */}
                {otrosServicios && otrosServicios.length > 0 && (() => {
                    const colsClass = otrosServicios.length === 1
                        ? 'grid-cols-1'
                        : otrosServicios.length === 2
                            ? 'grid-cols-1 sm:grid-cols-2'
                            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
                    return (
                        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-6">
                                Otros proveedores de {categoria.nombre} en {proveedor.comuna}
                            </h2>
                            <div className={`grid ${colsClass} gap-6`}>
                                {otrosServicios.map(s => (
                                    <ServiceCard key={s.servicio_id} service={s} />
                                ))}
                            </div>
                        </section>
                    );
                })()}
            </div>

            {/* Sticky CTA bar — solo mobile. Visible desde scroll inicial
                hasta el fin. Reusa handleChatClick (incluye gate de login,
                example modal y rate limit). El wrapper padre del ficha
                tiene pb-24 lg:pb-0 para que el contenido no quede tapado.
                z-40 sobre headers sticky (z-30) pero bajo modales (z-50). */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="shrink-0">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Desde</p>
                        <p className="text-lg font-bold text-emerald-700 leading-tight">
                            ${service.precio_desde?.toLocaleString('es-CL')}
                            <span className="text-xs font-medium text-slate-500 ml-0.5">/{service.unidad_precio}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleChatClick}
                        disabled={isChatLoading}
                        aria-label={`Enviar mensaje a ${proveedor.nombre_publico || proveedor.nombre}`}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm text-sm disabled:opacity-60"
                    >
                        {isChatLoading
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Enviar Mensaje</>
                        }
                    </button>
                </div>
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
            <ExampleCTAModal
                isOpen={exampleModalAction !== null}
                onClose={() => setExampleModalAction(null)}
                action={exampleModalAction ?? undefined}
            />
        </div>
    );
}
