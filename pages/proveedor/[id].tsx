import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { ShieldCheck, Star, Calendar, Briefcase, Award, Clock, Globe, Instagram } from 'lucide-react';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import ReviewSummary from '../../components/Service/ReviewSummary';
import ReviewList from '../../components/Service/ReviewList';
import GalleryLightbox from '../../components/GalleryLightbox';

const BioExpandible = ({ bio, maxChars }: { bio: string, maxChars: number }) => {
    const [expanded, setExpanded] = React.useState(false);
    if (!bio) return null;
    if (bio.length <= maxChars) {
        return <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{bio}</p>;
    }
    return (
        <div>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {expanded ? bio : `${bio.substring(0, maxChars)}...`}
            </p>
            <button onClick={() => setExpanded(!expanded)} className="text-emerald-600 font-bold text-sm mt-1 hover:underline">
                {expanded ? 'Leer menos' : 'Leer más'}
            </button>
        </div>
    );
};

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

export default function ProveedorPage({ proveedor, servicios, globalRatingPromedio, globalTotalEvaluaciones }: ProveedorProps) {
    const [galeriaOpen, setGaleriaOpen] = React.useState(false);

    if (!proveedor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500 font-medium">Proveedor no encontrado o inactivo.</p>
            </div>
        );
    }

    const title = `${proveedor.nombre} ${proveedor.apellido_p} — Proveedor de servicios en ${proveedor.comuna} | Pawnecta`;
    const desc = proveedor.bio ? proveedor.bio.substring(0, 160) : `Conoce a ${proveedor.nombre}, proveedor de servicios para mascotas en ${proveedor.comuna}. Revisa sus servicios, tarifas y las evaluaciones de otros clientes en Pawnecta.`;

    const anosEnPawnecta = new Date().getFullYear() - new Date(proveedor.created_at).getFullYear();
    const anosLabel = anosEnPawnecta === 0 ? "Nuevo en Pawnecta" : `${anosEnPawnecta} año${anosEnPawnecta > 1 ? "s" : ""} en Pawnecta`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{title}</title>
                <meta name="description" content={desc} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={desc} />
                <meta property="og:image" content={proveedor.foto_perfil || "/og-default.png"} />
                <meta property="og:type" content="profile" />
                <meta property="og:url" content={`https://pawnecta.cl/proveedor/${proveedor.id}`} />
                <link rel="canonical" href={`https://pawnecta.cl/proveedor/${proveedor.id}`} />

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": proveedor.tipo_entidad === "empresa" ? "LocalBusiness" : "Person",
                            "name": proveedor.tipo_entidad === "empresa"
                                ? (proveedor.nombre_fantasia || proveedor.razon_social)
                                : `${proveedor.nombre} ${proveedor.apellido_p}`,
                            "description": proveedor.bio || desc,
                            "image": proveedor.foto_perfil,
                            "url": `https://pawnecta.cl/proveedor/${proveedor.id}`,
                            "address": {
                                "@type": "PostalAddress",
                                "addressLocality": proveedor.comuna,
                                "addressCountry": "CL"
                            },
                            "aggregateRating": globalTotalEvaluaciones > 0 ? {
                                "@type": "AggregateRating",
                                "ratingValue": globalRatingPromedio.toFixed(1),
                                "reviewCount": globalTotalEvaluaciones,
                                "bestRating": "5",
                                "worstRating": "1"
                            } : undefined,
                        })
                    }}
                />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* SECCIÓN 1: Header del Proveedor */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative">
                    {/* Foto de perfil */}
                    <div className={`w-[120px] h-[120px] rounded-full bg-slate-200 shrink-0 border border-slate-200 overflow-hidden relative ${proveedor.rut_verificado ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
                        {proveedor.foto_perfil ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={proveedor.foto_perfil} alt={proveedor.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-100 text-3xl">
                                {proveedor.nombre.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Información Principal */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-1 justify-center md:justify-start">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {proveedor.nombre} {proveedor.apellido_p}
                            </h1>
                            {proveedor.rut_verificado && (
                                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full text-xs mx-auto md:mx-0">
                                    <ShieldCheck size={14} />
                                    <span>Verificado</span>
                                </div>
                            )}
                        </div>

                        {proveedor.tipo_entidad === "empresa" && (
                            <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-slate-500 mb-2">
                                <Briefcase size={14} />
                                <span>{proveedor.nombre_fantasia || proveedor.razon_social}</span>
                            </div>
                        )}

                        <p className="text-slate-500 font-medium mb-4">
                            {proveedor.comuna}
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm text-slate-700">
                                <Calendar size={16} className="text-emerald-600" />
                                <span>{anosLabel}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm text-slate-700">
                                <Star size={16} className="text-amber-400 fill-amber-400" />
                                <span className="font-bold">{globalRatingPromedio.toFixed(1)}</span>
                                <span className="text-slate-500">({globalTotalEvaluaciones} evaluaciones)</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm text-slate-700">
                                <Briefcase size={16} className="text-emerald-600" />
                                <span>{servicios.length} servicio{servicios.length !== 1 ? 's' : ''} activo{servicios.length !== 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN SOBRE MÍ */}
                {(proveedor.bio || proveedor.anios_experiencia || proveedor.certificaciones ||
                    proveedor.primera_ayuda || proveedor.miembro_asociacion ||
                    proveedor.sitio_web || proveedor.instagram || proveedor.tipo_entidad === "empresa") && (
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Sobre el proveedor</h2>
                            {/* Bio */}
                            {proveedor.bio && (
                                <BioExpandible bio={proveedor.bio} maxChars={300} />
                            )}

                            {/* Trust signals grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                {proveedor.anios_experiencia > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Clock size={16} className="text-emerald-600 shrink-0" />
                                        <span><strong>{proveedor.anios_experiencia}</strong> años de experiencia</span>
                                    </div>
                                )}
                                {proveedor.certificaciones && (
                                    <div className="flex items-start gap-2 text-sm text-slate-700">
                                        <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                        <span>{proveedor.certificaciones}</span>
                                    </div>
                                )}
                                {proveedor.primera_ayuda && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black shrink-0">+</span>
                                        <span>Certificado en Primeros Auxilios</span>
                                    </div>
                                )}
                                {proveedor.miembro_asociacion && (
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        <Award size={16} className="text-emerald-600 shrink-0" />
                                        <span>Miembro de Asociación Profesional</span>
                                    </div>
                                )}
                            </div>

                            {/* Empresa */}
                            {proveedor.tipo_entidad === "empresa" && (
                                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                                    <Briefcase size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900">{proveedor.nombre_fantasia || proveedor.razon_social}</p>
                                        {proveedor.giro && <p className="text-sm text-slate-500">{proveedor.giro}</p>}
                                    </div>
                                </div>
                            )}

                            {/* Redes sociales */}
                            {(proveedor.sitio_web || proveedor.instagram) && (
                                <div className="flex gap-4 pt-4 border-t border-slate-100">
                                    {proveedor.sitio_web && (
                                        <a href={proveedor.sitio_web.startsWith("http") ? proveedor.sitio_web : `https://${proveedor.sitio_web}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <Globe size={16} /> <span className="font-medium">Sitio web</span>
                                        </a>
                                    )}
                                    {proveedor.instagram && (
                                        <a href={`https://instagram.com/${proveedor.instagram.replace("@", "")}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-pink-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg">
                                            <Instagram size={16} /> <span className="font-medium">@{proveedor.instagram.replace("@", "")}</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                {/* SECCIÓN GALERÍA DEL ESPACIO */}
                {proveedor.galeria && proveedor.galeria.length > 0 && (
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Fotos de su espacio</h2>

                        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                            {proveedor.galeria.length === 1 ? (
                                <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden cursor-pointer" onClick={() => setGaleriaOpen(true)}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={proveedor.galeria[0]} alt="Espacio del proveedor" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                </div>
                            ) : proveedor.galeria.length < 4 ? (
                                <div className={`grid gap-2 grid-cols-${proveedor.galeria.length} h-48 md:h-64`}>
                                    {proveedor.galeria.map((url: string, i: number) => (
                                        <div key={i} className="rounded-2xl overflow-hidden cursor-pointer" onClick={() => setGaleriaOpen(true)}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 h-64 md:h-80">
                                    <div className="rounded-l-2xl overflow-hidden cursor-pointer" onClick={() => setGaleriaOpen(true)}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={proveedor.galeria[0]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="grid grid-rows-2 gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {proveedor.galeria.slice(1, 3).map((url: string, i: number) => (
                                                <div key={i} className={i === 1 ? "rounded-tr-2xl overflow-hidden cursor-pointer" : "overflow-hidden cursor-pointer"} onClick={() => setGaleriaOpen(true)}>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 relative">
                                            <div className="overflow-hidden cursor-pointer" onClick={() => setGaleriaOpen(true)}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={proveedor.galeria[3]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                            </div>
                                            {proveedor.galeria.length > 5 ? (
                                                <button onClick={() => setGaleriaOpen(true)} className="relative rounded-br-2xl overflow-hidden group border-0 p-0 text-left">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={proveedor.galeria[4]} alt="" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center transition-colors group-hover:bg-black/70">
                                                        <span className="text-white font-bold text-lg">+{proveedor.galeria.length - 4} fotos</span>
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="rounded-br-2xl overflow-hidden cursor-pointer" onClick={() => setGaleriaOpen(true)}>
                                                    {proveedor.galeria[4] && (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img src={proveedor.galeria[4]} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {galeriaOpen && (
                            <GalleryLightbox
                                images={proveedor.galeria}
                                isOpen={galeriaOpen}
                                onClose={() => setGaleriaOpen(false)}
                            />
                        )}
                    </section>
                )}

                {/* SECCIÓN 1.5: Credenciales y experiencia */}
                {proveedor.datos_especificos &&
                    Object.keys(proveedor.datos_especificos).length > 0 && (() => {
                        const entries = Object.entries(proveedor.datos_especificos)
                            .filter(([, v]) => v !== null && v !== '' && v !== false);
                        if (entries.length === 0) return null;
                        return (
                            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <ShieldCheck size={18} className="text-emerald-600" />
                                    Credenciales y experiencia
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {entries.map(([key, value]) => (
                                        <div key={key} className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">
                                                {LABELS_CAMPOS[key] ?? key}
                                            </span>
                                            <span className="text-sm font-medium text-slate-900">
                                                {formatValor(key, value)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        );
                    })()}

                {/* SECCIÓN 2: Servicios Ofrecidos */}
                <section>
                    <h2 className="text-xl font-bold text-slate-900 mb-6">Servicios ofrecidos</h2>

                    {servicios.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                {/* SECCIÓN 3: Evaluaciones */}
                <section className="space-y-6">
                    <h2 className="text-xl font-bold text-slate-900">Evaluaciones</h2>
                    <ReviewSummary proveedorId={proveedor.id} />
                    <ReviewList proveedorId={proveedor.id} />
                </section>

            </div>
        </div>
    );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params as { id: string };

    try {
        // 1. Fetch Proveedor
        const { data: proveedor, error: provError } = await supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .eq('estado', 'aprobado')
            .maybeSingle();

        if (provError || !proveedor) {
            return { notFound: true };
        }

        // 2. Fetch Servicios Publicados con Join a Categorías
        const { data: rawServices, error: servError } = await supabase
            .from('servicios_publicados')
            .select(`
                id, titulo, descripcion, precio_desde, precio_hasta, unidad_precio, fotos, destacado,
                categorias_servicio!inner (nombre, slug, icono)
            `)
            .eq('proveedor_id', id)
            .eq('activo', true);

        let servicios: ServiceResult[] = [];

        // 3. Fetch Evaluaciones (para el proveedor)
        const { data: evaluaciones, error: evalError } = await supabase
            .from('evaluaciones')
            .select('rating, servicio_id')
            .eq('proveedor_id', id)
            .eq('estado', 'aprobado');

        // Calcular globales
        let globalRatingPromedio = 0;
        let globalTotalEvaluaciones = 0;

        if (evaluaciones && evaluaciones.length > 0) {
            globalTotalEvaluaciones = evaluaciones.length;
            const sum = evaluaciones.reduce((acc, curr) => acc + curr.rating, 0);
            globalRatingPromedio = sum / globalTotalEvaluaciones;
        }

        // Map data to ServiceResult structure
        if (rawServices && rawServices.length > 0) {
            servicios = rawServices.map((rs: any) => {
                const cat = Array.isArray(rs.categorias_servicio) ? rs.categorias_servicio[0] : rs.categorias_servicio;

                // Calcular specs del servicio individual
                const evalsServicio = evaluaciones?.filter((e: any) => e.servicio_id === rs.id) || [];
                const totServ = evalsServicio.length;
                const promServ = totServ > 0 ? (evalsServicio.reduce((a: number, b: any) => a + b.rating, 0) / totServ) : 0;

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
                    total_evaluaciones: totServ
                };
            });
        }

        return {
            props: {
                proveedor,
                servicios,
                globalRatingPromedio,
                globalTotalEvaluaciones
            }
        };

    } catch (e) {
        console.error("Error en getServerSideProps de proveedor", e);
        return { notFound: true };
    }
};
