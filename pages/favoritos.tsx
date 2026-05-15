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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import ServiceCard, { ServiceResult } from '../components/Explore/ServiceCard';
import ProveedorCard, { ProveedorCardData } from '../components/Explore/ProveedorCard';
import { mapJoinToServiceResult } from '../lib/serviceMapper';

type Tab = 'servicio' | 'proveedor';

export default function FavoritosPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: userLoading } = useUser();

    const tabFromQuery = (router.query.tipo as Tab) === 'proveedor' ? 'proveedor' : 'servicio';
    const [tab, setTab] = useState<Tab>(tabFromQuery);
    const [servicios, setServicios] = useState<ServiceResult[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorCardData[]>([]);
    const [loading, setLoading] = useState(true);

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

    // Cargar favoritos del tab activo
    useEffect(() => {
        if (userLoading || !isAuthenticated || !user?.id) return;
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const { data: favs } = await supabase
                    .from('favoritos')
                    .select('entidad_id, created_at')
                    .eq('user_id', user.id)
                    .eq('entidad_tipo', tab)
                    .order('created_at', { ascending: false });

                if (cancelled) return;

                if (!favs || favs.length === 0) {
                    if (tab === 'servicio') setServicios([]);
                    else setProveedores([]);
                    return;
                }

                const ids = favs.map((f: any) => f.entidad_id);

                if (tab === 'servicio') {
                    const { data } = await supabase
                        .from('servicios_publicados')
                        .select(`
                            *,
                            proveedor:proveedores(nombre, apellido_p, nombre_publico, foto_perfil, comuna, perfil_completo, es_ejemplo),
                            categoria:categorias_servicio(nombre, icono, slug)
                        `)
                        .in('id', ids)
                        .eq('activo', true);
                    if (cancelled) return;
                    const map = new Map<string, any>((data ?? []).map((s: any) => [s.id, s]));
                    const ordered = ids
                        .map(id => map.get(id))
                        .filter(Boolean)
                        .map(mapJoinToServiceResult);
                    setServicios(ordered);
                } else {
                    const { data } = await supabase
                        .from('proveedores')
                        .select('id, nombre, apellido_p, nombre_publico, foto_perfil, comuna, rut_verificado, perfil_completo, es_ejemplo, favoritos_total')
                        .in('id', ids)
                        .eq('estado', 'aprobado');
                    if (cancelled) return;
                    const map = new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
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
            } catch (err) {
                console.warn('[/favoritos] fetch falló:', err);
                if (!cancelled) {
                    if (tab === 'servicio') setServicios([]);
                    else setProveedores([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [user?.id, isAuthenticated, userLoading, tab]);

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
    const isEmpty = !loading && items.length === 0;

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
                        className={`pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                            tab === 'servicio'
                                ? 'border-emerald-700 text-emerald-700'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Servicios
                    </button>
                    <button
                        role="tab"
                        aria-selected={tab === 'proveedor'}
                        onClick={() => changeTab('proveedor')}
                        className={`pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                            tab === 'proveedor'
                                ? 'border-emerald-700 text-emerald-700'
                                : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Proveedores
                    </button>
                </div>

                {/* Contenido */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-200 aspect-[4/5] animate-pulse" />
                        ))}
                    </div>
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
                            className="inline-flex items-center justify-center px-6 py-3 bg-emerald-700 text-white font-semibold rounded-xl hover:bg-emerald-800 transition-colors"
                        >
                            Explorar servicios
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
