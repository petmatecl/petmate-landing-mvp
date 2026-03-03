import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../contexts/UserContext";

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

const PAGE_SIZE = 20;

function getPaginationItems(current: number, total: number): (number | "...")[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 2) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function ExplorarPage() {
    const router = useRouter();
    const gridRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();

    const [categories, setCategories] = useState<Category[]>([]);
    const [services, setServices] = useState<ServiceResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [favoritoIds, setFavoritoIds] = useState<string[]>([]);
    const [comunasSugeridas, setComunasSugeridas] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        q: "",
        categoria: null as string | null,
        comuna: "",
        mascota: "any" as "perro" | "gato" | "otro" | "any",
        tamano: null as "pequeno" | "mediano" | "grande" | null,
        precioMin: "",
        precioMax: "",
        orden: "relevancia" as "relevancia" | "rating" | "precio_asc" | "precio_desc"
    });

    const [pagina, setPagina] = useState(1);

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

    // 1b. Cargar IDs de favoritos del usuario autenticado (batch, evita N+1)
    useEffect(() => {
        if (!user) { setFavoritoIds([]); return; }
        async function fetchFavoritos() {
            const { data } = await supabase
                .from('favoritos')
                .select('servicio_id')
                .eq('auth_user_id', user.id);
            if (data) setFavoritoIds(data.map((f: any) => f.servicio_id));
        }
        fetchFavoritos();
    }, [user]);

    // 2. Sincronizar estado local con Query Params de la URL
    useEffect(() => {
        if (!router.isReady) return;
        const { q, categoria, comuna, mascota, tamano, precioMin, precioMax, orden, pagina: paginaParam } = router.query;

        setFilters({
            q: (q as string) || "",
            categoria: (categoria as string) || null,
            comuna: (comuna as string) || "",
            mascota: (mascota as "perro" | "gato" | "otro" | "any") || "any",
            tamano: (tamano as "pequeno" | "mediano" | "grande" | null) || null,
            precioMin: (precioMin as string) || "",
            precioMax: (precioMax as string) || "",
            orden: (orden as "relevancia" | "rating" | "precio_asc" | "precio_desc") || "relevancia"
        });

        const p = parseInt(paginaParam as string);
        setPagina(Number.isFinite(p) && p >= 1 ? p : 1);
    }, [router.isReady, router.query]);

    // 3. Ejecutar búsqueda
    const fetchServices = useCallback(async () => {
        if (!router.isReady) return;

        setLoading(true);
        setComunasSugeridas([]);
        try {
            const { data, error } = await supabase.rpc('buscar_servicios', {
                p_categoria_slug: filters.categoria,
                p_comuna: filters.comuna || null,
                p_tipo_mascota: filters.mascota === 'any' ? null : filters.mascota,
                p_tamano: filters.tamano || null,
                p_precio_max: filters.precioMax ? parseInt(filters.precioMax) : null,
                p_precio_min: filters.precioMin ? parseInt(filters.precioMin) : null,
                p_texto: filters.q || null,
                p_limit: PAGE_SIZE,
                p_offset: (pagina - 1) * PAGE_SIZE
            });
            if (error) throw error;

            const localData: any[] = data || [];
            const serverTotal = localData.length > 0 ? Number(localData[0].total_count) : 0;

            // Ordenamiento en cliente
            localData.sort((a: any, b: any) => {
                if (filters.orden === "rating") {
                    if (b.rating_promedio !== a.rating_promedio) return b.rating_promedio - a.rating_promedio;
                    return b.total_evaluaciones - a.total_evaluaciones;
                }
                if (filters.orden === "precio_asc") return a.precio_desde - b.precio_desde;
                if (filters.orden === "precio_desc") return b.precio_desde - a.precio_desde;
                if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
                if (b.rating_promedio !== a.rating_promedio) return b.rating_promedio - a.rating_promedio;
                return b.total_evaluaciones - a.total_evaluaciones;
            });

            setTotalCount(serverTotal);
            setServices(localData);

            // Si no hay resultados con comuna + categoria → sugerir comunas cercanas
            if (localData.length === 0 && filters.comuna && filters.categoria) {
                const { data: altData } = await supabase.rpc('buscar_servicios', {
                    p_categoria_slug: filters.categoria,
                    p_comuna: null,
                    p_tipo_mascota: null,
                    p_tamano: null,
                    p_precio_max: null,
                    p_precio_min: null,
                    p_texto: null,
                    p_limit: 50,
                    p_offset: 0
                });
                if (altData && altData.length > 0) {
                    const comunas = Array.from(new Set(
                        (altData as any[]).map(s => s.proveedor_comuna).filter(Boolean)
                    )).slice(0, 4) as string[];
                    setComunasSugeridas(comunas);
                }
            }
        } catch (err) {
            console.error("Error fetching services:", err);
        } finally {
            setLoading(false);
        }
    }, [filters, pagina, router.isReady]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // 4. Cambio de página con scroll a grilla
    const goToPage = useCallback((p: number) => {
        const total = Math.ceil(totalCount / PAGE_SIZE);
        if (p < 1 || p > total) return;

        const query: Record<string, string> = {};
        if (filters.q) query.q = filters.q;
        if (filters.categoria) query.categoria = filters.categoria;
        if (filters.comuna) query.comuna = filters.comuna;
        if (filters.mascota && filters.mascota !== 'any') query.mascota = filters.mascota;
        if (filters.mascota === 'perro' && filters.tamano) query.tamano = filters.tamano;
        if (filters.precioMin) query.precioMin = filters.precioMin;
        if (filters.precioMax) query.precioMax = filters.precioMax;
        if (filters.orden && filters.orden !== 'relevancia') query.orden = filters.orden;
        if (p > 1) query.pagina = String(p);

        router.push({ pathname: '/explorar', query }, undefined, { shallow: true });

        setTimeout(() => {
            gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }, [filters, router, totalCount]);

    // 5. Actualizar filtros (resetea a página 1)
    const updateQueryParams = (newParams: Partial<typeof filters>) => {
        const combined = { ...filters, ...newParams };

        const query: Record<string, string> = {};
        if (combined.q) query.q = combined.q;
        if (combined.categoria) query.categoria = combined.categoria;
        if (combined.comuna) query.comuna = combined.comuna;
        if (combined.mascota && combined.mascota !== 'any') query.mascota = combined.mascota;
        if (combined.mascota === 'perro' && combined.tamano) query.tamano = combined.tamano;
        if (combined.precioMin) query.precioMin = combined.precioMin;
        if (combined.precioMax) query.precioMax = combined.precioMax;
        if (combined.orden && combined.orden !== 'relevancia') query.orden = combined.orden;

        router.push({ pathname: '/explorar', query }, undefined, { shallow: true });
    };

    const handleClearFilters = () => {
        router.push({ pathname: '/explorar' }, undefined, { shallow: true });
    };

    const totalPaginas = Math.ceil(totalCount / PAGE_SIZE);
    const paginationItems = getPaginationItems(pagina, totalPaginas);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Head>
                <title>Explorar Servicios | Pawnecta</title>
                <meta name="description" content="Busca y encuentra cuidadores, paseadores, entrenadores y veterinarios verificados en tu comuna." />
            </Head>

            {/* Filter Bar — sticky bajo el header global (h-16 = 64px = top-16) */}
            <div className="sticky top-16 z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="border-b border-slate-100">
                    <CategoryChips
                        categories={categories}
                        selectedCategory={filters.categoria}
                        onSelect={(slug) => updateQueryParams({ categoria: slug })}
                    />
                </div>
                <ServiceFilters
                    filters={filters}
                    onFilterChange={updateQueryParams}
                    onClear={handleClearFilters}
                />
            </div>

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                {/* Encabezado */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
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

                {/* Grilla */}
                {loading ? (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                        <ServiceSkeleton />
                    </div>
                ) : services.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-6">
                            <Search size={28} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {filters.comuna ? `Sin resultados en ${filters.comuna}` : 'Sin resultados con estos filtros'}
                        </h3>

                        {comunasSugeridas.length > 0 ? (
                            <>
                                <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
                                    Hay proveedores disponibles en comunas cercanas:
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 mt-4">
                                    {comunasSugeridas.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => updateQueryParams({ comuna: c })}
                                            className="inline-flex px-4 py-2 border border-slate-200 rounded-full text-sm text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
                                Intenta ajustar los filtros o ampliar la búsqueda.
                            </p>
                        )}

                        <div className="flex justify-center gap-3 mt-8">
                            <button onClick={handleClearFilters} className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                                Ver todos los servicios
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Barra superior: conteo + orden */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                            <p className="text-slate-500 font-medium shrink-0">
                                {totalCount} resultado{totalCount !== 1 ? 's' : ''}
                                {totalPaginas > 1 && (
                                    <span className="text-slate-400 font-normal ml-1">
                                        — página {pagina} de {totalPaginas}
                                    </span>
                                )}
                            </p>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto">
                                <label className="text-sm font-medium text-slate-500 hidden sm:block">Ordenar por:</label>
                                <select
                                    value={filters.orden}
                                    onChange={(e) => updateQueryParams({ orden: e.target.value as any })}
                                    className="w-full sm:w-auto border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors cursor-pointer appearance-none"
                                >
                                    <option value="relevancia">Relevancia</option>
                                    <option value="rating">Mejor evaluados</option>
                                    <option value="precio_asc">Menor precio</option>
                                    <option value="precio_desc">Mayor precio</option>
                                </select>
                            </div>
                        </div>

                        {/* Grilla de resultados */}
                        <div ref={gridRef} className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {services.map((service) => (
                                <ServiceCard key={service.servicio_id} service={service} isFavorite={favoritoIds.includes(service.servicio_id)} />
                            ))}
                        </div>

                        {/* Controles de paginación */}
                        {totalPaginas > 1 && (
                            <div className="mt-10 flex items-center justify-center gap-1.5">
                                <button
                                    onClick={() => goToPage(pagina - 1)}
                                    disabled={pagina === 1}
                                    className={`flex items-center gap-1 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pagina === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeft size={16} />
                                    <span className="hidden sm:inline">Anterior</span>
                                </button>

                                <div className="hidden sm:flex items-center gap-1.5">
                                    {paginationItems.map((item, idx) =>
                                        item === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-slate-400 text-sm select-none">…</span>
                                        ) : (
                                            <button
                                                key={item}
                                                onClick={() => goToPage(item as number)}
                                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item === pagina ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                                aria-current={item === pagina ? 'page' : undefined}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}
                                </div>

                                <span className="sm:hidden rounded-lg px-3 py-2 text-sm font-medium bg-emerald-600 text-white">
                                    {pagina}
                                </span>

                                <button
                                    onClick={() => goToPage(pagina + 1)}
                                    disabled={pagina === totalPaginas}
                                    className={`flex items-center gap-1 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${pagina === totalPaginas ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                                    aria-label="Página siguiente"
                                >
                                    <span className="hidden sm:inline">Siguiente</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
