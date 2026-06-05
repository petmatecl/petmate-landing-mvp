import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { ShieldCheck, Star, Briefcase, Award, Globe, Instagram, Clock, Camera, ChevronLeft, User, MapPin, Cake, BadgeCheck, Sparkles, X, Eye, Facebook, Youtube, Languages, Calendar, CheckCircle, Circle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { getComunaCoords } from '../../lib/comunas';

// LocationMap usa Leaflet — debe cargar dinamico sin SSR para no romper
// getServerSideProps. Loader minimo en gris siguiendo el resto de la ficha.
const LocationMap = dynamic(() => import('../../components/Shared/LocationMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] w-full rounded-xl bg-slate-100 flex items-center justify-center">
            <p className="text-slate-400 text-sm">Cargando mapa...</p>
        </div>
    ),
});
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import ReviewSummary from '../../components/Service/ReviewSummary';
import ReviewList from '../../components/Service/ReviewList';
import { useUser } from '../../contexts/UserContext';
import LoginRequiredModal from '../../components/Shared/LoginRequiredModal';
import VisitCounter from '../../components/Shared/VisitCounter';
import FavoritoButton from '../../components/Shared/FavoritoButton';
import { useTrackVisit } from '../../lib/hooks/useTrackVisit';
import { instagramUsernameFromUrl } from '../../lib/validators';
import { roundCoordsForPublic } from '../../lib/coordsPrivacy';
// Sprint 4 Fase 1 / Commit 3: la ficha publica del proveedor ya no renderiza
// proveedor.datos_especificos. Imports legacy (CAMPOS_POR_CATEGORIA,
// formatValorCampo, CampoDinamico, findCampoLegacy) eliminados.

interface CertificacionPublica {
    id: string;
    titulo: string;
    institucion: string | null;
    anio: number | null;
    documento_url: string | null;
}

interface ProveedorProps {
    proveedor: any;
    servicios: ServiceResult[];
    globalRatingPromedio: number;
    globalTotalEvaluaciones: number;
    contactosCount: number;
    certificacionesAprobadas: CertificacionPublica[];
}

function BioExpandible({ bio, maxChars = 280 }: { bio: string; maxChars?: number }) {
    const [expanded, setExpanded] = useState(false);
    const needsTruncation = bio.length > maxChars;
    const shown = expanded || !needsTruncation ? bio : bio.slice(0, maxChars) + '…';
    return (
        <div>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{shown}</p>
            {needsTruncation && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="mt-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                    {expanded ? 'Leer menos ↑' : 'Leer más ↓'}
                </button>
            )}
        </div>
    );
}

