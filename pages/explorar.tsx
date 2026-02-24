import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

import CategoryChips from "../components/Explore/CategoryChips";
import ServiceFilters from "../components/Explore/ServiceFilters";
import ServiceCard, { ServiceResult } from "../components/Explore/ServiceCard";
import ServiceSkeleton from "../components/Explore/ServiceSkeleton";

interface Category {
    id: number;
    slug: string;
    nombre: string;
    icono: string;
}

export default function ExplorarPage() {
    const router = useRouter();

    // Estados
    const [categories, setCategories] = useState<Category[]>([]);
    const [services, setServices] = useState<ServiceResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado de Filtros extraidos de URL
    const [filters, setFilters] = useState({
        categoria: null as string | null,
        comuna: "",
        mascota: "any" as "perro" | "gato" | "otro" | "any",
        tamano: null as "pequeno" | "mediano" | "grande" | null,
        precioMax: ""
    });

    // 1. Cargar Categorías
    useEffect(() => {
        async function fetchCategories() {
            const { data, error } = await supabase
                .from('categorias_servicio')
                .select('*')
                .eq('activa', true)
                .order('orden', { ascending: true });
            if (!error && data) {
                setCategories(data);
            }
        }
        fetchCategories();
    }, []);

    // 2. Sincronizar estado local con Query Params de la URL
    useEffect(() => {
        if (!router.isReady) return;
        const { categoria, comuna, mascota, tamano, precioMax } = router.query;

        setFilters({
            categoria: (categoria as string) || null,
            comuna: (comuna as string) || "",
            mascota: (mascota as "perro" | "gato" | "otro" | "any") || "any",
            tamano: (tamano as "pequeno" | "mediano" | "grande" | null) || null,
            precioMax: (precioMax as string) || ""
        });
    }, [router.isReady, router.query]);

    // 3. Ejecutar búsqueda basada en *estado local actualizado*
    const fetchServices = useCallback(async () => {
        // Evita refetch si router aún no monta queries iniciales
        if (!router.isReady) return;

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('buscar_servicios', {
                p_categoria_slug: filters.categoria,
                p_comuna: filters.comuna || null,
                p_tipo_mascota: filters.mascota === 'any' ? null : filters.mascota,
                p_tamano: filters.tamano || null,
                p_precio_max: filters.precioMax ? parseInt(filters.precioMax) : null
            });

            if (error) throw error;
            setServices(data || []);
        } catch (err) {
            console.error("Error fetching services:", err);
        } finally {
            setLoading(false);
        }
    }, [filters, router.isReady]);

    // Disparar effecto cuando cambian los filtros (después que se parseen de URL)
    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // 4. Manejador de cambios (Actualiza la URL, lo que dispara los useEffects)
    const updateQueryParams = (newParams: Partial<typeof filters>) => {
        const combined = { ...filters, ...newParams };

        // Limpiar query params nulos o vacíos para una URL limpia
        const query: Record<string, string> = {};
        if (combined.categoria) query.categoria = combined.categoria;
        if (combined.comuna) query.comuna = combined.comuna;
        if (combined.mascota && combined.mascota !== 'any') query.mascota = combined.mascota;
        if (combined.mascota === 'perro' && combined.tamano) query.tamano = combined.tamano;
        if (combined.precioMax) query.precioMax = combined.precioMax;

        router.push({ pathname: '/explorar', query }, undefined, { shallow: true });
    };

    const handleClearFilters = () => {
        router.push({ pathname: '/explorar' }, undefined, { shallow: true });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Head>
                <title>Explorar Servicios | Pawnecta</title>
                <meta name="description" content="Busca y encuentra cuidadores, paseadores, entrenadores y veterinarios verificados en tu comuna." />
            </Head>

            {/* 1. Category Chips (Sticky Top 1) */}
            <div className="sticky top-0 z-40">
                <CategoryChips
                    categories={categories}
                    selectedCategory={filters.categoria}
                    onSelect={(slug) => updateQueryParams({ categoria: slug })}
                />
            </div>

            {/* 2. Secondary Filters (Sticky Top 2 debajo de categorías) */}
            <div className="sticky top-[73px] z-30">
                <ServiceFilters
                    filters={filters}
                    onFilterChange={updateQueryParams}
                    onClear={handleClearFilters}
                />
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* Encabezado de la página */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {filters.categoria
                            ? categories.find(c => c.slug === filters.categoria)?.nombre || "Servicios"
                            : "Explorar"} en tu zona
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Descubre los mejores profesionales y amantes de las mascotas en Pawnecta.
                    </p>
                </div>

                {/* Grilla de Resultados / Skeletons */}
                {loading ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="text-6xl mb-4">🐾</div>
                        <h3 className="text-xl font-bold text-slate-900">
                            No encontramos servicios {filters.comuna ? `en ${filters.comuna}` : 'con estos filtros'}
                        </h3>
                        <p className="text-slate-500 mt-2 max-w-md mx-auto">
                            Intenta ampliando tu criterio de búsqueda o buscando en otra comuna cercana.
                        </p>
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={handleClearFilters}
                                className="px-6 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl hover:bg-emerald-200 transition-colors"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-slate-500 font-medium mb-6">
                            {services.length} resultado{services.length !== 1 ? 's' : ''}
                        </p>
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
