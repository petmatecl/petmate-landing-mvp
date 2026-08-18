import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, FileImage, ExternalLink, Mail, Phone, MapPin, Loader2, AlertTriangle, ShieldCheck, ShieldX, Shield, Clock, Building, User, FileText, Briefcase, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '../Shared/ConfirmDialog';
import { getCarnetSignedUrl } from '../../lib/carnetUrl';

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
            // Bug producto 2026-08-18: SELECT client-side directo dejaba el
            // email real (auth.users) invisible al admin — email_publico está
            // vacío para casi todos porque es opcional. Ahora vía endpoint
            // server-side (verifySession + isAdmin) que hace el join con
            // service_role_key + enriquece con conteo de servicios + flag
            // de cuenta de prueba.
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('Sin sesión activa');
            const res = await fetch('/api/admin/proveedores-pendientes', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json();
            setProveedores(body.proveedores || []);
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
                const { data: { session } } = await supabase.auth.getSession();
                await fetch('/api/admin/notify-provider', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token ?? ''}`,
                    },
                    body: JSON.stringify({ proveedorId: prov.id, estado: 'aprobado' })
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
                const { data: { session } } = await supabase.auth.getSession();
                await fetch('/api/admin/notify-provider', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token ?? ''}`,
                    },
                    body: JSON.stringify({ proveedorId: prov.id, estado: 'rechazado', motivo: motivoRechazo })
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
            // Sprint bug1-fks (2026-08-14) — BUG-1 fix. El SELECT previo
            // NO traía email_publico, telefono, whatsapp. El render usaba
            // esos campos con fallback 'No proveído', dando la falsa
            // apariencia de que los proveedores no habían dado contacto.
            // Aldo casi rechaza 8 personas reales por esta omisión. Fix:
            // agregar las 3 columnas al select. Email primario (de
            // auth.users) se resuelve post-fetch con getUserById para
            // cada auth_user_id — no se puede joinar directo desde el
            // cliente sin RPC dedicado, pero admin con SUPABASE_SERVICE_
            // ROLE_KEY tampoco existe client-side. Resolvemos con RPC
            // supabaseAdmin desde /api/admin/proveedores-emails cuando
            // haga falta; por ahora el email_publico + telefono +
            // whatsapp cubren el contacto del proveedor.
            const { data, error } = await supabase
                .from('proveedores')
                .select('id, nombre, apellido_p, foto_perfil, rut, foto_carnet, foto_carnet_dorso, comuna, auth_user_id, verificacion_estado, verificacion_nota, created_at, email_publico, telefono, whatsapp')
                .eq('verificacion_estado', 'pendiente')
                .order('created_at', { ascending: false });
            if (error) throw error;
            // Sprint Ola-1 A1 — resolver signed URLs para las fotos de carnet
            // (bucket documents es privado; el path/URL guardado en BD no
            // sirve al render directo). Ver lib/carnetUrl.ts.
            const withSignedUrls = await Promise.all((data || []).map(async (prov) => ({
                ...prov,
                foto_carnet_signed_url: await getCarnetSignedUrl(prov.foto_carnet),
                foto_carnet_dorso_signed_url: await getCarnetSignedUrl(prov.foto_carnet_dorso),
            })));
            setVerificaciones(withSignedUrls);
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
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === id
                ? 'bg-slate-900 text-white font-semibold shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
        >
            {label}
            {count > 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tab === id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    // P5 (2026-08-18): separar `proveedores` en 2 grupos por dónde está la
    // pelota. `sin_enviar` = proveedor aún no subió carnet → NO hay nada que
    // el admin pueda aprobar. `pendiente` = carnet subido esperando revisión
    // → admin acciona.
    //
    // El contador del sidebar tab `incorporacion` refleja SOLO el Grupo B
    // (accionable) para que la alarma diaria no infle con casos donde el
    // admin no puede hacer nada. Grupo A queda como info complementaria.
    const grupoA = proveedores.filter(p => p.verificacion_estado === 'sin_enviar');
    const grupoB = proveedores.filter(p => p.verificacion_estado === 'pendiente');
    // Helper: días desde el registro (para el badge de severidad del Grupo A).
    const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

    // Helper — renderiza una card de proveedor pendiente. `variant`:
    //   'a' = Grupo A (sin carnet) — CTA "Enviar recordatorio" (mailto).
    //   'b' = Grupo B (con carnet) — CTA Aprobar/Rechazar + Ver carnet.
    // Ajuste defensivo (nota PO 2026-08-18): campos opcionales vacíos NO se
    // renderizan (RUT, teléfono, empresa) en vez de mostrar etiquetas
    // vacías. Mejor huecos legítimos que placeholders.
    const renderProvCard = (prov: any, variant: 'a' | 'b') => {
        const tieneTelefono = !!(prov.telefono || prov.whatsapp);
        const tieneRut = !!prov.rut;
        const tieneEmpresaData = prov.tipo_entidad === 'empresa' && (prov.razon_social || prov.rut_empresa || prov.nombre_fantasia || prov.giro);
        const dias = diasDesde(prov.created_at);
        // Severidad temporal Grupo A: verde <7d, amber 7-29d, rojo ≥30d.
        const timeSeverity = dias >= 30 ? 'danger' : dias >= 7 ? 'warning' : 'success';
        const timeBadgeCls = timeSeverity === 'danger'
            ? 'bg-danger-100 text-danger-800 border-danger-100'
            : timeSeverity === 'warning'
                ? 'bg-warning-100 text-warning-800 border-warning-100'
                : 'bg-success-100 text-success-800 border-success-100';

        return (
            <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col xl:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 xl:w-1/3 shrink-0">
                    <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                        {prov.foto_perfil ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-xl uppercase">{prov.nombre.charAt(0)}</div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        {prov.servicios_activos > 0 ? (
                            <a href={`/proveedor/${prov.id}`} target="_blank" rel="noopener noreferrer"
                                className="text-base font-semibold text-slate-900 hover:text-accent-600 transition-colors flex items-center gap-1.5">
                                {prov.nombre} {prov.apellido_p || ''}
                                <ExternalLink size={14} className="text-slate-300" />
                            </a>
                        ) : (
                            <span className="text-base font-semibold text-slate-900 flex items-center gap-2 flex-wrap">
                                {prov.nombre} {prov.apellido_p || ''}
                                {prov.es_cuenta_prueba && (
                                    <span title="Cuenta de prueba (dominio @pawnecta-test.com)"
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning-100 text-warning-800 rounded text-[10px] font-semibold uppercase tracking-widest">
                                        <TestTube2 size={10} /> Prueba
                                    </span>
                                )}
                            </span>
                        )}
                        {prov.comuna && (
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><MapPin size={14} /> {prov.comuna}</p>
                        )}
                        <p className="text-xs font-semibold text-slate-400 mt-2 bg-slate-50 inline-block px-2 py-1 rounded">
                            {format(new Date(prov.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {prov.tipo_entidad === 'empresa' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-50 text-info-800 border border-info-100 rounded text-[11px] font-medium">
                                    <Building size={11} /> Empresa
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium">
                                    <User size={11} /> Persona natural
                                </span>
                            )}
                            {prov.servicios_activos > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-50 text-success-800 border border-success-100 rounded text-[11px] font-medium">
                                    {prov.servicios_activos} servicio{prov.servicios_activos > 1 ? 's' : ''} activo{prov.servicios_activos > 1 ? 's' : ''}
                                </span>
                            )}
                            {prov.servicios_inactivos > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-warning-50 text-warning-800 border border-warning-100 rounded text-[11px] font-medium">
                                    {prov.servicios_inactivos} en preparación
                                </span>
                            )}
                            {variant === 'a' && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${timeBadgeCls}`}>
                                    <Clock size={11} /> {dias === 0 ? 'Registrado hoy' : dias === 1 ? '1 día sin actividad' : `${dias} días sin actividad`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 border-y xl:border-y-0 xl:border-x border-slate-100 py-4 xl:py-0 xl:px-6">
                    <div className="space-y-3">
                        <div className="text-sm">
                            <span className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1 flex items-center gap-1.5"><Mail size={12} /> Correo</span>
                            {prov.email_auth ? (
                                <a href={`mailto:${prov.email_auth}`} className="font-medium text-accent-700 hover:underline break-all">
                                    {prov.email_auth}
                                </a>
                            ) : (
                                <span className="text-slate-400 italic text-xs">Sin correo en auth.users</span>
                            )}
                            {prov.email_publico && prov.email_publico !== prov.email_auth && (
                                <div className="text-xs text-slate-500 mt-1 break-all">
                                    Público: {prov.email_publico}
                                </div>
                            )}
                        </div>
                        {tieneTelefono && (
                            <div className="text-sm">
                                <span className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1 flex items-center gap-1.5"><Phone size={12} /> Teléfono</span>
                                <span className="font-medium text-slate-700">{prov.telefono || prov.whatsapp}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        {tieneRut && (
                            <div className="text-sm">
                                <span className="text-slate-400 text-xs font-medium uppercase tracking-widest block mb-1">RUT</span>
                                <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{prov.rut}</span>
                            </div>
                        )}
                        {tieneEmpresaData && (
                            <div className="text-xs bg-info-50/50 border border-info-100 rounded-lg p-2 space-y-1">
                                {prov.razon_social && <div><span className="text-slate-400">Razón social:</span> <span className="text-slate-700 font-medium">{prov.razon_social}</span></div>}
                                {prov.rut_empresa && <div><span className="text-slate-400">RUT empresa:</span> <span className="text-slate-700 font-mono">{prov.rut_empresa}</span></div>}
                                {prov.nombre_fantasia && <div><span className="text-slate-400">Nombre fantasía:</span> <span className="text-slate-700 font-medium">{prov.nombre_fantasia}</span></div>}
                                {prov.giro && <div><span className="text-slate-400">Giro:</span> <span className="text-slate-700">{prov.giro}</span></div>}
                            </div>
                        )}
                        {prov.bio && (
                            <div className="text-xs text-slate-600 leading-relaxed line-clamp-2" title={prov.bio}>
                                <FileText size={11} className="inline text-slate-400 mr-1" />
                                {prov.bio}
                            </div>
                        )}
                        {variant === 'b' && (prov.foto_carnet || prov.foto_rut) && (
                            <button onClick={() => setSelectedImage(prov.foto_carnet || prov.foto_rut)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg w-fit transition-colors">
                                <FileImage size={16} /> Ver Carnet
                            </button>
                        )}
                    </div>
                </div>
                <div className="xl:w-1/4 flex flex-row xl:flex-col justify-end gap-3 shrink-0">
                    {variant === 'b' ? (
                        <>
                            <button onClick={() => handleAprobar(prov)} disabled={isSubmitting}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-success-700 hover:bg-success-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                                <Check size={18} /> <span className="hidden sm:inline">Aprobar</span>
                            </button>
                            <button onClick={() => setRejectingId(prov.id)} disabled={isSubmitting}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-danger-200 hover:bg-danger-50 text-danger-600 font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                                <X size={18} /> <span className="hidden sm:inline">Rechazar</span>
                            </button>
                        </>
                    ) : (
                        // Grupo A: CTA "Enviar recordatorio" con mailto — abre el
                        // cliente de correo del admin con el email del proveedor
                        // pre-populated + subject + body sugerido. Cero backend
                        // nuevo. Si más adelante se implementa el cron
                        // recordatorio-carnet (BACKLOG), el CTA se reemplaza por
                        // un botón que dispara ese endpoint.
                        prov.email_auth ? (
                            <a href={`mailto:${prov.email_auth}?subject=${encodeURIComponent('Sube tu carnet para completar tu registro en Pawnecta')}&body=${encodeURIComponent(`Hola ${prov.nombre},\n\nRecibimos tu registro como proveedor en Pawnecta el ${format(new Date(prov.created_at), "d 'de' MMMM", { locale: es })}. Para poder aprobar tu perfil y que puedas empezar a recibir consultas, necesitamos que subas foto de tu carnet (frontal y dorso) desde tu panel:\n\nhttps://www.pawnecta.com/proveedor\n\nSi tienes alguna duda, responde este correo.\n\nSaludos,\nEl equipo de Pawnecta`)}`}
                                className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-accent-600 hover:text-accent-600 text-slate-700 font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm">
                                <Mail size={16} /> Enviar recordatorio
                            </a>
                        ) : (
                            <span className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-slate-50 text-slate-400 font-semibold py-2.5 px-4 rounded-lg text-sm">
                                Sin correo — no hay canal
                            </span>
                        )
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Tab Selector */}
            <div role="tablist" aria-label="Cola de verificaciones" className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl w-fit border border-slate-200">
                {/* P5: contador = Grupo B (accionable). Tooltip aclara. */}
                <TabButton id="incorporacion" label="Solicitudes de Alta" count={grupoB.length} />
                <TabButton id="verificacion" label="Verificaciones ID" count={verificaciones.length} />
            </div>

            {/* ============================== INCORPORACIÓN ============================== */}
            {tab === 'incorporacion' && (
                <>
                    {loading ? (
                        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Cargando solicitudes pendientes...</p>
                        </div>
                    ) : proveedores.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 text-accent-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">¡Todo al día!</h3>
                            <p className="text-slate-500">No hay solicitudes de proveedores pendientes.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {/* P5 Grupo B — carnet subido, esperando revisión admin.
                                Se muestra PRIMERO porque es lo accionable (mantiene
                                el flujo actual con Aprobar/Rechazar + Ver Carnet). */}
                            {grupoB.length > 0 && (
                                <section className="rounded-2xl border border-accent-100 bg-accent-50/30 p-4">
                                    <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-accent-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-accent-100 text-accent-800 rounded-lg flex items-center justify-center">
                                                <ShieldCheck size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">Carnet subido, esperando tu revisión</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">La pelota está en tu cancha — aprobar o rechazar según el carnet.</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-accent-100 text-accent-800 rounded-full text-[11px] font-bold uppercase tracking-widest">
                                            {grupoB.length} esperando tu revisión
                                        </span>
                                    </div>
                                    <div className="grid gap-3">
                                        {grupoB.map(prov => renderProvCard(prov, 'b'))}
                                    </div>
                                </section>
                            )}

                            {/* P5 Grupo A — esperando que el proveedor suba su carnet.
                                SIN botones Aprobar/Rechazar (nada que aprobar). CTA
                                "Enviar recordatorio" con mailto directo al email de
                                auth.users. */}
                            {grupoA.length > 0 && (
                                <section className="rounded-2xl border border-warning-100 bg-warning-50/30 p-4">
                                    <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-warning-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-warning-100 text-warning-800 rounded-lg flex items-center justify-center">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900">Esperando que el proveedor suba su carnet</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">La pelota está en la cancha del proveedor — no hay nada que aprobar aún.</p>
                                            </div>
                                        </div>
                                        <span className="px-3 py-1 bg-warning-100 text-warning-800 rounded-full text-[11px] font-bold uppercase tracking-widest">
                                            {grupoA.length} en espera
                                        </span>
                                    </div>
                                    <div className="grid gap-3">
                                        {grupoA.map(prov => renderProvCard(prov, 'a'))}
                                    </div>
                                </section>
                            )}
                            {/* Ambos grupos vacíos → mensaje empty ya cubierto arriba.
                                Legacy: mostraba todos juntos con contador. Ver Git log. */}
                        </div>
                    )}
                </>
            )}


            {/* ============================== VERIFICACIONES ID ============================== */}
            {tab === 'verificacion' && (
                <>
                    {loadingVerif ? (
                        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
                            <Loader2 className="w-8 h-8 animate-spin text-accent-600 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">Cargando verificaciones...</p>
                        </div>
                    ) : verificaciones.length === 0 ? (
                        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 text-accent-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Sin verificaciones pendientes</h3>
                            <p className="text-slate-500">Todos los carnets han sido revisados.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest">Verificaciones de Identidad ({verificaciones.length})</h2>
                            {verificaciones.map(prov => (
                                <div key={prov.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col xl:flex-row gap-6 shadow-sm hover:shadow-md transition-shadow">
                                    {/* Avatar + Info */}
                                    <div className="flex items-start gap-4 xl:w-1/3 shrink-0">
                                        <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                            {prov.foto_perfil ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-xl uppercase">{prov.nombre.charAt(0)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <a href={`/proveedor/${prov.id}`} target="_blank" rel="noopener noreferrer"
                                                className="font-semibold text-slate-900 hover:text-accent-600 transition-colors flex items-center gap-1.5">
                                                {prov.nombre} {prov.apellido_p}
                                                <ExternalLink size={12} className="text-slate-300" />
                                            </a>
                                            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1"><MapPin size={12} /> {prov.comuna || '—'}</p>
                                            <div className="flex items-center gap-1.5 mt-2">
                                                <Clock size={12} className="text-warning-500" />
                                                <span className="text-xs text-warning-600 font-semibold">Pendiente de revisión</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RUT + Carnet */}
                                    <div className="flex-1 border-y xl:border-y-0 xl:border-x border-slate-100 py-4 xl:py-0 xl:px-6 space-y-3">
                                        <div>
                                            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest block mb-1">RUT declarado</span>
                                            <span className="font-mono font-semibold text-slate-900 text-lg">{prov.rut || '—'}</span>
                                        </div>
                                        {prov.foto_carnet ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    {prov.foto_carnet_signed_url ? (
                                                        <img src={prov.foto_carnet_signed_url} alt="Carnet frontal"
                                                            className="h-16 w-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                                            onClick={() => setSelectedImage(prov.foto_carnet_signed_url)} />
                                                    ) : (
                                                        <div className="h-16 w-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">Sin URL</div>
                                                    )}
                                                    <span className="text-xs text-slate-500 font-medium">Frontal</span>
                                                </div>
                                                {prov.foto_carnet_dorso && (
                                                    <div className="flex items-center gap-3">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        {prov.foto_carnet_dorso_signed_url ? (
                                                            <img src={prov.foto_carnet_dorso_signed_url} alt="Carnet dorso"
                                                                className="h-16 w-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                                                onClick={() => setSelectedImage(prov.foto_carnet_dorso_signed_url)} />
                                                        ) : (
                                                            <div className="h-16 w-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">Sin URL</div>
                                                        )}
                                                        <span className="text-xs text-slate-500 font-medium">Dorso</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Shield size={16} />
                                                <span>Sin foto de carnet adjunta</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {/* Par verificar/rechazar-verificacion con tokens semanticos:
                                        success = Verificar filled, danger = Rechazar outlined. */}
                                    <div className="xl:w-1/4 flex flex-row xl:flex-col justify-end gap-3 shrink-0">
                                        <button onClick={() => handleAprobarVerif(prov)} disabled={isSubmitting || !prov.foto_carnet}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-success-700 hover:bg-success-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">
                                            <ShieldCheck size={16} /> <span className="hidden sm:inline">Verificar</span>
                                        </button>
                                        <button onClick={() => setRejectingVerifId(prov.id)} disabled={isSubmitting}
                                            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-danger-200 hover:bg-danger-50 text-danger-600 font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50">
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
                        <div className="w-12 h-12 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mb-6"><AlertTriangle size={24} /></div>
                        <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Rechazar Solicitud</h2>
                        <p className="text-sm text-slate-500 mb-6">Indica el motivo del rechazo. El usuario recibirá esta información por correo.</p>
                        <form onSubmit={handleRechazar}>
                            <div className="mb-6">
                                <label htmlFor="approval-motivo-solicitud" className="block text-sm font-semibold text-slate-700 mb-2">Motivo *</label>
                                <textarea id="approval-motivo-solicitud" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)}
                                    placeholder="Ej: Foto de carnet ilegible, datos incompletos..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-danger-500 outline-none resize-none text-sm" required />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setRejectingId(null); setMotivoRechazo(''); }}
                                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !motivoRechazo.trim()}
                                    className="px-5 py-2.5 bg-danger-600 hover:bg-danger-700 text-white font-medium tracking-wide rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
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
                        <div className="w-12 h-12 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mb-6"><ShieldX size={24} /></div>
                        <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">Rechazar Verificación</h2>
                        <p className="text-sm text-slate-500 mb-6">El proveedor verá este mensaje en su dashboard y podrá reenviar su solicitud.</p>
                        <form onSubmit={handleRechazarVerif}>
                            <div className="mb-6">
                                <label htmlFor="approval-motivo-verif" className="block text-sm font-semibold text-slate-700 mb-2">Motivo del rechazo *</label>
                                <textarea id="approval-motivo-verif" value={notaVerif} onChange={e => setNotaVerif(e.target.value)}
                                    placeholder="Ej: Foto ilegible, carnet vencido, RUT no coincide con la imagen..."
                                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-danger-500 outline-none resize-none text-sm" required />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setRejectingVerifId(null); setNotaVerif(''); }}
                                    className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSubmitting || !notaVerif.trim()}
                                    className="px-5 py-2.5 bg-danger-600 hover:bg-danger-700 text-white font-medium tracking-wide rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
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
