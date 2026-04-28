import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { TrendingUp, MessageSquare, Star, Users, RefreshCw } from 'lucide-react';

interface ConversionStats {
    nuevosUsuarios30d: number;
    conversaciones30d: number;
    evaluaciones30d: number;
    vistas30d: number;
    topCategorias: { nombre: string; count: number }[];
    topComunas: { comuna: string; count: number }[];
    topClicksChat: { titulo: string; count: number }[];
}

export default function ConversionMetrics() {
    const [stats, setStats] = useState<ConversionStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const [
                usuariosRes, conversRes, evalRes, vistasRes,
                topCategRes, topComunaRes, topChatRes
            ] = await Promise.all([
                // 1. Nuevos usuarios buscadores en 30d
                supabase.from('usuarios_buscadores')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', since30d),

                // 2. Conversaciones nuevas en 30d
                supabase.from('conversations')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', since30d),

                // 3. Evaluaciones enviadas en 30d
                supabase.from('evaluaciones')
                    .select('id', { count: 'exact', head: true })
                    .gte('created_at', since30d),

                // 4. Vistas de servicios en 30d (eventos_tracking)
                supabase.from('eventos_tracking')
                    .select('id', { count: 'exact', head: true })
                    .eq('tipo', 'vista_servicio')
                    .gte('created_at', since30d),

                // 5. Top categorías por conversaciones (join via servicios_publicados)
                supabase.from('conversations')
                    .select('servicios_publicados!servicio_id(categoria_slug:categorias_servicio!categoria_id(nombre))')
                    .gte('created_at', since30d)
                    .limit(200),

                // 6. Comunas: extraer de conversaciones via proveedor
                supabase.from('conversations')
                    .select('proveedor:proveedores!sitter_id(comuna)')
                    .gte('created_at', since30d)
                    .limit(200),

                // 7. Top servicios por clicks en chat
                supabase.from('eventos_tracking')
                    .select('servicio_id')
                    .eq('tipo', 'click_chat')
                    .gte('created_at', since30d)
                    .limit(500),
            ]);

            // Process top categorias
            const catCount: Record<string, number> = {};
            (topCategRes.data || []).forEach((row: any) => {
                const nombre = row.servicios_publicados?.categoria_slug?.nombre;
                if (nombre) catCount[nombre] = (catCount[nombre] || 0) + 1;
            });
            const topCategorias = Object.entries(catCount)
                .map(([nombre, count]) => ({ nombre, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Process top comunas
            const comunaCount: Record<string, number> = {};
            (topComunaRes.data || []).forEach((row: any) => {
                const c = row.proveedor?.comuna;
                if (c) comunaCount[c] = (comunaCount[c] || 0) + 1;
            });
            const topComunas = Object.entries(comunaCount)
                .map(([comuna, count]) => ({ comuna, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            // Process top chat clicks by service
            const chatCount: Record<string, number> = {};
            (topChatRes.data || []).forEach((row: any) => {
                const id = row.servicio_id;
                if (id) chatCount[id] = (chatCount[id] || 0) + 1;
            });
            const topClicksChat = Object.entries(chatCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([titulo, count]) => ({ titulo: titulo.slice(0, 8) + '...', count }));

            setStats({
                nuevosUsuarios30d: usuariosRes.count ?? 0,
                conversaciones30d: conversRes.count ?? 0,
                evaluaciones30d: evalRes.count ?? 0,
                vistas30d: vistasRes.count ?? 0,
                topCategorias,
                topComunas,
                topClicksChat,
            });
        } catch (err) {
            console.error('[ConversionMetrics] Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const ratio = stats.nuevosUsuarios30d > 0
        ? ((stats.conversaciones30d / stats.nuevosUsuarios30d) * 100).toFixed(1)
        : '0.0';

    const vistaRatio = stats.vistas30d > 0
        ? (stats.vistas30d / Math.max(stats.conversaciones30d, 1)).toFixed(1)
        : '—';

    const cards = [
        { label: 'Nuevos usuarios (30d)', value: stats.nuevosUsuarios30d, icon: Users, color: 'text-sky-600', bg: 'bg-sky-50' },
        { label: 'Conversaciones (30d)', value: stats.conversaciones30d, icon: MessageSquare, color: 'text-emerald-700', bg: 'bg-emerald-50' },
        { label: 'Evaluaciones (30d)', value: stats.evaluaciones30d, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Ratio conversión', value: `${ratio}%`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Conversión — últimos 30 días</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Métricas del funnel de adquisición y activación.</p>
                </div>
                <button
                    onClick={() => fetchStats(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Grid 2x2 métricas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cards.map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className={`w-10 h-10 ${card.bg} ${card.color} rounded-xl flex items-center justify-center`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Vistas / ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Vistas de servicios (30d)</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.vistas30d}</p>
                    <p className="text-xs text-slate-400 mt-1">~{vistaRatio} vistas por conversación iniciada</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Top servicios por click en chat</p>
                    {stats.topClicksChat.length === 0 ? (
                        <p className="text-sm text-slate-400">Sin datos</p>
                    ) : (
                        <div className="space-y-1">
                            {stats.topClicksChat.map((s, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-700 font-mono text-xs">{s.titulo}</span>
                                    <span className="font-bold text-slate-900">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Rankings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top categorías */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm">Top categorías por conversaciones</h3>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {stats.topCategorias.length === 0 && (
                                <tr><td className="px-5 py-3 text-slate-400">Sin datos</td></tr>
                            )}
                            {stats.topCategorias.map((row, i) => (
                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                    <td className="px-5 py-3 text-slate-500 text-xs font-mono w-6">{i + 1}</td>
                                    <td className="px-2 py-3 text-slate-700 font-medium capitalize">{row.nombre}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-900">{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Top comunas */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm">Top comunas por conversaciones</h3>
                    </div>
                    <table className="w-full text-sm">
                        <tbody>
                            {stats.topComunas.length === 0 && (
                                <tr><td className="px-5 py-3 text-slate-400">Sin datos</td></tr>
                            )}
                            {stats.topComunas.map((row, i) => (
                                <tr key={i} className="border-b border-slate-50 last:border-0">
                                    <td className="px-5 py-3 text-slate-500 text-xs font-mono w-6">{i + 1}</td>
                                    <td className="px-2 py-3 text-slate-700 font-medium">{row.comuna}</td>
                                    <td className="px-5 py-3 text-right font-bold text-slate-900">{row.count}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
