import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { ShieldCheck, Star, Briefcase, Award, Globe, Instagram, Clock, Camera } from 'lucide-react';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import ReviewSummary from '../../components/Service/ReviewSummary';
import ReviewList from '../../components/Service/ReviewList';
import { useUser } from '../../contexts/UserContext';
import LoginRequiredModal from '../../components/Shared/LoginRequiredModal';

const LABELS_CAMPOS: Record<string, string> = {
    universidad: 'Universidad',
    anio_titulacion: 'Año de titulación',
    numero_registro: 'N° Registro profesional',
    especialidad: 'Especialidad',
    tipo_vehiculo: 'Tipo de vehículo',
    tiene_empresa: 'Opera con empresa',
    nombre_empresa: 'Empresa',
    capacidad_mascotas: 'Capacidad máxima',
    anios_experiencia: 'Años de experiencia',
    certificaciones: 'Certificaciones',
    tiene_local: 'Local propio',
    metodo: 'Método de adiestramiento',
    certificacion: 'Certificación',
    capacidad_maxima: 'Capacidad máxima (mascotas)',
    tiene_patio: 'Tiene patio o jardín',
    otras_mascotas_hogar: 'Otras mascotas en el hogar',
    horario: 'Horario de atención',
    max_perros_simultaneos: 'Máx. perros simultáneos',
    duracion_estandar: 'Duración estándar del paseo',
    servicios_incluidos: 'Servicios incluidos',
};

const formatValor = (key: string, value: any): string => {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (key === 'anio_titulacion') return String(value);
    if (key === 'duracion_estandar') return `${value} minutos`;
    if (key === 'capacidad_maxima' || key === 'capacidad_mascotas' || key === 'max_perros_simultaneos')
        return `${value} mascotas`;
    if (key === 'metodo') {
        const map: Record<string, string> = { positivo: 'Refuerzo positivo', mixto: 'Mixto', tradicional: 'Tradicional' };
        return map[value] ?? value;
    }
    if (key === 'tipo_vehiculo') {
        const map: Record<string, string> = { auto: 'Auto', van: 'Van', furgon: 'Furgón' };
        return map[value] ?? value;
    }
    return String(value);
};

