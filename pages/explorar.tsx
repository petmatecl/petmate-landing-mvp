import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from "next/router";
import { Search, ChevronLeft, ChevronRight, Filter, X, MapPin, Dog, Cat, PawPrint, DollarSign, CalendarDays, List, Map } from "lucide-react";

const CaregiverMap = dynamic(() => import('../components/Explore/CaregiverMap'), {
    ssr: false,
    loading: () => (
        <div className="h-[580px] w-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center">
            <p className="text-slate-400 text-sm">Cargando mapa...</p>
        </div>
    ),
});
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../contexts/UserContext";
import { toast } from "sonner";

import SidebarFiltros from "../components/Explore/SidebarFiltros";
import ServiceCard, { ServiceResult } from "../components/Explore/ServiceCard";
import { mapRpcToServiceResult } from "../lib/serviceMapper";
import ServiceSkeleton from "../components/Explore/ServiceSkeleton";
import { COMUNAS_CHILE } from "../lib/comunas";

interface Category {
    id: string;
    slug: string;
    nombre: string;
    icono: string;
}

// Fallback estático en caso de que la DB demore o falle
const STATIC_CATEGORIES: Category[] = [
    { id: 'adiestramiento', slug: 'adiestramiento', nombre: 'Adiestramiento', icono: '🎓' },
    { id: 'domicilio', slug: 'domicilio', nombre: 'Cuidado a Domicilio', icono: '🏡' },
    { id: 'guarderia', slug: 'guarderia', nombre: 'Guardería Diurna', icono: '☀️' },
    { id: 'hospedaje', slug: 'hospedaje', nombre: 'Hospedaje', icono: '🏠' },
    { id: 'paseos', slug: 'paseos', nombre: 'Paseo de Perros', icono: '🦮' },
    { id: 'peluqueria', slug: 'peluqueria', nombre: 'Peluquería', icono: '✂️' },
    { id: 'traslado', slug: 'traslado', nombre: 'Traslado', icono: '🚗' },
    { id: 'fotografia', slug: 'fotografia', nombre: 'Fotografía de Mascotas', icono: '📷' },
    { id: 'veterinario', slug: 'veterinario', nombre: 'Veterinario a Domicilio', icono: '🩺' },
];

const PAGE_SIZE = 20;

function getPaginationItems(current: number, total: number): (number | "...")[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 2) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
}

// ─── ExplorarPrelaunch ───────────────────────────────────────────────────────
function ExplorarPrelaunch() {
    const [email, setEmail] = useState('');
    const [cat, setCat] = useState('');
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        try {
            const res = await fetch('/api/waitlist/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, categoria: cat, rol: 'tutor' }),
            });
            const data = await res.json();

            if (data.ok) {
                setDone(true);
            } else {
                toast.error('No pudimos guardar tu correo, intenta de nuevo');
            }
        } catch (err) {
            toast.error('No pudimos guardar tu correo, intenta de nuevo');
        }
    };

    const CATS = [
        { slug: 'hospedaje', label: 'Hospedaje' },
        { slug: 'guarderia', label: 'Guardería diurna' },
        { slug: 'domicilio', label: 'Visita a domicilio' },
        { slug: 'paseos', label: 'Paseo de perros' },
        { slug: 'peluqueria', label: 'Peluquería' },
        { slug: 'adiestramiento', label: 'Adiestramiento' },
        { slug: 'veterinario', label: 'Veterinario a domicilio' },
        { slug: 'traslado', label: 'Traslado' },
    ];

    return (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 px-6">
            <h3 className="text-xl font-bold text-slate-900 mb-3">
                Estamos activando proveedores en tu zona
            </h3>
            <p className="text-slate-500 max-w-md mx-auto text-sm mb-8">
                Pawnecta está en pleno lanzamiento. Estamos incorporando y verificando proveedores en cada categoría y comuna. Deja tu correo y te avisamos en cuanto haya opciones cerca tuyo.
            </p>

            {done ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-8 max-w-md mx-auto">
                    <p className="text-emerald-800 font-bold">¡Listo! Te avisamos en cuanto haya proveedores en tu zona.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                    <input
                        type="email"
                        required
                        placeholder="Tu correo electrónico"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="flex-1 h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-400 transition-colors"
                    />
                    <select
                        value={cat}
                        onChange={e => setCat(e.target.value)}
                        className="h-12 px-4 border border-slate-200 rounded-xl bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                    >
                        <option value="">Qué servicio...</option>
                        {CATS.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                    </select>
                    <button
                        type="submit"
                        className="h-12 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors text-sm shrink-0"
                    >
                        Avisarme cuando haya disponibles
                    </button>
                </form>
            )}

            <p className="text-xs text-slate-400 mt-4">Sin spam. Solo te contactamos cuando tengamos proveedores en tu zona.</p>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <Link href="/register?rol=proveedor" className="text-sm text-emerald-700 font-semibold hover:underline">
                    ¿Ofreces servicios para mascotas? Publica tu perfil gratis y sé de los primeros →
                </Link>
            </div>
        </div>
    );
}

