// components/Admin/AdminSidebar.tsx
// ----------------------------------------------------------------------------
// Sprint admin-sidebar-ref — Opción III (2026-11-20). Refactor unificador
// del sidebar admin: 1 solo componente consumido por pages/admin.tsx (SPA
// con tabs internas) + components/Admin/AdminLayout.tsx (sub-páginas con
// URL propia). Diseño visual tomado del SPA actual (header "Admin ·
// Pawnecta" + ícono ShieldCheck + fondo accent-50 para la entrada activa).
//
// 10 entradas totales:
//  - 6 tabs SPA → Métricas (dashboard), Conversión, (Aprobaciones cond.),
//    Moderación, Proveedores, Feedback.
//  - Separador visual.
//  - 4 sub-rutas con URL propia → Métricas detalle (/admin/metricas-
//    proveedores), Evaluaciones (/admin/evaluaciones), Notificaciones
//    (/admin/notificaciones), Volver al Sitio (/).
//
// Modo "SPA" (pages/admin.tsx): los tabs SPA son <button> con onClick +
// setActiveTab. La tab activa está determinada por `activeTab` que pasa el
// parent.
//
// Modo "page" (AdminLayout.tsx): los tabs SPA son <Link href=/admin?tab=X>
// (navegación cross-página). `activeTab` es null → ninguna tab activa; en
// su lugar, `activeSubRoute` indica cuál de las 4 sub-rutas está activa.
//
// Los 2 modos se discriminan por la presencia de `onTabClick`.
// ----------------------------------------------------------------------------
import React from 'react';
import Link from 'next/link';
import {
    ShieldCheck,
    Target,
    Star,
    Bell,
    ArrowLeft,
    type LucideIcon,
} from 'lucide-react';

export type AdminSidebarTab = {
    id: string;
    label: string;
    icon: LucideIcon;
    badge?: number;
};

export interface AdminSidebarProps {
    /** 6 tabs del SPA (orden desde pages/admin.tsx). */
    tabs: AdminSidebarTab[];
    /** Id de la tab SPA activa. null cuando estamos en sub-ruta. */
    activeTab: string | null;
    /** Callback cuando el user hace click en una tab SPA.
     *  - Definido → modo SPA: renderiza <button> + llama onTabClick.
     *  - Undefined → modo page: renderiza <Link href=/admin?tab=X>. */
    onTabClick?: (tabId: string) => void;
    /** Pathname de la sub-ruta activa, o null. */
    activeSubRoute: string | null;
    /** Offset dinámico del header (navbar + banner opcional). */
    headerH: number;
}

