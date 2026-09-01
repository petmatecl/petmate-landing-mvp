import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import { markNotificationAsRead } from '../../lib/notifications';
import { formatFechaRelativa } from '../../lib/dateRelative';
import { usePersistentOverlayClose } from '../../lib/hooks/usePersistentOverlayClose';

type NotificationMetadata = {
    tipo?: string;
    agendamiento_id?: string;
    evaluacion_id?: string;
    servicio_id?: string;
    proveedor_id?: string;
    destinatario?: string;
    familia?: string;
    [key: string]: unknown;
};

type Notification = {
    id: string;
    created_at: string;
    title: string;
    message: string;
    type: string;
    link?: string;
    read: boolean;
    metadata?: NotificationMetadata | null;
};

// Sprint notifs-panel C4 (2026-09-01) — refs conocidos que el batch query
// verifica contra las tablas destino. Formato del Set: "tabla:UUID". Cada
// notif con metadata puede tener uno o más refs; se considera clickeable
// si TODOS sus refs conocidos existen en el Set.
const REF_TIPOS: Array<{
    metaKey: keyof NotificationMetadata;
    tabla: 'agendamientos' | 'evaluaciones' | 'servicios_publicados';
    prefijo: string;
}> = [
    { metaKey: 'agendamiento_id', tabla: 'agendamientos', prefijo: 'agendamiento' },
    { metaKey: 'evaluacion_id', tabla: 'evaluaciones', prefijo: 'evaluacion' },
    { metaKey: 'servicio_id', tabla: 'servicios_publicados', prefijo: 'servicio' },
];

type AgendaFecha = {
    fecha_preferida?: string;
    fecha_fin?: string;
    duracion_min?: number;
};

