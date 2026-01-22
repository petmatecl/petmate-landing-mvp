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
        let mounted = true;

        const checkRole = async () => {
            if (typeof window === "undefined") return;

            try {
                // 1. Verify Real Session
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    if (mounted) destroySession();
                    return;
                }

                const userId = session.user.id;

                // 2. Fetch REAL roles from DB (Source of Truth)
                const { data: profile, error } = await supabase
                    .from('registro_petmate')
                    .select('roles')
                    .eq('auth_user_id', userId)
                    .single();

                if (error || !profile) {
                    console.error("Error fetching roles:", error);
                    if (mounted) destroySession();
                    return;
                }

                const userRoles: string[] = profile.roles || ['cliente']; // Default to client if empty
                const hasRequiredRole = userRoles.includes(requiredRole);

                if (mounted) {
                    if (hasRequiredRole) {
                        // Success: User has the role in DB.
                        setAuthorized(true);

                        // Treat localStorage only as a "View Preference" for UI persistence, 
                        // but we just validated they actually HAVE the right.
                        window.localStorage.setItem("activeRole", requiredRole);
                        setCurrentRole(requiredRole);
                    } else {
                        // Access Denied: User relies on localStorage or URL but DB says no.
                        console.warn(`Access denied. Required: ${requiredRole}, Has: ${userRoles.join(', ')}`);
                        setAuthorized(false);
                        setCurrentRole(userRoles.includes('petmate') ? 'petmate' : 'cliente'); // Show their actual viable role
                    }
                    setChecking(false);
                }

            } catch (err) {
                console.error("RoleGuard unexpected error:", err);
                if (mounted) {
                    setAuthorized(false);
                    setChecking(false);
                }
            }
        };

        const destroySession = () => {
            window.localStorage.removeItem("activeRole");
            window.localStorage.removeItem("pm_auth_role_pending");
            setAuthorized(false);
            setChecking(false);
            router.replace("/login");
        };

        checkRole();

        return () => {
            mounted = false;
        };
    }, [requiredRole, router]);

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
                <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border-2 border-slate-300">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">
                        Cambio de Perfil Requerido
                    </h1>
                    <p className="text-slate-600 mb-8">
                        Estás conectado como <strong>{currentRole === 'cliente' ? 'Usuario' : 'Sitter'}</strong>,
                        pero estás intentando acceder al panel de <strong>{requiredRole === 'cliente' ? 'Usuario' : 'Sitter'}</strong>.
                    </p>
                    <p className="text-slate-500 text-sm mb-6 bg-slate-50 p-4 rounded-lg">
                        Por razones de seguridad y flujo, debes cerrar sesión e ingresar seleccionando el perfil correcto.
                    </p>

                    <button
                        onClick={handleLogout}
                        className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
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
