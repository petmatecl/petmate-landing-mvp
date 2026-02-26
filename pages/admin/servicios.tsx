import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import {
    ArrowLeft, Search, Briefcase, Eye, EyeOff, CheckCircle2,
    XCircle, Clock, BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Tag
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

type FiltroEstadoType = 'todos' | 'activos' | 'inactivos';

interface ServicioAdmin {
    id: string;
    proveedor_id: string;
    categoria_id: number;
    titulo: string;
    descripcion: string;
    precio_desde: number;
    vistas: number;
    activo: boolean;
    created_at: string;
    requisitos: string;
    tiempo_duracion: string;
    // Joins
    proveedor_nombre?: string;
    proveedor_apellido?: string;
    proveedor_estado?: string;
    categoria_nombre?: string;
}

interface Categoria {
    id: number;
    nombre: string;
}

export default function GestionServicios() {
    const [servicios, setServicios] = useState<ServicioAdmin[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoType>('todos');
    const [filtroCat, setFiltroCat] = useState<number>(0); // 0 = Todas
    const [busqueda, setBusqueda] = useState('');

    // Modal Detalle
    const [modalData, setModalData] = useState<ServicioAdmin | null>(null);

    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Cargar categorias primero para los filtros
            const { data: catData, error: catErr } = await supabase.from('categorias_servicio').select('id, nombre');
            if (catErr) throw catErr;
            setCategorias(catData || []);

            // Cargar servicios con proveedores y categorias
            const { data: servData, error: servErr } = await supabase
                .from('servicios_publicados')
                .select(`
                    *,
                    proveedores (nombre, apellido_p, estado),
                    categorias_servicio (nombre)
                `)
                .order('created_at', { ascending: false });

            if (servErr) throw servErr;

            // Mapear los joins al front
            const formatted = (servData || []).map((s: any) => ({
                ...s,
                proveedor_nombre: s.proveedores?.nombre,
                proveedor_apellido: s.proveedores?.apellido_p,
                proveedor_estado: s.proveedores?.estado,
                categoria_nombre: s.categorias_servicio?.nombre
            }));

            setServicios(formatted);
        } catch (error) {
            console.error("Error al cargar datos:", error);
            toast.error("Error al cargar catálogo de servicios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleEstadoServicio = async (id: string, nuevoEstadoActivo: boolean) => {
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('servicios_publicados')
                .update({ activo: nuevoEstadoActivo })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Servicio ${nuevoEstadoActivo ? 'activado' : 'desactivado'}`);
            fetchData();
        } catch (err) {
            toast.error("Error al modificar visibilidad del servicio");
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    // Cálculos para Estadísticas Rápidas
    const statsData = useMemo(() => {
        const activosCount = servicios.filter(s => s.activo).length;

        let mvpViews = 0;
        let mvpServicio = null;

        const catCounts: Record<string, number> = {};
        let maxDocsInCat = 0;

        servicios.forEach(s => {
            // Buscar más visto
            if (s.vistas > mvpViews) {
                mvpViews = s.vistas;
                mvpServicio = s.titulo;
            }

            // Agrupar por categoría
            if (s.categoria_nombre) {
                catCounts[s.categoria_nombre] = (catCounts[s.categoria_nombre] || 0) + 1;
                if (catCounts[s.categoria_nombre] > maxDocsInCat) {
                    maxDocsInCat = catCounts[s.categoria_nombre];
                }
            }
        });

        // Convertir categorias a array ordendado para el grafico CSS
        const chartData = Object.entries(catCounts)
            .map(([name, count]) => ({ name, count, porcentaje: maxDocsInCat > 0 ? (count / maxDocsInCat) * 100 : 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Tomamos top 5

        return { activosCount, mvpServicio, mvpViews, chartData };
    }, [servicios]);

    // Filtrar para la Tabla
    const serviciosVisibles = servicios.filter(s => {
        if (filtroEstado === 'activos' && !s.activo) return false;
        if (filtroEstado === 'inactivos' && s.activo) return false;

        if (filtroCat !== 0 && s.categoria_id !== filtroCat) return false;

        if (busqueda) {
            const query = busqueda.toLowerCase();
            const titulo = (s.titulo || '').toLowerCase();
            const provName = `${s.proveedor_nombre || ''} ${s.proveedor_apellido || ''}`.toLowerCase();
            if (!titulo.includes(query) && !provName.includes(query)) return false;
        }

        return true;
    });

    const EstadoBadge = ({ activo }: { activo: boolean }) => {
        if (activo) return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Activo</span>;
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wider"><EyeOff size={12} /> Oculto</span>;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-12">
            <Head><title>Catálogo de Servicios | Admin</title></Head>

            <header className="bg-slate-900 text-white p-6 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black flex items-center gap-2">
                                <Briefcase className="text-indigo-400" />
                                Gestión de Servicios
                            </h1>
                            <p className="text-sm text-slate-400">Moderación de catálogo publicado</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

                {/* Grid Superior de Estadisticas Rápidas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Tarjeta 1: Total Activos */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between items-start">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 shrink-0">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-4xl font-black text-slate-800 mb-1">{statsData.activosCount}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Servicios Activos (Públicos)</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                            <p className="text-xs font-semibold text-slate-400">De un total de {servicios.length} borradores e inactivos.</p>
                        </div>
                    </div>

                    {/* Tarjeta 2: Vistas MVP */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between items-start">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-4 shrink-0">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-3xl font-black text-amber-600 mb-2 truncate max-w-[200px] sm:max-w-[250px]">{statsData.mvpServicio || '-'}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Servicio Más Visto</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 w-full">
                            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Eye size={12} className="text-slate-400" /> Acumulando <strong className="text-slate-800">{statsData.mvpViews}</strong> visualizaciones perfil.</p>
                        </div>
                    </div>

                    {/* Tarjeta 3: Gráfico CSS Categorias */}
                    <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-lg text-white">
                        <p className="text-xs font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider mb-4">
                            <BarChart3 size={14} className="text-indigo-400" /> Distribución Top 5
                        </p>

                        <div className="space-y-3">
                            {statsData.chartData.length === 0 && <p className="text-sm text-slate-500 italic">No hay datos.</p>}
                            {statsData.chartData.map((item, idx) => (
                                <div key={idx} className="relative">
                                    <div className="flex justify-between text-xs font-medium mb-1 relative z-10 text-slate-200">
                                        <span className="truncate pr-2">{item.name}</span>
                                        <span className="shrink-0">{item.count}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${item.porcentaje}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Controles de Filtrado */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                            {(['todos', 'activos', 'inactivos'] as FiltroEstadoType[]).map(estado => (
                                <button
                                    key={estado}
                                    onClick={() => setFiltroEstado(estado)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-colors ${filtroEstado === estado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>

                        {/* Categoria Select & Search */}
                        <div className="flex gap-3 flex-col sm:flex-row">
                            <select
                                value={filtroCat}
                                onChange={e => setFiltroCat(Number(e.target.value))}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[200px]"
                            >
                                <option value={0}>Todas las categorias</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar título o proveedor..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabla de Servicios */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Servicio</th>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">Categoría</th>
                                    <th className="px-6 py-4">Precio (Desde)</th>
                                    <th className="px-6 py-4">Vistas</th>
                                    <th className="px-6 py-4">Visibilidad</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                                            Cargando servicios en la plataforma...
                                        </td>
                                    </tr>
                                )}

                                {!loading && serviciosVisibles.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                                            <AlertTriangle size={36} className="text-slate-300 mx-auto mb-3" />
                                            No se encontraron servicios que coincidan con la vista actual.
                                        </td>
                                    </tr>
                                )}

                                {!loading && serviciosVisibles.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 max-w-[250px]">
                                            <p className="font-bold text-slate-900 truncate" title={s.titulo}>{s.titulo}</p>
                                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> {new Date(s.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-700">{s.proveedor_nombre} {s.proveedor_apellido}</p>
                                            {s.proveedor_estado !== 'aprobado' && (
                                                <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded ml-1 uppercase">Cta. {s.proveedor_estado}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap"><Tag size={10} /> {s.categoria_nombre}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-emerald-600">${s.precio_desde.toLocaleString('es-CL')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-600 font-medium flex items-center gap-1.5"><Eye size={12} className="text-slate-400" /> {s.vistas}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <EstadoBadge activo={s.activo} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 items-center">
                                                <button onClick={() => setModalData(s)} className="p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors tooltip tooltip-left" title="Inspeccionar Contenido">
                                                    <Eye size={18} />
                                                </button>

                                                {s.activo ? (
                                                    <button
                                                        disabled={actionLoading}
                                                        onClick={() => toggleEstadoServicio(s.id, false)}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 font-bold rounded-lg text-[10px] uppercase transition-colors"
                                                    >
                                                        Ocultar
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={actionLoading}
                                                        onClick={() => toggleEstadoServicio(s.id, true)}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 font-bold rounded-lg text-[10px] uppercase transition-colors"
                                                    >
                                                        Activar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* MODAL DETALLE DE SERVICIO */}
            {modalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl max-h-[90vh]">
                        {/* Cabecera */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-3xl">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-indigo-100 text-indigo-800 text-xs px-2.5 py-0.5 rounded font-bold">{modalData.categoria_nombre}</span>
                                    <EstadoBadge activo={modalData.activo} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 leading-tight">{modalData.titulo}</h3>
                                <p className="text-sm text-slate-500 mt-1">Proveedor: <span className="font-semibold text-slate-800">{modalData.proveedor_nombre} {modalData.proveedor_apellido}</span></p>
                            </div>
                            <button onClick={() => setModalData(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 shadow-sm border border-slate-200 transition-colors shrink-0">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Cuerpo Scrolls */}
                        <div className="p-6 overflow-y-auto w-full space-y-6">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción Pública</p>
                                <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{modalData.descripcion}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tarifa Base</p>
                                    <p className="text-2xl font-black text-emerald-600">${modalData.precio_desde.toLocaleString('es-CL')}</p>
                                </div>
                                <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Métricas</p>
                                    <p className="text-2xl font-black text-slate-800 flex items-center gap-2"><Eye size={20} className="text-indigo-400" /> {modalData.vistas} <span className="text-sm font-medium text-slate-400">vistas orgánicas</span></p>
                                </div>
                            </div>

                            {modalData.tiempo_duracion && (
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Duración y Frecuencia</p>
                                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 inline-block">
                                        <p className="text-sm font-medium text-slate-700 italic">{modalData.tiempo_duracion}</p>
                                    </div>
                                </div>
                            )}

                            {modalData.requisitos && (
                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-2 flex items-center gap-1.5"><AlertTriangle size={14} /> Condiciones / Requisitos</p>
                                    <p className="text-amber-900 text-sm whitespace-pre-wrap">{modalData.requisitos}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer acciones modal */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                            <div className="flex justify-between items-center px-2">
                                <p className="text-xs text-slate-400">ID Interno: {modalData.id.split('-')[0]}...</p>
                                <button onClick={() => setModalData(null)} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition-colors">
                                    Cerrar Ficha
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Toaster position="top-center" richColors />
        </div>
    );
}