interface ProveedorProps {
    proveedor: any;
    servicios: ServiceResult[];
    globalRatingPromedio: number;
    globalTotalEvaluaciones: number;
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

export default function ProveedorPage({ proveedor, servicios, globalRatingPromedio, globalTotalEvaluaciones }: ProveedorProps) {
    const { user } = useUser();
    const [loginModalOpen, setLoginModalOpen] = useState(false);

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

    const anosEnPawnecta = new Date().getFullYear() - new Date(proveedor.created_at).getFullYear();
    const bioTexto: string | null = proveedor.bio || proveedor.sobre_mi || null;
    const tieneTrustSignals = proveedor.anios_experiencia || proveedor.certificaciones || proveedor.primera_ayuda || proveedor.miembro_asociacion;
    const tieneDatosEspecificos = proveedor.datos_especificos && Object.entries(proveedor.datos_especificos).filter(([, v]) => v !== null && v !== '' && v !== false).length > 0;
    const tieneGaleria = proveedor.galeria && proveedor.galeria.length > 0;
    const title = `${proveedor.nombre} ${proveedor.apellido_p} — ${proveedor.comuna} | Pawnecta`;
    const desc = `Conoce a ${proveedor.nombre}, proveedor de servicios para mascotas en ${proveedor.comuna}. Revisa sus servicios, tarifas y evaluaciones en Pawnecta.`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{title}</title>
                <meta name="description" content={desc} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={desc} />
                <meta property="og:image" content={proveedor.foto_perfil || '/og-default.png'} />
                <link rel="canonical" href={`https://www.pawnecta.com/proveedor/${proveedor.id}`} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'LocalBusiness',
                            name: `${proveedor.nombre} ${proveedor.apellido_p}`,
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

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

                {/* ══ HERO ══════════════════════════════════════════════════ */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* Foto 120×120 */}
                        <div className={`w-28 h-28 rounded-2xl shrink-0 overflow-hidden border-2 ${proveedor.rut_verificado ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-slate-200'}`}>
                            {proveedor.foto_perfil ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={proveedor.foto_perfil} alt={proveedor.nombre} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600 font-bold text-4xl">
                                    {proveedor.nombre.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {proveedor.nombre} {proveedor.apellido_p}
                                </h1>
                                {(proveedor.rut_verificado || proveedor.verificacion_estado === 'aprobado') && (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 w-fit mx-auto sm:mx-0">
                                        <ShieldCheck size={12} /> Identidad Verificada
                                    </span>
                                )}
                            </div>

                            {proveedor.tipo_entidad === 'empresa' && (
                                <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
                                    <Briefcase size={13} className="text-emerald-600 shrink-0" />
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
                                    {anosEnPawnecta === 0 ? 'Nuevo en Pawnecta' : `${anosEnPawnecta} año${anosEnPawnecta > 1 ? 's' : ''} en Pawnecta`}
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
                            </div>
                        </div>
                    </div>

                    {/* Redes — franja inferior */}
                    {(proveedor.sitio_web || proveedor.instagram) && (
                        <div className="border-t border-slate-100 px-6 md:px-8 py-3 flex gap-5">
                            {proveedor.sitio_web && (
                                <a href={proveedor.sitio_web.startsWith('http') ? proveedor.sitio_web : `https://${proveedor.sitio_web}`}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium">
                                    <Globe size={15} /> Sitio web
                                </a>
                            )}
                            {proveedor.instagram && (
                                <a href={`https://instagram.com/${proveedor.instagram.replace('@', '')}`}
                                    onClick={handleProtectedLinkClick} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-pink-500 transition-colors font-medium">
                                    <Instagram size={15} /> @{proveedor.instagram.replace('@', '')}
                                </a>
                            )}
                        </div>
                    )}
                </section>

                {/* ══ BIO ═══════════════════════════════════════════════════ */}
                {bioTexto && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Sobre el proveedor</h2>
                        <BioExpandible bio={bioTexto} maxChars={400} />
                    </section>
                )}

                {/* ══ CREDENCIALES ══════════════════════════════════════════ */}
                {(tieneTrustSignals || tieneDatosEspecificos) && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <ShieldCheck size={17} className="text-emerald-600" />
                            Experiencia y credenciales
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                            {proveedor.anios_experiencia && parseInt(proveedor.anios_experiencia) > 0 && (
                                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <Clock size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Experiencia</p>
                                        <p className="text-sm font-semibold text-slate-800">{proveedor.anios_experiencia} años</p>
                                    </div>
                                </div>
                            )}

                            {proveedor.certificaciones && (
                                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <ShieldCheck size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Certificaciones</p>
                                        <p className="text-sm font-semibold text-slate-800">{proveedor.certificaciones}</p>
                                    </div>
                                </div>
                            )}

                            {proveedor.primera_ayuda && (
                                <div className="flex items-start gap-3 p-3.5 bg-red-50 rounded-xl border border-red-100">
                                    <span className="w-[17px] h-[17px] rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 text-[10px] font-black mt-0.5">+</span>
                                    <div>
                                        <p className="text-[11px] text-red-400 font-bold uppercase tracking-wide">Primeros Auxilios</p>
                                        <p className="text-sm font-semibold text-red-800">Certificado</p>
                                    </div>
                                </div>
                            )}

                            {proveedor.miembro_asociacion && (
                                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <Award size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Asociación</p>
                                        <p className="text-sm font-semibold text-slate-800">Miembro activo</p>
                                    </div>
                                </div>
                            )}

                            {tieneDatosEspecificos && Object.entries(proveedor.datos_especificos)
                                .filter(([, v]) => v !== null && v !== '' && v !== false)
                                .map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <ShieldCheck size={17} className="text-slate-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{LABELS_CAMPOS[key] ?? key}</p>
                                            <p className="text-sm font-semibold text-slate-800">{formatValor(key, value)}</p>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </section>
                )}

                {/* ══ GALERÍA ═══════════════════════════════════════════════ */}
                {tieneGaleria && (
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Camera size={17} className="text-emerald-600" />
                            Fotos del espacio
                        </h2>
                        {proveedor.galeria.length === 1 ? (
                            <div className="w-full h-72 rounded-xl overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={proveedor.galeria[0]} alt="" className="w-full h-full object-cover" />
                            </div>
                        ) : proveedor.galeria.length <= 3 ? (
                            <div className={`grid gap-2 h-64 ${proveedor.galeria.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {proveedor.galeria.map((url: string, i: number) => (
                                    <div key={i} className="rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // 4+ fotos: 1 grande izquierda + grid derecha
                            <div className="grid grid-cols-2 gap-2 h-72">
                                <div className="rounded-xl overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={proveedor.galeria[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                </div>
                                <div className="grid grid-rows-2 gap-2">
                                    <div className="rounded-xl overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proveedor.galeria[1]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                    </div>
                                    <div className="rounded-xl overflow-hidden relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proveedor.galeria[2]} alt="" className="w-full h-full object-cover" />
                                        {proveedor.galeria.length > 3 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                                                <span className="text-white font-bold text-lg">+{proveedor.galeria.length - 3} fotos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ══ SERVICIOS ═════════════════════════════════════════════ */}
                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Servicios ofrecidos</h2>
                    {servicios.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Evaluaciones</h2>
                    <ReviewSummary proveedorId={proveedor.id} />
                    <ReviewList proveedorId={proveedor.id} />
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
            .select('*')
            .eq('id', id)
            .eq('estado', 'aprobado')
            .maybeSingle();

        if (provError || !proveedor) {
            return { notFound: true };
        }

        const { data: rawServices } = await supabase
            .from('servicios_publicados')
            .select(`
                id, titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos, destacado,
                categorias_servicio!inner (nombre, slug, icono)
            `)
            .eq('proveedor_id', id)
            .eq('activo', true);

        const { data: evaluaciones } = await supabase
            .from('evaluaciones')
            .select('rating, servicio_id')
            .eq('proveedor_id', id)
            .eq('estado', 'aprobado');

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
                    proveedor_nombre: `${proveedor.nombre} ${proveedor.apellido_p}`,
                    proveedor_foto: proveedor.foto_perfil,
                    proveedor_comuna: proveedor.comuna,
                    destacado: !!rs.destacado,
                    rating_promedio: promServ,
                    total_evaluaciones: totServ,
                };
            });
        }

        return {
            props: { proveedor, servicios, globalRatingPromedio, globalTotalEvaluaciones }
        };

    } catch (e) {
        console.error('Error en getServerSideProps de proveedor', e);
        return { notFound: true };
    }
};
