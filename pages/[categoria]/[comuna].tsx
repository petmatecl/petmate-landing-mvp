import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import ServiceCard, { ServiceResult } from '../../components/Explore/ServiceCard';
import { ChevronRightIcon } from '@heroicons/react/24/solid';

export const COMUNAS_SEO = [
    { slug: 'providencia', name: 'Providencia' },
    { slug: 'las-condes', name: 'Las Condes' },
    { slug: 'nunoa', name: 'Ñuñoa' },
    { slug: 'vitacura', name: 'Vitacura' },
    { slug: 'la-reina', name: 'La Reina' },
    { slug: 'miraflores', name: 'Miraflores' },
    { slug: 'santiago', name: 'Santiago' },
    { slug: 'macul', name: 'Macul' },
    { slug: 'penalolen', name: 'Peñalolén' },
    { slug: 'la-florida', name: 'La Florida' },
    { slug: 'maipu', name: 'Maipú' },
    { slug: 'lo-barnechea', name: 'Lo Barnechea' },
    { slug: 'san-miguel', name: 'San Miguel' },
    { slug: 'estacion-central', name: 'Estación Central' },
    { slug: 'pudahuel', name: 'Pudahuel' },
];

interface SEOServicePageProps {
    categoria: {
        nombre: string;
        slug: string;
        descripcion?: string;
    };
    comuna: {
        name: string;
        slug: string;
    };
    services: ServiceResult[];
}

export default function SEOServicePage({ categoria, comuna, services }: SEOServicePageProps) {
    const pageTitle = `${categoria.nombre} en ${comuna.name} | Pawnecta`;
    const pageDescription = `Encuentra los mejores servicios de ${categoria.nombre.toLowerCase()} en ${comuna.name}. Proveedores verificados, reseñas reales y contacto directo sin intermediarios.`;

    // JSON-LD local business mockup for services
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": services.map((service, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "LocalBusiness",
                "name": service.titulo,
                "description": service.descripcion,
                "image": service.fotos?.[0] || "https://www.pawnecta.cl/favicon_sin_fondo_png.png",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": comuna.name,
                    "addressCountry": "CL"
                },
                "url": `https://www.pawnecta.cl/servicio/${service.servicio_id}`,
                "priceRange": service.precio_desde ? `$${service.precio_desde.toLocaleString('es-CL')}` : undefined
            }
        }))
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
                />
            </Head>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Breadcrumb */}
                <nav className="flex items-center text-sm text-slate-500 mb-8 font-medium">
                    <Link href="/" className="hover:text-emerald-600 transition-colors">Inicio</Link>
                    <ChevronRightIcon className="w-4 h-4 mx-2 text-slate-300" />
                    <Link href={`/${categoria.slug}`} className="hover:text-emerald-600 transition-colors">{categoria.nombre}</Link>
                    <ChevronRightIcon className="w-4 h-4 mx-2 text-slate-300" />
                    <span className="text-slate-900">{comuna.name}</span>
                </nav>

                {/* Encabezado */}
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        {categoria.nombre} en <span className="text-emerald-600">{comuna.name}</span>
                    </h1>
                    <p className="text-lg text-slate-600 mt-4 max-w-2xl">
                        {categoria.descripcion || `Descubre los mejores profesionales de ${categoria.nombre.toLowerCase()} en ${comuna.name}. En Pawnecta verificamos la identidad de cada proveedor para tu tranquilidad.`}
                    </p>
                </div>

                {/* Grilla de Servicios */}
                {services.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="text-6xl mb-4">🐾</div>
                        <h3 className="text-xl font-bold text-slate-900">
                            Aún no hay profesionales en {comuna.name}
                        </h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            Sé el primero en ofrecer servicios de {categoria.nombre.toLowerCase()} en esta comuna y consigue nuevos clientes.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Link
                                href="/register?role=proveedor"
                                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                                Ofrecer mis servicios
                            </Link>
                            <Link
                                href={`/${categoria.slug}`}
                                className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 transition-all"
                            >
                                Ver otras comunas
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-end mb-6">
                            <p className="text-slate-500 font-medium">
                                {services.length} profesional{services.length !== 1 ? 'es' : ''} disponible{services.length !== 1 ? 's' : ''}
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
    // Obtener categorías activas
    const { data: categorias } = await supabase
        .from('categorias_servicio')
        .select('slug')
        .eq('activa', true);

    if (!categorias) {
        return { paths: [], fallback: 'blocking' };
    }

    // Generar combinación de paths: categoría * comuna
    const paths: any[] = [];
    categorias.forEach((cat) => {
        COMUNAS_SEO.forEach((comuna) => {
            paths.push({
                params: {
                    categoria: cat.slug,
                    comuna: comuna.slug
                }
            });
        });
    });

    return {
        paths,
        fallback: 'blocking' // Si se agrega una nueva categoría o comuna on-the-fly, se genera al visitar
    };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const categorySlug = params?.categoria as string;
    const comunaSlug = params?.comuna as string;

    // 1. Obtener la categoría
    const { data: catData, error: catError } = await supabase
        .from('categorias_servicio')
        .select('id, nombre, slug, descripcion')
        .eq('slug', categorySlug)
        .single();

    if (catError || !catData) {
        return { notFound: true };
    }

    // 2. Obtener el nombre de la comuna basado en el slug (si es uno de los predefinidos)
    // Si entra por un fallback dinámico y no está en la lista, usamos el slug capitalizado (o podrías hacer return notFound)
    let comunaName = comunaSlug;
    const predefinedComuna = COMUNAS_SEO.find(c => c.slug === comunaSlug);

    if (predefinedComuna) {
        comunaName = predefinedComuna.name;
    } else {
        // Basic humanization for dynamic unknown slugs
        comunaName = comunaSlug
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // 3. Buscar servicios
    const { data: services, error: servicesError } = await supabase.rpc('buscar_servicios', {
        p_categoria_slug: categorySlug,
        p_comuna: comunaName,
        p_tipo_mascota: null,
        p_tamano: null,
        p_precio_max: null
    });

    if (servicesError) {
        console.error("Error fetching SEO services:", servicesError);
    }

    return {
        props: {
            categoria: catData,
            comuna: { name: comunaName, slug: comunaSlug },
            services: services || [],
        },
        revalidate: 3600, // Revalidar cada hora
    };
};