export default function NotificationBell() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    // Sprint notifs-panel C4 (2026-09-01) — Render defensivo.
    // Set con refs que existen en BD, formato "prefijo:UUID". Poblado por el
    // batch query después de traer las notifs. Notifs cuyos refs NO están en
    // el Set se renderean no-clickeables (opacity + cursor default + no
    // navegan). Cero query por notif — máximo 3 queries (una por tabla) por
    // refresh, independientemente de cuántas notifs visibles.
    const [existingRefs, setExistingRefs] = useState<Set<string>>(new Set());
    // Sprint notifs-panel C4 (Opción Y aprobada por PO 2026-09-01) — el mismo
    // batch de agendamientos que verifica existencia también trae la fecha
    // del evento (fecha_preferida, fecha_fin, duracion_min). Sirve para
    // renderizar una LÍNEA APARTE de "fecha del evento" en notifs de tipo
    // recordatorio_dia_anterior, con `formatFechaRelativa(..., { modo: 'evento' })`
    // — resuelve el defecto 7 (título "Mañana: X" congelado) sin parsear el
    // title con regex (aprobación PO explícita — evita acoplamiento frágil).
    const [agendaFechas, setAgendaFechas] = useState<Map<string, AgendaFecha>>(new Map());

    // Sprint notifs-panel C6 (2026-09-01) — cierre por Escape + routeChange.
    // NotificationBell vive en Header.tsx (mounted persistente entre rutas),
    // por eso `isOpen` sobrevive a navegación sin este hook. Cero cambio al
    // backdrop existente (L~141) — el hook NO cubre backdrop, queda en el
    // caller (aprobado PO D7 del sprint). useCallback para estabilidad
    // referencial del onClose entre renders.
    const closeBell = useCallback(() => setIsOpen(false), []);
    usePersistentOverlayClose(isOpen, closeBell);

    // 1. Fetch initial state & subscribe
    useEffect(() => {
        let channel: any;

        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            // Fetch existing
            await fetchNotifications(user.id);

            // Subscription
            channel = supabase
                .channel('public:notifications')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotif = payload.new as Notification;
                        // Sprint notifs-panel C5 (2026-09-01) — filter Postgres
                        // realtime sigue solo por user_id (opción B aprobada por
                        // PO — más simple, cero riesgo de filter compuesto no
                        // soportado). Chequeo client-side defensivo por si algún
                        // caller INSERT con read=true (no debería, todos los
                        // callers actuales insertan read=false, pero defensivo).
                        if (newNotif.read === true) return;
                        setNotifications((prev) => [newNotif, ...prev]);
                        setUnreadCount((prev) => prev + 1);
                        // Sprint notifs-panel C4 (2026-09-01) — Notifs que llegan
                        // por realtime NO pasan por el batch query de refs
                        // existentes. Se asumen CLICKEABLES por confianza — sus
                        // refs se agregan optimistic al Set. Motivo: acaban de
                        // crearse, es máximamente improbable que su target ya
                        // haya sido borrado en el milisegundo entre INSERT y
                        // realtime broadcast. Trade-off aceptable — mantiene
                        // el patrón "máximo 3 queries" del batch inicial. El
                        // próximo refetch (mount siguiente o handleMarkAllRead)
                        // reconcilia si aparece el caso raro.
                        setExistingRefs((prev) => {
                            const next = new Set(prev);
                            for (const { metaKey, prefijo } of REF_TIPOS) {
                                const id = newNotif.metadata?.[metaKey];
                                if (typeof id === 'string' && id) next.add(`${prefijo}:${id}`);
                            }
                            return next;
                        });
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async (uid: string) => {
        // Sprint notifs-panel C5 (2026-09-01) — Panel corto = SOLO NO LEÍDAS
        // (decisión D2 del PO). Con el link "Ver todas" removido en C1
        // (7c39210), las notifs LEÍDAS quedan INACCESIBLES desde la UI hasta
        // que exista la página /notificaciones (anotada en BACKLOG como
        // sprint dedicado con paginación + filtros + marcar leídas). Es
        // DELIBERADO, no un olvido: un panel corto que muestra también
        // leídas se vuelve ruidoso con volumen. La página /notificaciones
        // cuando llegue va a ser el destino del histórico completo.
        //
        // Efecto UX al marcar una notif como leída: el optimistic update
        // en handleMarkRead cambia read=true; el filter del render la saca
        // de la lista visible → parece "desaparecer" del panel. Correcto:
        // el user ya la atendió, no debería seguir viéndola en el panel corto.
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', uid)
            .eq('read', false)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error || !data) return;

        const notifs = data as Notification[];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);

        // Sprint notifs-panel C4 — batch query para render defensivo + fecha
        // del evento (Opción Y). Extraer ids distintos por tipo, después 3
        // queries paralelas (una por tabla). Skip la tabla si el array de ids
        // está vacío — evita queries innecesarias.
        const idsPorTipo = new Map<string, Set<string>>();
        for (const { metaKey, tabla } of REF_TIPOS) {
            idsPorTipo.set(tabla, new Set());
        }
        for (const n of notifs) {
            for (const { metaKey, tabla } of REF_TIPOS) {
                const id = n.metadata?.[metaKey];
                if (typeof id === 'string' && id) idsPorTipo.get(tabla)!.add(id);
            }
        }

        const queries = REF_TIPOS.map(async ({ tabla }) => {
            const ids = Array.from(idsPorTipo.get(tabla) ?? []);
            if (ids.length === 0) return { tabla, rows: [] as Array<Record<string, unknown>> };

            // Opción Y: agendamientos trae también fecha_preferida/fecha_fin/duracion_min
            // para el modo 'evento' del helper. Las otras tablas solo id.
            const columns = tabla === 'agendamientos'
                ? 'id, fecha_preferida, fecha_fin, duracion_min'
                : 'id';
            const { data: rows, error: qerr } = await supabase.from(tabla).select(columns).in('id', ids);
            if (qerr) {
                console.warn(`[NotificationBell] batch query ${tabla} failed:`, qerr);
                return { tabla, rows: [] as Array<Record<string, unknown>> };
            }
            // Cast a unknown primero — supabase-js pierde la inferencia del
            // genérico cuando `columns` es string variable (no literal). Los
            // rows retornados tienen el shape { id, fecha_preferida?, ... }
            // dependiendo de la tabla, tratados como Record genérico abajo.
            return { tabla, rows: (rows ?? []) as unknown as Array<Record<string, unknown>> };
        });

        const results = await Promise.all(queries);

        const nextRefs = new Set<string>();
        const nextAgendaFechas = new Map<string, AgendaFecha>();

        for (const { tabla, rows } of results) {
            const prefijo = REF_TIPOS.find((r) => r.tabla === tabla)!.prefijo;
            for (const row of rows) {
                const id = row.id as string;
                nextRefs.add(`${prefijo}:${id}`);
                if (tabla === 'agendamientos') {
                    nextAgendaFechas.set(id, {
                        fecha_preferida: row.fecha_preferida as string | undefined,
                        fecha_fin: row.fecha_fin as string | undefined,
                        duracion_min: row.duracion_min as number | undefined,
                    });
                }
            }
        }

        setExistingRefs(nextRefs);
        setAgendaFechas(nextAgendaFechas);
    };

    // Sprint notifs-panel C4 (2026-09-01) — Render defensivo.
    // Fallback confiado: notifs SIN metadata (o sin refs conocidos en metadata)
    // se asumen clickeables. Verificado empíricamente en prod 2026-09-01:
    // las 40 notifs históricas sin metadata (pre-F2B) apuntan todas a
    // '/proveedor?tab=evaluaciones' — vista estática que siempre existe.
    // Ninguna prod apunta a un recurso específico con id sin metadata.
    // Si en el futuro se agrega un caller que emita notif sin metadata pero
    // con link a recurso específico, este fallback se convierte en falso
    // positivo (marca clickeable algo que puede llevar a 404). Antes de
    // agregar ese caller, actualizar este render para chequear también el
    // path del link, no solo metadata.
    const esClickeable = (n: Notification): boolean => {
        const refs = REF_TIPOS
            .map(({ metaKey, prefijo }) => {
                const id = n.metadata?.[metaKey];
                return typeof id === 'string' && id ? `${prefijo}:${id}` : null;
            })
            .filter((r): r is string => r !== null);

        if (refs.length === 0) return true; // fallback confiado
        return refs.every((ref) => existingRefs.has(ref));
    };

    // Fecha del evento para tarjetas de recordatorio. Solo aplica si la
    // notif tiene metadata.tipo === 'recordatorio_dia_anterior' Y su
    // agendamiento sigue vivo (batch query trajo la fecha). Sino retorna
    // null (no muestra la línea aparte). Modo 'evento' del helper marca
    // pasado/futuro con "Fue el" / "El" — cierra defecto 7 completo.
    const fechaEvento = (n: Notification): string | null => {
        if (n.metadata?.tipo !== 'recordatorio_dia_anterior') return null;
        const agendId = n.metadata.agendamiento_id;
        if (typeof agendId !== 'string' || !agendId) return null;
        const info = agendaFechas.get(agendId);
        if (!info?.fecha_preferida) return null;
        return formatFechaRelativa(info.fecha_preferida, { modo: 'evento' });
    };

    const handleMarkRead = async (id: string) => {
        // Optimistic ID update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await markNotificationAsRead(id);
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);

        // Batch update? RLS policy is usually one by one or filter.
        // Supabase allows update with 'in'.
        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds);
    };

    const handleNotificationClick = async (n: Notification) => {
        if (!n.read) {
            await handleMarkRead(n.id);
        }
        // Sprint notifs-panel C4 — si el destino no existe, NO navegamos.
        // Marcamos como leída igual (limpia el panel) y cerramos el panel.
        // El usuario nunca ve una página rota — el destino inexistente es
        // señal en la tarjeta misma (opacity + cursor default).
        if (!esClickeable(n)) {
            setIsOpen(false);
            return;
        }
        setIsOpen(false);
        if (n.link) {
            router.push(n.link);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Notificaciones"
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls="notification-bell-menu"
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent-600/20"
            >
                <Bell size={20} />
                {/* Deuda UI T6-2 2026-08-18: bg-danger-500 → bg-notification-500.
                    Alias semántico separado del rojo de error creado en
                    tailwind.config.js:143 (`notification: colors.red`). Cero cambio
                    visual HOY (ambos apuntan al mismo hex red-500); permite rotar
                    el color de notifs con 1 línea en tailwind.config cuando aparezca
                    criterio de diseño para separar visualmente NO-LEÍDO
                    (notificación pendiente) de error/peligro. */}
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-notification-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    <div id="notification-bell-menu" role="menu" aria-label="Lista de notificaciones" className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border-2 border-slate-300 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-300 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-semibold text-slate-900">Notificaciones</h3>
                            <div className="flex items-center gap-3">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-medium text-accent-700 hover:text-accent-800 flex items-center gap-1"
                                    >
                                        <Check size={14} /> Marcar leídas
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                    aria-label="Cerrar notificaciones"
                                >
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Sprint notifs-panel C5 (2026-09-01) — filter render
                            por read=false. El fetch ya trae solo no-leídas
                            (.eq('read', false)), pero handleMarkRead hace
                            optimistic update que cambia read=true en el state
                            local; el filter acá saca la notif del render sin
                            necesidad de re-fetchear. Empty state se calcula
                            sobre las visibles, no sobre el array completo. */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {(() => {
                                const visibles = notifications.filter((n) => !n.read);
                                if (visibles.length === 0) {
                                    return (
                                        <div className="p-8 text-center text-slate-500 text-sm">
                                            <p>No tienes notificaciones.</p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="divide-y divide-slate-100">
                                        {visibles.map((n) => {
                                            const clickeable = esClickeable(n);
                                            const feEvento = fechaEvento(n);
                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    title={clickeable ? undefined : 'Este destino ya no está disponible'}
                                                    className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${!n.read ? 'bg-accent-50/30' : ''} ${clickeable ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
                                                >
                                                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-accent-600' : 'bg-transparent'}`} />
                                                    <div className="flex-1">
                                                        <p className={`text-sm ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                            {n.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                        {feEvento && (
                                                            <p className="text-xs text-slate-600 mt-1 font-medium">
                                                                {feEvento}
                                                            </p>
                                                        )}
                                                        <p className="text-[10px] text-slate-400 mt-2">
                                                            {formatFechaRelativa(n.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Sprint notifs-panel F6-a (2026-09-01) — Removido el
                            footer "Ver todas" que linkeaba a /notificaciones
                            (ruta inexistente en el repo, 404 en prod). La
                            página /notificaciones queda anotada en BACKLOG
                            como sprint dedicado con paginación + filtros +
                            marcar leídas. Hasta entonces el panel corto es
                            la única vista de notifs desde la campana. */}
                    </div>
                </>
            )}
        </div>
    );
}
