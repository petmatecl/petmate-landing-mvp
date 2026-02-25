import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../contexts/UserContext";
import { supabase } from '../../lib/supabaseClient';

interface RoleGuardProps {
    children: React.ReactNode;
    requiredRole: "cliente" | "petmate" | "admin";
}

export default function RoleGuard({ children, requiredRole }: RoleGuardProps) {
    const router = useRouter();
    const { isAuthenticated, isLoading, user, providerStatus, roles } = useUser();
    const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

    useEffect(() => {
        const verifyAccess = async () => {
            if (isLoading) return;

            if (!isAuthenticated || !user) {
                setAuthState('unauthorized');
                router.replace("/login");
                return;
            }

            if (requiredRole === 'cliente') {
                // If it's pure client dashboard, everyone authenticated has access essentially
                setAuthState('authorized');
                return;
            }

            if (requiredRole === 'petmate') {
                if (providerStatus === 'aprobado' || roles?.includes('admin')) {
                    setAuthState('authorized');
                    return;
                }

                // Fallback check in DB just in case context is lagging
                const { data } = await supabase
                    .from('proveedores')
                    .select('estado')
                    .eq('auth_user_id', user.id)
                    .single();

                if (data?.estado === 'aprobado') {
                    setAuthState('authorized');
                } else {
                    setAuthState('unauthorized');
                    router.push('/login');
                }
                return;
            }

            if (requiredRole === 'admin') {
                const { data } = await supabase
                    .from('proveedores')
                    .select('roles, estado')
                    .eq('auth_user_id', user.id)
                    .single();

                if (data?.roles && Array.isArray(data.roles) && data.roles.includes('admin') && data.estado === 'aprobado') {
                    setAuthState('authorized');
                } else {
                    setAuthState('unauthorized');
                    router.push('/login');
                }
                return;
            }
        };

        verifyAccess();
    }, [isLoading, isAuthenticated, requiredRole, user, providerStatus, roles, router]);

    if (authState === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    if (authState === 'unauthorized') {
        return null;
    }

    return <>{children}</>;
}
