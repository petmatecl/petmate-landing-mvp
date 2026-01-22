import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../contexts/UserContext";

interface RoleGuardProps {
    children: React.ReactNode;
    requiredRole: "cliente" | "petmate";
}

// RoleGuard.tsx now acts as a full RouteGuard
export default function RoleGuard({ children, requiredRole }: RoleGuardProps) {
    const router = useRouter();
    const { isAuthenticated, activeRole, isLoading, onboardingStatus, user } = useUser();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            // 1. Auth Check
            if (!isAuthenticated) {
                setIsRedirecting(true);
                router.replace("/login");
                return;
            }

            // 2. Onboarding Check
            if (onboardingStatus !== 'COMPLETE') {
                // If incomplete, determine where to go. 
                // Usually Profile Missing -> Register (or specific Step)
                // Avoid infinite loop if we are ALREADY on the target page (handled by parent usage usually, but here we guard internal routes)
                if (router.pathname !== '/register' && router.pathname !== '/logout') {
                    setIsRedirecting(true);
                    // Pass query param to indicate resumption
                    router.replace("/register?resume=true");
                }
                return;
            }
        }
    }, [isLoading, isAuthenticated, onboardingStatus, router]);

    if (isLoading || isRedirecting) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 text-sm animate-pulse">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // 3. Onboarding Blocker (Render-level)
    if (onboardingStatus !== 'COMPLETE') {
        return null; // Will redirect via effect
    }

    // 4. Role Check
    if (activeRole !== requiredRole) {
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
                    <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-lg">
                        Por favor, cambia de perfil en el menú superior o inicia sesión con la cuenta apropiada.
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
