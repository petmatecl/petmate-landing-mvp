import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Users, Star, LayoutDashboard, MessageSquare, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdminStats {
    proveedoresPendientes: number;
    proveedoresAprobados: number;
    serviciosActivos: number;
    evaluacionesPendientes: number;
    usuariosBuscadores: number;
    conversacionesActivas: number;
}

export default function AdminMetrics() {
    const [stats, setStats] = useState<AdminStats>({
        proveedoresPendientes: 0,
        proveedoresAprobados: 0,
        serviciosActivos: 0,
        evaluacionesPendientes: 0,
        usuariosBuscadores: 0,
        conversacionesActivas: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            try {
                const [
                    provPend, provAprob, servAct, evalPend, userSearch, convs
                ] = await Promise.all([
                    supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
                    supabase.from('proveedores').select('id', { count: 'exact', head: true }).eq('estado', 'aprobado'),
                    supabase.from('servicios_publicados').select('id', { count: 'exact', head: true }).eq('activo', true),
                    supabase.from('evaluaciones').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
                    supabase.from('registro_petmate').select('id', { count: 'exact', head: true }).contains('roles', ['cliente']),
                    supabase.from('conversations').select('id', { count: 'exact', head: true })
                ]);

                setStats({
                    proveedoresPendientes: provPend.count || 0,
                    proveedoresAprobados: provAprob.count || 0,
                    serviciosActivos: servAct.count || 0,
                    evaluacionesPendientes: evalPend.count || 0,
                    usuariosBuscadores: userSearch.count || 0,
                    conversacionesActivas: convs.count || 0
                });
            } catch (err) {
                console.error("Error fetching admin metrics", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
            {/* Pendientes de Aprobación */}
            <div className={`p-5 rounded-3xl shadow-sm border ${stats.proveedoresPendientes > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${stats.proveedoresPendientes > 0 ? 'text-red-600' : 'text-slate-400'}`}>Verificar</p>
                    <AlertTriangle className={`w-5 h-5 ${stats.proveedoresPendientes > 0 ? 'text-red-500' : 'text-slate-300'}`} />
                </div>
                <div className="flex items-center gap-2">
                    <p className={`text-3xl font-black ${stats.proveedoresPendientes > 0 ? 'text-red-600' : 'text-slate-900'}`}>{stats.proveedoresPendientes}</p>
                </div>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Prov. Pendientes</p>
            </div>

            {/* Evaluaciones Pendientes */}
            <div className={`p-5 rounded-3xl shadow-sm border ${stats.evaluacionesPendientes > 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100'}`}>
                <div className="flex justify-between items-start mb-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${stats.evaluacionesPendientes > 0 ? 'text-amber-600' : 'text-slate-400'}`}>Moderar</p>
                    <Star className={`w-5 h-5 ${stats.evaluacionesPendientes > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
                </div>
                <p className={`text-3xl font-black ${stats.evaluacionesPendientes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.evaluacionesPendientes}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Reviews Pendientes</p>
            </div>

            {/* Proveedores Aprobados */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comunidad</p>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-emerald-600">{stats.proveedoresAprobados}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Prov. Aprobados</p>
            </div>

            {/* Servicios Activos */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Oferta</p>
                    <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-3xl font-black text-indigo-600">{stats.serviciosActivos}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Servicios Públicos</p>
            </div>

            {/* Usuarios Buscadores */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Demanda</p>
                    <Users className="w-5 h-5 text-sky-400" />
                </div>
                <p className="text-3xl font-black text-sky-600">{stats.usuariosBuscadores}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Usuarios Registrados</p>
            </div>

            {/* Conversaciones */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Actividad</p>
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-3xl font-black text-purple-600">{stats.conversacionesActivas}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-wider truncate">Conversaciones</p>
            </div>
        </div>
    );
}
