import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../contexts/UserContext";
import { mapError } from "../../lib/errorMapper";

type Role = "cliente" | "petmate";

interface RouteGuardProps {
    children: React.ReactNode;
    requiredRole?: Role; // Optional: If set, enforces this role
    requireAuth?: boolean; // Default true
    fallbackPath?: string; // Where to redirect if validation fails
}

export default function RouteGuard({
    children,
    requiredRole,
    requireAuth = true,
}: RouteGuardProps) {
    const router = useRouter();
    const { isAuthenticated, activeRole, isLoading, onboardingStatus } = useUser();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            // 1. Auth Required Check
            if (requireAuth && !isAuthenticated) {
                setIsRedirecting(true);
                router.replace("/login");
                return;
            }

            // 2. Onboarding Check (Only if authenticated)
            if (isAuthenticated && onboardingStatus !== 'COMPLETE') {
                if (router.pathname !== '/register' && router.pathname !== '/logout') {
                    setIsRedirecting(true);
                    router.replace("/register?resume=true");
                }
                return;
            }

            // 3. Role Check (Only if specific role required)
            // Note: This check renders a "Forbidden" UI instead of redirecting usually, 
            // but we can also auto-redirect to the correct dashboard if we want "smart routing".
            // The previous RoleGuard rendered a friendly Error Component. We will keep that behavior below.
        }
    }, [isLoading, isAuthenticated, onboardingStatus, requireAuth, router]);

    if (isLoading || isRedirecting) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 text-sm animate-pulse">Verificando acceso...</p>
            </div>
        );
    }

    // Role Mismatch UI
    if (requiredRole && activeRole !== requiredRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border-2 border-slate-300">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">
                        Cambio de Perfil Requerido
                    </h1>
                    <p className="text-slate-600 mb-8">
                        Estás operando como <strong>{activeRole === 'cliente' ? 'Dueño de Mascota' : 'Sitter'}</strong>,
                        pero intentas acceder al panel de <strong>{requiredRole === 'cliente' ? 'Dueño de Mascota' : 'Sitter'}</strong>.
                    </p>
                    {/* Using errorMapper example directly or just static text for now */}
                    <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-lg">
                        {mapError({ message: "Role mismatch" })}
                    </p>

                    <button
                        onClick={() => router.push(requiredRole === 'cliente' ? '/usuario' : '/sitter')}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
                    >
                        Ir a mi Panel de {requiredRole === 'cliente' ? 'Dueño' : 'Sitter'}
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-slate-500 font-medium hover:text-slate-700 underline text-sm block mx-auto"
                    >
                        Volver atrás
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
