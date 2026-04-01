import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, FileImage, ExternalLink, Mail, Phone, MapPin, Loader2, AlertTriangle, ShieldCheck, ShieldX, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from './ConfirmDialog';

type AdminTab = 'incorporacion' | 'verificacion';

export default function ProveedorApprovalList() {
    const [tab, setTab] = useState<AdminTab>('incorporacion');

    // --- INCORPORACIÓN (existente) ---
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // --- VERIFICACIONES ---
    const [verificaciones, setVerificaciones] = useState<any[]>([]);
    const [loadingVerif, setLoadingVerif] = useState(true);

    // Lightbox
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Modal de rechazo incorporación
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    // Modal de rechazo verificación
    const [rejectingVerifId, setRejectingVerifId] = useState<string | null>(null);
    const [notaVerif, setNotaVerif] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void;
    }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

    useEffect(() => {
        fetchPendientes();
        fetchVerificaciones();
    }, []);

    /* =================== INCORPORACIÓN =================== */

    const fetchPendientes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('estado', 'pendiente')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProveedores(data || []);
        } catch (error) {
            console.error('Error fetching pendientes', error);
            toast.error('Error al cargar solicitudes pendientes');
        } finally {
            setLoading(false);
        }
    };

    const doAprobar = async (prov: any) => {
        setConfirmDialog(d => ({ ...d, open: false }));
        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa");
            const { error: updateError } = await supabase
                .from('proveedores')
                .update({ estado: 'aprobado', aprobado_at: new Date().toISOString(), aprobado_por: session.user.id })
                .eq('id', prov.id);
            if (updateError) throw updateError;
            try {
                await fetch('/api/admin/notify-provider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ auth_user_id: prov.auth_user_id, nombre: prov.nombre, estado: 'aprobado' })
                });
            } catch { toast.warning('Proveedor aprobado, pero falló el envío del email.'); }
            toast.success('Proveedor Aprobado exitosamente');
            setProveedores(prev => prev.filter(p => p.id !== prov.id));
        } catch (error: any) {
            toast.error(error.message || 'Ocurrió un error al aprobar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAprobar = (prov: any) => {
        setConfirmDialog({
            open: true,
            title: 'Aprobar proveedor',
            message: `¿Confirmas la aprobación de ${prov.nombre} ${prov.apellido_p}? Podrá publicar servicios inmediatamente.`,
            confirmLabel: 'Aprobar',
            onConfirm: () => doAprobar(prov),
        });
    };

    const handleRechazar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingId || !motivoRechazo.trim()) return;
        setIsSubmitting(true);
        try {
            const prov = proveedores.find(p => p.id === rejectingId);
            if (!prov) throw new Error("Proveedor no encontrado");
            const { error: updateError } = await supabase
                .from('proveedores')
                .update({ estado: 'rechazado', motivo_rechazo: motivoRechazo })
                .eq('id', rejectingId);
            if (updateError) throw updateError;
            try {
                await fetch('/api/admin/notify-provider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ auth_user_id: prov.auth_user_id, nombre: prov.nombre, estado: 'rechazado', motivo: motivoRechazo })
                });
            } catch { toast.warning('Rechazado, pero falló el envío del email.'); }
            toast.success('Solicitud rechazada');
            setProveedores(prev => prev.filter(p => p.id !== prov.id));
            setRejectingId(null);
            setMotivoRechazo('');
        } catch (error: any) {
            toast.error(error.message || 'Ocurrió un error al rechazar');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* =================== VERIFICACIONES =================== */

    const fetchVerificaciones = async () => {
        setLoadingVerif(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('id, nombre, apellido_p, foto_perfil, rut, foto_carnet, comuna, auth_user_id, verificacion_estado, verificacion_nota, created_at')
                .eq('verificacion_estado', 'pendiente')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setVerificaciones(data || []);
        } catch (err) {
            console.error('Error fetching verificaciones', err);
            toast.error('Error al cargar verificaciones pendientes');
        } finally {
            setLoadingVerif(false);
        }
    };

    const doAprobarVerif = async (prov: any) => {
        setConfirmDialog(d => ({ ...d, open: false }));
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('proveedores').update({
                verificacion_estado: 'aprobado',
                rut_verificado: true,
                verificacion_nota: null,
            }).eq('id', prov.id);
            if (error) throw error;
            toast.success(`Identidad de ${prov.nombre} verificada`);
            setVerificaciones(prev => prev.filter(p => p.id !== prov.id));
        } catch (err: any) {
            toast.error(err.message || 'Error al aprobar verificación');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAprobarVerif = (prov: any) => {
        setConfirmDialog({
            open: true,
            title: 'Verificar identidad',
            message: `¿Confirmas la verificación de identidad de ${prov.nombre} ${prov.apellido_p}?`,
            confirmLabel: 'Verificar',
            onConfirm: () => doAprobarVerif(prov),
        });
    };

    const handleRechazarVerif = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingVerifId || !notaVerif.trim()) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('proveedores').update({
                verificacion_estado: 'rechazado',
                rut_verificado: false,
                verificacion_nota: notaVerif,
            }).eq('id', rejectingVerifId);
            if (error) throw error;
            toast.success('Verificación rechazada');
            setVerificaciones(prev => prev.filter(p => p.id !== rejectingVerifId));
            setRejectingVerifId(null);
            setNotaVerif('');
        } catch (err: any) {
            toast.error(err.message || 'Error al rechazar verificación');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* =================== RENDER =================== */

    const TabButton = ({ id, label, count }: { id: AdminTab; label: string; count: number }) => (
        <button
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${tab === id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
        >
            {label}
            {count > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tab === id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="space-y-4">
            {/* Tab Selector */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-200">
                <TabButton id="incorporacion" label="Solicitudes de Alta" count={proveedores.length} />
                <TabButton id="verificacion" label="Verificaciones ID" count={verificaciones.length} />
            </div>

            {/* ============================== INCORPORACIÓN ============================== */}
            {tab === 'incorporacion' && (
                <>
                    {loading ? (
                        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Cargando solicitudes pendientes...</p>
                        </div>
                    ) : proveedores.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">¡Todo al día!</h3>
                            <p className="text-slate-500">No hay solicitudes de proveedores pendientes.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Solicitudes Pendientes ({proveedores.length})</h2>
                            {proveedores.map(prov => (
                                <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4 xl:w-1/3 shrink-0">
                                        <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                            {prov.foto_perfil ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl uppercase">{prov.nombre.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <a href={`/proveedor/${prov.id}`} target="_blank" rel="noopener noreferrer"
                                                className="text-lg font-bold text-slate-900 hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                                                {prov.nombre} {prov.apellido_p}
                                                <ExternalLink size={14} className="text-slate-300" />
                                            </a>
                                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {prov.comuna || 'Sin comuna'}</p>
                                            <p className="text-xs font-semibold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">
                                                {format(new Date(prov.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-y xl:border-y-0 xl:border-x border-slate-100 py-4 xl:py-0 xl:px-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><Mail size={14} /></div>
                                                <span className="font-medium text-slate-700">{prov.email_publico || 'No proveído'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400"><Phone size={14} /></div>
                                                <span className="font-medium text-slate-700">{prov.telefono || prov.whatsapp || 'No proveído'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="text-sm">
                                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-1">RUT</span>
                                                <span className="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{prov.rut || '—'}</span>
                                            </div>
                                            {(prov.foto_carnet || prov.foto_rut) && (
                                                <button onClick={() => setSelectedImage(prov.foto_carnet || prov.foto_rut)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg w-fit transition-colors">
                                                    <FileImage size={16} /> Ver Carnet
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="xl:w-1/4 flex flex-row xl:flex-col justify-end gap-3 shrink-0">
                                        <button onClick={() => handleAprobar(prov)} disabled={isSubmitting}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                                            <Check size={18} /> <span className="hidden sm:inline">Aprobar</span>
                                        </button>
                                        <button onClick={() => setRejectingId(prov.id)} disabled={isSubmitting}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                                            <X size={18} /> <span className="hidden sm:inline">Rechazar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ============================== VERIFICACIONES ID ============================== */}
            {tab === 'verificacion' && (
                <>
                    {loadingVerif ? (
                        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Cargando verificaciones...</p>
                        </div>
                    ) : verificaciones.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Sin verificaciones pendientes</h3>
                            <p className="text-slate-500">Todos los carnets han sido revisados.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Verificaciones de Identidad ({verificaciones.length})</h2>
                            {verificaciones.map(prov => (
                                <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Avatar + Info */}
                                    <div className="flex items-start gap-4 xl:w-1/3 shrink-0">
                                        <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                            {prov.foto_perfil ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl uppercase">{prov.nombre.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <a href={`/proveedor/${prov.id}`} target="_blank" rel="noopener noreferrer"
                                                className="font-bold text-slate-900 hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                                                {prov.nombre} {prov.apellido_p}
                                                <ExternalLink size={12} className="text-slate-300" />
                                            </a>
                                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={12} /> {prov.comuna || '—'}</p>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Clock size={12} className="text-amber-500" />
                                                <span className="text-xs text-amber-600 font-semibold">Pendiente de revisión</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RUT + Carnet */}
                                    <div className="flex-1 border-y xl:border-y-0 xl:border-x border-slate-100 py-4 xl:py-0 xl:px-6 space-y-3">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">RUT declarado</span>
                                            <span className="font-mono font-bold text-slate-900 text-lg">{prov.rut || '—'}</span>
                                        </div>
                                        {prov.foto_carnet ? (
                                            <div className="flex items-center gap-3">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={prov.foto_carnet}
                                                    alt="Carnet"
                                                    className="h-16 w-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                                    onClick={() => setSelectedImage(prov.foto_carnet)}
                                                />
                                                <button onClick={() => setSelectedImage(prov.foto_carnet)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                                    <FileImage size={16} /> Ver en grande
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Shield size={16} />
                                                <span>Sin foto de carnet adjunta</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="xl:w-1/4 flex flex-row xl:flex-col justify-end gap-3 shrink-0">
                                        <button onClick={() => handleAprobarVerif(prov)} disabled={isSubmitting || !prov.foto_carnet}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                                            <ShieldCheck size={16} /> <span className="hidden sm:inline">Verificar</span>
                                        </button>
                                        <button onClick={() => setRejectingVerifId(prov.id)} disabled={isSubmitting}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                                            <ShieldX size={16} /> <span className="hidden sm:inline">Rechazar</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ============================== LIGHTBOX ============================== */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2">
                            <X size={32} />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedImage} alt="Documento" className="w-full h-full object-contain rounded-xl shadow-2xl" />
                        <div className="absolute -bottom-14 left-0 w-full flex justify-center">
                            <a href={selectedImage} target="_blank" rel="noreferrer"
                                className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md transition-colors font-semibold">
                                <ExternalLink size={18} /> Abrir en nueva pestaña
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================== MODAL RECHAZO INCORPORACIÓN ============================== */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={24} /></div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Rechazar Solicitud</h2>
                        <p className="text-sm text-slate-500 mb-6">Indica el motivo del rechazo. El usuario recibirá esta información por correo.</p>
                        <form onSubmit={handleRechazar}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo *</label>
                                <textarea value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
                                    placeholder="Ej: Foto de carnet ilegible, datos incompletos..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm" required />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setRejectingId(null); setMotivoRechazo(''); }}
                                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !motivoRechazo.trim()}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Confirmar Rechazo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================== MODAL RECHAZO VERIFICACIÓN ============================== */}
            {rejectingVerifId && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><ShieldX size={24} /></div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Rechazar Verificación</h2>
                        <p className="text-sm text-slate-500 mb-6">El proveedor verá este mensaje en su dashboard y podrá reenviar su solicitud.</p>
                        <form onSubmit={handleRechazarVerif}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo del rechazo *</label>
                                <textarea value={notaVerif} onChange={e => setNotaVerif(e.target.value)}
                                    placeholder="Ej: Foto ilegible, carnet vencido, RUT no coincide con la imagen..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none resize-none text-sm" required />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setRejectingVerifId(null); setNotaVerif(''); }}
                                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !notaVerif.trim()}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Rechazar Verificación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================== CONFIRM DIALOG ============================== */}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmLabel={confirmDialog.confirmLabel}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
                loading={isSubmitting}
            />
        </div>
    );
}
