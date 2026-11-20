// components/Admin/AdminLayout.tsx
// ----------------------------------------------------------------------------
// Sprint admin-sidebar-ref — Opción III (2026-11-20). Reescritura para
// consumir el nuevo <AdminSidebar/> compartido. Las 6 tabs SPA se
// renderizan como Link a /admin?tab=X; la sub-ruta activa se detecta
// por router.pathname.
//
// Qué NO maneja este layout:
// - La tab "Aprobaciones" condicional. No tenemos acceso al count desde
//   acá — el SPA la muestra cuando aplica; las sub-páginas no.
// - Los badges de count (feedback nuevo, etc). Son data del SPA.
//
// Diseño visual: tomado del SPA (ShieldCheck + "Admin · Pawnecta"); el
// componente <AdminSidebar/> es idéntico en ambas superficies.
// ----------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    BarChart3,
    TrendingUp,
    MessageSquareWarning,
    Users,
    MessageSquareText,
    type LucideIcon,
} from 'lucide-react';
import AdminSidebar, { type AdminSidebarTab } from './AdminSidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

// Los 5 tabs no-condicionales del SPA. "Aprobaciones" se omite (ver header).
const SPA_TABS: AdminSidebarTab[] = [
    { id: 'dashboard', label: 'Métricas', icon: BarChart3 },
    { id: 'conversion', label: 'Conversión', icon: TrendingUp },
    { id: 'moderacion', label: 'Moderación', icon: MessageSquareWarning },
    { id: 'proveedores', label: 'Proveedores', icon: Users },
    { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();

    // Re-medir offset del header (navbar + banner opcional) — mismo mecanismo
    // que pages/admin.tsx para que el sidebar sticky arranque abajo del
    // header real, no a un offset hardcodeado.
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
        const t = setTimeout(measure, 500);
        return () => {
            window.removeEventListener('resize', measure);
            clearTimeout(t);
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans">
            <Head>
                <title>Panel de Administración | Pawnecta</title>
            </Head>

            <div className="flex" style={{ paddingTop: headerH }}>
                <AdminSidebar
                    tabs={SPA_TABS}
                    activeTab={null}
                    activeSubRoute={router.pathname}
                    headerH={headerH}
                />

                <main className="flex-1 p-4 lg:p-8" style={{ paddingTop: `calc(1rem + 56px)` }}>
                    {/* paddingTop extra = header mobile tabs 56px. Desktop
                        lg: el sidebar sticky ya no necesita este offset — el
                        padding de 2rem lo cubre. */}
                    <div className="max-w-7xl mx-auto lg:pt-0 -mt-14 lg:-mt-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