// 4 sub-rutas con URL propia, mismo orden en SPA y en sub-páginas.
const SUB_RUTAS: Array<{ path: string; label: string; icon: LucideIcon }> = [
    { path: '/admin/metricas-proveedores', label: 'Métricas detalle', icon: Target },
    { path: '/admin/evaluaciones', label: 'Evaluaciones', icon: Star },
    { path: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
];

function badgeSpan(tab: AdminSidebarTab, variant: 'desktop' | 'mobile' | 'mobile-active'): React.ReactNode {
    if (typeof tab.badge !== 'number' || tab.badge <= 0) return null;
    const text = tab.badge > 99 ? '99+' : tab.badge;
    const cls =
        variant === 'desktop'
            ? 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold bg-accent-600 text-white'
            : variant === 'mobile-active'
              ? 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-white text-accent-700'
              : 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-accent-600 text-white';
    return <span aria-label={`${tab.badge} pendientes`} className={cls}>{text}</span>;
}

function TabDesktop({ tab, active, onClick }: { tab: AdminSidebarTab; active: boolean; onClick?: () => void }) {
    const Icon = tab.icon;
    const className = `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
            ? 'bg-accent-50 text-accent-700 font-semibold'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;
    const body = (
        <>
            <Icon size={18} className={active ? 'text-accent-700' : 'text-slate-500'} />
            <span className="flex-1 text-left">{tab.label}</span>
            {badgeSpan(tab, 'desktop')}
        </>
    );
    if (onClick) {
        return (
            <button role="tab" aria-selected={active} onClick={onClick} className={className}>
                {body}
            </button>
        );
    }
    return (
        <Link href={{ pathname: '/admin', query: { tab: tab.id } }} className={className}>
            {body}
        </Link>
    );
}

function TabMobile({ tab, active, onClick }: { tab: AdminSidebarTab; active: boolean; onClick?: () => void }) {
    const Icon = tab.icon;
    const className = `flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
        active ? 'bg-accent-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'
    }`;
    const body = (
        <>
            <Icon size={14} />
            {tab.label}
            {badgeSpan(tab, active ? 'mobile-active' : 'mobile')}
        </>
    );
    if (onClick) {
        return (
            <button role="tab" aria-selected={active} onClick={onClick} className={className}>
                {body}
            </button>
        );
    }
    return (
        <Link href={{ pathname: '/admin', query: { tab: tab.id } }} className={className}>
            {body}
        </Link>
    );
}

export default function AdminSidebar({
    tabs,
    activeTab,
    onTabClick,
    activeSubRoute,
    headerH,
}: AdminSidebarProps) {
    return (
        <>
            {/* ── DESKTOP ── sidebar sticky izquierda */}
            <aside
                className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-slate-200"
                style={{ position: 'sticky', top: headerH, height: `calc(100vh - ${headerH}px)` }}
            >
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-7 h-7 text-accent-700" />
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 leading-tight">Admin</h2>
                            <p className="text-[11px] text-slate-500">Pawnecta</p>
                        </div>
                    </div>
                </div>
                <nav
                    role="tablist"
                    aria-label="Secciones de administración"
                    aria-orientation="vertical"
                    className="flex-1 p-3 space-y-1 overflow-y-auto"
                >
                    {tabs.map((tab) => (
                        <TabDesktop
                            key={tab.id}
                            tab={tab}
                            active={activeTab === tab.id}
                            onClick={onTabClick ? () => onTabClick(tab.id) : undefined}
                        />
                    ))}

                    {/* Separador visual entre tabs SPA y sub-rutas con URL propia. */}
                    <div className="h-px bg-slate-200 my-2" aria-hidden="true" />

                    {SUB_RUTAS.map(({ path, label, icon: Icon }) => {
                        const active = activeSubRoute === path;
                        return (
                            <Link
                                key={path}
                                href={path}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                    active
                                        ? 'bg-accent-50 text-accent-700 font-semibold'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                                aria-current={active ? 'page' : undefined}
                            >
                                <Icon size={18} className={active ? 'text-accent-700' : 'text-slate-500'} />
                                <span className="flex-1 text-left">{label}</span>
                            </Link>
                        );
                    })}
                    <Link
                        href="/"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700 mt-4"
                    >
                        <ArrowLeft size={18} />
                        <span className="flex-1 text-left">Volver al Sitio</span>
                    </Link>
                </nav>
            </aside>

            {/* ── MOBILE ── tabs horizontales fixed */}
            <div
                role="tablist"
                aria-label="Secciones de administración"
                className="lg:hidden fixed left-0 right-0 z-30 bg-white border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar"
                style={{ top: headerH }}
            >
                {tabs.map((tab) => (
                    <TabMobile
                        key={tab.id}
                        tab={tab}
                        active={activeTab === tab.id}
                        onClick={onTabClick ? () => onTabClick(tab.id) : undefined}
                    />
                ))}
                {/* Separador vertical + 4 sub-rutas en mobile como links. */}
                <div className="w-px bg-slate-200 my-1" aria-hidden="true" />
                {SUB_RUTAS.map(({ path, label, icon: Icon }) => {
                    const active = activeSubRoute === path;
                    return (
                        <Link
                            key={path}
                            href={path}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all ${
                                active ? 'bg-accent-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon size={14} />
                            {label}
                        </Link>
                    );
                })}
                <Link
                    href="/"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all text-slate-500 hover:bg-slate-50"
                >
                    <ArrowLeft size={14} />
                    Sitio
                </Link>
            </div>
        </>
    );
}
