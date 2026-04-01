import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Users, Star, LayoutDashboard,
    AlertTriangle, CheckCircle, UserIcon, RefreshCw
} from 'lucide-react';

interface AdminStats {
    proveedoresTotales: number;
    proveedoresPendientes: number;
    proveedoresAprobados: number;
    serviciosActivos: number;
    evaluacionesPendientes: number;
    usuariosBuscadores: number;
}

interface AdminMetricsProps {
    setActiveTab?: (tab: string) => void;
}

export default function AdminMetrics({ setActiveTab }: AdminMetricsProps) {
    const [stats, setStats] = useState<AdminStats>({
        proveedoresTotales: 0,
        proveedoresPendientes: 0,
        proveedoresAprobados: 0,
        serviciosActivos: 0,
        evaluacionesPendientes: 0,
        usuariosBuscadores: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMetrics = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [
                totalProv, provPend, provAprob, servAct, evalPend, userSearch
            ] = await Promise.all([
                supabase.from('proveedores').select('id', { count: 'exact', head: true }),
                supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
                supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
                supabase.from('servicios_publicados').select('id', { count: 'exact', head: true }).eq('activo', true),
                supabase.from('evaluaciones').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
                supabase.from('usuarios_buscadores').select('id', { count: 'exact', head: true })
            ]);

            setStats({
                proveedoresTotales: totalProv.count || 0,
                proveedoresPendientes: provPend.count || 0,
                proveedoresAprobados: provAprob.count || 0,
                serviciosActivos: servAct.count || 0,
                evaluacionesPendientes: evalPend.count || 0,
                usuariosBuscadores: userSearch.count || 0,
            });
        } catch (err) {
            console.error("Error fetching admin metrics", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const navigate = (tab: string) => {
        if (setActiveTab) setActiveTab(tab);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            label: 'Proveedores totales',
            value: stats.proveedoresTotales,
            icon: Users,
            tab: 'proveedores',
        },
        {
            label: 'Pendientes de aprobación',
            value: stats.proveedoresPendientes,
            icon: AlertTriangle,
            tab: 'aprobaciones',
            urgent: stats.proveedoresPendientes > 0,
        },
        {
            label: 'Proveedores aprobados',
            value: stats.proveedoresAprobados,
            icon: CheckCircle,
            tab: 'proveedores',
        },
        {
            label: 'Servicios activos',
            value: stats.serviciosActivos,
            icon: LayoutDashboard,
            tab: 'proveedores',
        },
        {
            label: 'Usuarios buscadores',
            value: stats.usuariosBuscadores,
            icon: UserIcon,
            tab: null,
        },
        {
            label: 'Evaluaciones pendientes',
            value: stats.evaluacionesPendientes,
            icon: Star,
            tab: 'moderacion',
            urgent: stats.evaluacionesPendientes > 0,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Resumen general</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Datos en tiempo real de la plataforma.</p>
                </div>
                <button
                    onClick={() => fetchMetrics(true)}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualizando' : 'Actualizar'}
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    const isClickable = !!card.tab;
                    return (
                        <button
                            key={card.label}
                            onClick={() => card.tab && navigate(card.tab)}
                            disabled={!isClickable}
                            className={`text-left p-5 rounded-xl border transition-all ${
                                card.urgent
                                    ? 'bg-white border-amber-200 hover:border-amber-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                            } ${isClickable ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'}`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <Icon size={18} className={card.urgent ? 'text-amber-500' : 'text-slate-400'} />
                                {card.urgent && (
                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                        Requiere acción
                                    </span>
                                )}
                            </div>
                            <p className={`text-3xl font-bold tracking-tight ${card.urgent ? 'text-amber-600' : 'text-slate-900'}`}>
                                {card.value}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 font-medium">{card.label}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
