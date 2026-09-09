// pages/favoritos.tsx
// Lista los favoritos del usuario logueado, divididos en 2 tabs: Servicios / Proveedores.
//
// Patrón:
//   - CSR con guard de auth: si !user → redirect a /login?redirect=/favoritos.
//   - Query en 2 pasos (la FK no está declarada en la tabla polimórfica, así que
//     no podemos usar !inner embed).
//     1) SELECT entidad_id, created_at FROM favoritos WHERE user_id AND entidad_tipo.
//     2) SELECT * FROM (servicios_publicados | proveedores) WHERE id IN (...).
//     3) Merge en JS preservando el orden por created_at DESC.
//
// Sprint tipo-b lote 2 (2026-09-09) — cualquier query fallida hace surface un
// <EstadoError titulo="No pudimos cargar tus favoritos" onRetry={refetch} />
// en lugar del empty state. El header + tabs siguen visibles (no dependen del
// fetch). Refactor de queries a runReadQuery (Sentry tags subsystem, table,
// route).

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { runReadQuery } from '../lib/supabaseReadQuery';
import { fetchProveedoresPublicosByIds } from '../lib/supabase/queries/proveedoresPublicos';
import ServiceCard, { ServiceResult } from '../components/Explore/ServiceCard';
import ProveedorCard, { ProveedorCardData } from '../components/Explore/ProveedorCard';
import { mapJoinToServiceResult } from '../lib/serviceMapper';
import { EstadoError } from '../components/Shared/EstadoError';

type Tab = 'servicio' | 'proveedor';

