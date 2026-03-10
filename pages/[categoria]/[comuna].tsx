import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps, GetStaticPaths } from 'next';
import { supabase } from '../../lib/supabaseClient';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';

// --- Comunas for SEO ---
export const COMUNAS_SEO: { slug: string; name: string }[] = [
    { slug: 'providencia', name: 'Providencia' },
    { slug: 'las-condes', name: 'Las Condes' },
    { slug: 'nunoa', name: 'Ñuñoa' },
    { slug: 'vitacura', name: 'Vitacura' },
    { slug: 'santiago', name: 'Santiago' },
    { slug: 'maipu', name: 'Maipú' },
    { slug: 'la-florida', name: 'La Florida' },
    { slug: 'san-miguel', name: 'San Miguel' },
    { slug: 'macul', name: 'Macul' },
    { slug: 'la-reina', name: 'La Reina' },
    { slug: 'lo-barnechea', name: 'Lo Barnechea' },
    { slug: 'penalolen', name: 'Peñalolén' },
    { slug: 'pudahuel', name: 'Pudahuel' },
    { slug: 'quilicura', name: 'Quilicura' },
    { slug: 'estacion-central', name: 'Estación Central' },
];

// --- Utility functions ---
export function comunaToSlug(nombre: string): string {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

export function slugToComuna(slug: string): string {
    // Map of common slugs to proper names
    const COMUNAS: Record<string, string> = {
        'providencia': 'Providencia',
        'las-condes': 'Las Condes',
        'nunoa': 'Ñuñoa',
        'vitacura': 'Vitacura',
        'santiago': 'Santiago',
        'maipu': 'Maipú',
        'la-florida': 'La Florida',
        'san-miguel': 'San Miguel',
        'macul': 'Macul',
        'la-reina': 'La Reina',
        'lo-barnechea': 'Lo Barnechea',
        'penalolen': 'Peñalolén',
        'pudahuel': 'Pudahuel',
        'quilicura': 'Quilicura',
        'estacion-central': 'Estación Central',
        'cerrillos': 'Cerrillos',
        'renca': 'Renca',
        'conchali': 'Conchalí',
        'huechuraba': 'Huechuraba',
        'independencia': 'Independencia',
    };
    return COMUNAS[slug] || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

interface Props {
    categoria: { nombre: string; slug: string; icono: string } | null;
    comuna: string;
    services: ServiceResult[];
}

export default function CategoriaComuna({ categoria, comuna, services }: Props) {
    if (!categoria) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-slate-500">Categoría no encontrada.</p>
            </div>
        );
    }

    const title = `${categoria.nombre} en ${comuna} | Pawnecta`;
    const description = `Encuentra ${services.length > 0 ? services.length : ''} proveedores de ${categoria.nombre.toLowerCase()} verificados en ${comuna}. Compara perfiles, lee evaluaciones y contacta directo. Gratis.`;

    // JSON-LD ItemList
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${categoria.nombre} en ${comuna}`,
        numberOfItems: services.length,
        itemListElement: services.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `https://www.pawnecta.com/servicio/${s.servicio_id}`,
            name: s.titulo,
        })),
    };

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </Head>

            <div className="min-h-screen bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8" aria-label="Breadcrumb">
                        <Link href="/" className="hover:text-emerald-600 transition-colors">Inicio</Link>
                        <span>/</span>
                        <Link href="/explorar" className="hover:text-emerald-600 transition-colors">Explorar</Link>
                        <span>/</span>
                        <Link href={`/explorar?categoria=${categoria.slug}`} className="hover:text-emerald-600 transition-colors capitalize">{categoria.nombre}</Link>
                        <span>/</span>
                        <span className="text-slate-800 font-medium">{comuna}</span>
                    </nav>

                    {/* Header */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-slate-900">
                            {categoria.nombre} en {comuna}
                        </h1>
                        <p className="text-slate-500 mt-2 max-w-2xl">
                            {services.length > 0
                                ? `Encuentra ${services.length} proveedor${services.length !== 1 ? 'es' : ''} de ${categoria.nombre.toLowerCase()} en ${comuna}. Compara perfiles y contacta directo.`
                                : `Proveedores verificados | Pawnecta`
                            }
                        </p>
                    </div>

                    {/* Grid */}
                    {services.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {services.map(s => (
                                <ServiceCard key={s.servicio_id} service={s} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm max-w-xl mx-auto">
                            <p className="text-lg font-bold text-slate-800 mb-2">Sin proveedores por el momento</p>
                            <p className="text-slate-500 text-sm mb-6">
                                Aún no hay proveedores de {categoria.nombre.toLowerCase()} en {comuna}. Prueba buscar en comunas cercanas.
                            </p>
                            <Link
                                href={`/explorar?categoria=${categoria.slug}`}
                                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                            >
                                Ver todos los proveedores de {categoria.nombre}
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export const getStaticPaths: import('next').GetStaticPaths = async () => {
    const categorias = [
        'hospedaje', 'guarderia-diurna', 'paseo', 'visita-domicilio',
        'peluqueria', 'adiestramiento', 'veterinaria', 'traslado'
    ];
    const paths = [];
    for (const cat of categorias) {
        for (const com of COMUNAS_SEO) {
            paths.push({ params: { categoria: cat, comuna: com.slug } });
        }
    }
    return {
        paths,
        fallback: 'blocking'
    };
};

export const getStaticProps: import('next').GetStaticProps = async ({ params }) => {
    const { categoria: categoriaSlug, comuna: comunaSlug } = params as { categoria: string; comuna: string };
    const comunaNombre = slugToComuna(comunaSlug);

    try {
        // Get categoria info
        const { data: catData } = await supabase
            .from('categorias_servicio')
            .select('nombre, slug, icono')
            .eq('slug', categoriaSlug)
            .maybeSingle();

        const categoria = catData || null;

        // Get services via RPC
        let services: ServiceResult[] = [];
        if (categoria) {
            const { data } = await supabase.rpc('buscar_servicios', {
                p_categoria_slug: categoriaSlug,
                p_comuna: comunaNombre,
                p_limit: 30,
                p_offset: 0,
            });

            services = (data || []).map((s: any) => ({
                servicio_id: s.servicio_id,
                titulo: s.titulo,
                descripcion: s.descripcion,
                precio_desde: s.precio_desde,
                precio_hasta: s.precio_hasta,
                unidad_precio: s.unidad_precio,
                fotos: s.fotos || [],
                categoria_nombre: s.categoria_nombre,
                categoria_slug: s.categoria_slug,
                categoria_icono: s.categoria_icono,
                proveedor_id: s.proveedor_id,
                proveedor_nombre: s.proveedor_nombre,
                proveedor_foto: s.proveedor_foto || '',
                proveedor_comuna: s.proveedor_comuna || '',
                destacado: s.destacado || false,
                rating_promedio: s.rating_promedio || 0,
                total_evaluaciones: s.total_evaluaciones || 0,
                proveedor_updated_at: s.proveedor_updated_at ?? null,
            }));
        }

        return {
            props: { categoria, comuna: comunaNombre, services },
            revalidate: 3600 // Revalidate every hour
        };
    } catch (e) {
        console.error('Error en [categoria]/[comuna] getStaticProps:', e);
        return { props: { categoria: null, comuna: comunaNombre, services: [] }, revalidate: 3600 };
    }
};
