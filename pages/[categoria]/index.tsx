import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import { ChevronRightIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import { COMUNAS_SEO } from './[comuna]';

interface CategoryPageProps {
    categoria: {
        nombre: string;
        slug: string;
        descripcion?: string;
    };
    services: ServiceResult[];
}

export default function CategoryPage({ categoria, services }: CategoryPageProps) {
    const pageTitle = `${categoria.nombre} | Encuentra Profesionales en Pawnecta`;
    const pageDescription = `Encuentra los mejores proveedores de ${categoria.nombre.toLowerCase()} en Santiago y Chile. Perfiles verificados, reseñas reales y trato personalizado.`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
            </Head>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Breadcrumb */}
                <nav className="flex items-center text-sm text-slate-500 mb-8 font-medium">
                    <Link href="/" className="hover:text-emerald-600 transition-colors">Inicio</Link>
                    <ChevronRightIcon className="w-4 h-4 mx-2 text-slate-300" />
                    <span className="text-slate-900">{categoria.nombre}</span>
                </nav>

                {/* Encabezado */}
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {categoria.nombre} <span className="text-emerald-600">cerca de ti</span>
                    </h1>
                    <p className="text-lg text-slate-600 mt-4 max-w-2xl">
                        {categoria.descripcion || `Descubre los mejores profesionales de ${categoria.nombre.toLowerCase()} en nuestra red. Filtra por tu comuna para encontrar opciones más cercanas.`}
                    </p>
                </div>

                {/* Buscador Rápido de Comunas (Enlaces SEO) */}
                <div className="mb-12 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPinIcon className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-bold text-slate-900">Busca por comuna en Santiago</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {COMUNAS_SEO.map((comuna) => (
                            <Link
                                key={comuna.slug}
                                href={`/${categoria.slug}/${comuna.slug}`}
                                className="px-4 py-2 bg-slate-50 text-slate-700 font-medium rounded-full border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all text-sm"
                            >
                                {comuna.name}
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Grilla de Servicios (Todos los de la categoría) */}
                {services.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-6">
                            <Search size={28} className="text-slate-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            Sin resultados por ahora
                        </h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            Intenta con otra categoria o comuna.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <Link href="/explorar" className="px-6 py-3 bg-transparent text-slate-700 font-medium rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors">
                                Ver todos los servicios
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-end mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">
                                Todos los profesionales
                            </h2>
                            <p className="text-slate-500 font-medium">
                                {services.length} resultado{services.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {services.map((service) => (
                                <ServiceCard key={service.servicio_id} service={service} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const { data: categorias } = await supabase
        .from('categorias_servicio')
        .select('slug')
        .eq('activa', true);

    if (!categorias) {
        return { paths: [], fallback: 'blocking' };
    }

    const paths = categorias.map((cat) => ({
        params: { categoria: cat.slug }
    }));

    return {
        paths,
        fallback: 'blocking'
    };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const categorySlug = params?.categoria as string;

    // 1. Obtener categoría
    const { data: catData, error: catError } = await supabase
        .from('categorias_servicio')
        .select('id, nombre, slug, descripcion')
        .eq('slug', categorySlug)
        .single();

    if (catError || !catData) {
        return { notFound: true };
    }

    // 2. Buscar servicios (sin filtro de comuna, pero podríamos limitar a los 100 mejores para SEO inicial)
    const { data: services, error: servicesError } = await supabase.rpc('buscar_servicios', {
        p_categoria_slug: categorySlug,
        // Dejamos comuna null para traer todos
        p_comuna: null,
        p_tipo_mascota: null,
        p_tamano: null,
        p_precio_max: null
    });

    if (servicesError) {
        console.error("Error fetching category services:", servicesError);
    }

    return {
        props: {
            categoria: catData,
            services: services || [],
        },
        revalidate: 3600, // Revalidar cada hora
    };
};
