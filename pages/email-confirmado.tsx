import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Shared/Card";
import { AuthService, Role } from "../lib/authService";

// Icons needed for selector
const UserIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const PawIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="8" r="2.5" />
    <path d="M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
  </svg>
);

export default function EmailConfirmadoPage() {
    const router = useRouter();
    
    // State for Role Selection
    const [showRoleSelector, setShowRoleSelector] = React.useState(false);
    const [userName, setUserName] = React.useState("");
    const [availableRoles, setAvailableRoles] = React.useState<string[]>([]);

    const handleRoleSelect = async (selectedRole: Role) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("activeRole", selectedRole);
        }
        await router.push(selectedRole === "cliente" ? "/usuario" : "/sitter");
    };

    useEffect(() => {
        // Escuchar cambios de estado (login con Google dispara SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user;
                const pendingRole = window.localStorage.getItem('pm_auth_role_pending');

                try {
                    // 1. Check if profile exists using AuthService (checks 'roles' array too)
                    const existingProfile = await AuthService.fetchProfile(user.id);

                    if (!existingProfile) {
                        // 2. Create Profile if it doesn't exist
                        // Extract metadata from Google
                        const fullName = user.user_metadata.full_name || user.user_metadata.name || "";
                        const firstName = user.user_metadata.given_name || fullName.split(' ')[0] || "Usuario";
                        const lastName = user.user_metadata.family_name || fullName.split(' ').slice(1).join(' ') || "";
                        const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture || "";

                        const roleToAssign = pendingRole === 'sitter' || pendingRole === 'petmate' ? 'petmate' : 'cliente';
                        const rolesArray = roleToAssign === 'petmate' ? ['sitter'] : ['cliente'];

                        const { error: insertError } = await supabase
                            .from('registro_petmate')
                            .insert([
                                {
                                    auth_user_id: user.id,
                                    rol: roleToAssign,
                                    roles: rolesArray,
                                    nombre: firstName,
                                    apellido_p: lastName,
                                    email: user.email,
                                    foto_perfil: avatarUrl,
                                    region: "RM", // Default
                                    perros: 0,
                                    gatos: 0
                                }
                            ]);

                        if (insertError) throw insertError;

                        // Set active role for immediate consistent UX
                        window.localStorage.setItem("activeRole", roleToAssign === 'petmate' ? 'petmate' : 'cliente');
                        
                        // New profile -> Direct Redirect based on what they just signed up for
                        router.replace(roleToAssign === 'petmate' ? "/sitter" : "/usuario");

                    } else {
                        // 3. Existing Profile - Check for multiple roles
                         const userRoles = existingProfile.roles || [];
                         if (existingProfile.rol && !userRoles.includes(existingProfile.rol)) userRoles.push(existingProfile.rol);
                         if (userRoles.length === 0) userRoles.push('cliente');
 
                         setUserName(existingProfile.nombre || "Usuario");
 
                         // Logic from login.tsx:
                         // 1. Both Roles? -> Show Selector
                         if (userRoles.includes('petmate') && userRoles.includes('cliente')) {
                             setAvailableRoles(userRoles);
                             setShowRoleSelector(true);
                             // Do NOT redirect
                             return;
                         }
 
                        // 2. Only One Role? -> Auto Redirect
                        let targetRole: Role = 'cliente';
                        if (userRoles.includes('petmate')) targetRole = 'petmate';
                        else if (pendingRole === 'sitter') targetRole = 'petmate'; // Fallback if pending intent matches

                        window.localStorage.setItem("activeRole", targetRole);
                        router.replace(targetRole === 'cliente' ? "/usuario" : "/sitter");
                    }

                } catch (err) {
                    console.error("Error handling Google Auth profile:", err);
                    router.replace("/usuario");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <>
            <Head>
                <title>¡Correo confirmado! — Pawnecta</title>
            </Head>

            <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
                {showRoleSelector ? (
                    <Card variant="elevated" padding="l" className="w-full max-w-[500px]">
                        <h1 className="text-2xl font-bold text-center mb-2">¡Hola, {userName}!</h1>
                        <p className="text-slate-600 text-center mb-8">¿Con qué perfil deseas ingresar hoy?</p>

                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => handleRoleSelect("cliente")}
                                className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-emerald-500 group-hover:text-white shrink-0">
                                    <UserIcon />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="font-bold text-slate-900 text-lg">Ingresar como Usuario</span>
                                    <span className="text-sm text-slate-500">Buscar servicios para mis mascotas</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleRoleSelect("petmate")}
                                className="flex items-center gap-4 p-4 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md transition-all group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-emerald-500 group-hover:text-white shrink-0">
                                    <PawIcon />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="font-bold text-slate-900 text-lg">Ingresar como Sitter</span>
                                    <span className="text-sm text-slate-500">Gestionar mis servicios y reservas</span>
                                </div>
                            </button>
                        </div>
                    </Card>
                ) : (
                    <Card padding="l" className="w-full max-w-[520px] text-center relative">
                        {/* Decoración de fondo */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-emerald-100 text-emerald-600 text-4xl shadow-sm">
                            🎉
                        </div>

                        <h1 className="text-3xl font-extrabold text-slate-900 m-0 mb-2">
                            ¡Sesión iniciada!
                        </h1>

                        <p className="text-lg text-slate-600 mb-6">
                            Te estamos redirigiendo a tu cuenta...
                        </p>
                    </Card>
                )}
            </main>
        </>
    );
}
