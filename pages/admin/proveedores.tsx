import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import {
    ArrowLeft, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
    Eye, ShieldCheck, User as UserIcon, Briefcase, Star, MapPin
} from 'lucide-react';
import { toast, Toaster } from 'sonner';

type EstadoProveedor = 'todos' | 'pendiente' | 'aprobado' | 'suspendido' | 'rechazado';
type OrdenType = 'fecha_desc' | 'fecha_asc' | 'nombre' | 'estado';

export default function GestionProveedores() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState<EstadoProveedor>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [orden, setOrden] = useState<OrdenType>('fecha_desc');

    // Modales
    const [modalConfig, setModalConfig] = useState<{
        type: 'aprobar' | 'rechazar' | 'suspender' | 'reactivar' | 'detalle' | null,
        prov: any | null
    }>({ type: null, prov: null });
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Detalles Modal
    const [provServicios, setProvServicios] = useState<any[]>([]);
    const [provEvaluaciones, setProvEvaluaciones] = useState<any[]>([]);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchProveedores = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*');

            if (error) throw error;
            setProveedores(data || []);
        } catch (error) {
            console.error("Error fetching proveedores", error);
            toast.error("Error al cargar proveedores");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProveedores();
    }, []);

    // Procesar lista con filtros y orden
    const proveedoresVisibles = proveedores
        .filter(p => {
            if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
            if (busqueda) {
                const query = busqueda.toLowerCase();
                const nombreCompleto = `${p.nombre || ''} ${p.apellido_p || ''}`.toLowerCase();
                if (!nombreCompleto.includes(query) && !(p.rut || '').toLowerCase().includes(query)) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => {
            if (orden === 'fecha_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (orden === 'fecha_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (orden === 'nombre') return (a.nombre || '').localeCompare(b.nombre || '');
            if (orden === 'estado') return (a.estado || '').localeCompare(b.estado || '');
            return 0;
        });


    // Acciones
    const openModal = async (type: string, prov: any) => {
        setModalConfig({ type: type as any, prov });
        if (type === 'rechazar') {
            setMotivoRechazo('');
        }
        if (type === 'detalle') {
            setDetailsLoading(true);
            try {
                const [resServ, resEval] = await Promise.all([
                    supabase.from('servicios_publicados').select('*, categoria:categorias_servicio(nombre)').eq('proveedor_id', prov.id),
                    supabase.from('evaluaciones').select('*').eq('proveedor_id', prov.id)
                ]);
                setProvServicios(resServ.data || []);
                setProvEvaluaciones(resEval.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setDetailsLoading(false);
            }
        }
    };

    const closeModal = () => {
        setModalConfig({ type: null, prov: null });
    };

    const getProviderEmail = async (authUserId: string) => {
        // Fallback email recovery
        const { data } = await supabase.from('registro_petmate').select('email').eq('auth_user_id', authUserId).single();
        return data?.email || 'admin@pawnecta.com'; // Fallback
    };

    const handleAprobar = async () => {
        if (!modalConfig.prov) return;
        setActionLoading(true);
        try {
            const currentProv = modalConfig.prov;
            const { error } = await supabase.from('proveedores').update({ estado: 'aprobado' }).eq('id', currentProv.id);
            if (error) throw error;

            const email = currentProv.email_publico || await getProviderEmail(currentProv.auth_user_id);

            // Notify
            await fetch('/api/admin/notify-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    nombre: currentProv.nombre,
                    estado: 'aprobado'
                })
            });

            toast.success("Proveedor aprobado exitosamente");
            fetchProveedores();
            closeModal();
        } catch (error) {
            console.error(error);
            toast.error("Error al aprobar");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRechazar = async () => {
        if (!modalConfig.prov || !motivoRechazo) return;
        setActionLoading(true);
        try {
            const currentProv = modalConfig.prov;
            const { error } = await supabase.from('proveedores').update({
                estado: 'rechazado',
                notas_admin: motivoRechazo
            }).eq('id', currentProv.id);
            if (error) throw error;

            const email = currentProv.email_publico || await getProviderEmail(currentProv.auth_user_id);

            // Notify
            await fetch('/api/admin/notify-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    nombre: currentProv.nombre,
                    estado: 'rechazado',
                    motivo: motivoRechazo
                })
            });

            toast.success("Proveedor rechazado y notificado");
            fetchProveedores();
            closeModal();
        } catch (error) {
            console.error(error);
            toast.error("Error al rechazar");
        } finally {
            setActionLoading(false);
        }
    };

    const updateStatusSimple = async (id: string, newStatus: string) => {
        setActionLoading(true);
        try {
            const { error } = await supabase.from('proveedores').update({ estado: newStatus }).eq('id', id);
            if (error) throw error;
            toast.success(`Estado actualizado a ${newStatus}`);
            fetchProveedores();
            closeModal();
        } catch (error) {
            toast.error("Error al actualizar estado");
        } finally {
            setActionLoading(false);
        }
    };

    const EstadoBadge = ({ estado }: { estado: string }) => {
        switch (estado) {
            case 'aprobado': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Aprobado</span>;
            case 'pendiente': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider"><Clock size={12} /> Pendiente</span>;
            case 'suspendido': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wider"><AlertTriangle size={12} /> Suspendido</span>;
            case 'rechazado': return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider"><XCircle size={12} /> Rechazado</span>;
            default: return <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">{estado}</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <Head><title>Gestión de Proveedores | Admin</title></Head>

            <header className="bg-slate-900 text-white p-6 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black flex items-center gap-2">
                                <ShieldCheck className="text-emerald-400" />
                                Gestión de Proveedores
                            </h1>
                            <p className="text-sm text-slate-400">Panel administrativo de perfiles</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Controles y Filtros */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 justify-between">
                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                            {(['todos', 'pendiente', 'aprobado', 'suspendido', 'rechazado'] as EstadoProveedor[]).map(estado => (
                                <button
                                    key={estado}
                                    onClick={() => setFiltroEstado(estado)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold capitalize whitespace-nowrap transition-colors ${filtroEstado === estado ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>
                        {/* Search & Sort */}
                        <div className="flex gap-3">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar nombre o RUT..."
                                    value={busqueda}
                                    onChange={e => setBusqueda(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <select
                                value={orden}
                                onChange={e => setOrden(e.target.value as OrdenType)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="fecha_desc">Más recientes primero</option>
                                <option value="fecha_asc">Más antiguos primero</option>
                                <option value="nombre">Orden alfabético</option>
                                <option value="estado">Agrupar por estado</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tabla de Proveedores */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Proveedor</th>
                                    <th className="px-6 py-4">Ubicación</th>
                                    <th className="px-6 py-4">Registro</th>
                                    <th className="px-6 py-4">Estado</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <div className="flex justify-center mb-2"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
                                            Cargando datos...
                                        </td>
                                    </tr>
                                )}

                                {!loading && proveedoresVisibles.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500 font-medium">
                                            No se encontraron proveedores que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}

                                {!loading && proveedoresVisibles.map(prov => (
                                    <tr key={prov.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-400">
                                                    {prov.foto_perfil ? <img src={prov.foto_perfil} alt="" className="w-full h-full object-cover" /> : <UserIcon size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 cursor-pointer hover:text-emerald-700" onClick={() => openModal('detalle', prov)}>
                                                        {prov.nombre} {prov.apellido_p}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                                        {prov.rut}
                                                        {prov.rut_verificado && <CheckCircle2 size={12} className="text-emerald-500" />}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-700">{prov.comuna}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-600 font-medium">{new Date(prov.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <EstadoBadge estado={prov.estado} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Botones condicionales */}
                                                {prov.estado === 'pendiente' && (
                                                    <>
                                                        <button onClick={() => openModal('aprobar', prov)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold rounded-lg text-xs transition-colors">Aprobar</button>
                                                        <button onClick={() => openModal('rechazar', prov)} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 font-bold rounded-lg text-xs transition-colors">Rechazar</button>
                                                    </>
                                                )}
                                                {prov.estado === 'aprobado' && (
                                                    <>
                                                        <button onClick={() => openModal('detalle', prov)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors tooltip" title="Ver Perfil"><Eye size={18} /></button>
                                                        <button onClick={() => openModal('suspender', prov)} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold rounded-lg text-xs transition-colors">Suspender</button>
                                                    </>
                                                )}
                                                {prov.estado === 'suspendido' && (
                                                    <>
                                                        <button onClick={() => openModal('detalle', prov)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors tooltip" title="Ver Perfil"><Eye size={18} /></button>
                                                        <button onClick={() => openModal('reactivar', prov)} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold rounded-lg text-xs transition-colors">Reactivar</button>
                                                    </>
                                                )}
                                                {prov.estado === 'rechazado' && (
                                                    <button onClick={() => openModal('detalle', prov)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-lg text-xs transition-colors">Revisar</button>
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

            {/* MODALES OVERLAYS */}
            {modalConfig.type && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">

                    {/* Modal Aprobar */}
                    {modalConfig.type === 'aprobar' && (
                        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Aprobar Proveedor</h3>
                            <p className="text-slate-600 text-sm mb-6">
                                ¿Estás seguro de aprobar a <strong className="text-slate-900">{modalConfig.prov.nombre}</strong> como proveedor verificado en plataforma?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
                                <button onClick={handleAprobar} disabled={actionLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">
                                    {actionLoading ? 'Procesando...' : 'Sí, Aprobar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Modal Rechazar */}
                    {modalConfig.type === 'rechazar' && (
                        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl">
                            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <XCircle className="text-red-500" /> Rechazar Solicitud
                            </h3>
                            <p className="text-slate-600 text-sm mb-4">
                                Proveedor: <strong>{modalConfig.prov.nombre}</strong>
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo del rechazo (visible para el proveedor)</label>
                                <textarea
                                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none bg-slate-50"
                                    rows={3}
                                    value={motivoRechazo}
                                    onChange={e => setMotivoRechazo(e.target.value)}
                                    placeholder="Explica brevemente por qué no fue aprobado..."
                                ></textarea>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {['RUT inválido', 'Información incompleta', 'Servicio no permitido', 'Fotos inapropiadas'].map(motivo => (
                                    <button
                                        key={motivo}
                                        onClick={() => setMotivoRechazo(motivo)}
                                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                                    >
                                        {motivo}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={closeModal} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
                                <button
                                    onClick={handleRechazar}
                                    disabled={!motivoRechazo || actionLoading}
                                    className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
                                >
                                    {actionLoading ? 'Rechazando...' : 'Rechazar Solicitud'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Modales Simples: Suspender / Reactivar */}
                    {(modalConfig.type === 'suspender' || modalConfig.type === 'reactivar') && (
                        <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${modalConfig.type === 'suspender' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {modalConfig.type === 'suspender' ? <AlertTriangle size={32} /> : <CheckCircle2 size={32} />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2 capitalize">{modalConfig.type} Cuenta</h3>
                            <p className="text-slate-600 text-sm mb-6">
                                ¿Deseas {modalConfig.type} el perfil de <strong className="text-slate-900">{modalConfig.prov.nombre}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={closeModal} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200">Cancelar</button>
                                <button
                                    onClick={() => updateStatusSimple(modalConfig.prov.id, modalConfig.type === 'suspender' ? 'suspendido' : 'aprobado')}
                                    disabled={actionLoading}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-white disabled:opacity-50 ${modalConfig.type === 'suspender' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Modal Detalle */}
                    {modalConfig.type === 'detalle' && (
                        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <UserIcon className="text-slate-400" /> Ficha del Proveedor
                                </h3>
                                <button onClick={closeModal} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1 flex flex-col md:flex-row gap-6">

                                {/* Sidebar info personal */}
                                <div className="md:w-1/3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                                    <div className="w-24 h-24 rounded-full bg-slate-100 mx-auto mb-4 overflow-hidden border-2 border-slate-200">
                                        {modalConfig.prov.foto_perfil ? <img src={modalConfig.prov.foto_perfil} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><UserIcon size={40} /></div>}
                                    </div>
                                    <h2 className="text-2xl font-bold text-center text-slate-900 mb-1">{modalConfig.prov.nombre} {modalConfig.prov.apellido_p}</h2>
                                    <div className="text-center mb-6">
                                        <EstadoBadge estado={modalConfig.prov.estado} />
                                    </div>

                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">RUT Oficial</p>
                                            <p className="font-semibold text-slate-700">{modalConfig.prov.rut || 'No proporcionado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Contacto Público</p>
                                            <p className="text-slate-700">{modalConfig.prov.email_publico || 'Sin email'}</p>
                                            <p className="text-slate-700">{modalConfig.prov.telefono || 'Sin tfno'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Ubicación</p>
                                            <p className="font-semibold text-slate-700 flex items-center gap-1"><MapPin size={14} /> {modalConfig.prov.comuna || 'No informada'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Registro</p>
                                            <p className="text-slate-700">{new Date(modalConfig.prov.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {modalConfig.prov.notas_admin && (
                                        <div className="mt-6 p-3 bg-red-50 border border-red-100 rounded-xl">
                                            <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Notas de Admin</p>
                                            <p className="text-sm text-red-900">{modalConfig.prov.notas_admin}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Content tabs */}
                                <div className="md:w-2/3 flex flex-col gap-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Briefcase size={18} className="text-indigo-500" /> Servicios Publicados ({provServicios.length})</h4>
                                        {detailsLoading ? <p className="text-slate-400 text-sm animate-pulse">Cargando servicios...</p> : (
                                            <div className="grid gap-3">
                                                {provServicios.length === 0 ? <p className="text-sm text-slate-500">No hay servicios asociados a este proveedor.</p> :
                                                    provServicios.map(s => (
                                                        <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-800">{s.titulo}</p>
                                                                <p className="text-xs text-slate-500">{s.categoria?.nombre} • {s.activo ? 'Público' : 'Oculto'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-bold text-slate-700">${s.precio_desde}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2"><Star size={18} className="text-amber-500" /> Evaluaciones Recibidas ({provEvaluaciones.length})</h4>
                                        {detailsLoading ? <p className="text-slate-400 text-sm animate-pulse">Cargando valoraciones...</p> : (
                                            <div className="grid gap-3">
                                                {provEvaluaciones.length === 0 ? <p className="text-sm text-slate-500">Aún no tiene valoraciones.</p> :
                                                    provEvaluaciones.map(e => (
                                                        <div key={e.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <div className="flex text-amber-400">
                                                                    {[1, 2, 3, 4, 5].map(i => <Star key={i} size={12} className={i <= e.rating ? "fill-current" : "text-slate-200"} />)}
                                                                </div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{e.estado}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 italic">&quot;{e.comentario}&quot;</p>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )}
            <Toaster position="top-center" richColors />
        </div>
    );
}
