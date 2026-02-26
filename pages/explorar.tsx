import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { Search } from "lucide-react";
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

    const [filters, setFilters] = useState({
        q: "",
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
        const { q, categoria, comuna, mascota, tamano, precioMax } = router.query;

        setFilters({
            q: (q as string) || "",
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

            let localData = data || [];
            if (filters.q) {
                const searchLower = filters.q.toLowerCase();
                localData = localData.filter((s: any) =>
                    s.titulo.toLowerCase().includes(searchLower) ||
                    s.descripcion?.toLowerCase().includes(searchLower)
                );
            }
            setServices(localData);
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
        if (combined.q) query.q = combined.q;
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
                        {filters.q ? `Resultados para "${filters.q}"` : (
                            filters.categoria
                                ? `${categories.find(c => c.slug === filters.categoria)?.nombre || "Servicios"} en tu zona`
                                : "Explorar en tu zona"
                        )}
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
