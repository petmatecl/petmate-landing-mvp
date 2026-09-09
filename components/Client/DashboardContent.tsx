import React, { useCallback, useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { supabase } from "../../lib/supabaseClient";
import { runReadQuery } from "../../lib/supabaseReadQuery";
import { fetchProveedoresPublicosByIds } from "../../lib/supabase/queries/proveedoresPublicos";
import Link from "next/link";
import { MessagesSquare, Search, Heart, X, Star } from "lucide-react";
import ReviewModal from "../Service/ReviewModal";
import { EstadoError } from "../Shared/EstadoError";

// --- Tipos de Datos ---
interface ConversationPreview {
    id: string;
    partnerName: string;
    partnerPhoto?: string;
    lastMessage: string;
    updatedAt: string;
}

interface ContactedService {
    conversation_id: string;
    servicio_id: string;
    proveedor_id: string;
    titulo: string;
    foto: string | null;
    precio_desde?: number;
    unidad_precio?: string;
    proveedor_nombre: string;
}

interface PendingReview {
    servicio_id: string;
    proveedor_id: string;
    titulo: string;
    foto: string | null;
    proveedor_nombre: string;
}

// Sprint tipo-b lote 2 (2026-09-09) — dashboard del tutor con estado de error
// por sección independiente:
//   * Mensajes (conversations query) → banner "No pudimos cargar tus mensajes"
//     dentro del box de la sidebar.
//   * Servicios consultados (conversations con embed servicios_publicados) →
//     banner "No pudimos cargar tus servicios consultados" reemplaza el empty
//     state + el listado.
//   * Reseñas pendientes (evaluaciones + eventos_tracking + servicios) → silent
//     + log Sentry. Es un bloque de nudge condicional (`pendingReviews.length >
//     0`); no afirma ausencia cuando falla — simplemente no renderiza el bloque.
//   * Hidratación de proveedores_publicos (nombres) → silent via helper (log
//     Sentry). Fallback textual "Proveedor" ya cubierto en el mapeo.

export default function DashboardContent() {
    const { user, profile } = useUser();

    const [conversations, setConversations] = useState<ConversationPreview[]>([]);
    const [contactedServices, setContactedServices] = useState<ContactedService[]>([]);
    const [pendingReviews, setPendingReviews] = useState<PendingReview[]>([]);
    const [evaluadosSet, setEvaluadosSet] = useState<Set<string>>(new Set());
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    // UI states
    const [isLoadingConversations, setIsLoadingConversations] = useState(true);
    const [showBanner, setShowBanner] = useState(false);

    // Error states por sección (Lote 2 tipo-b). Ninguno afecta el resto de la
    // pantalla — cada sección resuelve su propio banner.
    const [mensajesError, setMensajesError] = useState<string | null>(null);
    const [serviciosError, setServiciosError] = useState<string | null>(null);

    // 1. Fetch Conversaciones. El embed proveedores!fk(...) se reemplaza
    //    por hidratacion via vista publica (post-RLS fix junio 2026).
    //    sitter_id en conversations es auth_user_id directo del proveedor
    //    (no proveedor.id), asi que hidratamos por auth_user_id no por id.
    const loadConversations = useCallback(async (userId: string) => {
        setIsLoadingConversations(true);
        setMensajesError(null);

        const convResult = await runReadQuery<any[]>(
            () => supabase
                .from('conversations')
                .select(`
                    id,
                    updated_at,
                    sitter_id,
                    messages(
                        content,
                        created_at
                    )
                `)
                .eq('client_id', userId)
                .order('updated_at', { ascending: false })
                .limit(5),
            { subsystem: 'dashboard_tutor', table: 'conversations', route: '/usuario' },
        );
        if (convResult.error) {
            setMensajesError('No pudimos cargar tus mensajes');
            setIsLoadingConversations(false);
            return;
        }
        const data = convResult.data ?? [];

        // Hidratar partner desde vista por auth_user_id (sitter_id es FK a
        // auth.users). Falla silenciosa + log via runReadQuery en el helper.
        // Fallback textual "Proveedor" ya presente en el map.
        const partnerAuthIds = data.map((c: any) => c.sitter_id).filter(Boolean);
        const partnersResult = await runReadQuery<any[]>(
            () => supabase
                .from('proveedores_publicos')
                .select('auth_user_id, nombre, apellido_p, foto_perfil')
                .in('auth_user_id', partnerAuthIds),
            { subsystem: 'dashboard_tutor', table: 'proveedores_publicos', route: '/usuario' },
        );
        const partners = partnersResult.data ?? [];
        const partnerMap = new Map<string, any>(partners.map((p: any) => [p.auth_user_id, p]));

        const parsed = data.map((conv: any) => {
            const partner = partnerMap.get(conv.sitter_id) ?? null;
            const msgs = conv.messages || [];
            const lastMsg = msgs.length > 0
                ? msgs.reduce((a: any, b: any) => new Date(a.created_at) > new Date(b.created_at) ? a : b)?.content
                : 'Sin mensajes';

            return {
                id: conv.id,
                partnerName: partner ? `${partner.nombre || 'Proveedor'} ${partner.apellido_p ? partner.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor Eliminado',
                partnerPhoto: partner?.foto_perfil,
                lastMessage: lastMsg || '',
                updatedAt: conv.updated_at,
            };
        });
        setConversations(parsed);
        setIsLoadingConversations(false);
    }, []);

    // 3. Fetch Servicios consultados (DISTINCT por servicio, últimos 6).
    //    Embed nested proveedores!inner se reemplaza por hidratacion desde
    //    vista publica (post-RLS fix). Embed a servicios_publicados se
    //    mantiene intacto (tabla no tocada por el fix).
    const loadContactedServices = useCallback(async (userId: string) => {
        setServiciosError(null);

        const result = await runReadQuery<any[]>(
            () => supabase
                .from('conversations')
                .select(`
                    id,
                    created_at,
                    servicios_publicados!inner(
                        id, titulo, fotos, precio_desde, unidad_precio, proveedor_id
                    )
                `)
                .eq('client_id', userId)
                .order('created_at', { ascending: false })
                .limit(20),
            { subsystem: 'dashboard_tutor', table: 'conversations', route: '/usuario' },
        );
        if (result.error) {
            setServiciosError('No pudimos cargar tus servicios consultados');
            return;
        }
        const data = result.data ?? [];

        // Hidratar proveedor anidado dentro de cada servicio (silent + log).
        const provIds = data
            .map((c: any) => {
                const sp = c.servicios_publicados;
                return Array.isArray(sp) ? sp[0]?.proveedor_id : sp?.proveedor_id;
            })
            .filter(Boolean);
        const provMap = await fetchProveedoresPublicosByIds(
            provIds,
            'id,nombre,apellido_p,foto_perfil',
            '/usuario',
        );

        const seen = new Set<string>();
        const unique: ContactedService[] = [];
        for (const conv of data) {
            const sp = conv.servicios_publicados as any;
            if (!sp?.id || seen.has(sp.id)) continue;
            seen.add(sp.id);
            const prov = provMap.get(sp.proveedor_id) ?? null;
            unique.push({
                conversation_id: conv.id,
                servicio_id: sp.id,
                proveedor_id: sp.proveedor_id ?? '',
                titulo: sp.titulo,
                foto: sp.fotos?.[0] || null,
                precio_desde: sp.precio_desde,
                unidad_precio: sp.unidad_precio,
                proveedor_nombre: prov ? `${prov.nombre} ${prov.apellido_p ? prov.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor',
            });
            if (unique.length >= 6) break;
        }
        setContactedServices(unique);
    }, []);

    // 4. Fetch reseñas pendientes — bloque de nudge condicional. Cualquier
    //    fallo se loguea a Sentry (via runReadQuery) y el bloque simplemente
    //    no aparece (no afirma ausencia porque el heading + copy están
    //    encadenados al `pendingReviews.length > 0` guard).
    const loadPendingReviews = useCallback(async (userId: string) => {
        // 1. IDs con evaluación aprobada de este usuario.
        const evalsResult = await runReadQuery<any[]>(
            () => supabase
                .from('evaluaciones')
                .select('servicio_id')
                .eq('usuario_id', userId)
                .eq('estado', 'aprobado'),
            { subsystem: 'dashboard_tutor', table: 'evaluaciones', route: '/usuario' },
        );
        if (evalsResult.error) return;
        const evSet = new Set((evalsResult.data ?? []).map((e: any) => e.servicio_id));
        setEvaluadosSet(evSet);

        // 2. IDs de servicios con click de contacto últimos 30 días.
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const clicksResult = await runReadQuery<any[]>(
            () => supabase
                .from('eventos_tracking')
                .select('servicio_id')
                .eq('user_id', userId)
                .in('tipo', ['click_whatsapp', 'click_telefono', 'click_email', 'click_web', 'click_instagram'])
                .gte('created_at', since),
            { subsystem: 'dashboard_tutor', table: 'eventos_tracking', route: '/usuario' },
        );
        if (clicksResult.error) return;
        const clickIds = Array.from(new Set((clicksResult.data ?? []).map((c: any) => c.servicio_id).filter(Boolean)));

        // 3. Servicios de clicks que no han sido evaluados (máx 3).
        const pendingIds = clickIds.filter(id => !evSet.has(id)).slice(0, 3);
        if (pendingIds.length === 0) return;

        const extrasResult = await runReadQuery<any[]>(
            () => supabase
                .from('servicios_publicados')
                .select('id, titulo, fotos, proveedor_id')
                .in('id', pendingIds),
            { subsystem: 'dashboard_tutor', table: 'servicios_publicados', route: '/usuario' },
        );
        if (extrasResult.error) return;
        const extras = extrasResult.data ?? [];

        const provMap = await fetchProveedoresPublicosByIds(
            extras.map((s: any) => s.proveedor_id),
            'id,nombre,apellido_p',
            '/usuario',
        );
        const mapped: PendingReview[] = extras.map((s: any) => {
            const prov = provMap.get(s.proveedor_id) ?? null;
            return {
                servicio_id: s.id,
                proveedor_id: s.proveedor_id ?? '',
                titulo: s.titulo,
                foto: s.fotos?.[0] || null,
                proveedor_nombre: prov ? `${prov.nombre} ${prov.apellido_p ? prov.apellido_p.charAt(0) + '.' : ''}` : 'Proveedor',
            };
        });
        setPendingReviews(mapped);
    }, []);

    useEffect(() => {
        if (!user) return;

        // Welcome banner (localStorage, solo primera visita)
        const key = `pawnecta_onboarded_${user.id}`;
        if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
            setShowBanner(true);
        }

        loadConversations(user.id);
        loadContactedServices(user.id);
        loadPendingReviews(user.id);
    }, [user, loadConversations, loadContactedServices, loadPendingReviews]);

    const dismissBanner = () => {
        if (user && typeof window !== 'undefined') {
            localStorage.setItem(`pawnecta_onboarded_${user.id}`, '1');
        }
        setShowBanner(false);
    };

    if (!user) return <div className="p-8 text-center text-slate-500">Cargando panel...</div>;

    const firstName = profile?.nombre || 'Usuario';

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-12">

            {/* --- WELCOME BANNER (primera visita, localStorage) --- */}
            {showBanner && (
                <div className="bg-accent-50 border border-accent-200 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="font-semibold text-slate-900 tracking-tight">
                                Bienvenido a Pawnecta, {firstName}
                            </h2>
                            <p className="text-sm text-slate-600 mt-1">
                                Busca proveedores verificados en tu comuna y contáctalos directo.
                            </p>
                            <div className="flex flex-wrap gap-3 mt-4">
                                <Link
                                    href="/explorar"
                                    className="bg-accent-600 text-white text-sm font-medium tracking-wide px-4 py-2 rounded-xl hover:bg-accent-700 transition-colors"
                                >
                                    Buscar proveedores
                                </Link>
                            </div>
                        </div>
                        <button onClick={dismissBanner} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- SECCIÓN: ¿Cómo te fue? (reseñas pendientes) --- */}
                {pendingReviews.length > 0 && (
                    <section className="lg:col-span-2 space-y-4">
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">¿Cómo te fue con estos proveedores?</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Tu opinión ayuda a otros tutores a elegir mejor</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {pendingReviews.map(item => (
                                <div key={item.servicio_id} className="bg-warning-50 border border-warning-200 rounded-2xl p-4 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-warning-100 overflow-hidden shrink-0">
                                            {item.foto ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.foto} alt={item.titulo} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-warning-400">
                                                    <Star size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-900 text-sm line-clamp-2 leading-tight">{item.titulo}</p>
                                            <p className="text-xs text-slate-500 truncate">{item.proveedor_nombre}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setReviewingId(item.servicio_id)}
                                        className="w-full flex items-center justify-center gap-1.5 bg-warning-500 hover:bg-warning-600 text-white text-sm font-medium tracking-wide py-2 rounded-xl transition-colors"
                                    >
                                        <Star size={14} />
                                        Dejar reseña
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Modal de reseña — fuera del map */}
                {reviewingId && (() => {
                    const item = pendingReviews.find(r => r.servicio_id === reviewingId);
                    if (!item) return null;
                    return (
                        <ReviewModal
                            isOpen={true}
                            onClose={() => {
                                setPendingReviews(prev => prev.filter(r => r.servicio_id !== reviewingId));
                                setReviewingId(null);
                            }}
                            servicioId={item.servicio_id}
                            proveedorId={item.proveedor_id}
                            serviceTitle={item.titulo}
                        />
                    );
                })()}

                {/* --- SECCIÓN: Servicios que has consultado (2/3 desktop) --- */}
                <section className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Servicios que has consultado</h2>

                    {serviciosError ? (
                        <EstadoError
                            titulo={serviciosError}
                            onRetry={() => user && loadContactedServices(user.id)}
                        />
                    ) : contactedServices.length > 0 ? (
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                                {contactedServices.map(item => (
                                    <div key={item.servicio_id} className="w-56 shrink-0 border border-slate-200 rounded-xl shadow-sm overflow-hidden bg-white relative">
                                        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                                            {item.foto ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.foto} alt={item.titulo} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                                                    <Search size={28} />
                                                </div>
                                            )}
                                            {evaluadosSet.has(item.servicio_id) && (
                                                <span className="absolute top-2 right-2 bg-accent-100 text-accent-800 text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full z-10">
                                                    ✓ Evaluado
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-0.5">{item.titulo}</h3>
                                            <p className="text-xs text-slate-500 mb-3">{item.proveedor_nombre}</p>
                                            <div className="flex gap-2">
                                                <Link
                                                    href={`/servicio/${item.servicio_id}`}
                                                    className="flex-1 text-center text-xs font-medium bg-accent-50 text-accent-800 py-1.5 rounded-lg hover:bg-accent-100 transition-colors"
                                                >
                                                    Ver servicio
                                                </Link>
                                                <Link
                                                    href={`/mensajes?id=${item.conversation_id}`}
                                                    className="flex-1 text-center text-xs font-medium bg-slate-100 text-slate-700 py-1.5 rounded-lg hover:bg-slate-200 transition-colors"
                                                >
                                                    Ver chat
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <Search size={32} className="text-slate-300 mb-3" />
                            <h3 className="text-slate-900 font-semibold mb-1">Aún no has consultado ningún servicio</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-4">
                                Encuentra proveedores verificados en tu comuna y contáctalos directo.
                            </p>
                            <Link
                                href="/explorar"
                                className="bg-accent-600 text-white px-6 py-2.5 rounded-xl font-medium tracking-wide hover:bg-accent-700 transition-colors shadow-sm"
                            >
                                Buscar proveedores
                            </Link>
                        </div>
                    )}
                </section>

                {/* --- SIDEBAR DERECHA --- */}
                <div className="space-y-8">

                    {/* Conversaciones Recientes */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900 tracking-tight">
                            <MessagesSquare className="text-blue-500" />
                            Mensajes
                        </h2>

                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                            {mensajesError ? (
                                <EstadoError
                                    titulo={mensajesError}
                                    onRetry={() => user && loadConversations(user.id)}
                                />
                            ) : isLoadingConversations ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="flex gap-3 items-center animate-pulse">
                                            <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0" />
                                            <div className="space-y-2 flex-1">
                                                <div className="h-4 w-20 bg-slate-200 rounded" />
                                                <div className="h-3 w-full bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : conversations.length > 0 ? (
                                <div className="space-y-4">
                                    {conversations.map(conv => (
                                        <Link key={conv.id} href={`/mensajes?id=${conv.id}`} className="block group">
                                            <div className="flex items-center gap-3 p-2 -mx-2 rounded-xl group-hover:bg-slate-50 transition-colors">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                                    {conv.partnerPhoto ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={conv.partnerPhoto} alt={conv.partnerName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex justify-center items-center text-slate-400 font-semibold">
                                                            {conv.partnerName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <p className="font-semibold text-slate-900 text-sm truncate">{conv.partnerName}</p>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {new Date(conv.updatedAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate group-hover:text-blue-600 transition-colors">
                                                        {conv.lastMessage}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                    <div className="pt-2">
                                        <Link href="/mensajes" className="text-sm font-medium text-blue-600 hover:text-blue-700 block text-center">
                                            Ver todos mis mensajes &rarr;
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-slate-500">
                                    <MessagesSquare size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-sm">Sin conversaciones activas.</p>
                                    <p className="text-xs text-slate-400 mt-1">Busca un proveedor y escríbele.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Favoritos — link a la página dedicada /favoritos */}
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900 tracking-tight">
                            <Heart size={20} strokeWidth={1.5} className="text-rose-500" />
                            Mis favoritos
                        </h2>

                        <Link
                            href="/favoritos"
                            className="block bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:border-accent-600 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                                    <Heart size={20} strokeWidth={1.5} aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm group-hover:text-accent-600 transition-colors">
                                        Tus servicios y proveedores guardados
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Toca el corazón en cualquier servicio o perfil para guardarlo.
                                    </p>
                                </div>
                                <span className="text-sm font-medium text-accent-700 group-hover:text-accent-800 shrink-0">
                                    Ver todos →
                                </span>
                            </div>
                        </Link>
                    </section>
                </div>
            </div>

            {/* --- CTA explorar --- */}
            <section className="mt-8">
                <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-24 -left-20 w-64 h-64 bg-slate-800 rounded-full opacity-50 blur-3xl" />
                    <div className="absolute -bottom-24 -right-20 w-64 h-64 bg-deep-900 rounded-full opacity-30 blur-3xl" />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl mb-2 backdrop-blur-sm">
                            <Search size={32} className="text-accent-500" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Encuentra al proveedor ideal</h2>
                        <p className="text-slate-300 text-lg mx-auto">
                            Proveedores verificados en tu comuna, con reseñas reales de tutores como tú.
                        </p>
                        <div className="pt-4">
                            {/* rgba de accent-500 (#22C55E) — glow del CTA hero dark, hex directo porque es shadow arbitrary value. */}
                            <Link
                                href="/explorar"
                                className="inline-flex items-center justify-center h-14 px-8 rounded-full bg-accent-500 hover:bg-accent-400 text-slate-900 font-medium tracking-wide text-lg shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:-translate-y-1 transition-all"
                            >
                                Buscar proveedores
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
