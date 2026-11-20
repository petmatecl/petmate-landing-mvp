import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
    BarChart3,
    TrendingUp,
    MessageSquareWarning,
    Users,
    MessageSquareText,
    Target,
    Star,
    Bell,
    ArrowLeft,
    PawPrint,
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}

// Sprint sidebar-metricas Opción I (2026-11-20). Decisión PO: unificar el
// sidebar admin con las 6 tabs canónicas del SPA `/admin` + "Métricas detalle"
// (ruta propia) + "Volver al Sitio". Entradas "Evaluaciones" y "Notificaciones"
// se mantienen hasta confirmación PO sobre su uso real (ver BACKLOG).
//
// Las entradas del SPA apuntan a `/admin?tab=<id>` — para que la navegación
// funcione, `pages/admin.tsx` lee `router.query.tab` y activa la tab
// correspondiente al aterrizar con query param.
//
// "Aprobaciones" (condicional en el SPA según count) NO se incluye en este
// sidebar porque AdminLayout.tsx no tiene acceso al count. El SPA sigue
// mostrando la tab cuando aplica; desde sub-páginas, la tab es accesible via
// `/admin?tab=aprobaciones` manual.

type TabEntry = { label: string; icon: React.ComponentType<any>; tab: string };
const TABS_SPA: TabEntry[] = [
    { label: 'Métricas', icon: BarChart3, tab: 'dashboard' },
    { label: 'Conversión', icon: TrendingUp, tab: 'conversion' },
    { label: 'Moderación', icon: MessageSquareWarning, tab: 'moderacion' },
    { label: 'Proveedores', icon: Users, tab: 'proveedores' },
    { label: 'Feedback', icon: MessageSquareText, tab: 'feedback' },
];

type RouteEntry = { label: string; icon: React.ComponentType<any>; path: string };
const RUTAS_PROPIAS: RouteEntry[] = [
    { label: 'Métricas detalle', icon: Target, path: '/admin/metricas-proveedores' },
    { label: 'Evaluaciones', icon: Star, path: '/admin/evaluaciones' },
    { label: 'Notificaciones', icon: Bell, path: '/admin/notificaciones' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();

    // Tab del SPA — URL es `/admin?tab=X`. default (sin query) activa
    // 'dashboard' (igual que el SPA).
    const activeTab = typeof router.query.tab === 'string' ? router.query.tab : 'dashboard';
    const isTabActive = (tabId: string) =>
        router.pathname === '/admin' && activeTab === tabId;
    const isPathActive = (path: string) => router.pathname === path;

    const linkClass = (active: boolean) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors whitespace-nowrap ${
            active
                ? 'bg-accent-50 text-accent-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
        }`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <Head>
                <title>Panel de Administración | Pawnecta</title>
            </Head>

            {/* Sidebar / Mobile Nav */}
            <aside className="bg-white border-b md:border-b-0 md:border-r border-slate-300 w-full md:w-64 flex-shrink-0 md:sticky md:top-24 md:h-[calc(100vh-6rem)] md:overflow-y-auto no-scrollbar">
                <div className="p-6 border-b border-slate-300 flex items-center justify-between md:block">
                    <Link
                        href="/admin"
                        className="text-xl font-bold text-accent-700 tracking-tight flex items-center gap-2"
                    >
                        <PawPrint size={24} /> PAWNECTA{' '}
                        <span className="text-slate-400 font-normal text-xs">Admin</span>
                    </Link>
                </div>

                <nav className="p-4 space-y-1 overflow-x-auto md:overflow-visible flex md:block scrollbar-hide">
                    {/* Las 5 tabs canónicas del SPA (sprint sidebar-metricas Opción I).
                        Cada link va a /admin?tab=<id> — pages/admin.tsx lee router.query
                        .tab y activa la tab correspondiente. */}
                    {TABS_SPA.map(({ label, icon: Icon, tab }) => (
                        <Link
                            key={tab}
                            href={{ pathname: '/admin', query: { tab } }}
                            className={linkClass(isTabActive(tab))}
                        >
                            <Icon size={20} /> {label}
                        </Link>
                    ))}

                    {/* Separador visual entre tabs del SPA y sub-rutas con URL propia. */}
                    <div className="h-px bg-slate-200 my-2" aria-hidden="true" />

                    {RUTAS_PROPIAS.map(({ label, icon: Icon, path }) => (
                        <Link key={path} href={path} className={linkClass(isPathActive(path))}>
                            <Icon size={20} /> {label}
                        </Link>
                    ))}

                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-medium transition-colors whitespace-nowrap mt-4"
                    >
                        <ArrowLeft size={20} /> Volver al Sitio
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    );
}
