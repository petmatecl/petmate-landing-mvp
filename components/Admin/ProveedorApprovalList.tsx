import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, FileImage, Download, ExternalLink, Mail, Phone, MapPin, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProveedorApprovalList() {
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Lightbox / Modal de imagen
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Modal de rechazo
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPendientes();
    }, []);

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

    const handleAprobar = async (prov: any) => {
        if (!confirm(`¿Estás seguro de aprobar a ${prov.nombre} ${prov.apellido_p}?`)) return;

        setIsSubmitting(true);
        try {
            // 1. Obtener ID del admin actual
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No hay sesión activa");

            // 2. Actualizar estado
            const { error: updateError } = await supabase
                .from('proveedores')
                .update({
                    estado: 'aprobado',
                    aprobado_at: new Date().toISOString(),
                    aprobado_por: session.user.id
                })
                .eq('id', prov.id);

            if (updateError) throw updateError;

            // 3. Enviar email (no bloqueamos si falla el email, pero notificamos)
            try {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: prov.email_publico || prov.email || `${session.user.email}`, // Fallback ideal iterar supabase auth user, asumimos email_publico para pruebas o logica en backend
                        subject: "¡Estás aprobado en Pawnecta! Ya puedes publicar tus servicios 🐾",
                        template: "AprobacionProveedor",
                        props: { nombre: prov.nombre }
                    })
                });
            } catch (emailErr) {
                console.error("Error enviando email", emailErr);
                toast.warning('Proveedor aprobado, pero falló el envío del email.');
            }

            toast.success('Proveedor Aprobado exitosamente');
            setProveedores(prev => prev.filter(p => p.id !== prov.id));
        } catch (error: any) {
            console.error('Error aprobando', error);
            toast.error(error.message || 'Ocurrió un error al aprobar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRechazar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingId || !motivoRechazo.trim()) return;

        setIsSubmitting(true);
        try {
            const prov = proveedores.find(p => p.id === rejectingId);
            if (!prov) throw new Error("Proveedor no encontrado en lista local");

            // Actualizar estado
            const { error: updateError } = await supabase
                .from('proveedores')
                .update({
                    estado: 'rechazado',
                    motivo_rechazo: motivoRechazo
                })
                .eq('id', rejectingId);

            if (updateError) throw updateError;

            // Enviar email
            try {
                await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: prov.email_publico || prov.email || "test@test.com",
                        subject: "Sobre tu solicitud en Pawnecta",
                        template: "RechazoProveedor",
                        props: { nombre: prov.nombre, motivo_rechazo: motivoRechazo }
                    })
                });
            } catch (emailErr) {
                console.error("Error enviando email de rechazo", emailErr);
                toast.warning('Rechazado, pero falló el envío del email.');
            }

            toast.success('Solicitud rechazada');
            setProveedores(prev => prev.filter(p => p.id !== rejectingId));
            setRejectingId(null);
            setMotivoRechazo('');
        } catch (error: any) {
            console.error('Error rechazando', error);
            toast.error(error.message || 'Ocurrió un error al rechazar');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Función auxiliar para obtener URL del carnet si está en Storage u otra DB
    const extractIdDocumentUrl = (prov: any) => {
        // Asumiendo que pueden venir en foto_perfil temporalmente o en una nueva columna documento_identidad
        // Ajustar según el schema real si existiera un campo documento_identidad o foto_rut
        return prov.foto_carnet || prov.foto_rut || null;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Cargando solicitudes pendientes...</p>
            </div>
        );
    }

    if (proveedores.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">¡Todo al día!</h3>
                <p className="text-slate-500">No hay solicitudes de proveedores pendientes por revisar en este momento.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Solicitudes Pendientes ({proveedores.length})</h2>

            <div className="grid gap-4">
                {proveedores.map(prov => (
                    <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">

                        {/* Avatar & Basic Info */}
                        <div className="flex items-start gap-4 xl:w-1/3 shrink-0">
                            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {prov.foto_perfil ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl uppercase">
                                        {prov.nombre.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 group flex items-center gap-2">
                                    {prov.nombre} {prov.apellido_p}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {prov.comuna || 'Sin comuna'}</p>
                                <p className="text-xs font-semibold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">
                                    Registrado el {format(new Date(prov.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                </p>
                            </div>
                        </div>

                        {/* Contact Data */}
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
                                    <span className="font-medium text-slate-800 bg-slate-100 px-2 py-1 rounded">{prov.rut || 'No visible en BD proveedor'}</span>
                                </div>

                                {/* Document Btn */}
                                {extractIdDocumentUrl(prov) && (
                                    <button
                                        onClick={() => setSelectedImage(extractIdDocumentUrl(prov))}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg w-fit transition-colors"
                                    >
                                        <FileImage size={16} /> Ver Carnet
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="xl:w-1/4 flex flex-row xl:flex-col justify-end gap-3 shrink-0">
                            <button
                                onClick={() => handleAprobar(prov)}
                                disabled={isSubmitting}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                <Check size={18} /> <span className="hidden sm:inline">Aprobar</span>
                            </button>
                            <button
                                onClick={() => setRejectingId(prov.id)}
                                disabled={isSubmitting}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                            >
                                <X size={18} /> <span className="hidden sm:inline">Rechazar</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* LIGHTBOX DE IMAGEN */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedImage(null)} className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2">
                            <X size={32} />
                        </button>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedImage} alt="Documento" className="w-full h-full object-contain rounded-xl shadow-2xl" />
                        <div className="absolute -bottom-14 left-0 w-full flex justify-center">
                            <a href={selectedImage} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md transition-colors font-semibold">
                                <ExternalLink size={18} /> Abrir en nueva pestaña
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE RECHAZO */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-2">Rechazar Solicitud</h2>
                        <p className="text-sm text-slate-500 mb-6">Indica el motivo por el cual no se puede aprobar este perfil. Esta información le llegará por correo al usuario.</p>

                        <form onSubmit={handleRechazar}>
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Motivo de Rechazo *</label>
                                <textarea
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    placeholder="Ej: Foto de carnet ilegible, datos falsos detectados..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none text-sm"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setRejectingId(null); setMotivoRechazo(''); }} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSubmitting || !motivoRechazo.trim()} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-red-600/20">
                                    {isSubmitting && <Loader2 size={16} className="animate-spin" />} Confirmar Rechazo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