export default function ExplorarPage() {
    const router = useRouter();
    const gridRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();

    const [categories, setCategories] = useState<Category[]>(STATIC_CATEGORIES);;
    const [services, setServices] = useState<ServiceResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [favoritoIds, setFavoritoIds] = useState<string[]>([]);
    const [comunasSugeridas, setComunasSugeridas] = useState<string[]>([]);

    const [filters, setFilters] = useState({
        q: "",
        categorias: [] as string[],
        comuna: "",
        fecha: "",
        mascota: "any" as "perro" | "gato" | "otro" | "any",
        tamano: null as "pequeno" | "mediano" | "grande" | null,
        precioMin: "",
        precioMax: "",
        orden: "relevancia" as "relevancia" | "rating" | "precio_asc" | "precio_desc"
    });

    const [pagina, setPagina] = useState(1);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [vista, setVista] = useState<'lista' | 'mapa'>('lista');

    // Per-category count from current results (client-side, no extra query)
    const categoryCounts = useMemo(() =>
        services.reduce((acc, s) => {
            const slug = s.categoria_slug;
            if (slug) acc[slug] = (acc[slug] ?? 0) + 1;
            return acc;
        }, {} as Record<string, number>)
        , [services]);

    // 1. Cargar Categorías desde DB (reemplaza el fallback estático si tiene datos)
    useEffect(() => {
        async function fetchCategories() {
            const { data, error } = await supabase
                .from('categorias_servicio')
                .select('id, slug, nombre, icono')
                .order('nombre', { ascending: true });
            if (!error && data && data.length > 0) {
                setCategories(data as Category[]);
            }
            // Si falla, se mantiene el fallback estático
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

    // Serializar router.query para evitar re-renders infinitos.
    // router.query en Next.js crea una nueva referencia en cada render,
    // lo que dispararía el efecto infinitamente si se usara el objeto directamente.
    const queryKey = router.isReady ? JSON.stringify(router.query) : null;

    // 2+3. Unificado: leer URL → syncear filters → buscar.
    //       Un solo efecto evita race conditions entre sync y fetch.
    useEffect(() => {
        if (!router.isReady) return;

        const { q, categoria, comuna, mascota, tamano, precioMin, precioMax, orden, pagina: paginaParam, fecha } = router.query;
        const hasQueryParams = q || categoria || comuna || mascota || precioMin || precioMax || orden;

        // Si no hay params en la URL, intentar restaurar última búsqueda
        if (!hasQueryParams && typeof window !== 'undefined') {
            const saved = localStorage.getItem('pawnecta_last_search');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed && Object.keys(parsed).length > 0) {
                        // router.replace disparará este mismo efecto con los nuevos params
                        router.replace({ pathname: '/explorar', query: parsed }, undefined, { shallow: true });
                        return;
                    }
                } catch { /* ignore */ }
            }
        }

        // Derivar filtros directamente desde router.query (fuente de verdad)
        const currentCategorias: string[] = categoria
            ? (typeof categoria === 'string' ? categoria.split(',').filter(Boolean) : (categoria as string[]))
            : [];
        const currentComuna = (comuna as string) || '';
        const currentQ = (q as string) || '';
        const currentFecha = (fecha as string) || '';
        const currentMascota = (mascota as 'perro' | 'gato' | 'otro' | 'any') || 'any';
        const currentTamano = (tamano as 'pequeno' | 'mediano' | 'grande' | null) || null;
        const currentPrecioMin = (precioMin as string) || '';
        const currentPrecioMax = (precioMax as string) || '';
        const currentOrden = (orden as 'relevancia' | 'rating' | 'precio_asc' | 'precio_desc') || 'relevancia';
        const p = parseInt(paginaParam as string);
        const currentPagina = Number.isFinite(p) && p >= 1 ? p : 1;

        // Sincronizar estado (para UI: chips, sidebar, header)
        setFilters({
            q: currentQ,
            categorias: currentCategorias,
            comuna: currentComuna,
            fecha: currentFecha,
            mascota: currentMascota,
            tamano: currentTamano,
            precioMin: currentPrecioMin,
            precioMax: currentPrecioMax,
            orden: currentOrden,
        });
        setPagina(currentPagina);

        // ── Fetch inmediato con los valores leídos de router.query ──
        setLoading(true);
        setComunasSugeridas([]);

        const baseParams = {
            p_comuna: currentComuna || null,
            p_precio_max: currentPrecioMax ? parseInt(currentPrecioMax) : null,
            p_precio_min: currentPrecioMin ? parseInt(currentPrecioMin) : null,
            p_texto: currentQ || null,
            p_limit: PAGE_SIZE,
            p_offset: (currentPagina - 1) * PAGE_SIZE,
        };

        async function run() {
            try {
                let allData: any[] = [];
                let serverTotal = 0;

                if (currentCategorias.length <= 1) {
                    const { data, error } = await supabase.rpc('buscar_servicios', {
                        ...baseParams,
                        p_categoria_slug: currentCategorias[0] || null,
                    });
                    if (error) throw error;
                    allData = data || [];
                    serverTotal = allData.length > 0 ? Number(allData[0].total_count) : 0;
                } else {
                    const results = await Promise.all(
                        currentCategorias.map(slug =>
                            supabase.rpc('buscar_servicios', {
                                ...baseParams,
                                p_categoria_slug: slug,
                                p_limit: 100,
                                p_offset: 0,
                            })
                        )
                    );
                    const seen = new Set<string>();
                    for (const { data } of results) {
                        if (!data) continue;
                        for (const item of data as any[]) {
                            const uniqueKey = item.servicio_id ?? item.id;
                            if (!seen.has(uniqueKey)) { seen.add(uniqueKey); allData.push(item); }
                        }
                    }
                    serverTotal = allData.length;
                }

                // Sort client-side
                const rankingScore = (item: any) =>
                    (item.rating_promedio / 5) * 0.35 +
                    (item.foto_perfil ? 0.10 : 0) +
                    (item.total_evaluaciones > 0 ? 0.15 : 0) +
                    (item.destacado ? 0.10 : 0) +
                    0.10;

                allData.sort((a: any, b: any) => {
                    if (currentOrden === 'rating') {
                        if (b.rating_promedio !== a.rating_promedio) return b.rating_promedio - a.rating_promedio;
                        return b.total_evaluaciones - a.total_evaluaciones;
                    }
                    if (currentOrden === 'precio_asc') return a.precio_desde - b.precio_desde;
                    if (currentOrden === 'precio_desc') return b.precio_desde - a.precio_desde;
                    return rankingScore(b) - rankingScore(a);
                });

                setTotalCount(serverTotal);

                const mapped = allData.map(mapRpcToServiceResult);
                const filteredByMascota = mapped.filter(s => {
                    if (currentMascota === 'perro') return s.acepta_perros !== false;
                    if (currentMascota === 'gato') return s.acepta_gatos !== false;
                    return true;
                });
                setServices(filteredByMascota);

                // Sugerir comunas alternativas si no hay resultados
                if (allData.length === 0 && currentComuna && currentCategorias.length > 0) {
                    const { data: altData } = await supabase.rpc('buscar_servicios', {
                        p_categoria_slug: currentCategorias[0],
                        p_comuna: null, p_precio_max: null,
                        p_precio_min: null, p_texto: null, p_limit: 50, p_offset: 0,
                    });
                    if (altData && altData.length > 0) {
                        const comunas = Array.from(new Set(
                            (altData as any[]).map((s: any) => s.comuna).filter(Boolean)
                        )).slice(0, 4) as string[];
                        setComunasSugeridas(comunas);
                    }
                }
            } catch (err) {
                console.error('Error fetching services:', err);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        }

        run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKey]);

    // goToPage actualiza la URL (lo que dispara el efecto de arriba)
    const goToPage = useCallback((p: number) => {
        const total = Math.ceil(totalCount / PAGE_SIZE);
        if (p < 1 || p > total) return;

        const query: Record<string, string> = {};
        if (filters.q) query.q = filters.q;
        if (filters.categorias.length > 0) query.categoria = filters.categorias.join(',');
        if (filters.comuna) query.comuna = filters.comuna;
        if (filters.fecha) query.fecha = filters.fecha;
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

    // 5. Actualizar filtros (resetea a página 1) y guardar en localStorage
    const updateQueryParams = (newParams: Partial<typeof filters>) => {
        const combined = { ...filters, ...newParams };

        const query: Record<string, string> = {};
        if (combined.q) query.q = combined.q;
        if (combined.categorias && combined.categorias.length > 0) query.categoria = combined.categorias.join(',');
        if (combined.comuna) query.comuna = combined.comuna;
        if (combined.fecha) query.fecha = combined.fecha;
        if (combined.mascota && combined.mascota !== 'any') query.mascota = combined.mascota;
        if (combined.mascota === 'perro' && combined.tamano) query.tamano = combined.tamano;
        if (combined.precioMin) query.precioMin = combined.precioMin;
        if (combined.precioMax) query.precioMax = combined.precioMax;
        if (combined.orden && combined.orden !== 'relevancia') query.orden = combined.orden;

        // Persist last search for when user returns to /explorar
        if (typeof window !== 'undefined') {
            if (Object.keys(query).length > 0) {
                localStorage.setItem('pawnecta_last_search', JSON.stringify(query));
            } else {
                localStorage.removeItem('pawnecta_last_search');
            }
        }

        router.push({ pathname: '/explorar', query }, undefined, { shallow: true });

        // Scroll to top so user sees results after filter change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClearFilters = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('pawnecta_last_search');
        }
        router.push({ pathname: '/explorar' }, undefined, { shallow: true });
    };

    const totalPaginas = Math.ceil(totalCount / PAGE_SIZE);
    const paginationItems = getPaginationItems(pagina, totalPaginas);

    const hasActiveFilters =
        filters.categorias.length > 0 ||
        filters.mascota !== 'any' ||
        !!filters.precioMin ||
        !!filters.precioMax ||
        !!filters.q ||
        !!filters.comuna;

    const activeFiltersCount = [
        filters.categorias.length > 0,
        filters.mascota !== 'any',
        !!filters.precioMin || !!filters.precioMax,
        !!filters.q,
        !!filters.comuna,
    ].filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>Explorar Servicios | Pawnecta</title>
                <meta name="description" content="Busca y encuentra proveedores, paseadores, entrenadores y veterinarios verificados en tu comuna." />
            </Head>

            {/* ── MOBILE: botón flotante Filtros ── */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white font-bold px-6 py-3 rounded-full shadow-lg text-sm"
                >
                    <Filter size={15} />
                    Filtros
                    {hasActiveFilters && (
                        <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── MOBILE: drawer desde abajo ── */}
            {mobileFiltersOpen && (
                <>
                    <div
                        className="lg:hidden fixed inset-0 bg-black/40 z-40"
                        onClick={() => setMobileFiltersOpen(false)}
                    />
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-900">Filtros</h3>
                            <button
                                onClick={() => setMobileFiltersOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <SidebarFiltros
                                filters={filters}
                                categories={categories}
                                onFilterChange={updateQueryParams}
                                onClear={handleClearFilters}
                                card={false}
                            />
                        </div>
                        <div className="p-5 border-t border-slate-100">
                            <button
                                onClick={() => setMobileFiltersOpen(false)}
                                className="w-full bg-emerald-700 text-white font-bold py-3 rounded-xl hover:bg-emerald-800 transition-colors"
                            >
                                Ver {totalCount} resultado{totalCount !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* ── LAYOUT: 2 columnas ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex gap-8 items-start">

                    {/* SIDEBAR — solo desktop */}
                    <aside className="hidden lg:block w-72 shrink-0 sticky top-24">
                        <SidebarFiltros
                            filters={filters}
                            categories={categories}
                            onFilterChange={updateQueryParams}
                            onClear={handleClearFilters}
                            card={true}
                            categoryCounts={categoryCounts}
                        />
                    </aside>

                    {/* ÁREA DE RESULTADOS */}
                    <div className="flex-1 min-w-0">

                        {/* Encabezado */}
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900 mb-1.5">
                                {filters.q ? `Resultados para "${filters.q}"` : (
                                    filters.categorias.length === 1
                                        ? `${categories.find(c => c.slug === filters.categorias[0])?.nombre || 'Servicios'} en tu zona`
                                        : filters.categorias.length > 1
                                            ? `${filters.categorias.length} categorías en tu zona`
                                            : 'Explorar en tu zona'
                                )}
                            </h1>
                            <p className="text-sm text-slate-500">
                                Descubre los mejores profesionales y amantes de las mascotas en Pawnecta.
                            </p>
                        </div>

                        {/* ── Chips de filtros activos ── */}
                        {(filters.categorias.length > 0 || filters.mascota !== 'any' ||
                            filters.comuna || filters.precioMin || filters.precioMax || filters.fecha) && (
                                <div className="flex flex-wrap gap-2 mb-4">

                                    {filters.categorias.map(slug => (
                                        <span key={slug} className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            {categories.find(c => c.slug === slug)?.nombre ?? slug}
                                            <button
                                                onClick={() => updateQueryParams({ categorias: filters.categorias.filter(s => s !== slug) })}
                                                className="text-emerald-700 hover:text-emerald-900 leading-none ml-0.5"
                                                aria-label="Quitar categoría"
                                            >×</button>
                                        </span>
                                    ))}

                                    {filters.comuna && (
                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            <MapPin size={11} className="text-slate-500 shrink-0" /> {filters.comuna}
                                            <button
                                                onClick={() => updateQueryParams({ comuna: '' })}
                                                className="text-slate-500 hover:text-slate-900 leading-none ml-0.5"
                                            >×</button>
                                        </span>
                                    )}

                                    {filters.mascota !== 'any' && (
                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            {filters.mascota === 'perro' ? <Dog size={11} className="text-slate-500 shrink-0" /> : filters.mascota === 'gato' ? <Cat size={11} className="text-slate-500 shrink-0" /> : <PawPrint size={11} className="text-slate-500 shrink-0" />}
                                            {filters.mascota === 'perro' ? 'Perros' : filters.mascota === 'gato' ? 'Gatos' : 'Otro'}
                                            <button
                                                onClick={() => updateQueryParams({ mascota: 'any', tamano: null })}
                                                className="text-slate-500 hover:text-slate-900 leading-none ml-0.5"
                                            >×</button>
                                        </span>
                                    )}

                                    {(filters.precioMin || filters.precioMax) && (
                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            <DollarSign size={11} className="text-slate-500 shrink-0" /> ${filters.precioMin || '0'} – ${filters.precioMax || '∞'}
                                            <button
                                                onClick={() => updateQueryParams({ precioMin: '', precioMax: '' })}
                                                className="text-slate-500 hover:text-slate-900 leading-none ml-0.5"
                                            >×</button>
                                        </span>
                                    )}

                                    {filters.fecha && (
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                                            📅 {new Date(filters.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                            <button
                                                onClick={() => updateQueryParams({ fecha: '' })}
                                                className="text-emerald-700 hover:text-emerald-900 leading-none ml-0.5"
                                            >×</button>
                                        </span>
                                    )}
                                </div>
                            )}

                        {/* Error de carga */}
                        {!loading && fetchError && (
                            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                                <p className="text-slate-500 mb-3">No se pudieron cargar los servicios.</p>
                                <button
                                    onClick={() => { setFetchError(false); setLoading(true); }}
                                    className="text-sm text-emerald-700 font-medium hover:underline"
                                >
                                    Reintentar
                                </button>
                            </div>
                        )}

                        {/* Grilla */}
                        {!fetchError && loading ? (
                            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                <ServiceSkeleton />
                                <ServiceSkeleton />
                                <ServiceSkeleton />
                                <ServiceSkeleton />
                            </div>
                        ) : !fetchError && services.length === 0 ? (
                            (() => {
                                const hasActiveFilters =
                                    filters.categorias.length > 0 ||
                                    !!filters.comuna ||
                                    filters.mascota !== 'any' ||
                                    !!filters.precioMin ||
                                    !!filters.precioMax;
                                return hasActiveFilters ? (
                                    /* RAMA A: filtros activos, sin match */
                                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mx-auto mb-6">
                                            <Search size={28} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                                            {filters.comuna ? `Sin resultados en ${filters.comuna} ` : 'Sin resultados con estos filtros'}
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
                                        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
                                            <button onClick={handleClearFilters} className="px-6 py-2.5 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                                                Ver todos los servicios
                                            </button>
                                            <Link href="/register?rol=proveedor" className="px-6 py-2.5 bg-emerald-50 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-100 transition-colors text-sm text-center">
                                                ¿Eres proveedor? Publica tu servicio →
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    /* RAMA B: sin filtros, estado pre-lanzamiento */
                                    <ExplorarPrelaunch />
                                );
                            })()
                        ) : (
                            <>
                                {/* Barra: conteo + orden + toggle vista */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <p className="text-slate-500 font-medium shrink-0">
                                        {totalCount} resultado{totalCount !== 1 ? 's' : ''}
                                        {totalPaginas > 1 && vista === 'lista' && (
                                            <span className="text-slate-400 font-normal ml-1">
                                                — página {pagina} de {totalPaginas}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto">
                                        {/* Toggle Lista / Mapa */}
                                        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                                            <button
                                                onClick={() => setVista('lista')}
                                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${vista === 'lista'
                                                    ? 'bg-slate-900 text-white'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                aria-label="Vista lista"
                                            >
                                                <List size={14} />
                                                <span className="hidden sm:inline">Lista</span>
                                            </button>
                                            <button
                                                onClick={() => setVista('mapa')}
                                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${vista === 'mapa'
                                                    ? 'bg-slate-900 text-white'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                aria-label="Vista mapa"
                                            >
                                                <Map size={14} />
                                                <span className="hidden sm:inline">Mapa</span>
                                            </button>
                                        </div>
                                        {vista === 'lista' && (
                                            <label className="text-sm font-medium text-slate-500 hidden sm:block">Ordenar por:</label>
                                        )}
                                        {vista === 'lista' && (
                                            <select
                                                value={filters.orden}
                                                onChange={(e) => updateQueryParams({ orden: e.target.value as any })}
                                                className="w-full sm:w-auto border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors cursor-pointer appearance-none"
                                            >
                                                <option value="relevancia">Mejor coincidencia</option>
                                                <option value="rating">Mejor evaluados</option>
                                                <option value="precio_asc">Menor precio</option>
                                                <option value="precio_desc">Mayor precio</option>
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {/* Grilla de resultados o Mapa */}
                                {vista === 'mapa' ? (
                                    <CaregiverMap services={services} />
                                ) : (
                                    <div ref={gridRef} className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                                        {services.map((service) => (
                                            <ServiceCard key={service.servicio_id} service={service} isFavorite={favoritoIds.includes(service.servicio_id)} />
                                        ))}
                                    </div>
                                )}

                                {/* Controles de paginación — solo en vista lista */}
                                {vista === 'lista' && totalPaginas > 1 && (
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
                                                        className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${item === pagina ? 'bg-emerald-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                                        aria-current={item === pagina ? 'page' : undefined}
                                                    >
                                                        {item}
                                                    </button>
                                                )
                                            )}
                                        </div>

                                        <span className="sm:hidden rounded-lg px-3 py-2 text-sm font-medium bg-emerald-700 text-white">
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
                    </div>
                </div>
            </div>

            {/* CTA Proveedores */}
            {!user && (
                <section className="py-16 px-4 bg-emerald-50 border-t border-emerald-100">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">
                            ¿Ofreces servicios para mascotas?
                        </h2>
                        <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                            Únete a Pawnecta y conecta con miles de dueños que buscan profesionales confiables como tú.
                        </p>
                        <Link
                            href="/register?rol=proveedor"
                            className="inline-block px-8 py-4 bg-emerald-700 text-white font-semibold rounded-2xl hover:bg-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 shadow-sm"
                        >
                            Publicar mi servicio
                        </Link>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
                            {[
                                { label: 'Registro gratuito', sub: 'Sin costos de alta' },
                                { label: 'Sin comisión', sub: 'En el período de lanzamiento' },
                                { label: 'Clientes reales', sub: 'Conecta con dueños verificados' },
                            ].map((b, i) => (
                                <div key={b.label} className="text-center">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        {i === 0 && <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        {i === 1 && <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                        {i === 2 && <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                    </div>
                                    <p className="text-sm text-slate-900 font-semibold">{b.label}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{b.sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
