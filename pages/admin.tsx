import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, BarChart3, Users, UserCheck, MessageSquareWarning, MessageSquareText, TrendingUp } from 'lucide-react';

import dynamic from 'next/dynamic';

const AdminMetrics = dynamic(() => import('../components/Admin/AdminMetrics'), { ssr: false });
const ProveedorApprovalList = dynamic(() => import('../components/Admin/ProveedorApprovalList'), { ssr: false });
const EvaluacionModerationList = dynamic(() => import('../components/Admin/EvaluacionModerationList'), { ssr: false });
const ProveedorManagementList = dynamic(() => import('../components/Admin/ProveedorManagementList'), { ssr: false });
const ConversionMetrics = dynamic(() => import('../components/Admin/ConversionMetrics'), { ssr: false });
// Sprint Ola-1 C1-extended (2026-08-14) — OfertaMetrics para el umbral de
// apertura de campaña a tutores (servicios por categoría + comuna). Ver
// components/Admin/OfertaMetrics.tsx.
const OfertaMetrics = dynamic(() => import('../components/Admin/OfertaMetrics'), { ssr: false });
// Sprint A4 fase 2 (2026-08-14) — badge visible del backend rate limiter
// (upstash | memory | memory-fallback). Silencioso cuando todo OK en dev,
// rojo persistente cuando degradado en prod/preview. Aldo lo ve al entrar.
const RateLimitBadge = dynamic(() => import('../components/Admin/RateLimitBadge'), { ssr: false });
// Sprint admin-visibilidad (2026-08-27) — lista solo-lectura de
// feedback_submissions. Tabla ya existía con RLS admin desde 20260508
// pero la superficie UI faltaba (patrón "infra sin superficie" que veníamos
// viendo esta semana). Ver components/Admin/FeedbackList.tsx.
const FeedbackList = dynamic(() => import('../components/Admin/FeedbackList'), { ssr: false });

