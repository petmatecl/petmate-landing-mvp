import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ShieldAlert, CheckCircle, ExternalLink, Loader2, MapPin, AlertTriangle, PlayCircle, Copy, CheckCircle2, Phone, MessageCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../Shared/ConfirmDialog';
// Sprint cuelgue-diag (2026-08-28) — instrumentación temporal. NO merge a main.
import { cx, cxTrack, cxMount } from '../../lib/cuelgueTelemetry';

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

    // Confirm dialog
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void;
    }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

    useEffect(() => {
        const unmountLog = cxMount('pml');
        cx('pml:effect-fired');
        fetchProveedores();
        return unmountLog;
    }, []);

    // Sprint admin-visibilidad (2026-08-27) — reemplazo del .from('proveedores')
    // por el RPC admin_listar_proveedores() (security definer + is_admin gate).
    // Razón: el email real vive en auth.users que NO está expuesto por
    // PostgREST al rol authenticated (schema fuera de db-schemas de Supabase
    // por default), entonces el panel mostraba "N/A" en la columna Contacto
    // porque leía prov.email_publico (opcional, 0/N poblado). El RPC joinea
    // proveedores + auth.users y devuelve email real + email_confirmado
    // (boolean derivado de email_confirmed_at IS NOT NULL) + last_sign_in_at.
    // Ver migrations/20260827_admin_listar_proveedores_rpc.sql para el gate.
    // n_servicios / n_servicios_activos vienen precomputados en el RPC —
    // reemplazan al array embed .servicios(...) del select anterior.
    const fetchProveedores = async () => {
        setLoading(true);
        try {
            // Sprint cuelgue-diag — envuelve rpc con timeout 20s + logs.
            const { data, error } = await cxTrack('pml:rpc-admin_listar_proveedores', supabase.rpc('admin_listar_proveedores'));

            if (error) throw error;
            setProveedores(data || []);
        } catch (error) {
            console.error('Error fetching proveedores', error);
            toast.error('Error al cargar la lista de proveedores');
        } finally {
            setLoading(false);
            cx('pml:fetch-finally setLoading(false)');
        }
    };

    // Sprint admin-visibilidad — copiar valor al portapapeles con 1 click.
    // navigator.clipboard puede fallar en contextos no-HTTPS o si el user no
    // dio permiso; el catch cubre esos escenarios sin romper la tabla.
    // `etiqueta` va en el toast para diferenciar correo/teléfono/whatsapp.
    const copyValue = async (value: string, etiqueta: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${etiqueta} copiado`);
        } catch {
            toast.error('No se pudo copiar. Selecciónalo a mano.');
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

    const doReactivate = async (provId: string) => {
        setConfirmDialog(d => ({ ...d, open: false }));
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

    const handleReactivate = (provId: string) => {
        const prov = proveedores.find(p => p.id === provId);
        setConfirmDialog({
            open: true,
            title: 'Reactivar proveedor',
            message: `¿Confirmas la reactivación de ${prov?.nombre || 'este proveedor'}?`,
            confirmLabel: 'Reactivar',
            onConfirm: () => doReactivate(provId),
        });
    };

    // Aplicar filtros localmente
    const filteredProveedores = proveedores.filter(prov => {
        let matchesSearch = true;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const fullName = `${prov.nombre} ${prov.apellido_p}`.toLowerCase();
            // Sprint admin-visibilidad — buscar por email_auth (auth.users) que ahora
            // viene del RPC. email_publico se mantiene como fallback histórico por si
            // el proveedor lo pobló manualmente (0/N pobladas hoy, pero cero costo).
            const email = (prov.email_auth || prov.email_publico || "").toLowerCase();
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
            <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Cargando base de proveedores...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o RUT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-600 outline-none text-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>

                <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-600 outline-none text-sm font-medium text-slate-700 cursor-pointer"
                >
                    <option value="todos">Todos los Estados</option>
                    <option value="aprobado">Aprobados</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="suspendido">Suspendidos</option>
                    <option value="rechazado">Rechazados</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-400 uppercase font-medium tracking-widest text-xs">
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
                                                        <div className="w-full h-full flex items-center justify-center font-semibold text-slate-400">{prov.nombre.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <a href={`/proveedor/${prov.id}`} target="_blank" rel="noopener noreferrer"
                                                        className="font-semibold text-slate-900 hover:text-accent-600 transition-colors inline-flex items-center gap-1">
                                                        {prov.nombre} {prov.apellido_p}
                                                        <ExternalLink size={12} className="text-slate-300" />
                                                    </a>
                                                    <p className="text-xs text-slate-500">RUT: {prov.rut || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Sprint admin-visibilidad (2026-08-27) — columna Contacto:
                                            (1) email_auth del RPC (auth.users.email real), (2) botón
                                            Copiar con navigator.clipboard, (3) badge de estado de
                                            confirmación del correo. Sin confirmar = cuenta aprobada
                                            que NO puede entrar (login rebota). El copy explícito
                                            "no puede entrar" evita ambigüedad — es exactamente el
                                            estado operativo que Aldo necesita ver de un vistazo. */}
                                        <td className="px-6 py-4">
                                            {prov.email_auth ? (
                                                <div className="flex items-center gap-2">
                                                    <p className="text-slate-700 font-medium">{prov.email_auth}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyValue(prov.email_auth, 'Correo')}
                                                        aria-label={`Copiar correo de ${prov.nombre}`}
                                                        title="Copiar correo"
                                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic text-xs">Sin cuenta en auth</p>
                                            )}
                                            {prov.email_auth && (
                                                prov.email_confirmado ? (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-success-100 text-success-700 rounded-full text-[10px] font-medium uppercase tracking-widest">
                                                        <CheckCircle2 size={10} /> Confirmado
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-warning-100 text-warning-700 rounded-full text-[10px] font-medium uppercase tracking-widest">
                                                        <AlertTriangle size={10} /> Sin confirmar — no puede entrar
                                                    </span>
                                                )
                                            )}
                                            {/* Sprint admin-visibilidad — teléfono y whatsapp (RPC V2, pedido
                                                PO 2026-08-27). Vía alternativa de contacto cuando el correo
                                                no está confirmado. Solo se muestran si están presentes,
                                                cero placeholder vacío. Botón Copiar por cada uno. */}
                                            {prov.telefono && (
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                                    <Phone size={12} className="text-slate-400 shrink-0" />
                                                    <span>{prov.telefono}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyValue(prov.telefono, 'Teléfono')}
                                                        aria-label={`Copiar teléfono de ${prov.nombre}`}
                                                        title="Copiar teléfono"
                                                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            {prov.whatsapp && (
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                                    <MessageCircle size={12} className="text-slate-400 shrink-0" />
                                                    <span>{prov.whatsapp}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyValue(prov.whatsapp, 'WhatsApp')}
                                                        aria-label={`Copiar whatsapp de ${prov.nombre}`}
                                                        title="Copiar whatsapp"
                                                        className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><MapPin size={12} /> {prov.comuna || 'N/A'}</p>
                                            {/* Sprint admin-visibilidad — indicador chico "perfil completo".
                                                Usa la col `perfil_completo` de proveedores (NOT NULL,
                                                calculada por calcular_perfil_completo_proveedor + triggers).
                                                Discreto en gris cuando incompleto; verde con check cuando
                                                completo. Cero acción — solo señal. */}
                                            {prov.perfil_completo ? (
                                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-success-700 uppercase tracking-widest">
                                                    <UserCheck size={10} /> Perfil completo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                                    Perfil incompleto
                                                </span>
                                            )}
                                        </td>
                                        {/* Sprint admin-visibilidad — n_servicios/n_servicios_activos
                                            precomputados en el RPC (reemplazan al array embed
                                            .servicios(...) del select anterior). Muestra activos primero
                                            porque es la métrica operativa; total como contexto secundario. */}
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center justify-center">
                                                <span className="font-bold text-slate-700 text-lg leading-none">{prov.n_servicios_activos ?? 0}</span>
                                                <span className="text-[10px] uppercase font-medium text-slate-400 tracking-widest">Activos {prov.n_servicios && prov.n_servicios !== prov.n_servicios_activos ? `/ ${prov.n_servicios} total` : ''}</span>
                                            </div>
                                        </td>
                                        {/* T3 — misma triada de T2 (proveedores.tsx) con tokens semanticos:
                                            success = aprobado, warning = suspendido (pausa reversible, no danger),
                                            slate = rechazado (terminal), warning = pendiente (fallback del ternario). */}
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-widest
                                                ${prov.estado === 'aprobado' ? 'bg-success-100 text-success-600' :
                                                    prov.estado === 'suspendido' ? 'bg-warning-100 text-warning-700' :
                                                        prov.estado === 'rechazado' ? 'bg-slate-200 text-slate-600' :
                                                            'bg-warning-100 text-warning-700'
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
                                                        title="Suspender cuenta"
                                                        className="p-2 text-slate-400 hover:text-warning-600 hover:bg-warning-50 rounded-lg transition-colors"
                                                    >
                                                        {actionId === prov.id ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
                                                    </button>
                                                )}

                                                {/* P6 — par contextual suspender/reactivar con tokens semanticos.
                                                    Suspender (icono arriba, hover warning) es la accion sobre aprobado;
                                                    Reactivar (este boton, success) es la accion sobre suspendido.
                                                    Warning para suspender porque es pausa reversible. */}
                                                {prov.estado === 'suspendido' && (
                                                    <button
                                                        onClick={() => handleReactivate(prov.id)}
                                                        disabled={actionId === prov.id}
                                                        title="Reactivar cuenta"
                                                        className="px-3 py-1.5 bg-success-50 text-success-700 hover:bg-success-100 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                                                    >
                                                        {actionId === prov.id ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />} Reactivar
                                                    </button>
                                                )}

                                                <a
                                                    href={`/proveedor/${prov.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Ver perfil público"
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-left whitespace-normal">
                        <div className="w-12 h-12 bg-warning-100 text-warning-600 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Suspender Proveedor</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Estás a punto de suspender la cuenta de <strong>{providerToSuspend.nombre} {providerToSuspend.apellido_p}</strong>.
                            Sus servicios dejarán de ser visibles públicamente y no podrá iniciar nuevas conversaciones.
                        </p>

                        <form onSubmit={handleSuspend}>
                            <div className="mb-6">
                                <label htmlFor="mgmt-suspension-motivo" className="block text-sm font-semibold text-slate-700 mb-2">Motivo de la suspensión (Interno)</label>
                                <textarea
                                    id="mgmt-suspension-motivo"
                                    value={suspensionReason}
                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                    placeholder="Detalla las razones por las que este proveedor ha sido suspendido..."
                                    className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-warning-500 outline-none resize-none text-sm"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setSuspendModalOpen(false); setProviderToSuspend(null); setSuspensionReason(''); }} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={actionId === providerToSuspend.id || !suspensionReason.trim()} className="px-5 py-2.5 bg-warning-600 hover:bg-warning-700 text-white font-medium tracking-wide rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-warning-600/20">
                                    {actionId === providerToSuspend.id ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />} Suspender
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
            />
        </div>
    );
}
