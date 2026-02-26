import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Users, Star, LayoutDashboard, Briefcase, AlertTriangle,
    CheckCircle, UserIcon, RefreshCw, ArrowRight
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

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Encabezado del Dashboard Interno */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Resumen General</h2>
                    <p className="text-sm text-slate-500">Métricas principales de la plataforma en tiempo real.</p>
                </div>
                <button
                    onClick={() => fetchMetrics(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Proveedores Totales */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center">
                            <Users size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-900 mb-1">{stats.proveedoresTotales}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Proveedores Totales</p>
                    </div>
                </div>

                {/* 2. Proveedores Pendientes */}
                <div className={`p-6 rounded-3xl shadow-sm border flex flex-col justify-between transition-colors ${stats.proveedoresPendientes > 0 ? 'bg-amber-50/30 border-amber-300' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.proveedoresPendientes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        {stats.proveedoresPendientes > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                Requieren revisión
                            </span>
                        )}
                    </div>
                    <div>
                        <p className={`text-4xl font-black mb-1 ${stats.proveedoresPendientes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.proveedoresPendientes}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Proveedores Pendientes</p>
                    </div>
                </div>

                {/* 3. Proveedores Aprobados Activos */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-900 mb-1">{stats.proveedoresAprobados}</p>
                        <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-wider">Proveedores Aprobados</p>
                    </div>
                </div>

                {/* 4. Servicios Publicados */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                            <LayoutDashboard size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-indigo-600 mb-1">{stats.serviciosActivos}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Servicios Activos</p>
                    </div>
                </div>

                {/* 5. Usuarios Buscadores */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center">
                            <UserIcon size={24} />
                        </div>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-sky-600 mb-1">{stats.usuariosBuscadores}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Usuarios Buscadores</p>
                    </div>
                </div>

                {/* 6. Evaluaciones Pendientes */}
                <div className={`p-6 rounded-3xl shadow-sm border flex flex-col justify-between transition-colors ${stats.evaluacionesPendientes > 0 ? 'bg-amber-50/30 border-amber-300' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stats.evaluacionesPendientes > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Star size={24} />
                        </div>
                        {stats.evaluacionesPendientes > 0 && (
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                                Moderación requerida
                            </span>
                        )}
                    </div>
                    <div>
                        <p className={`text-4xl font-black mb-1 ${stats.evaluacionesPendientes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.evaluacionesPendientes}</p>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Evaluaciones Pendientes</p>
                    </div>
                </div>

            </div>

            {/* Accesos Rápidos */}
            {setActiveTab && (
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm mt-8">
                    <h3 className="font-bold text-slate-800 mb-4 px-2">Accesos Rápidos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => setActiveTab('aprobaciones')}
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left text-slate-600 group"
                        >
                            <span className="font-semibold text-sm flex items-center gap-2">
                                <AlertTriangle size={18} className="text-amber-500" />
                                Ver proveedores pendientes
                            </span>
                            <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => setActiveTab('moderacion')}
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left text-slate-600 group"
                        >
                            <span className="font-semibold text-sm flex items-center gap-2">
                                <Star size={18} className="text-amber-500" />
                                Ver evaluaciones pendientes
                            </span>
                            <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                            onClick={() => setActiveTab('proveedores')}
                            className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-all text-left text-slate-600 group"
                        >
                            <span className="font-semibold text-sm flex items-center gap-2">
                                <Briefcase size={18} className="text-indigo-400" />
                                Ver todos los servicios
                            </span>
                            <ArrowRight size={18} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
