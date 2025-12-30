import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

interface RoleGuardProps {
    children: React.ReactNode;
    requiredRole: "cliente" | "petmate";
}

export default function RoleGuard({ children, requiredRole }: RoleGuardProps) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);
    const [currentRole, setCurrentRole] = useState<string | null>(null);

    useEffect(() => {
        // Run specific check on mount
        const checkRole = async () => {
            if (typeof window === "undefined") return;

            // 1. Verify Real Session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // No session = unauthorized. Clear ghost data and kick out.
                window.localStorage.removeItem("activeRole");
                window.localStorage.removeItem("pm_auth_role_pending");
                setAuthorized(false);
                setChecking(false);
                router.replace("/login"); // Force redirect
                return;
            }

            const activeRole = window.localStorage.getItem("activeRole");
            setCurrentRole(activeRole);

            if (!activeRole) {
                // Check if there is a pending role from registration/login
                const pendingRole = window.localStorage.getItem("pm_auth_role_pending");

                if (pendingRole === requiredRole) {
                    // Optimized Flow: If the pending role matches where they are trying to go, let them in.
                    window.localStorage.setItem("activeRole", requiredRole);
                    setAuthorized(true);
                } else {
                    // Strict Mode: If no active role and pending doesn't match (or is null), 
                    // DO NOT auto-grant access. This prevents new sitters from seeing client dashboard.
                    // We simply leave authorized = false.
                    setAuthorized(false);
                }
            } else {
                if (activeRole === requiredRole) {
                    setAuthorized(true);
                } else {
                    setAuthorized(false);
                }
            }
            setChecking(false);
        };

        checkRole();
    }, [requiredRole]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("activeRole");
            window.localStorage.removeItem("pm_auth_role_pending");
        }
        router.push("/login");
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border border-slate-200">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">
                        Cambio de Perfil Requerido
                    </h1>
                    <p className="text-slate-600 mb-8">
                        Estás conectado como <strong>{currentRole === 'cliente' ? 'Cliente' : 'Sitter'}</strong>,
                        pero estás intentando acceder al panel de <strong>{requiredRole === 'cliente' ? 'Cliente' : 'Sitter'}</strong>.
                    </p>
                    <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-lg">
                        Por razones de seguridad y flujo, debes cerrar sesión e ingresar seleccionando el perfil correcto.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-black transition-all shadow-lg shadow-slate-900/10"
                    >
                        Cerrar Sesión
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="mt-4 text-slate-500 font-medium hover:text-slate-700 underline text-sm"
                    >
                        Volver atrás
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
