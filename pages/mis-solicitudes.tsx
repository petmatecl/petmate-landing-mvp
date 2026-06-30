// pages/mis-solicitudes.tsx
// ----------------------------------------------------------------------------
// Sprint 4 — pagina del tutor para ver y gestionar sus solicitudes de
// agendamiento. Standalone (no parte de un panel del tutor — ese no existe
// todavia). RLS garantiza que el tutor solo ve y modifica sus propias filas.
//
// Patron: CSR con guard de auth (igual que /favoritos). Sin SSR porque la
// UserContext del cliente es la fuente de verdad de quien esta logueado y
// resolver tutor_id requiere otro round trip — total 2 fetches igual,
// preferimos consistencia con la convencion del proyecto.
// ----------------------------------------------------------------------------
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Calendar, ArrowRight, Clock, CheckCircle, XCircle, Phone, MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { fetchProveedoresPublicosByIds } from '../lib/supabase/queries/proveedoresPublicos';
import ConfirmDialog from '../components/Shared/ConfirmDialog';
import { formatFechaPreferida, formatFechaCorta, formatRangoNoches, formatPuntualConDuracion } from '../lib/formatFecha';
import { MODALIDAD_LABELS, type ModalidadCuidado } from '../lib/categoriaTemporal';
import { formatDireccionLinea } from '../lib/formatDireccion';
import type { AgendamientoConRelaciones, EstadoAgendamiento } from '../lib/types/agendamiento';

type LoadState =
    | { kind: 'loading' }
    | { kind: 'no-tutor-profile' }
    | { kind: 'ready'; agendamientos: AgendamientoConRelaciones[] };

