import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { ShieldCheck, Star } from 'lucide-react';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import ReviewSummary from '../../components/Service/ReviewSummary';
import ReviewList from '../../components/Service/ReviewList';

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
    if (!proveedor) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <p className="text-slate-500 font-medium">Proveedor no encontrado o inactivo.</p>
            </div>
        );
    }

    const title = `${proveedor.nombre} ${proveedor.apellido_p} — Proveedor de servicios en ${proveedor.comuna} | Pawnecta`;
    const desc = `Conoce a ${proveedor.nombre}, proveedor de servicios para mascotas en ${proveedor.comuna}. Revisa sus servicios, tarifas y las evaluaciones de otros clientes en Pawnecta.`;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Head>
                <title>{title}</title>
                <meta name="description" content={desc} />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

                {/* SECCIÓN 1: Header del Proveedor */}
                <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 relative">
                    {/* Foto de perfil */}
                    <div className="w-20 h-20 rounded-full bg-slate-200 shrink-0 border border-slate-200 overflow-hidden relative">
                        {proveedor.foto_perfil ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={proveedor.foto_perfil} alt={proveedor.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-100 text-2xl">
                                {proveedor.nombre.charAt(0)}
                            </div>
                        )}
                    </div>

                    {/* Información Principal */}
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2 justify-center md:justify-start">
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

                        <p className="text-slate-500 font-medium mb-3">
                            {proveedor.comuna}
                        </p>

                        <div className="flex items-center justify-center md:justify-start gap-1 text-slate-700 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl w-max mx-auto md:mx-0">
                            <Star className="text-amber-400 fill-amber-400" size={16} />
                            <span className="font-bold text-sm">{globalRatingPromedio.toFixed(1)}</span>
                            <span className="text-slate-500 text-xs ml-1">({globalTotalEvaluaciones} evaluaciones)</span>
                        </div>

                        {proveedor.sobre_mi && (
                            <p className="mt-4 text-slate-600 text-sm leading-relaxed max-w-2xl whitespace-pre-wrap">
                                {proveedor.sobre_mi}
                            </p>
                        )}
                    </div>
                </section>

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