export default function ProveedorPage({ proveedor, servicios, globalRatingPromedio, globalTotalEvaluaciones, contactosCount, certificacionesAprobadas }: ProveedorProps) {
    const router = useRouter();
    const { user } = useUser();
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [exampleBannerVisible, setExampleBannerVisible] = useState(true);

    // Reset banner visibility when navigating to a different provider
    useEffect(() => {
        setExampleBannerVisible(true);
    }, [proveedor?.id]);

    // Track visit (no trackea si es el dueño del perfil)
    useTrackVisit('proveedor', proveedor?.id, proveedor?.auth_user_id);

    const handleProtectedLinkClick = (e: React.MouseEvent) => {
        if (!user) {
            e.preventDefault();
            setLoginModalOpen(true);
        }
    };

    if (!proveedor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500 font-medium">Proveedor no encontrado o inactivo.</p>
            </div>
        );
    }

    const miembroDesde = new Date(proveedor.created_at).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    const bioTexto: string | null = proveedor.bio || proveedor.sobre_mi || null;

    // Calcular edad a partir de fecha_nacimiento
    const calcularEdad = (fechaNac: string | null): number | null => {
        if (!fechaNac) return null;
        const hoy = new Date();
        const nac = new Date(fechaNac);
        let edad = hoy.getFullYear() - nac.getFullYear();
        if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--;
        return edad > 0 && edad < 100 ? edad : null;
    };
    const edad = calcularEdad(proveedor.fecha_nacimiento);
    const generoLabel: Record<string, string> = { mujer: 'Mujer', hombre: 'Hombre', no_binario: 'No binario' };
    const esPersonaNatural = !proveedor.tipo_entidad || proveedor.tipo_entidad === 'persona_natural';
    const tieneInfoPersonal = esPersonaNatural && (edad || proveedor.genero || proveedor.ocupacion || proveedor.anios_experiencia);
    const tieneGaleria = proveedor.galeria && proveedor.galeria.length > 0;
    const displayName = proveedor.nombre_publico || `${proveedor.nombre} ${proveedor.apellido_p}`;
    const title = `${displayName} — ${proveedor.comuna} | Pawnecta`;
    const desc = `Conoce a ${displayName}, proveedor de servicios para mascotas en ${proveedor.comuna}. Revisa sus servicios, tarifas y evaluaciones en Pawnecta.`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{title}</title>
                <meta name="description" content={desc} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={desc} />
                <meta property="og:image" content={proveedor.foto_perfil || 'https://www.pawnecta.com/og-image.jpg'} />
                <link rel="canonical" href={`https://www.pawnecta.com/proveedor/${proveedor.id}`} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'LocalBusiness',
                            name: displayName,
                            description: desc,
                            image: proveedor.foto_perfil || undefined,
                            url: `https://www.pawnecta.com/proveedor/${proveedor.id}`,
                            address: {
                                '@type': 'PostalAddress',
                                addressLocality: proveedor.comuna,
                                addressCountry: 'CL',
                            },
                            ...(globalTotalEvaluaciones > 0 ? {
                                aggregateRating: {
                                    '@type': 'AggregateRating',
                                    ratingValue: globalRatingPromedio,
                                    reviewCount: globalTotalEvaluaciones,
                                },
                            } : {}),
                            ...(servicios.length > 0 ? {
                                makesOffer: servicios.map(s => ({
                                    '@type': 'Offer',
                                    itemOffered: {
                                        '@type': 'Service',
                                        name: s.titulo,
                                    },
                                    price: s.precio_desde,
                                    priceCurrency: 'CLP',
                                })),
                            } : {}),
                        }),
                    }}
                />
            </Head>

            {proveedor.es_ejemplo && exampleBannerVisible && (
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
                {/* Volver */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700 transition-colors mb-2"
                >
                    <ChevronLeft size={16} /> Volver
                </button>

                {/* Banner para perfiles no aprobados */}
                {proveedor.estado !== 'aprobado' && (
                    <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                        proveedor.estado === 'pendiente' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        <span className="text-base">⚠</span>
                        Este perfil tiene estado <strong className="ml-1">{proveedor.estado}</strong>. No es visible públicamente para usuarios.
                    </div>
                )}

                {/* ══ HERO ══════════════════════════════════════════════════ */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* Foto 120×120 */}
                        <div className={`w-28 h-28 rounded-2xl shrink-0 overflow-hidden border-2 ${proveedor.rut_verificado ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200'}`}>
                            {proveedor.foto_perfil ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={proveedor.foto_perfil} alt={proveedor.nombre} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-700 font-semibold text-4xl">
                                    {proveedor.nombre.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    {displayName}
                                </h1>
                                {(proveedor.rut_verificado || proveedor.verificacion_estado === 'aprobado') && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-200 w-fit mx-auto sm:mx-0">
                                        <ShieldCheck size={12} /> Identidad Verificada
                                    </span>
                                )}
                                {proveedor.perfil_completo && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-200 w-fit mx-auto sm:mx-0">
                                        <BadgeCheck size={12} /> Perfil completo
                                    </span>
                                )}
                            </div>

                            {proveedor.tipo_entidad === 'empresa' && (
                                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
                                    <Briefcase size={13} className="text-slate-400 shrink-0" />
                                    <span className="font-medium">{proveedor.nombre_fantasia || proveedor.razon_social}</span>
                                    {proveedor.giro && <span className="text-slate-400">· {proveedor.giro}</span>}
                                </p>
                            )}

                            <p className="text-slate-500 text-sm mb-4 flex items-center gap-1.5 justify-center sm:justify-start">
                                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                {proveedor.comuna}
                            </p>

                            {/* Stat chips */}
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                                <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                                    <Clock size={12} className="text-slate-400" />
                                    En Pawnecta desde {miembroDesde}
                                </span>
                                {globalTotalEvaluaciones > 0 && (
                                    <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-medium px-3 py-1.5 rounded-full">
                                        <Star size={12} className="text-amber-400 fill-amber-400" />
                                        {globalRatingPromedio.toFixed(1)} · {globalTotalEvaluaciones} evaluacion{globalTotalEvaluaciones !== 1 ? 'es' : ''}
                                    </span>
                                )}
                                {servicios.length > 0 && (
                                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                                        <Briefcase size={12} className="text-slate-400" />
                                        {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} activo{servicios.length !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {contactosCount > 0 && (
                                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                        {contactosCount} contacto{contactosCount !== 1 ? 's' : ''}
                                    </span>
                                )}
                                {(proveedor.visitas_total ?? 0) > 0 && (
                                    <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                                        <Eye size={12} strokeWidth={1.5} className="text-slate-400" />
                                        {(proveedor.visitas_total ?? 0).toLocaleString('es-CL')} visitas
                                        {(proveedor.visitas_mes ?? 0) > 0 && (
                                            <span className="text-slate-400"> · {proveedor.visitas_mes} este mes</span>
                                        )}
                                    </span>
                                )}
                                <FavoritoButton
                                    entidad_tipo="proveedor"
                                    entidad_id={proveedor.id}
                                    contador_inicial={proveedor.favoritos_total ?? 0}
                                    es_ejemplo={!!proveedor.es_ejemplo}
                                    variant="icon-with-count"
                                    size="sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contacto y redes — franja inferior */}
                    {(proveedor.email_publico || proveedor.sitio_web || proveedor.instagram || proveedor.facebook || proveedor.tiktok || proveedor.youtube) && (
                        <div className="border-t border-slate-100 px-6 md:px-8 py-3 flex flex-wrap gap-x-5 gap-y-2">
                            {proveedor.email_publico && proveedor.mostrar_email && (
                                <a href={`mailto:${proveedor.email_publico}`}
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors font-medium">
                                    <MapPin size={15} className="hidden" /><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                    {proveedor.email_publico}
                                </a>
                            )}
                            {proveedor.sitio_web && (
                                <a href={proveedor.sitio_web.startsWith('http') ? proveedor.sitio_web : `https://${proveedor.sitio_web}`}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors font-medium">
                                    <Globe size={15} /> Sitio web
                                </a>
                            )}
                            {proveedor.instagram && (() => {
                                // Backwards-compat: el campo puede traer URL canonica
                                // (post Sprint 2) o @usuario / usuario (legacy).
                                const igUser = instagramUsernameFromUrl(proveedor.instagram);
                                if (!igUser) return null;
                                const igHref = proveedor.instagram.startsWith('http')
                                    ? proveedor.instagram
                                    : `https://instagram.com/${igUser}`;
                                return (
                                    <a href={igHref}
                                        onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-pink-500 transition-colors font-medium">
                                        <Instagram size={15} /> @{igUser}
                                    </a>
                                );
                            })()}
                            {proveedor.facebook && (
                                <a href={proveedor.facebook}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors font-medium">
                                    <Facebook size={15} /> Facebook
                                </a>
                            )}
                            {proveedor.tiktok && (
                                // Lucide ^0.553 no tiene icono de marca TikTok — link de
                                // texto etiquetado en su lugar (sin emojis, sin deps).
                                <a href={proveedor.tiktok}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium">
                                    TikTok
                                </a>
                            )}
                            {proveedor.youtube && (
                                <a href={proveedor.youtube}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors font-medium">
                                    <Youtube size={15} /> YouTube
                                </a>
                            )}
                        </div>
                    )}
                </section>

                {/* ══ QUIÉN SOY (persona natural) ═══════════════════════════ */}
                {tieneInfoPersonal && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            Quién soy
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                            {proveedor.ocupacion && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                        <Briefcase size={16} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Profesión</p>
                                        <p className="text-sm text-slate-700">{proveedor.ocupacion}</p>
                                    </div>
                                </div>
                            )}
                            {edad && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                        <Cake size={16} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Edad</p>
                                        <p className="text-sm text-slate-700">{edad} años</p>
                                    </div>
                                </div>
                            )}
                            {proveedor.genero && generoLabel[proveedor.genero] && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                        <User size={16} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Género</p>
                                        <p className="text-sm text-slate-700">{generoLabel[proveedor.genero]}</p>
                                    </div>
                                </div>
                            )}
                            {proveedor.anios_experiencia > 0 && (
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                        <Award size={16} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-medium">Experiencia</p>
                                        <p className="text-sm text-slate-700">{proveedor.anios_experiencia} años</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                    <Clock size={16} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-medium">En Pawnecta</p>
                                    <p className="text-sm text-slate-700">Desde {miembroDesde}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                                    <Briefcase size={16} className="text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 font-medium">Servicios activos</p>
                                    <p className="text-sm text-slate-700">{servicios.length}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ══ BIO ═══════════════════════════════════════════════════ */}
                {bioTexto && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-semibold text-slate-900 mb-3">{esPersonaNatural ? 'Sobre mí' : 'Sobre el proveedor'}</h2>
                        <BioExpandible bio={bioTexto} maxChars={400} />
                    </section>
                )}

                {/* ══ CREDENCIALES ══════════════════════════════════════════ */}
                {/* Seccion siempre visible. Una sola jerarquia (header
                    "Credenciales", items directos sin sub-headers).
                    Items:
                      1. Primeros auxilios — SIEMPRE renderizado, con dos
                         estados explicitos. Es senal de SEGURIDAD: la
                         ausencia es info util para el tutor que va a
                         dejar su mascota varias horas. Verde si declarado,
                         slate neutro si no (tono no punitivo).
                      2. Certificaciones (texto) — condicional. Cualificacion
                         POSITIVA: ausencia no es senal negativa.
                      3. Diplomas (uploads aprobados) — condicional. Idem
                         certificaciones. Solo `estado='aprobado'` (RLS lo
                         enforza tambien via policy public_read_approved_cert).
                    Sprint 4 Fase 1 / Commit 3: datos_especificos viven
                    per-servicio, no aca. */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                    <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <ShieldCheck size={17} className="text-emerald-500" />
                        Credenciales
                    </h2>
                    <div className="space-y-3">

                        {/* Primeros auxilios: siempre visible, dos estados */}
                        {proveedor.primera_ayuda ? (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100">
                                <CheckCircle size={13} className="shrink-0" />
                                Certificación en primeros auxilios para mascotas
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200">
                                <Circle size={13} className="shrink-0 text-slate-400" />
                                No declara certificación en primeros auxilios
                            </div>
                        )}

                        {/* Certificaciones (texto libre, opcional) */}
                        {proveedor.certificaciones && (
                            <div className="flex items-start gap-2.5 text-sm text-slate-700 pt-1">
                                <ShieldCheck size={17} className="text-emerald-500 shrink-0 mt-0.5" />
                                <p className="leading-relaxed">{proveedor.certificaciones}</p>
                            </div>
                        )}

                        {/* Diplomas aprobados (tabla `certificaciones`, opcional).
                            Solo estado='aprobado' — pendientes/rechazadas
                            NUNCA llegan aqui (filtro explicito en SSR + RLS). */}
                        {certificacionesAprobadas.length > 0 && (
                            <ul className="space-y-2 pt-1">
                                {certificacionesAprobadas.map(cert => (
                                    <li key={cert.id} className="flex items-start justify-between gap-3 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-700 truncate">{cert.titulo}</p>
                                            {(cert.institucion || cert.anio) && (
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {cert.institucion}
                                                    {cert.institucion && cert.anio && ' · '}
                                                    {cert.anio}
                                                </p>
                                            )}
                                        </div>
                                        {cert.documento_url && (
                                            <a
                                                href={cert.documento_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 shrink-0 self-center"
                                            >
                                                Ver
                                            </a>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                {/* ══ IDIOMAS ═══════════════════════════════════════════════ */}
                {Array.isArray(proveedor.idiomas) && proveedor.idiomas.length > 0 && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Languages size={17} className="text-slate-400" />
                            Idiomas
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {proveedor.idiomas.map((idioma: string) => (
                                <span
                                    key={idioma}
                                    className="bg-emerald-50 text-emerald-800 text-sm font-medium px-3 py-1.5 rounded-full border border-emerald-100"
                                >
                                    {idioma}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* ══ POLÍTICA DE CANCELACIÓN ═══════════════════════════════ */}
                {proveedor.politica_cancelacion && (() => {
                    const POLITICA_LABELS: Record<string, { titulo: string; descripcion: string }> = {
                        flexible: {
                            titulo: 'Flexible',
                            descripcion: 'Acepta cancelaciones avisando con al menos 24 horas de anticipación.',
                        },
                        moderada: {
                            titulo: 'Moderada',
                            descripcion: 'Solicita aviso entre 48 horas y 7 días antes del servicio.',
                        },
                        estricta: {
                            titulo: 'Estricta',
                            descripcion: 'Solicita aviso con más de 7 días de anticipación.',
                        },
                    };
                    const info = POLITICA_LABELS[proveedor.politica_cancelacion];
                    if (!info) return null;
                    return (
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Calendar size={17} className="text-slate-400" />
                                Política de cancelación
                            </h2>
                            <div className="flex items-start gap-3">
                                <span className="inline-flex items-center bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200 mt-0.5">
                                    {info.titulo}
                                </span>
                                <p className="text-sm text-slate-600 leading-relaxed flex-1">{info.descripcion}</p>
                            </div>
                            {proveedor.politica_cancelacion_nota && (
                                <p className="text-sm text-slate-500 leading-relaxed mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3">
                                    {proveedor.politica_cancelacion_nota}
                                </p>
                            )}
                        </section>
                    );
                })()}

                {/* ══ UBICACIÓN ═════════════════════════════════════════════ */}
                {/* Mapa aproximado. Usa lat/lng guardados por el proveedor si
                    existen; si no, cae al centroide de su comuna (mismo hash
                    que CaregiverMap). Circle de 1000m — la lat/lng llegan
                    redondeadas a 2 decimales (~1km) via roundCoordsForPublic
                    en getServerSideProps; el radio del Circle matchea la
                    precision expuesta. La BD conserva 3 decimales para uso
                    interno (calculos de distancia), pero el cliente publico
                    nunca los ve. */}
                {(proveedor.lat != null && proveedor.lng != null) || proveedor.comuna ? (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <MapPin size={17} className="text-slate-400" />
                            Ubicación
                        </h2>
                        {(() => {
                            const hasPin = proveedor.lat != null && proveedor.lng != null;
                            const [mapLat, mapLng] = hasPin
                                ? [proveedor.lat as number, proveedor.lng as number]
                                : getComunaCoords(proveedor.comuna);
                            return (
                                <>
                                    <LocationMap lat={mapLat} lng={mapLng} approximate radius={1000} height="300px" />
                                    <p className="text-xs text-slate-500 mt-3">
                                        {hasPin
                                            ? `Área aproximada en ${proveedor.comuna || 'la comuna del proveedor'}. La dirección exacta no se comparte públicamente.`
                                            : `Ubicación referencial en ${proveedor.comuna}. El proveedor aún no ha posicionado un pin específico.`}
                                    </p>
                                </>
                            );
                        })()}
                    </section>
                ) : null}

                {/* ══ GALERÍA ═══════════════════════════════════════════════ */}
                {tieneGaleria && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Camera size={17} className="text-slate-400" />
                            Fotos del espacio
                        </h2>
                        {proveedor.galeria.length === 1 ? (
                            <div className="w-full aspect-[16/9] rounded-xl overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={proveedor.galeria[0]} alt="" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className={`grid gap-2 ${proveedor.galeria.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {proveedor.galeria.slice(0, 3).map((url: string, i: number) => (
                                    <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                        {i === 2 && proveedor.galeria.length > 3 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <span className="text-white font-semibold text-lg">+{proveedor.galeria.length - 3} fotos</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {/* ══ SERVICIOS ═════════════════════════════════════════════ */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-4">Servicios ofrecidos</h2>
                    {servicios.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {servicios.map((srv) => (
                                <ServiceCard key={srv.servicio_id} service={srv} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                            <p className="text-slate-500">Este proveedor no tiene servicios activos.</p>
                        </div>
                    )}
                </section>

                {/* ══ EVALUACIONES ══════════════════════════════════════════ */}
                {/* h2 "Evaluaciones" es page-level header. ReviewSummary va con
                    bare={true} para evitar el doble titulo "Evaluaciones" +
                    "Resumen de Evaluaciones" que ya cerramos en ServiceDetailView
                    (commit 0a80cf1) y que persistia aca porque esta URL tiene
                    su propio render inline (no usa ServiceDetailView). Card
                    wrapper local mantiene la estetica de cards bg-white del
                    resto de la pagina del proveedor. */}
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Evaluaciones</h2>
                    {globalTotalEvaluaciones === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                            <Star size={32} className="text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Este proveedor aún no tiene evaluaciones.</p>
                            <p className="text-slate-400 text-sm mt-1">¡Sé el primero en contactarlo y dejar una reseña!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
                            <ReviewSummary proveedorId={proveedor.id} bare />
                            <ReviewList proveedorId={proveedor.id} />
                        </div>
                    )}
                </section>

            </div>

            <LoginRequiredModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
            />
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        const { data: proveedor, error: provError } = await supabase
            .from('proveedores')
            .select(`
                id, auth_user_id, nombre, apellido_p, nombre_publico, foto_perfil, bio, comuna,
                tipo_entidad, razon_social, nombre_fantasia, giro,
                genero, ocupacion, fecha_nacimiento, anios_experiencia,
                certificaciones, primera_ayuda, rut_verificado, verificacion_estado,
                sitio_web, instagram, facebook, tiktok, youtube,
                idiomas, politica_cancelacion, politica_cancelacion_nota,
                lat, lng,
                email_publico, mostrar_email,
                mostrar_whatsapp, mostrar_telefono, telefono, whatsapp,
                galeria, estado, created_at, perfil_completo, es_ejemplo,
                visitas_total, visitas_mes, favoritos_total
            `)
            .eq('id', id)
            .maybeSingle();

        if (provError || !proveedor) {
            return { notFound: true };
        }

        // Privacidad: reduce la precision de lat/lng expuestas al cliente
        // de 3 decimales (~111m, lo guardado en BD) a 2 decimales (~1km).
        // El Circle de Leaflet en la ficha publica usa radio 1000m, asi que
        // la zona visible cubre el ruido. La BD NO se toca aqui — los 3
        // decimales originales se preservan para calculos internos.
        const { lat: latPublica, lng: lngPublica } = roundCoordsForPublic(
            proveedor.lat as number | null,
            proveedor.lng as number | null
        );
        proveedor.lat = latPublica;
        proveedor.lng = lngPublica;

        const { data: rawServices } = await supabase
            .from('servicios_publicados')
            .select(`
                id, titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos, destacado,
                visitas_total, visitas_mes, favoritos_total, detalles,
                categorias_servicio!inner (nombre, slug, icono)
            `)
            .eq('proveedor_id', id)
            .eq('activo', true);

        const { data: evaluaciones } = await supabase
            .from('evaluaciones')
            .select('rating, servicio_id')
            .eq('proveedor_id', id)
            .eq('estado', 'aprobado');

        // Diplomas aprobados (tabla `certificaciones`). RLS ya filtra
        // estado='aprobado' via policy public_read_approved_cert, pero
        // filtro explicito por defensa en profundidad — si la RLS se
        // deshabilita / modifica, este SSR sigue sin exponer pendientes.
        const { data: certificacionesAprobadasRaw } = await supabase
            .from('certificaciones')
            .select('id, titulo, institucion, anio, documento_url')
            .eq('proveedor_id', id)
            .eq('estado', 'aprobado')
            .order('created_at', { ascending: false });
        const certificacionesAprobadas: CertificacionPublica[] = certificacionesAprobadasRaw || [];

        let globalRatingPromedio = 0;
        let globalTotalEvaluaciones = 0;

        if (evaluaciones && evaluaciones.length > 0) {
            globalTotalEvaluaciones = evaluaciones.length;
            globalRatingPromedio = evaluaciones.reduce((acc, curr) => acc + curr.rating, 0) / globalTotalEvaluaciones;
        }

        let servicios: ServiceResult[] = [];
        if (rawServices && rawServices.length > 0) {
            servicios = rawServices.map((rs: any) => {
                const cat = Array.isArray(rs.categorias_servicio) ? rs.categorias_servicio[0] : rs.categorias_servicio;
                const evalsServicio = evaluaciones?.filter((e: any) => e.servicio_id === rs.id) || [];
                const totServ = evalsServicio.length;
                const promServ = totServ > 0 ? evalsServicio.reduce((a: number, b: any) => a + b.rating, 0) / totServ : 0;
                return {
                    servicio_id: rs.id,
                    titulo: rs.titulo,
                    descripcion: rs.descripcion || '',
                    precio_desde: rs.precio_desde,
                    precio_hasta: rs.precio_hasta,
                    unidad_precio: rs.unidad_precio,
                    fotos: rs.fotos || [],
                    categoria_nombre: cat.nombre,
                    categoria_slug: cat.slug,
                    categoria_icono: cat.icono,
                    proveedor_id: proveedor.id,
                    proveedor_nombre: proveedor.nombre_publico || `${proveedor.nombre} ${proveedor.apellido_p}`,
                    proveedor_foto: proveedor.foto_perfil,
                    proveedor_comuna: proveedor.comuna,
                    destacado: !!rs.destacado,
                    rating_promedio: promServ,
                    total_evaluaciones: totServ,
                    proveedor_perfil_completo: proveedor.perfil_completo ?? false,
                    proveedor_es_ejemplo: proveedor.es_ejemplo ?? false,
                    visitas_total: rs.visitas_total ?? 0,
                    visitas_mes: rs.visitas_mes ?? 0,
                    favoritos_total: rs.favoritos_total ?? 0,
                    detalles: rs.detalles ?? null,
                };
            });
        }

        // Contact count (all time)
        const { count: contactosCount } = await supabase
            .from('contactos')
            .select('*', { head: true, count: 'exact' })
            .eq('proveedor_id', id);

        return {
            props: { proveedor, servicios, globalRatingPromedio, globalTotalEvaluaciones, contactosCount: contactosCount || 0, certificacionesAprobadas }
        };

    } catch (e) {
        console.error('Error en getServerSideProps de proveedor', e);
        return { notFound: true };
    }
};
