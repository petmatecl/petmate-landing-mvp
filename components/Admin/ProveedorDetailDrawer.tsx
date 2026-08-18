import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    X, Mail, Phone, MapPin, User, Building, FileText, FileImage,
    Package, AlertTriangle, Send, Copy, ExternalLink, Briefcase,
    Loader2, TestTube2, ShieldCheck,
} from 'lucide-react';
import { getCarnetSignedUrl } from '../../lib/carnetUrl';
import { toast } from 'sonner';

// Vista detalle del proveedor pendiente en /admin > Aprobaciones.
// Drawer lateral derecho (~680px) que se abre al hacer clic en el nombre.
// Preview aprobado por PO 2026-08-18 con ajuste al ordenamiento de "qué
// falta" (criticidad, no orden de campos).

interface ProveedorDetailDrawerProps {
    prov: any;               // Mismo shape que retorna /api/admin/proveedores-pendientes
    onClose: () => void;
}

interface ServicioMini {
    id: string;
    titulo: string;
    categoria_nombre: string | null;
    activo: boolean;
}

export default function ProveedorDetailDrawer({ prov, onClose }: ProveedorDetailDrawerProps) {
    // ESC para cerrar (paridad con VerificationGateModal.tsx).
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Signed URLs del carnet (frontal + dorso) — helper A1 reusado.
    const [signedCarnetUrl, setSignedCarnetUrl] = useState<string | null>(null);
    const [signedCarnetDorsoUrl, setSignedCarnetDorsoUrl] = useState<string | null>(null);
    const [carnetLoading, setCarnetLoading] = useState<boolean>(!!prov.foto_carnet);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!prov.foto_carnet && !prov.foto_carnet_dorso) {
                setCarnetLoading(false);
                return;
            }
            setCarnetLoading(true);
            const [urlFrontal, urlDorso] = await Promise.all([
                prov.foto_carnet ? getCarnetSignedUrl(prov.foto_carnet) : Promise.resolve(null),
                prov.foto_carnet_dorso ? getCarnetSignedUrl(prov.foto_carnet_dorso) : Promise.resolve(null),
            ]);
            if (cancelled) return;
            setSignedCarnetUrl(urlFrontal);
            setSignedCarnetDorsoUrl(urlDorso);
            setCarnetLoading(false);
        })();
        return () => { cancelled = true; };
    }, [prov.foto_carnet, prov.foto_carnet_dorso]);

    // Servicios del proveedor — query cliente. El endpoint principal solo
    // trae conteos; para la lista con títulos + categorías hacemos un fetch
    // adicional aquí (solo se dispara cuando el drawer abre).
    const [servicios, setServicios] = useState<ServicioMini[]>([]);
    const [serviciosLoading, setServiciosLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setServiciosLoading(true);
            const { data, error } = await supabase
                .from('servicios_publicados')
                .select('id, titulo, activo, categoria:categorias_servicio!servicios_publicados_categoria_id_fkey(nombre)')
                .eq('proveedor_id', prov.id)
                .order('created_at', { ascending: false });
            if (cancelled) return;
            if (error) {
                console.warn('[ProveedorDetailDrawer] servicios fetch failed:', error);
                setServicios([]);
            } else {
                setServicios((data || []).map((s: any) => ({
                    id: s.id,
                    titulo: s.titulo,
                    activo: s.activo,
                    categoria_nombre: Array.isArray(s.categoria) ? s.categoria[0]?.nombre : s.categoria?.nombre,
                })));
            }
            setServiciosLoading(false);
        })();
        return () => { cancelled = true; };
    }, [prov.id]);

    const dias = Math.floor((Date.now() - new Date(prov.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const timeSeverity = dias >= 30 ? 'danger' : dias >= 7 ? 'warning' : 'success';
    const timeBadgeCls = timeSeverity === 'danger'
        ? 'bg-danger-100 text-danger-800'
        : timeSeverity === 'warning'
            ? 'bg-warning-100 text-warning-800'
            : 'bg-success-100 text-success-800';

    // Ajuste PO 2026-08-18: sección "Qué falta" ORDENADA POR CRITICIDAD, no
    // por orden de campos. Cada faltante tiene severity + copy sugerido de
    // acción. La regla es: primero lo que BLOQUEA (aprobación admin),
    // después lo que MEJORA (conversión), después lo OPCIONAL. Datos que
    // faltan por evolución del formulario (RUT post-30-abril) van como
    // nota al pie — no es acción pendiente para el proveedor.
    const faltantes: Array<{ severity: 'critical' | 'high' | 'medium' | 'low'; label: string; explain?: string }> = [];
    if (!prov.foto_carnet || !prov.foto_carnet_dorso) {
        faltantes.push({
            severity: 'critical',
            label: 'Foto de carnet (frontal + dorso)',
            explain: 'Paso bloqueante — sin esto no puedes aprobar el registro.',
        });
    }
    if (servicios.filter(s => s.activo).length === 0) {
        faltantes.push({
            severity: 'high',
            label: 'Publicar primer servicio',
            explain: 'Después de tu aprobación como admin. Sin servicio activo el proveedor no aparece en /explorar.',
        });
    }
    if (!prov.foto_perfil) {
        faltantes.push({
            severity: 'medium',
            label: 'Foto de perfil',
            explain: 'Los perfiles con foto reciben ~70% más contactos (dato cron recordatorio-onboarding).',
        });
    }
    if (!prov.telefono && !prov.whatsapp) {
        faltantes.push({
            severity: 'low',
            label: 'Teléfono o WhatsApp',
            explain: 'Opcional pero recomendado para tutores que pregunten fuera del chat.',
        });
    }
    // Nota al pie: RUT vacío + registrado post-30-abril (versión sin RUT en
    // signup) = no es acción del proveedor, es cómo funciona el flujo hoy.
    // Fecha corte: commit ff97d14 del 2026-04-30.
    const CORTE_RUT_ISO = '2026-04-30T22:59:00Z'; // 18:58 CLT del commit
    const registradoPostCorte = new Date(prov.created_at) > new Date(CORTE_RUT_ISO);
    const rutNotaPie = !prov.rut && registradoPostCorte;

    // Compose hint personalizado por severidad temporal — tono cambia entre
    // recordatorio corto (reciente) y recuperación humana (larga data).
    const composeHint = timeSeverity === 'danger'
        ? 'Larga data sin actividad — mensaje humano y abierto. Reconocer el tiempo transcurrido, preguntar si sigue interesado/a. Un recordatorio automático se le va a leer mal. La bio (si escribió) da contexto para personalizar.'
        : timeSeverity === 'warning'
            ? 'Semanas sin actividad — mensaje directo pero con un "sabemos que la vida pasa". Preguntar si necesita apoyo con algún paso concreto.'
            : 'Registro reciente — mensaje corto y directo. Mencionar los pasos concretos que faltan (carnet + servicio) con link a /proveedor.';

    const initialLetter = prov.nombre?.charAt(0)?.toUpperCase() || '?';
    const nombreCompleto = `${prov.nombre} ${prov.apellido_p || ''}`.trim();
    const mailtoHref = prov.email_auth
        ? `mailto:${prov.email_auth}?subject=${encodeURIComponent('Sube tu carnet para completar tu registro en Pawnecta')}&body=${encodeURIComponent(`Hola ${prov.nombre},\n\n\n\n(Redactado en base al detalle del proveedor)\n\nSaludos,\nEl equipo de Pawnecta`)}`
        : '#';

    const copiarEmail = async () => {
        if (!prov.email_auth) return;
        try {
            await navigator.clipboard.writeText(prov.email_auth);
            toast.success('Correo copiado al portapapeles');
        } catch {
            toast.error('No pudimos copiar. Usa Ctrl+C.');
        }
    };

    const criticalityColor = (s: 'critical' | 'high' | 'medium' | 'low') =>
        s === 'critical' ? 'bg-danger-100 text-danger-800 border-danger-200'
        : s === 'high' ? 'bg-warning-100 text-warning-800 border-warning-200'
        : s === 'medium' ? 'bg-info-100 text-info-800 border-info-200'
        : 'bg-slate-100 text-slate-700 border-slate-200';

    const criticalityLabel = (s: 'critical' | 'high' | 'medium' | 'low') =>
        s === 'critical' ? 'Crítico' : s === 'high' ? 'Alto' : s === 'medium' ? 'Mejora' : 'Opcional';

    return (
        <>
            {/* Backdrop atenuado — click fuera cierra */}
            <div
                className="fixed inset-0 bg-slate-900/20 z-40"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Drawer */}
            <aside
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[680px] max-w-[92vw] bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto"
                role="dialog"
                aria-modal="true"
                aria-labelledby="prov-drawer-title"
            >
                <div className="p-6 sm:p-7">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 mb-5">
                        <div className="flex gap-4 flex-1 min-w-0">
                            <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {prov.foto_perfil ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={prov.foto_perfil} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-2xl uppercase">{initialLetter}</div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 id="prov-drawer-title" className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                                    {nombreCompleto}
                                    {prov.es_cuenta_prueba && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning-100 text-warning-800 rounded text-[10px] font-semibold uppercase tracking-widest">
                                            <TestTube2 size={10} /> Prueba
                                        </span>
                                    )}
                                </h2>
                                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                    {prov.tipo_entidad === 'empresa' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-info-100 text-info-800 rounded text-[11px] font-medium"><Building size={11} /> Empresa</span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium"><User size={11} /> Persona natural</span>
                                    )}
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${timeBadgeCls}`}>
                                        {dias === 0 ? 'Registrado hoy' : dias === 1 ? '1 día sin actividad' : `${dias} días sin actividad`}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Registrado el {format(new Date(prov.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                                    {prov.comuna && ` · ${prov.comuna}`}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0" aria-label="Cerrar">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Sección: Contacto */}
                    <section className="mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                            <Mail size={12} /> Contacto
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Correo</div>
                                {prov.email_auth ? (
                                    <a href={`mailto:${prov.email_auth}`} className="text-sm text-accent-700 hover:underline font-medium break-all">
                                        {prov.email_auth}
                                    </a>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Sin correo en auth.users</span>
                                )}
                                {prov.email_publico && prov.email_publico !== prov.email_auth && (
                                    <div className="text-xs text-slate-500 mt-1 break-all">Público: {prov.email_publico}</div>
                                )}
                            </div>
                            {(prov.telefono || prov.whatsapp) && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Teléfono / WhatsApp</div>
                                    <div className="text-sm text-slate-800 font-medium">{prov.telefono || prov.whatsapp}</div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Sección: Identidad */}
                    <section className="mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                            <Briefcase size={12} /> Identidad
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {prov.rut && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">RUT persona</div>
                                    <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block">{prov.rut}</span>
                                </div>
                            )}
                            {prov.comuna && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Comuna base</div>
                                    <div className="text-sm text-slate-800 flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {prov.comuna}</div>
                                </div>
                            )}
                            {prov.tipo_entidad === 'empresa' && prov.razon_social && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Razón social</div>
                                    <div className="text-sm text-slate-800">{prov.razon_social}</div>
                                </div>
                            )}
                            {prov.tipo_entidad === 'empresa' && prov.rut_empresa && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">RUT empresa</div>
                                    <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block">{prov.rut_empresa}</span>
                                </div>
                            )}
                            {prov.tipo_entidad === 'empresa' && prov.nombre_fantasia && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Nombre fantasía</div>
                                    <div className="text-sm text-slate-800">{prov.nombre_fantasia}</div>
                                </div>
                            )}
                            {prov.tipo_entidad === 'empresa' && prov.giro && (
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5">Giro</div>
                                    <div className="text-sm text-slate-800">{prov.giro}</div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Sección: Descripción */}
                    {prov.bio && (
                        <section className="mb-6">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                                <FileText size={12} /> Descripción
                            </h3>
                            <div className="bg-slate-50 rounded-lg p-3.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100">
                                {prov.bio}
                            </div>
                        </section>
                    )}

                    {/* Sección: Carnet */}
                    <section className="mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                            <FileImage size={12} /> Carnet de identidad
                        </h3>
                        {carnetLoading ? (
                            <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Cargando URL firmada...
                            </div>
                        ) : (signedCarnetUrl || signedCarnetDorsoUrl) ? (
                            <div className="grid grid-cols-2 gap-2.5">
                                {signedCarnetUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={signedCarnetUrl} alt="Carnet frontal" className="aspect-[5/3] object-cover rounded-lg border border-slate-200 cursor-pointer hover:border-accent-600 transition-colors" onClick={() => window.open(signedCarnetUrl, '_blank')} />
                                )}
                                {signedCarnetDorsoUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={signedCarnetDorsoUrl} alt="Carnet dorso" className="aspect-[5/3] object-cover rounded-lg border border-slate-200 cursor-pointer hover:border-accent-600 transition-colors" onClick={() => window.open(signedCarnetDorsoUrl, '_blank')} />
                                )}
                            </div>
                        ) : (
                            <div className="bg-warning-50 border border-dashed border-warning-200 rounded-lg p-3 text-sm text-warning-800 flex items-center gap-2">
                                <AlertTriangle size={14} className="shrink-0" />
                                Aún no subió foto del carnet. Este paso lo debe completar el proveedor desde <code className="bg-white/70 px-1 rounded text-xs">/proveedor</code>.
                            </div>
                        )}
                    </section>

                    {/* Sección: Servicios */}
                    <section className="mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                            <Package size={12} /> Servicios publicados
                        </h3>
                        {serviciosLoading ? (
                            <div className="text-xs text-slate-400 italic p-2">Cargando servicios...</div>
                        ) : servicios.length === 0 ? (
                            <div className="text-sm text-slate-500 italic p-3 bg-slate-50 rounded-lg border border-slate-100">
                                Sin servicios publicados aún.
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {servicios.map(s => (
                                    <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm text-slate-800 font-medium truncate">{s.titulo}</div>
                                            {s.categoria_nombre && <div className="text-xs text-slate-500 mt-0.5">{s.categoria_nombre}</div>}
                                        </div>
                                        <span className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${s.activo ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'}`}>
                                            {s.activo ? 'Activo' : 'En preparación'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Sección: Qué falta — ORDENADA POR CRITICIDAD (ajuste PO) */}
                    <section className="mb-6 bg-warning-50 border border-warning-100 rounded-xl p-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-warning-800 mb-3 flex items-center gap-1.5">
                            <AlertTriangle size={12} /> Qué falta para completar el registro
                        </h3>
                        {faltantes.length === 0 ? (
                            <div className="text-sm text-slate-700">
                                <ShieldCheck size={14} className="inline text-success-800 mr-1" /> Perfil completo — solo esperando tu aprobación.
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {faltantes.map((f, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest shrink-0 mt-0.5 ${criticalityColor(f.severity)}`}>
                                            {criticalityLabel(f.severity)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm text-slate-900 font-medium">{f.label}</div>
                                            {f.explain && <div className="text-xs text-slate-600 mt-0.5">{f.explain}</div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {rutNotaPie && (
                            <div className="mt-3 text-[11px] text-slate-500 italic border-t border-warning-100 pt-2">
                                Nota interna: RUT vacío porque se registró después del 30-abril-2026, cuando el signup dejó de pedir RUT. Se captura solo cuando sube carnet — no es acción pendiente del proveedor.
                            </div>
                        )}

                        <div className="mt-4 text-xs text-slate-700 bg-white rounded-lg p-3 border-l-2 border-warning-200">
                            <div className="font-semibold text-slate-800 mb-1">Contenido sugerido del mensaje</div>
                            {composeHint}
                        </div>
                    </section>

                    {/* Acciones */}
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                        {prov.email_auth ? (
                            <>
                                <a href={mailtoHref} className="flex-1 inline-flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm shadow-sm transition-colors">
                                    <Send size={15} /> Enviar recordatorio
                                </a>
                                <button onClick={copiarEmail} className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors" title="Copiar correo al portapapeles">
                                    <Copy size={15} />
                                </button>
                            </>
                        ) : (
                            <div className="flex-1 text-center text-sm text-slate-500 italic py-2.5 bg-slate-50 rounded-lg">
                                Sin correo — no hay canal para escribir directo
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
