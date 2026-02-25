import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ShieldAlert, CheckCircle, ExternalLink, Loader2, MapPin, AlertTriangle, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProveedorManagementList() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<string>('todos');

    // Acciones completas
    const [actionId, setActionId] = useState<string | null>(null);
    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [providerToSuspend, setProviderToSuspend] = useState<any>(null);
    const [suspensionReason, setSuspensionReason] = useState('');

    useEffect(() => {
        fetchProveedores();
    }, []);

    const fetchProveedores = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select(`
                    *,
                    servicios:servicios_publicados(id, titulo, activo)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProveedores(data || []);
        } catch (error) {
            console.error('Error fetching proveedores', error);
            toast.error('Error al cargar la lista de proveedores');
        } finally {
            setLoading(false);
        }
    };

    const handleSuspend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!providerToSuspend || !suspensionReason.trim()) return;

        setActionId(providerToSuspend.id);
        try {
            const { error } = await supabase
                .from('proveedores')
                .update({
                    estado: 'suspendido',
                    // Idealmente guardar suspensionReason en alguna tabla de logs o agregar columna `notas_admin`
                })
                .eq('id', providerToSuspend.id);

            if (error) throw error;

            toast.success('Proveedor suspendido');
            setProveedores(prev => prev.map(p => p.id === providerToSuspend.id ? { ...p, estado: 'suspendido' } : p));
            setSuspendModalOpen(false);
            setProviderToSuspend(null);
            setSuspensionReason('');
        } catch (error: any) {
            console.error('Error suspendiendo', error);
            toast.error(error.message || 'Error al suspender');
        } finally {
            setActionId(null);
        }
    };

    const handleReactivate = async (provId: string) => {
        if (!confirm('¿Seguro que deseas reactivar a este proveedor?')) return;

        setActionId(provId);
        try {
            const { error } = await supabase
                .from('proveedores')
                .update({ estado: 'aprobado' })
                .eq('id', provId);

            if (error) throw error;

            toast.success('Proveedor reactivado');
            setProveedores(prev => prev.map(p => p.id === provId ? { ...p, estado: 'aprobado' } : p));
        } catch (error: any) {
            console.error('Error reactivando', error);
            toast.error(error.message || 'Error al reactivar');
        } finally {
            setActionId(null);
        }
    };

    // Aplicar filtros localmente
    const filteredProveedores = proveedores.filter(prov => {
        let matchesSearch = true;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const fullName = `${prov.nombre} ${prov.apellido_p}`.toLowerCase();
            const email = (prov.email_publico || prov.email || "").toLowerCase();
            const rut = (prov.rut || "").toLowerCase();

            matchesSearch = fullName.includes(term) || email.includes(term) || rut.includes(term);
        }

        let matchesStatus = true;
        if (estadoFilter !== 'todos') {
            matchesStatus = prov.estado === estadoFilter;
        }

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Cargando base de proveedores...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>

                <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                >
                    <option value="todos">Todos los Estados</option>
                    <option value="aprobado">Aprobados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="suspendido">Suspendidos</option>
                    <option value="rechazado">Rechazados</option>
                </select>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-6 py-4">Proveedor</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4 text-center">Servicios</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredProveedores.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No se encontraron proveedores que coincidan con los filtros.
                                    </td>
                                </tr>
                            ) : (
                                filteredProveedores.map(prov => (
                                    <tr key={prov.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                    {prov.foto_perfil ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={prov.foto_perfil} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{prov.nombre.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{prov.nombre} {prov.apellido_p}</p>
                                                    <p className="text-xs text-slate-500">RUT: {prov.rut || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-700 font-medium">{prov.email_publico || prov.email || 'N/A'}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={12} /> {prov.comuna || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <span className="font-black text-slate-700 text-lg leading-none">{prov.servicios?.length || 0}</span>
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Publicados</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase
                                                ${prov.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                                                    prov.estado === 'suspendido' ? 'bg-red-100 text-red-700' :
                                                        prov.estado === 'rechazado' ? 'bg-slate-200 text-slate-600' :
                                                            'bg-amber-100 text-amber-700'
                                                }
                                            `}>
                                                {prov.estado === 'aprobado' && <CheckCircle size={12} />}
                                                {prov.estado === 'suspendido' && <ShieldAlert size={12} />}
                                                {prov.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {prov.estado === 'aprobado' && (
                                                    <button
                                                        onClick={() => { setProviderToSuspend(prov); setSuspendModalOpen(true); }}
                                                        disabled={actionId === prov.id}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip tooltip-left"
                                                        data-tip="Suspender Cuenta"
                                                    >
                                                        {actionId === prov.id ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                                                    </button>
                                                )}

                                                {prov.estado === 'suspendido' && (
                                                    <button
                                                        onClick={() => handleReactivate(prov.id)}
                                                        disabled={actionId === prov.id}
                                                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                                                    >
                                                        {actionId === prov.id ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Reactivar
                                                    </button>
                                                )}

                                                <a
                                                    href={`/admin/proveedor/${prov.id}`} // Enlace hipotético por si a futuro quieren un detalle completo
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-left"
                                                    data-tip="Ver Detalle"
                                                    onClick={(e) => { e.preventDefault(); toast.info('Detalle del proveedor en desarrollo'); }}
                                                >
                                                    <ExternalLink size={18} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 p-4 text-xs font-semibold text-slate-500 text-center">
                    Mostrando {filteredProveedores.length} proveedores registrados.
                </div>
            </div>

            {/* MODAL SUSPENSIÓN */}
            {suspendModalOpen && providerToSuspend && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-left whitespace-normal">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Suspender Proveedor</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Estás a punto de suspender la cuenta de <strong>{providerToSuspend.nombre} {providerToSuspend.apellido_p}</strong>.
                            Sus servicios dejarán de ser visibles públicamente y no podrá iniciar nuevas conversaciones.
                        </p>

                        <form onSubmit={handleSuspend}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo de la suspensión (Interno)</label>
                                <textarea
                                    value={suspensionReason}
                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                    placeholder="Detalla las razones por las que este proveedor ha sido suspendido..."
                                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setSuspendModalOpen(false); setProviderToSuspend(null); setSuspensionReason(''); }} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionId === providerToSuspend.id || !suspensionReason.trim()} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-600/20">
                                    {actionId === providerToSuspend.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} Suspender
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