export default function FavoritosPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: userLoading } = useUser();

    const tabFromQuery = (router.query.tipo as Tab) === 'proveedor' ? 'proveedor' : 'servicio';
    const [tab, setTab] = useState<Tab>(tabFromQuery);
    const [servicios, setServicios] = useState<ServiceResult[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sync state con query param cuando cambia la URL
    useEffect(() => {
        if (router.isReady) setTab(tabFromQuery);
    }, [tabFromQuery, router.isReady]);

    // Guard: redirect a login si no está autenticado
    useEffect(() => {
        if (userLoading || !router.isReady) return;
        if (!isAuthenticated) {
            router.replace(`/login?redirect=${encodeURIComponent('/favoritos')}`);
        }
    }, [isAuthenticated, userLoading, router]);

    // Cargar favoritos del tab activo. useCallback para reusar en Reintentar.
    const cargarFavoritos = useCallback(async (userId: string, activeTab: Tab) => {
        setLoading(true);
        setError(null);

        // 1) Query favoritos del tab.
        const favResult = await runReadQuery<any[]>(
            () => supabase
                .from('favoritos')
                .select('entidad_id, created_at')
                .eq('user_id', userId)
                .eq('entidad_tipo', activeTab)
                .order('created_at', { ascending: false }),
            { subsystem: 'favoritos', table: 'favoritos', route: '/favoritos' },
        );
        if (favResult.error) {
            setError('No pudimos cargar tus favoritos');
            setLoading(false);
            return;
        }
        const favs = favResult.data;
        if (!favs || favs.length === 0) {
            if (activeTab === 'servicio') setServicios([]);
            else setProveedores([]);
            setLoading(false);
            return;
        }

        const ids = favs.map((f: any) => f.entidad_id);

        if (activeTab === 'servicio') {
            // 2) Query servicios_publicados.
            const svcResult = await runReadQuery<any[]>(
                () => supabase
                    .from('servicios_publicados')
                    .select(`
                        *,
                        proveedor_id,
                        categoria:categorias_servicio(nombre, icono, slug)
                    `)
                    .in('id', ids)
                    .eq('activo', true),
                { subsystem: 'favoritos', table: 'servicios_publicados', route: '/favoritos' },
            );
            if (svcResult.error) {
                setError('No pudimos cargar tus favoritos');
                setLoading(false);
                return;
            }
            const data = svcResult.data ?? [];
            // 3) Hidratación proveedor (silent + log Sentry via helper — cosmético).
            const provMap = await fetchProveedoresPublicosByIds(
                data.map((s: any) => s.proveedor_id),
                'id,nombre,apellido_p,nombre_publico,foto_perfil,comuna,perfil_completo,es_ejemplo',
                '/favoritos',
            );
            const withProv = data.map((s: any) => ({
                ...s,
                proveedor: provMap.get(s.proveedor_id) ?? null,
            }));
            const map = new Map<string, any>(withProv.map((s: any) => [s.id, s]));
            const ordered = ids
                .map(id => map.get(id))
                .filter(Boolean)
                .map(mapJoinToServiceResult);
            setServicios(ordered);
        } else {
            // 2) Query proveedores_publicos.
            const provResult = await runReadQuery<any[]>(
                () => supabase
                    .from('proveedores_publicos')
                    .select('id, nombre, apellido_p, nombre_publico, foto_perfil, comuna, rut_verificado, perfil_completo, es_ejemplo, favoritos_total')
                    .in('id', ids),
                { subsystem: 'favoritos', table: 'proveedores_publicos', route: '/favoritos' },
            );
            if (provResult.error) {
                setError('No pudimos cargar tus favoritos');
                setLoading(false);
                return;
            }
            const data = provResult.data ?? [];
            const map = new Map<string, any>(data.map((p: any) => [p.id, p]));
            const ordered: ProveedorCardData[] = ids
                .map(id => map.get(id))
                .filter(Boolean)
                .map((p: any) => ({
                    id: p.id,
                    nombre_publico: p.nombre_publico || `${p.nombre} ${p.apellido_p ?? ''}`.trim(),
                    foto_perfil: p.foto_perfil,
                    comuna: p.comuna,
                    rut_verificado: p.rut_verificado,
                    perfil_completo: p.perfil_completo,
                    es_ejemplo: p.es_ejemplo,
                    favoritos_total: p.favoritos_total,
                }));
            setProveedores(ordered);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (userLoading || !isAuthenticated || !user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                if (!cancelled) await cargarFavoritos(user.id, tab);
            } catch (err) {
                // Salvavidas: cualquier throw no capturado por runReadQuery
                // (ej. bug de mapper) también cae en estado de error.
                if (!cancelled) {
                    setError('No pudimos cargar tus favoritos');
                    setLoading(false);
                }
                console.warn('[/favoritos] fetch falló:', err);
            }
        })();
        return () => { cancelled = true; };
    }, [user?.id, isAuthenticated, userLoading, tab, cargarFavoritos]);

    const reintentar = () => {
        if (user?.id) cargarFavoritos(user.id, tab);
    };

    const changeTab = (next: Tab) => {
        setTab(next);
        router.push({ query: { tipo: next } }, undefined, { shallow: true });
    };

    // Loading inicial / no autenticado todavía
    if (userLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-slate-500 text-sm">Cargando...</div>
            </div>
        );
    }

    const items = tab === 'servicio' ? servicios : proveedores;
    const isEmpty = !loading && !error && items.length === 0;

    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>Mis favoritos | Pawnecta</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Mis favoritos</h1>
                <p className="text-slate-500 mb-8">Tus servicios y proveedores guardados.</p>

                {/* Tabs */}
                <div role="tablist" className="flex gap-6 border-b border-slate-200 mb-8">
                    <button
                        role="tab"
                        aria-selected={tab === 'servicio'}
                        onClick={() => changeTab('servicio')}
                        className={`pb-3 -mb-px text-sm border-b-2 transition-colors ${
                            tab === 'servicio'
                                ? 'border-accent-600 text-accent-700 font-semibold'
                                : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        Servicios
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === 'proveedor'}
                        onClick={() => changeTab('proveedor')}
                        className={`pb-3 -mb-px text-sm border-b-2 transition-colors ${
                            tab === 'proveedor'
                                ? 'border-accent-600 text-accent-700 font-semibold'
                                : 'border-transparent text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        Proveedores
                    </button>
                </div>

                {/* Contenido — estado de error reemplaza SOLO al empty state /
                    lista. Header + tabs siguen visibles porque no dependen del
                    fetch (regla de diseño Fase 0 sprint tipo-b). */}
                {loading ? (
                    /* Skeleton estructural — antes era un rectangulo blanco con
                       `animate-pulse` y nada adentro, lo que parecia mas un fallo
                       de render que una carga. Ahora replica la forma de una
                       card real: imagen + titulo + subtitulo + precio. */
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                                <div className="aspect-[4/3] bg-slate-100 animate-pulse" />
                                <div className="p-4 space-y-2.5">
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                                    <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
                                    <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3 mt-3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <EstadoError titulo={error} onRetry={reintentar} />
                ) : isEmpty ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-50 mb-4">
                            <Heart size={48} strokeWidth={1.5} className="text-slate-300" aria-hidden="true" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                            Aún no guardas favoritos
                        </h2>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Toca el corazón en los servicios y proveedores que te gusten para guardarlos aquí.
                        </p>
                        <Link
                            href="/explorar"
                            className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium tracking-wide rounded-lg px-4 py-2 transition"
                        >
                            Explorar servicios
                            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                        </Link>
                    </div>
                ) : tab === 'servicio' ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {servicios.map(s => (
                            <ServiceCard key={s.servicio_id} service={s} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {proveedores.map(p => (
                            <ProveedorCard key={p.id} proveedor={p} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
