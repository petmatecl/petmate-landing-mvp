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

    // State for Registration Conflict (User tried to register but already exists)
    const [registrationConflict, setRegistrationConflict] = React.useState(false);
    const [existingEmail, setExistingEmail] = React.useState("");

    // Debug / Manual Override State
    const [statusText, setStatusText] = React.useState("Analizando sesión...");
    const [showManualButton, setShowManualButton] = React.useState(false);

    const handleRoleSelect = async (selectedRole: Role) => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("activeRole", selectedRole);
        }
        await router.push(selectedRole === "cliente" ? "/usuario" : "/sitter");
    };

    // Timeout for manual button
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowManualButton(true);
        }, 4000); // Show manual option after 4 seconds
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any) => {
            if (!session?.user) return;
            setStatusText("Sesión detectada. Verificando perfil...");
            const user = session.user;
            const pendingRole = window.localStorage.getItem('pm_auth_role_pending');

            try {
                // 1. Check if profile exists
                const existingProfile = await AuthService.fetchProfile(user.id);

                if (!existingProfile) {
                    setStatusText("Creando perfil nuevo...");
                    // 2. Create Profile if it doesn't exist
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
                                region: "RM",
                                perros: 0,
                                gatos: 0
                            }
                        ]);

                    if (insertError) throw insertError;

                    if (mounted) {
                        setStatusText("Perfil creado. Redirigiendo...");
                        window.localStorage.setItem("activeRole", roleToAssign === 'petmate' ? 'petmate' : 'cliente');
                        router.replace(roleToAssign === 'petmate' ? "/sitter" : "/usuario");
                    }

                } else {
                    setStatusText("Perfil encontrado. Verificando roles...");
                    // 3. Existing Profile
                    if (router.query.flow === 'register') {
                        if (mounted) {
                            setRegistrationConflict(true);
                            setExistingEmail(user.email || "");
                        }
                        await supabase.auth.signOut();
                        return;
                    }

                    // ... NORMAL LOGIN FLOW ...
                    const userRoles = existingProfile.roles || [];
                    if (userRoles.length === 0) userRoles.push('cliente');

                    if (mounted) setUserName(existingProfile.nombre || "Usuario");

                    // 1. Both Roles? -> Show Selector
                    if (userRoles.includes('petmate') && userRoles.includes('cliente')) {
                        if (mounted) {
                            setStatusText("Selecciona tu perfil.");
                            setAvailableRoles(userRoles);
                            setShowRoleSelector(true);
                        }
                        return;
                    }

                    // 2. Only One Role? -> Auto Redirect
                    let targetRole: Role = 'cliente';
                    if (userRoles.includes('petmate')) targetRole = 'petmate';
                    else if (pendingRole === 'sitter') targetRole = 'petmate';

                    if (mounted) {
                        setStatusText(`Redirigiendo a ${targetRole === 'petmate' ? 'Sitter' : 'Usuario'}...`);
                        window.localStorage.setItem("activeRole", targetRole);
                        router.replace(targetRole === 'cliente' ? "/usuario" : "/sitter");
                    }
                }

            } catch (err: any) {
                console.error("Error processing session:", err);
                setStatusText(`Error: ${err.message || "Error desconocido"}`);
                setShowManualButton(true);
            }
        };

        // MANUAL HASH CHECK (Fallback for Implicit Flow)
        // MANUAL HASH CHECK & PKCE CHECK
        const checkHashParams = async () => {
            // 1. PKCE Check (Query Params)
            const code = new URLSearchParams(window.location.search).get('code');
            if (code) {
                setStatusText("Intercambiando código (PKCE)...");
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (data.session) {
                        handleSession(data.session);
                        return;
                    }
                    if (error) {
                        console.error("PKCE Error:", error);
                        setStatusText(`Error PKCE: ${error.message}`);
                        setShowManualButton(true);
                    }
                } catch (err: any) {
                    setStatusText(`Excepción PKCE: ${err.message}`);
                    setShowManualButton(true);
                }
                return;
            }

            // 2. Implicit Check (Hash Params)
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                setStatusText("Procesando token...");
                const params = new URLSearchParams(hash.replace('#', ''));
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    try {
                        const { data, error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token
                        });
                        if (error) {
                            console.error("SetSession Error:", error);
                            setStatusText(`Error Token: ${error.message}`);
                            setShowManualButton(true);
                        } else if (data.session) {
                            setStatusText("Token validado. Iniciando...");
                            handleSession(data.session);
                            return;
                        } else {
                            setStatusText("Token procesado pero sin sesión.");
                            setShowManualButton(true);
                        }
                    } catch (e: any) {
                        console.error("SetSession Exception:", e);
                        const msg = e.message || "";
                        if (msg.includes("Failed to fetch")) {
                            setStatusText("Error de Conexión: Tu navegador o red está bloqueando a Supabase. Desactiva tu AdBlocker o Firewall.");
                        } else {
                            setStatusText(`Excepción Token: ${msg}`);
                        }
                        setShowManualButton(true);
                    }
                }
            }

            // Standard Session Check
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session) {
                    handleSession(data.session);
                } else {
                    if (!hash.includes('access_token') && !code) {
                        setStatusText("Esperando autenticación...");
                        setTimeout(() => setShowManualButton(true), 2000);
                    }
                }
            } catch (err: any) {
                setStatusText(`Error GetSession: ${err.message}`);
            }
        };

        checkHashParams();


        // Listen for new Auth Events (e.g. just finished OAuth redirect flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session) {
                handleSession(session);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <>
            <Head>
                <title>¡Correo confirmado! — Pawnecta</title>
            </Head>

            <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
                {registrationConflict ? (
                    <Card padding="l" className="w-full max-w-[520px] text-center relative">
                        <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-amber-100 text-amber-600 text-4xl shadow-sm">
                            ⚠️
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 m-0 mb-2">
                            Ya tienes una cuenta
                        </h1>
                        <p className="text-lg text-slate-600 mb-6">
                            El correo <strong>{existingEmail}</strong> ya está registrado en Pawnecta.
                            <br /><br />
                            Por favor, inicia sesión para acceder a tu cuenta.
                        </p>
                        <div className="space-y-3">
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center h-14 rounded-xl font-bold bg-slate-900 text-white w-full text-lg shadow-lg hover:bg-slate-800 hover:scale-[1.02] transition-all"
                            >
                                Ir a Iniciar Sesión
                            </Link>
                        </div>
                    </Card>
                ) : showRoleSelector ? (
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
                    <div className="flex flex-col items-center justify-center animate-pulse">
                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
                        <h2 className="text-xl font-bold text-slate-700">Iniciando sesión...</h2>
                        <p className="text-slate-500 mb-4">{statusText}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                            API: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20)}...
                        </p>

                        {/* Manual Override after 3 seconds or error */}
                        {showManualButton && (
                            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-xs text-slate-400 mb-2">¿Tarda demasiado?</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => router.replace('/usuario')}
                                        className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        Ir al Panel de Usuario
                                    </button>
                                    <button
                                        onClick={() => router.replace('/sitter')}
                                        className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        Ir al Panel de Sitter
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </>
    );
}
