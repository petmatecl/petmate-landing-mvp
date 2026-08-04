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
import { Calendar, ArrowRight, Clock, CheckCircle, CheckCircle2, XCircle, AlertTriangle, Phone, MapPin, Home, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabaseClient';
import { fetchProveedoresPublicosByIds } from '../lib/supabase/queries/proveedoresPublicos';
import ConfirmDialog from '../components/Shared/ConfirmDialog';
import { formatFechaPreferida, formatFechaCorta, formatRangoNoches, formatPuntualConDuracion } from '../lib/formatFecha';
import { MODALIDAD_LABELS, type ModalidadCuidado } from '../lib/categoriaTemporal';
import { formatDireccionLinea } from '../lib/formatDireccion';
import { estadoDerivado } from '../lib/estadoDerivado';
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
    // PD2 sprint PRODUCTO-2 — pestañas de organización. Default 'proximas'
    // (confirmadas futuras, orden fecha asc — lo que el tutor necesita
    // "próximamente"). El particionado es 100% client-side sobre la lista
    // ya cargada — cero queries nuevas.
    const [activeTab, setActiveTab] = useState<'proximas' | 'pendientes' | 'historial'>('proximas');
    // PD4-bis sprint PRODUCTO-2 — id de la vencida cuyo CTA "Volver a
    // solicitar" está en curso de cancel-then-navigate. Alimenta el
    // disabled del botón mientras corre el UPDATE + navigate.
    const [volverASolicitarLoadingId, setVolverASolicitarLoadingId] = useState<string | null>(null);
    // PD3 sprint PRODUCTO-2 — filtros dentro de pestañas. Client-side,
    // sin queries nuevas. Alimentados dinámicamente por la data del
    // panel activo (dropdowns visibles solo si hay >1 opción).
    // Valor `null` = sin filtro; string = filtrar por ese id/label.
    const [filtroProveedor, setFiltroProveedor] = useState<string | null>(null);
    const [filtroMascota, setFiltroMascota] = useState<string | null>(null);

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
        //
        //    F2-3-D: agregamos capacidad_snapshot_estadia (bandera F2) al
        //    SELECT del agendamiento + cancelacion_min_horas_antes al SELECT
        //    del servicio. Sirve para: (a) decidir si el boton "Cancelar
        //    reserva" pasa por el endpoint POST /api/agendamientos/cancelar
        //    o por UPDATE client (F1/legacy); (b) computar puedeCancelar
        //    client-side y disabled+tooltip cuando la ventana cerro.
        const { data, error } = await supabase
            .from('agendamientos')
            .select(`
                id, servicio_id, proveedor_id, tutor_id,
                fecha_preferida, fecha_fin, modalidad_elegida, modo_tarifa,
                duracion_horas, direccion_servicio,
                region, comuna, calle, numero, direccion_info,
                mensaje, estado, nota_proveedor,
                duracion_min, capacidad_snapshot, capacidad_snapshot_estadia, tutor_nombre,
                mascota_id, tipo_mascota_texto,
                respondido_at, created_at, updated_at,
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo, cancelacion_min_horas_antes),
                mascota:mascotas!agendamientos_mascota_id_fkey(id, nombre, tipo, foto_mascota)
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
            // PD3: normalizar embed mascota (PostgREST puede devolver
            // array u object según cache/permisos; N:1 aquí = 1 fila max).
            // RLS de mascotas restringe a user_id=auth.uid() del tutor —
            // el join solo trae mascotas del propio tutor, alineado con
            // el filtro tutor_id de la query.
            mascota: Array.isArray(a.mascota) ? (a.mascota[0] ?? null) : (a.mascota ?? null),
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
        // F2-3-D: reservas F2 confirmadas van por el endpoint server
        // (autoritativo para la ventana anti-cancelacion). Semaforo F2 =
        // capacidad_snapshot_estadia NOT NULL — mismo que F2-3-B para
        // no regresionar V2/V4a legacy.
        const esF2 = sol?.capacidad_snapshot_estadia != null;
        const usarEndpointCancel = eraConfirmada && esF2;

        setCancelLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (usarEndpointCancel) {
                // F2 confirmada — endpoint hace ownership check + ventana
                // + UPDATE via service_role. Copy del rechazo (ventana
                // cerrada) viene del server con las horas exactas y el
                // nombre del proveedor.
                if (!session) {
                    toast.error('Tu sesión expiró. Te llevamos al login.');
                    router.push(`/login?reason=expired&redirect=${encodeURIComponent(router.asPath)}`);
                    return;
                }
                const res = await fetch('/api/agendamientos/cancelar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ agendamientoId: cancelDialogId }),
                });
                if (!res.ok) {
                    const body = await res.json().catch(() => ({ error: 'Error desconocido.' }));
                    toast.error(body?.error || 'No pudimos cancelar la reserva.');
                    // Cerrar dialog aunque falle, para que el usuario vea el
                    // toast completo y no quede el modal encimado.
                    setCancelDialogId(null);
                    return;
                }
            } else {
                // F1 / legacy / pendiente — UPDATE client como antes.
                const { error } = await supabase
                    .from('agendamientos')
                    .update({
                        estado: 'cancelada' as EstadoAgendamiento,
                        respondido_at: new Date().toISOString(),
                    })
                    .eq('id', cancelDialogId);
                if (error) throw error;
            }

            if (eraConfirmada && session) {
                fetch('/api/agendamientos/notify-proveedor-cancel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ agendamientoId: cancelDialogId }),
                }).catch(err => console.warn('[mis-solicitudes] notify-cancel falló:', err));
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

    // PD4-bis sprint PRODUCTO-2 — CTA "Volver a solicitar" en vencidas:
    // cancel-then-navigate. La vencida es `estado='pendiente'` en BD (decisión
    // derivados), y navegar directo a /servicio/{id} para crear nueva
    // solicitud violaría `agendamientos_unique_pendiente_por_tutor_servicio`
    // (dos pendientes del mismo par tutor+servicio) — el modal mostraría un
    // mensaje absurdo tipo "Ya tienes una solicitud pendiente... espera al
    // proveedor" sobre una vencida.
    //
    // Approach opción A (aprobado PO 2026-08-04): UPDATE client-side directo
    // (mismo patrón que handleConfirmCancel para F1/legacy/pendiente) con
    // refinamiento `.eq('estado','pendiente')` — si entre render y click el
    // proveedor confirmó, matchea 0 rows: NO navegamos, refrescamos + toast
    // neutro. Cierra la carrera. RLS permite (tutor cancela su propia fila).
    // El endpoint /api/agendamientos/cancelar es F2-confirmadas-only y no
    // acepta este use case (ver reporte al PO del 2026-08-04).
    const handleVolverASolicitar = useCallback(async (
        agendamientoId: string,
        servicioId: string,
    ) => {
        setVolverASolicitarLoadingId(agendamientoId);
        try {
            const { data, error } = await supabase
                .from('agendamientos')
                .update({
                    estado: 'cancelada' as EstadoAgendamiento,
                    respondido_at: new Date().toISOString(),
                })
                .eq('id', agendamientoId)
                .eq('estado', 'pendiente')   // refinamiento anti-carrera
                .select('id');
            if (error) throw error;
            if (!data || data.length === 0) {
                // Carrera: entre render y click, la solicitud pasó a otro
                // estado (proveedor confirmó, o tutor la canceló desde otra
                // tab). NO navegamos — refrescamos y damos feedback neutro.
                toast.info('Esta solicitud cambió de estado.');
                await fetchSolicitudes();
                return;
            }
            // Éxito: la vencida quedó como cancelada (aparece en Historial
            // como "Cancelada por ti"), y la constraint unique_pendiente
            // queda libre para la nueva solicitud del mismo servicio.
            router.push(`/servicio/${servicioId}`);
        } catch (err: any) {
            console.error('[mis-solicitudes] volver-a-solicitar error:', err);
            toast.error(`No pudimos preparar el reintento: ${err?.message || 'error desconocido'}`);
        } finally {
            setVolverASolicitarLoadingId(null);
        }
    }, [fetchSolicitudes, router]);

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
                <title>Mis reservas | Pawnecta</title>
                <meta name="robots" content="noindex" />
            </Head>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <header className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                        Mis reservas
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Aquí ves todas tus reservas y su estado. El proveedor responde por email; también puedes verlo aquí.
                    </p>
                </header>

                {state.kind === 'loading' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <p className="text-sm text-slate-400">Cargando tus reservas...</p>
                    </div>
                )}

                {state.kind === 'no-tutor-profile' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Completa tu perfil de tutor</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Necesitas completar tu perfil de tutor antes de ver tus reservas.
                        </p>
                        <Link
                            href="/register?rol=usuario"
                            className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm"
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
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Todavía no tienes reservas</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                            Explora los servicios disponibles y reserva desde la ficha del que te interese.
                        </p>
                        <Link
                            href="/explorar"
                            className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white font-medium tracking-wide py-2.5 px-5 rounded-xl transition-colors shadow-sm"
                        >
                            Explorar servicios
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}

                {state.kind === 'ready' && state.agendamientos.length > 0 && (() => {
                    // PD2 — particionado por estadoDerivado.
                    //   proximas:   confirmadas futuras            (orden fecha asc)
                    //   pendientes: pendientes vigentes            (orden fecha asc)
                    //   historial:  realizadas + vencidas +
                    //               canceladas + rechazadas +
                    //               cancelada_proveedor            (orden fecha desc)
                    const withEstado = state.agendamientos.map(sol => ({
                        sol,
                        estadoUI: estadoDerivado(sol),
                    }));
                    const proximas = withEstado
                        .filter(x => x.estadoUI === 'confirmada')
                        .sort((a, b) => {
                            const av = new Date(a.sol.fecha_preferida || 0).getTime();
                            const bv = new Date(b.sol.fecha_preferida || 0).getTime();
                            return av - bv;
                        });
                    const pendientes = withEstado
                        .filter(x => x.estadoUI === 'pendiente')
                        .sort((a, b) => {
                            const av = new Date(a.sol.fecha_preferida || 0).getTime();
                            const bv = new Date(b.sol.fecha_preferida || 0).getTime();
                            return av - bv;
                        });
                    const historial = withEstado
                        .filter(x => ['realizada', 'vencida', 'cancelada', 'rechazada', 'cancelada_proveedor']
                            .includes(x.estadoUI))
                        .sort((a, b) => {
                            const av = new Date(a.sol.fecha_preferida || 0).getTime();
                            const bv = new Date(b.sol.fecha_preferida || 0).getTime();
                            return bv - av;
                        });
                    const grupos = { proximas, pendientes, historial };
                    const cardsPestana = grupos[activeTab];

                    // PD3 — opciones de filtro dinámicas por pestaña. Solo
                    // proveedores presentes en la pestaña activa; solo
                    // mascotas presentes (con etiqueta "Sin mascota" si hay
                    // filas sin ficha ni texto). Dropdowns visibles solo si
                    // hay >1 opción (regla del brief).
                    const proveedoresPresentes = Array.from(
                        new Map(
                            cardsPestana
                                .filter(x => x.sol.proveedor?.id)
                                .map(x => [x.sol.proveedor!.id, {
                                    id: x.sol.proveedor!.id,
                                    label: (x.sol.proveedor!.nombre ?? 'Proveedor').trim(),
                                }])
                        ).values()
                    );
                    // Mascota "key": id de ficha si viaja, sino 'texto:'+trim, sino 'sin'.
                    // Alimenta filtro + reconstrucción del label del dropdown.
                    const mascotaKey = (sol: AgendamientoConRelaciones): string => {
                        if (sol.mascota?.id) return `id:${sol.mascota.id}`;
                        if (sol.tipo_mascota_texto) return `texto:${sol.tipo_mascota_texto.trim().toLowerCase()}`;
                        return 'sin';
                    };
                    const mascotaLabel = (sol: AgendamientoConRelaciones): string => {
                        if (sol.mascota?.nombre) return sol.mascota.nombre;
                        if (sol.tipo_mascota_texto) return sol.tipo_mascota_texto;
                        return 'Sin mascota';
                    };
                    const mascotasPresentes = Array.from(
                        new Map(
                            cardsPestana.map(x => {
                                const k = mascotaKey(x.sol);
                                return [k, { key: k, label: mascotaLabel(x.sol) }];
                            })
                        ).values()
                    );

                    // Aplicar filtros al panel activo.
                    const activas = cardsPestana.filter(x => {
                        if (filtroProveedor && x.sol.proveedor?.id !== filtroProveedor) return false;
                        if (filtroMascota && mascotaKey(x.sol) !== filtroMascota) return false;
                        return true;
                    });

                    const tabs = [
                        { id: 'proximas' as const, label: 'Próximas', count: proximas.length },
                        { id: 'pendientes' as const, label: 'Pendientes', count: pendientes.length },
                        { id: 'historial' as const, label: 'Historial', count: historial.length },
                    ];

                    return (
                        <>
                            {/* Tablist — patrón coherente con admin (radiogroup no aplica:
                                cambia el contenido, no un filtro con estado semántico) */}
                            <div
                                role="tablist"
                                aria-label="Filtro de reservas por etapa"
                                className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar border-b border-slate-100"
                            >
                                {tabs.map(tab => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`mis-reservas-panel-${tab.id}`}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                // PD3: reset filtros al cambiar de pestaña — las
                                                // opciones dependen del panel activo (distinta
                                                // partición → distintos proveedores/mascotas).
                                                setFiltroProveedor(null);
                                                setFiltroMascota(null);
                                            }}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-[1px] ${
                                                isActive
                                                    ? 'text-accent-700 border-accent-600'
                                                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                                            }`}
                                        >
                                            {tab.label}
                                            <span className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 text-xs font-semibold rounded-full px-1.5 ${
                                                isActive
                                                    ? 'bg-accent-100 text-accent-700'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* PD3 — Filtros dentro de pestañas. Visibles solo si hay >1
                                opción. Se resetean al cambiar de pestaña. */}
                            {(proveedoresPresentes.length > 1 || mascotasPresentes.length > 1) && (
                                <div className="flex flex-wrap gap-3 mb-4">
                                    {proveedoresPresentes.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="filtro-proveedor" className="text-xs font-medium text-slate-500">Proveedor:</label>
                                            <select
                                                id="filtro-proveedor"
                                                value={filtroProveedor ?? ''}
                                                onChange={e => setFiltroProveedor(e.target.value || null)}
                                                className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 cursor-pointer"
                                            >
                                                <option value="">Todos</option>
                                                {proveedoresPresentes.map(p => (
                                                    <option key={p.id} value={p.id}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {mascotasPresentes.length > 1 && (
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="filtro-mascota" className="text-xs font-medium text-slate-500">Mascota:</label>
                                            <select
                                                id="filtro-mascota"
                                                value={filtroMascota ?? ''}
                                                onChange={e => setFiltroMascota(e.target.value || null)}
                                                className="h-9 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 px-3 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-accent-600 cursor-pointer"
                                            >
                                                <option value="">Todas</option>
                                                {mascotasPresentes.map(m => (
                                                    <option key={m.key} value={m.key}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Panel activo */}
                            <div
                                id={`mis-reservas-panel-${activeTab}`}
                                role="tabpanel"
                                aria-labelledby={`tab-${activeTab}`}
                                className="space-y-4"
                            >
                                {activas.length === 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                                        <p className="text-sm text-slate-500">
                                            {cardsPestana.length > 0
                                                ? 'Ninguna reserva coincide con los filtros aplicados.'
                                                : activeTab === 'proximas' ? 'No tienes reservas confirmadas próximamente.'
                                                : activeTab === 'pendientes' ? 'No tienes solicitudes esperando respuesta.'
                                                : 'Todavía no hay reservas en tu historial.'}
                                        </p>
                                    </div>
                                ) : (
                                    activas.map(({ sol }) => (
                                        <SolicitudCard
                                            key={sol.id}
                                            solicitud={sol}
                                            onCancel={() => setCancelDialogId(sol.id)}
                                            onVolverASolicitar={handleVolverASolicitar}
                                            volverASolicitarLoading={volverASolicitarLoadingId === sol.id}
                                        />
                                    ))
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>

            {/* Sweep #3 taxonomía: colapsados los 4 títulos de cancelación
                a 2 casos según convención PO — "Cancelar reserva" para toda
                confirmada (F2/F1/legacy) y "Cancelar solicitud" para pendiente.
                Los detalles diferenciales (noches vs horario, ventana, aviso
                al proveedor) viven en el MESSAGE — donde "estadía" y "noches"
                sí son bienvenidos como tipo. */}
            {(() => {
                const sol = state.kind === 'ready'
                    ? state.agendamientos.find(a => a.id === cancelDialogId)
                    : null;
                const eraConfirmada = sol?.estado === 'confirmada';
                const esReservaAgendaF1 = sol?.duracion_min != null;
                const esReservaAgendaF2 = sol?.capacidad_snapshot_estadia != null;
                const esConfirmadaAuto = eraConfirmada && (esReservaAgendaF1 || esReservaAgendaF2);
                const title = eraConfirmada
                    ? 'Cancelar reserva'
                    : '¿Cancelar esta solicitud?';
                const message = esReservaAgendaF2 && eraConfirmada
                    ? 'Vas a liberar tus noches y avisaremos al proveedor por email. Si puedes, contáctalo antes para coordinar.'
                    : esConfirmadaAuto
                        ? 'Vas a liberar tu horario y avisaremos al proveedor por email. Si puedes, contáctalo antes para coordinar.'
                        : eraConfirmada
                            ? 'Esta reserva ya fue confirmada por el proveedor. Si la cancelas ahora, le enviaremos un aviso por email. Si puedes, contáctalo directamente para coordinar.'
                            : 'Esta acción no se puede revertir. El proveedor verá que cancelaste.';
                const confirmLabel = eraConfirmada
                    ? 'Cancelar reserva'
                    : 'Cancelar solicitud';
                return (
                    <ConfirmDialog
                        open={cancelDialogId !== null}
                        title={title}
                        message={message}
                        confirmLabel={confirmLabel}
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
    onVolverASolicitar,
    volverASolicitarLoading,
}: {
    solicitud: AgendamientoConRelaciones;
    onCancel: () => void;
    onVolverASolicitar: (agendamientoId: string, servicioId: string) => void;
    volverASolicitarLoading: boolean;
}) {
    const proveedor = solicitud.proveedor;
    const servicio = solicitud.servicio;
    // PD1 sprint PRODUCTO-2: estado DERIVADO en UI (cero cambios BD). El
    // helper reusa la semántica canónica de familia + fin efectivo del cron
    // recordatorio-reserva.ts. Cards muestran REALIZADA/VENCIDA sin que la
    // BD guarde esos valores.
    const estadoUI = estadoDerivado(solicitud);
    const isPendiente = estadoUI === 'pendiente';
    const isConfirmada = estadoUI === 'confirmada';
    const isRealizada = estadoUI === 'realizada';
    const isVencida = estadoUI === 'vencida';
    const isRechazada = estadoUI === 'rechazada';
    const isCancelada = estadoUI === 'cancelada';
    const isCanceladaProveedor = estadoUI === 'cancelada_proveedor';
    // F1 agenda — la reserva viene del picker rigido cuando duracion_min esta
    // poblada (INSERT lo popula desde el servicio.duracion_slot_min). Sirve
    // para diferenciar reservas auto-confirmadas del picker vs confirmadas
    // resueltas por el proveedor (pendiente→confirmada del flujo viejo).
    const esReservaAgenda = solicitud.duracion_min != null;
    // F2 agenda — la reserva viene del picker de rango de noches cuando
    // capacidad_snapshot_estadia esta poblada. Sirve para: (a) el copy
    // del dialog (F1 vs F2 → distinto texto), y (b) el gate de la
    // ventana anti-cancelacion (solo F2, según el diseño F2-3-D).
    const esReservaAgendaF2 = solicitud.capacidad_snapshot_estadia != null;
    const esConfirmadaAuto = isConfirmada && (esReservaAgenda || esReservaAgendaF2);

    // F2-3-D: la ventana de cancelacion aplica solo a reservas F2
    // confirmadas. F1 y legacy siguen sin ventana. Cuando la ventana
    // cerro, el boton "Cancelar reserva" queda disabled + tooltip con
    // el copy amable — mismo enforcement autoritativo se hace en el
    // endpoint, esto es solo feedback UX.
    const cancelacionMinHoras = solicitud.servicio?.cancelacion_min_horas_antes ?? 48;
    const puedeCancelarPorVentana = (() => {
        if (!esReservaAgendaF2 || !isConfirmada) return true;
        const checkInMs = new Date(solicitud.fecha_preferida ?? 0).getTime();
        if (!Number.isFinite(checkInMs)) return true;   // defensivo
        const horasHastaCheckIn = (checkInMs - Date.now()) / 3_600_000;
        return horasHastaCheckIn >= cancelacionMinHoras;
    })();
    const tooltipVentanaCerrada = `Faltan menos de ${cancelacionMinHoras === 1 ? '1 hora' : `${cancelacionMinHoras} horas`} para el check-in. Contacta al proveedor por chat para coordinar.`;

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

    // Badge de estado — el estado UI incluye los 2 DERIVADOS (PD1):
    //   success = confirmada             (positivo, servicio próximo)
    //   accent  = realizada              (neutro-positivo, servicio pasado
    //                                     completado; sin celebración explícita
    //                                     conforme al mapa semántico de emails)
    //   danger  = rechazada              (negativo terminal)
    //   slate   = vencida                (pendiente que caducó — no negativo,
    //                                     solo temporal)
    //   slate   = cancelada              (tutor canceló, sin color activo)
    //   slate + XCircle = cancelada_proveedor (F1: proveedor canceló una
    //                    reserva confirmada; motivo en nota_proveedor)
    //   warning = pendiente              (espera de decisión del proveedor)
    const estadoBadge = (() => {
        switch (estadoUI) {
            case 'confirmada':
                return <span className="inline-flex items-center gap-1 bg-success-50 text-success-700 border border-success-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><CheckCircle size={12} /> Confirmada</span>;
            case 'realizada':
                return <span className="inline-flex items-center gap-1 bg-accent-50 text-accent-700 border border-accent-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><CheckCircle2 size={12} /> Realizada</span>;
            case 'vencida':
                return <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><AlertTriangle size={12} /> Vencida</span>;
            case 'rechazada':
                return <span className="inline-flex items-center gap-1 bg-danger-50 text-danger-700 border border-danger-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><XCircle size={12} /> Rechazada</span>;
            case 'cancelada':
                return <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest">Cancelada por ti</span>;
            case 'cancelada_proveedor':
                return <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><XCircle size={12} /> Cancelada por el proveedor</span>;
            default:
                return <span className="inline-flex items-center gap-1 bg-warning-50 text-warning-700 border border-warning-100 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest"><Clock size={12} /> Pendiente</span>;
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
                        <Link href={`/servicio/${servicio.id}`} className="text-sm font-semibold text-slate-900 hover:text-accent-600 transition-colors block truncate">
                            {servicio.titulo || 'Servicio eliminado'}
                        </Link>
                    ) : (
                        <p className="text-sm font-semibold text-slate-900 truncate">Servicio eliminado</p>
                    )}
                    {proveedor?.id ? (
                        <Link href={`/proveedor/${proveedor.id}`} className="text-xs text-slate-500 hover:text-accent-600 transition-colors block truncate mt-0.5">
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

            {/* PD3 sprint PRODUCTO-2 — chip mascota discreto: ficha real +
                foto pequeña si viaja, o fallback a texto libre. Ausente
                cuando la reserva no tiene mascota asociada (mayoritario
                en filas legacy) — no rompe layout ni deja hueco.
                Patrón coherente con el resto de líneas info (icon +
                texto). */}
            {(solicitud.mascota || solicitud.tipo_mascota_texto) && (
                <div className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                    {solicitud.mascota?.foto_mascota ? (
                        <img
                            src={solicitud.mascota.foto_mascota}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                        />
                    ) : (
                        <PawPrint size={15} className="text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">
                        {solicitud.mascota?.nombre ?? solicitud.tipo_mascota_texto}
                        {solicitud.mascota?.tipo && (
                            <span className="text-xs text-slate-500 ml-1.5">({solicitud.mascota.tipo})</span>
                        )}
                    </span>
                </div>
            )}

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

            {/* Bloque post-estado: 3 casos.
                (a) Reserva auto-confirmada F1: el proveedor NO respondio (nacio
                    confirmada del picker). Copy propio "Confirmada al instante".
                (b) Confirmada/rechazada con respuesta del proveedor (flujo viejo
                    pendiente→resuelta): "Respuesta del proveedor" + nota.
                (c) Cancelada_proveedor: "Motivo de la cancelación" + nota
                    obligatoria (danger). */}
            {esConfirmadaAuto ? (
                <div className="bg-success-50/50 rounded-xl p-3 border border-success-100 mb-3">
                    <p className="text-[11px] uppercase tracking-widest font-medium mb-1 text-success-700">
                        Reserva confirmada al instante
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                        Elegiste un horario disponible — no hace falta esperar respuesta del proveedor.
                        {solicitud.nota_proveedor && (
                            <> {' '}Su nota: <span className="italic">&quot;{solicitud.nota_proveedor}&quot;</span></>
                        )}
                    </p>
                </div>
            ) : (isConfirmada || isRechazada || isCanceladaProveedor) && (
                <div className={`rounded-xl p-3 border mb-3 ${isConfirmada ? 'bg-success-50/50 border-success-100' : 'bg-danger-50/40 border-danger-100'}`}>
                    <p className={`text-[11px] uppercase tracking-widest font-medium mb-1 ${isConfirmada ? 'text-success-700' : 'text-danger-700'}`}>
                        {isCanceladaProveedor
                            ? `Motivo de la cancelación${respondidoAt ? ` · ${respondidoAt}` : ''}`
                            : `Respuesta del proveedor${respondidoAt ? ` · ${respondidoAt}` : ''}`}
                    </p>
                    {solicitud.nota_proveedor
                        ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{solicitud.nota_proveedor}</p>
                        : <p className="text-sm text-slate-500 italic">Sin nota adicional.</p>}
                </div>
            )}

            {/* Datos de contacto — solo confirmada AND opt-in del proveedor */}
            {isConfirmada && (showTelefono || showWhatsapp) && (
                <div className="bg-accent-50/30 rounded-xl p-3 border border-accent-100 mb-3 space-y-1.5">
                    <p className="text-[11px] uppercase tracking-widest text-accent-700 font-medium">Contacta al proveedor</p>
                    {showTelefono && (
                        <a href={`tel:${proveedor!.telefono}`} className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-accent-600 transition-colors">
                            <Phone size={14} className="shrink-0" />
                            {proveedor!.telefono}
                        </a>
                    )}
                    {showWhatsapp && whatsappLink && (
                        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-accent-700 hover:text-accent-900 transition-colors block">
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
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-danger-600 border border-danger-300 hover:bg-danger-50 rounded-xl transition-colors"
                    >
                        Cancelar solicitud
                    </button>
                )}
                {isConfirmada && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={!puedeCancelarPorVentana}
                        title={puedeCancelarPorVentana ? undefined : tooltipVentanaCerrada}
                        className="inline-flex items-center px-4 py-2 text-sm font-semibold text-danger-600 border border-danger-300 hover:bg-danger-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        Cancelar reserva
                    </button>
                )}
                {isConfirmada && servicio?.id && (
                    <Link
                        href={`/servicio/${servicio.id}`}
                        className="inline-flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm shadow-sm"
                    >
                        Ver ficha del servicio
                        <ArrowRight size={14} />
                    </Link>
                )}
                {isVencida && servicio?.id && (
                    // PD4 sprint PRODUCTO-2 — CTA útil en VENCIDA: navega a
                    // la ficha del servicio con el flujo de reserva/solicitud
                    // según tenga agenda o no. La vencida deja de ser lápida.
                    //
                    // PD4-bis (2026-08-04): antes de navegar cancelamos la
                    // vencida (UPDATE .eq('estado','pendiente')) — cierra el
                    // constraint agendamientos_unique_pendiente_por_tutor_
                    // servicio que bloqueaba el flujo primario del CTA.
                    <button
                        type="button"
                        onClick={() => onVolverASolicitar(solicitud.id, servicio.id!)}
                        disabled={volverASolicitarLoading}
                        className="inline-flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {volverASolicitarLoading ? 'Preparando...' : 'Volver a solicitar'}
                        {!volverASolicitarLoading && <ArrowRight size={14} />}
                    </button>
                )}
                {isRechazada && (
                    <Link
                        href="/explorar"
                        className="inline-flex items-center gap-1.5 bg-accent-600 hover:bg-accent-700 text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm shadow-sm"
                    >
                        Buscar otros proveedores
                        <ArrowRight size={14} />
                    </Link>
                )}
            </div>
        </article>
    );
}
