import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import {
    ArrowLeft, Search, Star, MessageSquareWarning,
    CheckCircle2, XCircle, Clock, ShieldCheck, Filter, UserIcon, AlertTriangle
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

type EstadoReview = 'todas' | 'pendiente' | 'aprobado' | 'rechazado';
type EstrellasFilter = 'todas' | 1 | 2 | 3 | 4 | 5;

// Extended Evaluation type with joined tables
interface EvaluacionAdmin {
    id: string;
    servicio_id: string;
    proveedor_id: string;
    usuario_id: string | null;
    rating: number;
    comentario: string;
    estado: string;
    created_at: string;
    proveedor_nombre?: string;
    proveedor_apellido?: string;
    servicio_titulo?: string;
    evaluador_email?: string;
}

export default function GestionEvaluaciones() {
    const [evaluaciones, setEvaluaciones] = useState<EvaluacionAdmin[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState<EstadoReview>('todas');
    const [filtroEstrellas, setFiltroEstrellas] = useState<EstrellasFilter>('todas');
    const [busqueda, setBusqueda] = useState('');

    // Metricas rapidas
    const [stats, setStats] = useState({
        pendientes: 0,
        aprobadasMes: 0,
        promedioGlobal: 0
    });

    // Modales y Acciones
    const [actionLoading, setActionLoading] = useState(false);
    const [rechazoModal, setRechazoModal] = useState<{ isOpen: boolean, evalId: string | null }>({ isOpen: false, evalId: null });
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const fetchEvaluaciones = async () => {
        setLoading(true);
        try {
            // Nota: El auth.users no se puede jointear directamente desde el cliente Supabase
            // por restricciones de seguridad (schema auth). En su lugar mostramos ID o datos guardados publicos.
            const { data, error } = await supabase
                .from('evaluaciones')
                .select(`
                    *,
                    proveedores (nombre, apellido_p),
                    servicios_publicados (titulo)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Formatear los joins
            const formattedData = (data || []).map((e: any) => ({
                ...e,
                proveedor_nombre: e.proveedores?.nombre,
                proveedor_apellido: e.proveedores?.apellido_p,
                servicio_titulo: e.servicios_publicados?.titulo
            }));

            setEvaluaciones(formattedData);
            calcularMetricas(formattedData);
        } catch (error) {
            console.error("Error fetching evaluaciones", error);
            toast.error("Error al cargar evaluaciones");
        } finally {
            setLoading(false);
        }
    };

    const calcularMetricas = (data: EvaluacionAdmin[]) => {
        const pendientes = data.filter(e => e.estado === 'pendiente').length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const aprobadasMes = data.filter(e => {
            if (e.estado !== 'aprobado') return false;
            const date = new Date(e.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        const ratings = data.map(e => e.rating);
        const promedio = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length) : 0;

        setStats({
            pendientes,
            aprobadasMes,
            promedioGlobal: Number(promedio.toFixed(1))
        });
    };

    useEffect(() => {
        fetchEvaluaciones();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Procesar lista con filtros
    const evaluacionesVisibles = evaluaciones.filter(e => {
        if (filtroEstado !== 'todas' && e.estado !== filtroEstado) return false;
        if (filtroEstrellas !== 'todas' && e.rating !== filtroEstrellas) return false;
        if (busqueda) {
            const query = busqueda.toLowerCase();
            const provName = `${e.proveedor_nombre || ''} ${e.proveedor_apellido || ''}`.toLowerCase();
            const servName = (e.servicio_titulo || '').toLowerCase();
            const comment = (e.comentario || '').toLowerCase();

            if (!provName.includes(query) && !servName.includes(query) && !comment.includes(query)) {
                return false;
            }
        }
        return true;
    });

    const handleAprobar = async (id: string) => {
        setActionLoading(true);
        try {
            const { error } = await supabase.from('evaluaciones').update({ estado: 'aprobado' }).eq('id', id);
            if (error) throw error;
            toast.success("Evaluación aprobada y publicada");
            fetchEvaluaciones();
        } catch (error) {
            console.error(error);
            toast.error("Error al aprobar evaluación");
        } finally {
            setActionLoading(false);
        }
    };

    const openRechazarModal = (id: string) => {
        setRechazoModal({ isOpen: true, evalId: id });
        setMotivoRechazo('');
    };

    const handleRechazar = async () => {
        if (!rechazoModal.evalId || !motivoRechazo) return;
        setActionLoading(true);
        try {
            const { error } = await supabase.from('evaluaciones').update({
                estado: 'rechazado',
                motivo_rechazo: motivoRechazo
            }).eq('id', rechazoModal.evalId);

            if (error) throw error;
            toast.success("Evaluación rechazada y ocultada");
            fetchEvaluaciones();
            setRechazoModal({ isOpen: false, evalId: null });
        } catch (error) {
            console.error(error);
            toast.error("Error al rechazar evaluación");
        } finally {
            setActionLoading(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={16} className={i <= rating ? "fill-current" : "text-slate-200 fill-slate-50"} />
                ))}
            </div>
        );
    };

    const EstadoBadge = ({ estado }: { estado: string }) => {
        switch (estado) {
            case 'aprobado': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Aprobado</span>;
            case 'pendiente': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold uppercase tracking-wider"><Clock size={12} /> Pendiente</span>;
            case 'rechazado': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase tracking-wider"><XCircle size={12} /> Rechazado</span>;
            default: return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px]">{estado}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
            <Head><title>Moderación de Evaluaciones | Admin</title></Head>

            <header className="bg-slate-900 text-white p-6 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black flex items-center gap-2">
                                <MessageSquareWarning className="text-amber-400" />
                                Moderación de Evaluaciones
                            </h1>
                            <p className="text-sm text-slate-400">Revisión de feedback de usuarios a proveedores</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-top-8">

                {/* Estadísticas Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
                                <Clock size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-amber-600 mb-1">{stats.pendientes}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pendientes de Revisión</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-emerald-600 mb-1">{stats.aprobadasMes}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Aprobadas este mes</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                                <Star size={24} />
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-blue-600 mb-1">{stats.promedioGlobal}</p>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Rating Promedio Plataforma</p>
                        </div>
                    </div>
                </div>

                {/* Controles y Filtros */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 mb-8">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Filter size={18} className="text-slate-400" /> Filtros
                    </h3>
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Tabs Estado */}
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar lg:border-r lg:border-slate-200 lg:pr-4">
                            {(['todas', 'pendiente', 'aprobado', 'rechazado'] as EstadoReview[]).map(estado => (
                                <button
                                    key={estado}
                                    onClick={() => setFiltroEstado(estado)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-colors border ${filtroEstado === estado
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>

                        {/* Buscador & Stars */}
                        <div className="flex gap-3 flex-1 flex-col sm:flex-row">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por proveedor, servicio o comentario..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                                />
                            </div>
                            <select
                                value={filtroEstrellas}
                                onChange={e => setFiltroEstrellas(e.target.value === 'todas' ? 'todas' : Number(e.target.value) as any)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 min-w-[120px]"
                            >
                                <option value="todas">Cualquier rating</option>
                                <option value="5">5 Estrellas</option>
                                <option value="4">4 Estrellas</option>
                                <option value="3">3 Estrellas</option>
                                <option value="2">2 Estrellas</option>
                                <option value="1">1 Estrella</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Lista de Evaluaciones */}
                <div className="space-y-4">
                    {loading && (
                        <div className="text-center py-12 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 font-medium">Cargando evaluaciones...</p>
                        </div>
                    )}

                    {!loading && evaluacionesVisibles.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <MessageSquareWarning size={48} className="text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-800">No hay evaluaciones que mostrar</h3>
                            <p className="text-slate-500">Prueba ajustando los filtros de búsqueda.</p>
                        </div>
                    )}

                    {!loading && evaluacionesVisibles.map(evaluacion => (
                        <div key={evaluacion.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">

                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                {/* Info Principal */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        {renderStars(evaluacion.rating)}
                                        <EstadoBadge estado={evaluacion.estado} />
                                        <span className="text-xs text-slate-400 font-medium">
                                            {new Date(evaluacion.created_at).toLocaleDateString()}
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-4 inline-block w-full">
                                        <p className="text-slate-700 italic text-sm leading-relaxed">&quot;{evaluacion.comentario}&quot;</p>
                                    </div>

                                    <div className="flex items-center gap-6 text-sm">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Proveedor Evaluado</p>
                                            <p className="font-semibold text-slate-800 flex items-center gap-1.5"><UserIcon size={14} className="text-slate-400" /> {evaluacion.proveedor_nombre} {evaluacion.proveedor_apellido}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Servicio</p>
                                            <p className="font-semibold text-indigo-600">{evaluacion.servicio_titulo}</p>
                                        </div>
                                    </div>

                                    {/* Mostrar motivo si fue rechazada */}
                                    {evaluacion.estado === 'rechazado' && (evaluacion as any).motivo_rechazo && (
                                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100 flex items-start gap-2">
                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                            <div>
                                                <strong>Rechazada por:</strong> {(evaluacion as any).motivo_rechazo}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Acciones (Solo para pendientes) */}
                                {evaluacion.estado === 'pendiente' && (
                                    <div className="flex flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                        <button
                                            onClick={() => handleAprobar(evaluacion.id)}
                                            disabled={actionLoading}
                                            className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={16} /> Aprobar
                                        </button>
                                        <button
                                            onClick={() => openRechazarModal(evaluacion.id)}
                                            disabled={actionLoading}
                                            className="flex-1 md:flex-none px-6 py-2.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={16} /> Rechazar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Modal Rechazar Evaluación */}
            {rechazoModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                            <XCircle className="text-red-500" /> Rechazar Evaluación
                        </h3>
                        <p className="text-slate-600 text-sm mb-6">
                            La evaluación no será visible públicamente. Por favor indica el motivo para el historial interno.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Motivo del rechazo</label>
                            <textarea
                                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none bg-slate-50"
                                rows={3}
                                value={motivoRechazo}
                                onChange={e => setMotivoRechazo(e.target.value)}
                                placeholder="Ej: Lenguaje inapropiado, SPAM, etc."
                            ></textarea>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-8">
                            {['Lenguaje inapropiado', 'Contenido irrelevante', 'Posible SPAM o bot', 'Conflicto de interés'].map(motivo => (
                                <button
                                    key={motivo}
                                    onClick={() => setMotivoRechazo(motivo)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                                >
                                    {motivo}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRechazoModal({ isOpen: false, evalId: null })}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRechazar}
                                disabled={!motivoRechazo || actionLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
                            >
                                {actionLoading ? 'Guardando...' : 'Rechazar Eval.'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Toaster position="top-center" richColors />
        </div>
    );
}
