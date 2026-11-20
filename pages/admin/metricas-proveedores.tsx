// pages/admin/metricas-proveedores.tsx
// ----------------------------------------------------------------------------
// Sprint TRACKING-META-100-PROVEEDORES Opción B (2026-11-20).
//
// Dashboard pre-campañas. Métricas de proveedores activos (meta 100) + reparto
// por categoría/comuna + tendencia semanal.
//
// Gate: RoleGuard requiredRole="admin" (igual que el resto de /admin).
// Fetch: /api/admin/metricas-proveedores (gate id-only).
// ----------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../lib/supabaseClient';
import RoleGuard from '../../components/Shared/RoleGuard';
import AdminLayout from '../../components/Admin/AdminLayout';
import {
    Target, TrendingUp, TrendingDown, Minus, MapPin, Tag, Clock, Loader2, AlertTriangle,
} from 'lucide-react';

type MetricasResponse = {
    total_activos: number;
    por_categoria: Array<{ slug: string; categoria_nombre: string; n: number }>;
    por_comuna: Array<{ nombre: string; n: number }>;
    ultimo_registro: string | null;
    tendencia: { ult7d: number; prev7d: number };
};

const META_OBJETIVO = 100;

function MetricasPanel() {
    const [data, setData] = useState<MetricasResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;
                if (!token) {
                    setError('Sesión no iniciada');
                    return;
                }
                const res = await fetch('/api/admin/metricas-proveedores', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    setError(body?.message || `HTTP ${res.status}`);
                    return;
                }
                const json: MetricasResponse = await res.json();
                setData(json);
            } catch (e: any) {
                setError(e?.message || 'Error al cargar métricas');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-500 mx-auto" aria-hidden="true" />
                    <p className="mt-3 text-slate-600">Cargando métricas...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="max-w-xl mx-auto bg-white border border-rose-200 rounded-lg p-6 mt-8">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0" aria-hidden="true" />
                    <div>
                        <h2 className="font-semibold text-rose-900">No se pudieron cargar las métricas</h2>
                        <p className="mt-1 text-sm text-rose-700">{error || 'Respuesta vacía'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const pct = Math.min(100, Math.round((data.total_activos / META_OBJETIVO) * 100));
    const delta = data.tendencia.ult7d - data.tendencia.prev7d;
    const tendenciaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
    const TendenciaIcon = tendenciaIcon;
    const tendenciaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500';

    const maxCat = Math.max(...data.por_categoria.map((c) => c.n), 1);
    const maxCom = Math.max(...data.por_comuna.map((c) => c.n), 1);

    return (
        <div className="w-full pb-20 max-w-5xl mx-auto">
            {/* Sprint admin-sidebar-ref Opción III — removido back button;
                AdminLayout provee el sidebar con navegación persistente a
                Dashboard y las otras sub-rutas desde cualquier sub-página. */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Métricas de proveedores</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Avance hacia la meta de 100 proveedores activos para activar campañas pagadas.
                </p>
            </div>

                {/* Card meta 100 */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-slate-700" aria-hidden="true" />
                            <h2 className="font-semibold text-slate-900">Proveedores activos</h2>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-slate-900">{data.total_activos}</div>
                            <div className="text-xs text-slate-500">de {META_OBJETIVO}</div>
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                            className="bg-slate-700 h-3 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={META_OBJETIVO}
                            aria-valuenow={data.total_activos}
                            aria-label={`${data.total_activos} de ${META_OBJETIVO} proveedores`}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {pct}% hacia la meta. Criterio: proveedor con estado aprobado y al menos un servicio publicado activo.
                    </p>
                </div>

                {/* Grid de 3 cards: tendencia, último registro, categoría top */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <TendenciaIcon className={`w-4 h-4 ${tendenciaColor}`} aria-hidden="true" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Tendencia 7d</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {data.tendencia.ult7d}
                            <span className={`text-sm font-medium ml-2 ${tendenciaColor}`}>
                                {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            vs {data.tendencia.prev7d} semana anterior
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Último registro</span>
                        </div>
                        <div className="text-slate-900 font-medium">
                            {data.ultimo_registro
                                ? format(new Date(data.ultimo_registro), "dd-MM-yyyy", { locale: es })
                                : '—'}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {data.ultimo_registro
                                ? format(new Date(data.ultimo_registro), "HH:mm", { locale: es }) + ' CLT'
                                : 'sin datos'}
                        </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-slate-500" aria-hidden="true" />
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Categoría top</span>
                        </div>
                        <div className="text-slate-900 font-medium">
                            {data.por_categoria[0]?.categoria_nombre || '—'}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {data.por_categoria[0] ? `${data.por_categoria[0].n} proveedores` : 'sin datos'}
                        </p>
                    </div>
                </div>

                {/* Distribución por categoría */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                        <Tag className="w-5 h-5 text-slate-700" aria-hidden="true" />
                        Distribución por categoría
                    </h2>
                    {data.por_categoria.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay proveedores activos todavía.</p>
                    ) : (
                        <ul className="space-y-2">
                            {data.por_categoria.map((c) => (
                                <li key={c.slug}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-slate-700">{c.categoria_nombre}</span>
                                        <span className="font-medium text-slate-900 tabular-nums">{c.n}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-slate-500 h-2 rounded-full"
                                            style={{ width: `${(c.n / maxCat) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-slate-500 mt-4">
                        Un proveedor con servicios en más de una categoría cuenta en cada una.
                    </p>
                </div>

                {/* Distribución por comuna */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-4">
                        <MapPin className="w-5 h-5 text-slate-700" aria-hidden="true" />
                        Top comunas con cobertura
                    </h2>
                    {data.por_comuna.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay proveedores con comuna declarada.</p>
                    ) : (
                        <ul className="space-y-2">
                            {data.por_comuna.map((c) => (
                                <li key={c.nombre}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-slate-700">{c.nombre}</span>
                                        <span className="font-medium text-slate-900 tabular-nums">{c.n}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-slate-500 h-2 rounded-full"
                                            style={{ width: `${(c.n / maxCom) * 100}%` }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs text-slate-500 mt-4">Top 15. Solo cuenta proveedores con comuna declarada.</p>
                </div>

            <p className="text-xs text-slate-400">
                Datos en tiempo real. La página se recarga en cada visita; no cachea en el browser.
            </p>
        </div>
    );
}

export default function MetricasProveedoresPage() {
    return (
        <RoleGuard requiredRole="admin">
            <Head>
                <title>Métricas de proveedores | Admin Pawnecta</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <AdminLayout>
                <MetricasPanel />
            </AdminLayout>
        </RoleGuard>
    );
}