export default function AdminDashboard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Pestaña activa ('dashboard', 'aprobaciones', 'moderacion', 'proveedores')
    const [activeTab, setActiveTab] = useState('dashboard');

    // Sprint badge-f1 (2026-08-18) — auto-aprobación al signup deja el
    // tab Aprobaciones legacy vacío en el flow nuevo. Ocultamos el tab
    // cuando count=0 para no mostrar ruido permanente. Reaparece si en el
    // futuro aparece un pendiente (suspensión manual, cuenta legacy que
    // el admin re-active, etc.). Query barata: HEAD count sobre
    // proveedores.estado='pendiente' con filtro es_ejemplo. Corre una
    // sola vez al aterrizar el admin verificado.
    const [aprobacionesPendientesCount, setAprobacionesPendientesCount] = useState<number | null>(null);
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        (async () => {
            const { count, error } = await supabase
                .from('proveedores')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'pendiente')
                .or('es_ejemplo.eq.false,es_ejemplo.is.null');
            if (cancelled) return;
            if (error) {
                console.warn('[admin] fetch aprobacionesPendientesCount failed:', error);
                setAprobacionesPendientesCount(0);
                return;
            }
            setAprobacionesPendientesCount(count ?? 0);
        })();
        return () => { cancelled = true; };
    }, [isAdmin]);

    // Sprint admin-visibilidad (2026-08-27) — count de feedback con estado
    // 'nuevo' para badge del tab. Mismo patrón que aprobacionesPendientesCount:
    // HEAD count barato, corre una vez al aterrizar el admin verificado. Sin
    // este badge Aldo declaró explícitamente que va a olvidar revisar el tab.
    // RLS de feedback_submissions ya filtra a admin — cero RPC necesario.
    const [feedbackNuevosCount, setFeedbackNuevosCount] = useState<number | null>(null);
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        (async () => {
            const { count, error } = await supabase
                .from('feedback_submissions')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'nuevo');
            if (cancelled) return;
            if (error) {
                console.warn('[admin] fetch feedbackNuevosCount failed:', error);
                setFeedbackNuevosCount(0);
                return;
            }
            setFeedbackNuevosCount(count ?? 0);
        })();
        return () => { cancelled = true; };
    }, [isAdmin]);

    const checkAuth = React.useCallback(async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                throw new Error('No session');
            }

            // Verificación por rol en la base de datos (única fuente de verdad)
            const { data: profile } = await supabase
                .from('proveedores')
                .select('roles, estado')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();

            const roles = Array.isArray(profile?.roles) ? profile.roles : [];
            const hasAdminAccess = roles.includes('admin') && profile?.estado === 'aprobado';

            setIsAdmin(!!hasAdminAccess);
        } catch (error) {
            console.error('Error checking auth:', error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            });

            if (error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('email not confirmed')) {
                    setLoginError('Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada.');
                } else if (msg.includes('invalid login credentials') || msg.includes('invalid')) {
                    setLoginError('El correo o la contraseña no son correctos.');
                } else {
                    setLoginError(`Error de autenticación: ${error.message}`);
                }
                setLoginLoading(false);
                return;
            }

            if (!data.user) {
                setLoginError('No se pudo obtener la sesión. Intenta nuevamente.');
                setLoginLoading(false);
                return;
            }

            // Verificar rol admin en DB (sin filtrar por estado para dar mejor feedback)
            const { data: proveedorData, error: queryError } = await supabase
                .from('proveedores')
                .select('roles, estado')
                .eq('auth_user_id', data.user.id)
                .maybeSingle();

            if (queryError) {
                console.error('Admin query error:', queryError);
                await supabase.auth.signOut();
                setLoginError('Error al verificar permisos. Contacta al administrador.');
                setLoginLoading(false);
                return;
            }

            if (!proveedorData) {
                await supabase.auth.signOut();
                setLoginError('Esta cuenta no tiene un perfil de proveedor asociado.');
                setLoginLoading(false);
                return;
            }

            const roles = Array.isArray(proveedorData.roles) ? proveedorData.roles : [];
            const hasAdminRole = roles.includes('admin');
            const isApproved = proveedorData.estado === 'aprobado';

            if (!hasAdminRole) {
                await supabase.auth.signOut();
                setLoginError('Esta cuenta no tiene permisos de administrador.');
                setLoginLoading(false);
                return;
            }

            if (!isApproved) {
                await supabase.auth.signOut();
                setLoginError(`Tu perfil de proveedor tiene estado "${proveedorData.estado}". Debe estar aprobado para acceder al admin.`);
                setLoginLoading(false);
                return;
            }

            // Admin verificado → activar directamente sin reload
            setIsAdmin(true);
            setLoginLoading(false);

        } catch (err: any) {
            console.error('Admin login error:', err);
            setLoginError('Error al iniciar sesión. Intenta nuevamente.');
            setLoginLoading(false);
        }
    };

    // Tab Aprobaciones se oculta cuando el contador de pendientes es 0
    // (auto-aprobación sprint badge-f1). Reaparece automáticamente si
    // aparece un pendiente. Mientras `aprobacionesPendientesCount` es
    // null (fetch en curso al mount), el tab se muestra para evitar
    // hidration flash — la primera lectura decide si queda o no.
    // Sprint admin-visibilidad (2026-08-27) — `badge?: number` opcional en el
    // tab. Se muestra solo cuando > 0 (evita ruido "0" cuando la bandeja está
    // limpia). Feedback tab siempre visible (a diferencia de Aprobaciones que
    // se auto-oculta en 0) porque la ausencia de feedback también es señal —
    // Aldo va a querer confirmar visualmente que la sección existe aunque
    // esté vacía. MessageSquareText (no Warning) porque el feedback no es
    // todo problema y el ícono de warning sesga la lectura antes de abrir.
    const tabs: Array<{ id: string; label: string; icon: any; badge?: number }> = [
        { id: 'dashboard', label: 'Métricas', icon: BarChart3 },
        { id: 'conversion', label: 'Conversión', icon: TrendingUp },
        ...(aprobacionesPendientesCount !== 0
            ? [{ id: 'aprobaciones', label: 'Aprobaciones', icon: UserCheck, badge: aprobacionesPendientesCount ?? undefined }]
            : []),
        { id: 'moderacion', label: 'Moderación', icon: MessageSquareWarning },
        { id: 'proveedores', label: 'Proveedores', icon: Users },
        { id: 'feedback', label: 'Feedback', icon: MessageSquareText, badge: feedbackNuevosCount ?? undefined },
    ];

    // Si el tab activo se ocultó (activeTab='aprobaciones' pero count llegó
    // a 0), volver al dashboard sin dejar contenido colgando.
    useEffect(() => {
        if (activeTab === 'aprobaciones' && aprobacionesPendientesCount === 0) {
            setActiveTab('dashboard');
        }
    }, [activeTab, aprobacionesPendientesCount]);

    // Detect real header height (navbar + optional banner)
    const [headerH, setHeaderH] = useState(72);
    useEffect(() => {
        const measure = () => {
            const header = document.querySelector('header');
            if (header) {
                const rect = header.getBoundingClientRect();
                setHeaderH(rect.bottom);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        // Re-measure after a short delay (banner may close)
        const t = setTimeout(measure, 500);
        return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
    }, [isAdmin]);

    if (loading) {
        return (
            <>
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-600"></div>
                </div>
            </>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Acceso restringido</h1>
                    </div>

                    <form onSubmit={handleAdminLogin}>
                        <div className="space-y-4">
                            <input
                                type="email"
                                placeholder="Correo"
                                value={adminEmail}
                                onChange={e => setAdminEmail(e.target.value)}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                            {loginError && (
                                <p role="alert" aria-live="polite" className="text-danger-500 text-sm text-center">{loginError}</p>
                            )}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full bg-slate-900 text-white font-medium tracking-wide py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {loginLoading && (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                        style={{ animation: "spin 0.8s linear infinite" }}>
                                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                    </svg>
                                )}
                                {loginLoading ? 'Verificando...' : 'Ingresar'}
                            </button>
                        </div>
                    </form>
                </div>

                <style jsx>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans">
            <Head>
                <title>Administración | Pawnecta</title>
            </Head>

            <div className="flex" style={{ paddingTop: headerH }}>
                {/* ── SIDEBAR: navegación sticky izquierda ── */}
                <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-slate-200" style={{ position: 'sticky', top: headerH, height: `calc(100vh - ${headerH}px)` }}>
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-7 h-7 text-accent-700" />
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 leading-tight">Admin</h2>
                                <p className="text-[11px] text-slate-400">Pawnecta</p>
                            </div>
                        </div>
                    </div>
                    <nav role="tablist" aria-label="Secciones de administración" aria-orientation="vertical" className="flex-1 p-3 space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-accent-50 text-accent-700 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-accent-700' : 'text-slate-400'} />
                                    <span className="flex-1 text-left">{tab.label}</span>
                                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                                        <span
                                            aria-label={`${tab.badge} pendientes`}
                                            className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-accent-600 text-white"
                                        >
                                            {tab.badge > 99 ? '99+' : tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* ── MOBILE: tabs horizontales ── */}
                <div role="tablist" aria-label="Secciones de administración" className="lg:hidden fixed left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar" style={{ top: headerH }}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${isActive
                                    ? 'bg-accent-600 text-white font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                                {typeof tab.badge === 'number' && tab.badge > 0 && (
                                    <span
                                        aria-label={`${tab.badge} pendientes`}
                                        className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${isActive ? 'bg-white text-accent-700' : 'bg-accent-600 text-white'}`}
                                    >
                                        {tab.badge > 99 ? '99+' : tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── CONTENIDO PRINCIPAL ── */}
                <div className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 mt-12 lg:mt-0">
                    <div className="max-w-6xl">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                                    {tabs.find(t => t.id === activeTab)?.label || 'Panel de Administración'}
                                </h1>
                                <RateLimitBadge />
                            </div>
                            <p className="mt-1 text-sm text-slate-500">Herramientas de gestión y moderación del marketplace.</p>
                        </div>

                        {/* Tab content */}
                        {activeTab === 'dashboard' && <AdminMetrics setActiveTab={setActiveTab} />}
                        {activeTab === 'conversion' && (
                            <div className="space-y-12">
                                <OfertaMetrics />
                                <ConversionMetrics />
                            </div>
                        )}
                        {activeTab === 'aprobaciones' && <ProveedorApprovalList />}
                        {activeTab === 'moderacion' && <EvaluacionModerationList />}
                        {activeTab === 'proveedores' && <ProveedorManagementList />}
                        {activeTab === 'feedback' && <FeedbackList />}
                    </div>
                </div>
            </div>
        </div>
    );
}
