import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { LayoutDashboard, Star, Bell, ArrowLeft, PawPrint, Video } from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const router = useRouter();

    const isActive = (path: string) => router.pathname === path;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            <Head>
                <title>Panel de Administración | Pawnecta</title>
            </Head>

            {/* Sidebar / Mobile Nav */}
            <aside className="bg-white border-b md:border-b-0 md:border-r border-slate-300 w-full md:w-64 flex-shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto no-scrollbar">
                <div className="p-6 border-b border-slate-300 flex items-center justify-between md:block">
                    <Link href="/admin" className="text-xl font-extrabold text-emerald-600 flex items-center gap-2">
                        <PawPrint size={24} /> PAWNECTA <span className="text-slate-400 font-normal text-xs">Admin</span>
                    </Link>
                </div>

                <nav className="p-4 space-y-1 overflow-x-auto md:overflow-visible flex md:block scrollbar-hide">
                    <Link
                        href="/admin"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${isActive('/admin')
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>

                    <Link
                        href="/admin/reviews"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${isActive('/admin/reviews')
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                    >
                        <Star size={20} /> Reseñas
                    </Link>

                    <Link
                        href="/admin/notificaciones"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${isActive('/admin/notificaciones')
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                    >
                        <Bell size={20} /> Notificaciones
                    </Link>

                    <Link
                        href="/admin/videos"
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${isActive('/admin/videos')
                            ? 'bg-emerald-50 text-emerald-700 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                    >
                        <Video size={20} /> Videos
                    </Link>

                    <Link
                        href="/"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 font-medium transition-colors whitespace-nowrap mt-4"
                    >
                        <ArrowLeft size={20} /> Volver al Sitio
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