export default function MisSolicitudesPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: userLoading } = useUser();

    const [state, setState] = useState<LoadState>({ kind: 'loading' });
    const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    // Auth gate — mismo patron que /favoritos.
    useEffect(() => {
        if (userLoading || !router.isReady) return;
        if (!isAuthenticated) {
            router.replace(`/login?redirect=${encodeURIComponent('/mis-solicitudes')}`);
        }
    }, [isAuthenticated, userLoading, router]);

    const fetchSolicitudes = useCallback(async () => {
        if (!user?.id) return;
        setState({ kind: 'loading' });

        // 1. Resolver tutor_id por auth_user_id (mismo patron que el modal
        //    del Sprint 2).
        const { data: buscador, error: buscadorErr } = await supabase
            .from('usuarios_buscadores')
            .select('id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (buscadorErr) {
            console.error('[mis-solicitudes] buscador fetch error:', buscadorErr);
            setState({ kind: 'ready', agendamientos: [] });
            return;
        }

        if (!buscador) {
            setState({ kind: 'no-tutor-profile' });
            return;
        }

        // 2. Listar agendamientos del tutor. RLS restringe a las propias.
        //    El embed proveedor:proveedores!fk(...) se reemplaza por hidratacion
        //    via vista publica (post-RLS fix junio 2026 — anon/tutor no-owner no
        //    puede leer la tabla base). El embed servicio:servicios_publicados
        //    funciona sin cambios (esa tabla no fue tocada por el fix).
        const { data, error } = await supabase
            .from('agendamientos')
            .select(`
                id, servicio_id, proveedor_id, tutor_id,
                fecha_preferida, fecha_fin, modalidad_elegida, modo_tarifa,
                duracion_horas, direccion_servicio,
                region, comuna, calle, numero, direccion_info,
                mensaje, estado, nota_proveedor,
                respondido_at, created_at, updated_at,
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo)
            `)
            .eq('tutor_id', buscador.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[mis-solicitudes] agendamientos fetch error:', error);
            setState({ kind: 'ready', agendamientos: [] });
            return;
        }

        // Hidratar proveedor desde vista publica (gating de telefono/whatsapp
        // por mostrar_* ya aplicado a nivel BD en la vista).
        const provMap = await fetchProveedoresPublicosByIds(
            (data || []).map((a: any) => a.proveedor_id),
            'id,nombre,apellido_p,foto_perfil,telefono,whatsapp,mostrar_telefono,mostrar_whatsapp',
        );
        const hydrated = (data || []).map((a: any) => ({
            ...a,
            proveedor: provMap.get(a.proveedor_id) ?? null,
        }));

        // Sort pendientes primero. PG no soporta CASE en order via supabase-js;
        // partition local sobre la lista que ya viene por created_at desc.
        const raw = hydrated as unknown as AgendamientoConRelaciones[];
        const pendientes = raw.filter(a => a.estado === 'pendiente');
        const otras = raw.filter(a => a.estado !== 'pendiente');
        setState({ kind: 'ready', agendamientos: [...pendientes, ...otras] });
    }, [user?.id]);

    useEffect(() => {
        if (userLoading || !isAuthenticated || !user?.id) return;
        fetchSolicitudes();
    }, [userLoading, isAuthenticated, user?.id, fetchSolicitudes]);

    const handleConfirmCancel = async () => {
        if (!cancelDialogId) return;
        // Mejora B: si la solicitud que se cancela era CONFIRMADA, notificar
        // al proveedor para que sepa que esa cita ya no esta en pie. Cancelar
        // pendientes NO genera notificacion (decision UX original).
        const sol = state.kind === 'ready'
            ? state.agendamientos.find(a => a.id === cancelDialogId)
            : null;
        const eraConfirmada = sol?.estado === 'confirmada';

        setCancelLoading(true);
        try {
            const { error } = await supabase
                .from('agendamientos')
                .update({
                    estado: 'cancelada' as EstadoAgendamiento,
                    respondido_at: new Date().toISOString(),
                })
                .eq('id', cancelDialogId);
            if (error) throw error;

            if (eraConfirmada) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    fetch('/api/agendamientos/notify-proveedor-cancel', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ agendamientoId: cancelDialogId }),
                    }).catch(err => console.warn('[mis-solicitudes] notify-cancel falló:', err));
                }
            }

            toast.success(eraConfirmada
                ? 'Cancelación enviada. El proveedor fue notificado.'
                : 'Solicitud cancelada.');
            setCancelDialogId(null);
            await fetchSolicitudes();
        } catch (err: any) {
            console.error('[mis-solicitudes] cancel error:', err);
            toast.error(`No pudimos cancelar la solicitud: ${err?.message || 'error desconocido'}`);
        } finally {
            setCancelLoading(false);
        }
    };

    // Loading / pre-auth — evitar flash de empty state mientras se resuelve.
    if (userLoading || !router.isReady || !isAuthenticated) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-slate-400 text-sm">Cargando...</p>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>Mis solicitudes | Pawnecta</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <header className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                        Mis solicitudes de agendamiento
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Aquí ves todas tus solicitudes y su estado. El proveedor responde por email; también puedes verlo aquí.
                    </p>
                </header>

                {state.kind === 'loading' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <p className="text-sm text-slate-400">Cargando tus solicitudes...</p>
                    </div>
                )}

                {state.kind === 'no-tutor-profile' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Completá tu perfil de tutor</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Necesitas completar tu perfil de tutor antes de ver tus solicitudes.
                        </p>
                        <Link
                            href="/register?rol=usuario"
                            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm"
                        >
                            Registrarme como tutor
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {state.kind === 'ready' && state.agendamientos.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Todavía no agendaste ningún servicio</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Explorá los servicios disponibles y solicitá un agendamiento desde la ficha del que te interese.
                        </p>
                        <Link
                            href="/explorar"
                            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm"
                        >
                            Explorar servicios
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {state.kind === 'ready' && state.agendamientos.length > 0 && (
                    <div className="space-y-4">
                        {state.agendamientos.map(sol => (
                            <SolicitudCard
                                key={sol.id}
                                solicitud={sol}
                                onCancel={() => setCancelDialogId(sol.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Mejora B: el copy del dialog depende del estado actual de la
                solicitud que se cancela. Cancelar una CONFIRMADA es mas
                serio (cita acordada, proveedor reservo el horario) — texto
                explicito + aviso de que se le manda email. */}
            {(() => {
                const sol = state.kind === 'ready'
                    ? state.agendamientos.find(a => a.id === cancelDialogId)
                    : null;
                const eraConfirmada = sol?.estado === 'confirmada';
                return (
                    <ConfirmDialog
                        open={cancelDialogId !== null}
                        title={eraConfirmada ? 'Cancelar cita confirmada' : '¿Cancelar esta solicitud?'}
                        message={eraConfirmada
                            ? 'Esta cita ya fue confirmada por el proveedor. Si la cancelas ahora, le enviaremos un aviso por email. Si puedes, contáctalo directamente para coordinar.'
                            : 'Esta acción no se puede revertir. El proveedor verá que cancelaste.'}
                        confirmLabel={eraConfirmada ? 'Cancelar cita' : 'Cancelar solicitud'}
                        cancelLabel="Volver"
                        variant="danger"
                        loading={cancelLoading}
                        onConfirm={handleConfirmCancel}
                        onCancel={() => setCancelDialogId(null)}
                    />
                );
            })()}
        </>
    );
}

// ── Card de solicitud (p.o.v. tutor) ──
function SolicitudCard({
    solicitud,
    onCancel,
}: {
    solicitud: AgendamientoConRelaciones;
    onCancel: () => void;
}) {
    const proveedor = solicitud.proveedor;
    const servicio = solicitud.servicio;
    const isPendiente = solicitud.estado === 'pendiente';
    const isConfirmada = solicitud.estado === 'confirmada';
    const isRechazada = solicitud.estado === 'rechazada';
    const isCancelada = solicitud.estado === 'cancelada';

    // Branching de formato segun variante: la combinacion de modo_tarifa +
    // fecha_fin encoda cual de V1/V2/V4a/V4b. No consultamos la categoria
    // del servicio al render — la solicitud trae todo lo que necesitamos.
    //   V4b (cuidado a domicilio por horas):  modo_tarifa='horas' + duracion
    //   V2/V4a (rango noches):                fecha_fin presente
    //   V1 (puntual):                         else
    const fechaPreferida = (() => {
        if (solicitud.modo_tarifa === 'horas' && solicitud.duracion_horas) {
            return formatPuntualConDuracion(solicitud.fecha_preferida, solicitud.duracion_horas);
        }
        if (solicitud.fecha_fin) {
            return formatRangoNoches(solicitud.fecha_preferida, solicitud.fecha_fin);
        }
        return formatFechaPreferida(solicitud.fecha_preferida);
    })();
    const respondidoAt = formatFechaCorta(solicitud.respondido_at);

    // Modalidad label (presente solo en solicitudes Fase 2+ de cuidado). El
    // fallback a null para legacy (modalidad_elegida=null de Fase 1) o para
    // un valor futuro no presente en el mapa.
    const modalidadLabel = solicitud.modalidad_elegida
        ? MODALIDAD_LABELS[solicitud.modalidad_elegida as ModalidadCuidado] ?? null
        : null;
    // Ola 1: direccion compacta (formato nuevo si region/comuna/calle/
    // numero pobles; fallback a direccion_servicio text legacy si los 5
    // estructurados estan null). Info adicional aparte en linea italica.
    const direccionLinea = formatDireccionLinea({
        region: solicitud.region,
        comuna: solicitud.comuna,
        calle: solicitud.calle,
        numero: solicitud.numero,
        direccion_info: solicitud.direccion_info,
        direccion_servicio: solicitud.direccion_servicio,
    });
    const direccionInfo = solicitud.direccion_info;

    const estadoBadge = (() => {
        switch (solicitud.estado) {
            case 'confirmada':
                return <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><CheckCircle size={12} /> Confirmada</span>;
            case 'rechazada':
                return <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><XCircle size={12} /> Rechazada</span>;
            case 'cancelada':
                return <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest">Cancelada</span>;
            default:
                return <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><Clock size={12} /> Pendiente</span>;
        }
    })();

    const proveedorNombre = proveedor
        ? `${proveedor.nombre || ''} ${proveedor.apellido_p || ''}`.trim() || 'Proveedor'
        : 'Proveedor';

    // Datos de contacto del proveedor — solo se muestran si confirmada AND
    // el proveedor opto por exponerlos publicamente. Mismo gating que la
    // ficha publica del proveedor.
    const showTelefono = isConfirmada && proveedor?.mostrar_telefono && proveedor.telefono;
    const showWhatsapp = isConfirmada && proveedor?.mostrar_whatsapp && proveedor.whatsapp;
    const whatsappLink = showWhatsapp
        ? `https://wa.me/${(proveedor!.whatsapp as string).replace(/[^\d]/g, '')}`
        : null;

    return (
        <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            {/* Header: servicio + proveedor + estado */}
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                    {servicio?.id ? (
                        <Link href={`/servicio/${servicio.id}`} className="text-sm font-semibold text-slate-900 hover:text-emerald-700 transition-colors block truncate">
                            {servicio.titulo || 'Servicio eliminado'}
                        </Link>
                    ) : (
                        <p className="text-sm font-semibold text-slate-900 truncate">Servicio eliminado</p>
                    )}
                    {proveedor?.id ? (
                        <Link href={`/proveedor/${proveedor.id}`} className="text-xs text-slate-500 hover:text-emerald-700 transition-colors block truncate mt-0.5">
                            {proveedorNombre}
                        </Link>
                    ) : (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{proveedorNombre}</p>
                    )}
                </div>
                <div className="shrink-0">{estadoBadge}</div>
            </div>

            {/* Fecha preferida (formato segun variante) */}
            <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                <Calendar size={15} className="text-slate-400 shrink-0" />
                <span>{fechaPreferida}</span>
            </div>

            {/* Modalidad — Fase 2: solo si el servicio es cuidado */}
            {modalidadLabel && (
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    <MapPin size={15} className="text-slate-400 shrink-0" />
                    <span>{modalidadLabel}</span>
                </div>
            )}

            {/* Direccion — V4a/V4b (modalidad casa_tutor). Ola 1: formato
                estructurado compacto + info adicional opcional en italica. */}
            {direccionLinea && (
                <div className="flex items-start gap-2 text-sm text-slate-700 mb-3">
                    <Home size={15} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="whitespace-pre-wrap">{direccionLinea}</span>
                        {direccionInfo && <p className="text-xs text-slate-500 italic mt-0.5">{direccionInfo}</p>}
                    </div>
                </div>
            )}

            {/* Mensaje original del tutor */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 font-medium mb-1">Tu mensaje</p>
                {solicitud.mensaje
                    ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{solicitud.mensaje}</p>
                    : <p className="text-sm text-slate-500 italic">Sin mensaje adicional.</p>}
            </div>

            {/* Respuesta del proveedor — solo si ya respondio (no cancelada) */}
            {(isConfirmada || isRechazada) && (
                <div className={`rounded-xl p-3 border mb-3 ${isConfirmada ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/40 border-red-100'}`}>
                    <p className={`text-[11px] uppercase tracking-widest font-medium mb-1 ${isConfirmada ? 'text-emerald-700' : 'text-red-700'}`}>
                        Respuesta del proveedor{respondidoAt ? ` · ${respondidoAt}` : ''}
                    </p>
                    {solicitud.nota_proveedor
                        ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{solicitud.nota_proveedor}</p>
                        : <p className="text-sm text-slate-500 italic">Sin nota adicional.</p>}
                </div>
            )}

            {/* Datos de contacto — solo confirmada AND opt-in del proveedor */}
            {isConfirmada && (showTelefono || showWhatsapp) && (
                <div className="bg-emerald-50/30 rounded-xl p-3 border border-emerald-100 mb-3 space-y-1.5">
                    <p className="text-[11px] uppercase tracking-widest text-emerald-700 font-medium">Contactá al proveedor</p>
                    {showTelefono && (
                        <a href={`tel:${proveedor!.telefono}`} className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-700 transition-colors">
                            <Phone size={14} className="shrink-0" />
                            {proveedor!.telefono}
                        </a>
                    )}
                    {showWhatsapp && whatsappLink && (
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 transition-colors block">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Abrir WhatsApp
                        </a>
                    )}
                </div>
            )}

            {/* Cancelado info — al tutor le mostramos cuando el evento ocurrio */}
            {isCancelada && respondidoAt && (
                <p className="text-xs text-slate-400 italic mb-3">Cancelaste esta solicitud el {respondidoAt}.</p>
            )}

            {/* Acciones segun estado */}
            <div className="border-t border-slate-100 pt-4 mt-4 flex flex-wrap gap-2 justify-end">
                {isPendiente && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-600 border border-red-300 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        Cancelar solicitud
                    </button>
                )}
                {isConfirmada && servicio?.id && (
                    <Link
                        href={`/servicio/${servicio.id}`}
                        className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm shadow-sm"
                    >
                        Ver ficha del servicio
                        <ArrowRight size={14} />
                    </Link>
                )}
                {isRechazada && (
                    <Link
                        href="/explorar"
                        className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm shadow-sm"
                    >
                        Buscar otros proveedores
                        <ArrowRight size={14} />
                    </Link>
                )}
            </div>
        </article>
    );
}
