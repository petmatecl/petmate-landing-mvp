import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShieldCheck, BarChart3, Users, UserCheck, MessageSquareWarning } from 'lucide-react';
// import TabNavigation from '../components/Proveedor/TabNavigation'; // Removed missing component

// Nuevos componentes de la refactorización
import AdminMetrics from '../components/Admin/AdminMetrics';
import ProveedorApprovalList from '../components/Admin/ProveedorApprovalList';
import EvaluacionModerationList from '../components/Admin/EvaluacionModerationList';
import ProveedorManagementList from '../components/Admin/ProveedorManagementList';

export default function AdminDashboard() {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    // Pestaña activa ('dashboard', 'aprobaciones', 'moderacion', 'proveedores')
    const [activeTab, setActiveTab] = useState('dashboard');

    const checkAuth = React.useCallback(async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                throw new Error('No session');
            }

            const email = session.user.email;
            if (!email) throw new Error('No email');

            // 1. Verificación por Lista Dura (Hardcoded Fallback de Seguridad)
            // Ajustar correos según corresponda
            const ADMIN_EMAILS = [
                'cano.caldera@gmail.com',
                'admin@pawnecta.com',
                // Agregar otros mientras se configuran los roles
            ];

            let hasAdminAccess = ADMIN_EMAILS.includes(email);

            // 2. Verificación por Rol en la base de datos (Si no pasó la lista dura)
            if (!hasAdminAccess) {
                const { data: profile } = await supabase
                    .from('proveedores')
                    .select('roles')
                    .eq('user_id', session.user.id)
                    .single();

                if (profile?.roles && Array.isArray(profile.roles) && profile.roles.includes('admin')) {
                    hasAdminAccess = true;
                }
            }

            if (hasAdminAccess) {
                setIsAdmin(true);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error('Error checking auth:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth, router]);

    const tabs = [
        { id: 'dashboard', label: 'Métricas', icon: BarChart3 },
        { id: 'aprobaciones', label: 'Aprobaciones', icon: UserCheck },
        { id: 'moderacion', label: 'Moderación', icon: MessageSquareWarning },
        { id: 'proveedores', label: 'Proveedores', icon: Users },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
            <Head>
                <title>Administración | Pawnecta</title>
            </Head>

            <Header />

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-24">
                {/* Header del Dashboard */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
                            Panel de Administración
                        </h1>
                        <p className="mt-2 text-slate-600">Herramientas de gestión y moderación del marketplace.</p>
                    </div>
                </div>

                {/* Navegación por Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-slate-200 hide-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${isActive
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:text-emerald-700'
                                    }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Contenedor de las Tab */}
                <div className="mt-8">
                    {activeTab === 'dashboard' && <AdminMetrics />}
                    {activeTab === 'aprobaciones' && <ProveedorApprovalList />}
                    {activeTab === 'moderacion' && <EvaluacionModerationList />}
                    {activeTab === 'proveedores' && <ProveedorManagementList />}
                </div>
            </main>

            <Footer />
        </div>
    );
}
