import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Shared/Card";
import { CheckCircle } from "lucide-react";

export default function EmailConfirmadoPage() {
    const router = useRouter();
    const [statusText, setStatusText] = useState("Verificando confirmación...");
    const [registrationConflict, setRegistrationConflict] = useState(false);
    const [existingEmail, setExistingEmail] = useState("");
    const [isProcessing, setIsProcessing] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [targetRole, setTargetRole] = useState<'proveedor' | 'usuario'>('usuario');

    // Estado en caso de que todo tarde o se congele
    const [showManualButton, setShowManualButton] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (isProcessing) setShowManualButton(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [isProcessing]);

    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any) => {
            if (!session?.user) return;
            setStatusText("Preparando tu cuenta...");

            const user = session.user;
            const pendingRole = window.localStorage.getItem('pawnecta_pending_role') as 'proveedor' | 'usuario' | null;
            const finalRole = pendingRole === 'proveedor' ? 'proveedor' : 'usuario';

            if (mounted) setTargetRole(finalRole);

            try {
                if (finalRole === 'proveedor') {
                    // Flujo Proveedor
                    const { data: existingProvider } = await supabase
                        .from('proveedores')
                        .select('id')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();

                    if (!existingProvider) {
                        setStatusText("Creando perfil de cuidador...");
                        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
                        const firstName = user.user_metadata?.given_name || fullName.split(' ')[0] || "Proveedor";
                        const lastName = user.user_metadata?.family_name || fullName.split(' ').slice(1).join(' ') || "";

                        const { error: insertError } = await supabase
                            .from('proveedores')
                            .insert([{
                                auth_user_id: user.id,
                                nombre: firstName,
                                apellido_p: lastName,
                                estado: 'pendiente' // Pendiente de moderación según spec técnico
                            }]);

                        if (insertError && insertError.code === '23505') {
                            // Unique constraint violation - already registered
                            if (mounted) {
                                setRegistrationConflict(true);
                                setExistingEmail(user.email || "");
                                setIsProcessing(false);
                            }
                            return;
                        } else if (insertError) {
                            throw insertError;
                        }
                    } else if (router.query.flow === 'register') {
                        if (mounted) {
                            setRegistrationConflict(true);
                            setExistingEmail(user.email || "");
                            setIsProcessing(false);
                        }
                        return;
                    }

                    if (mounted) {
                        setStatusText("¡Listo! Redirigiendo a tu panel de proveedor...");
                        setIsSuccess(true);
                        setIsProcessing(false);
                        setTimeout(() => router.replace('/proveedor'), 1500);
                    }

                } else {
                    // Flujo Usuario / Cliente Básico
                    const { data: existingUser } = await supabase
                        .from('usuarios_buscadores')
                        .select('id')
                        .eq('auth_user_id', user.id)
                        .maybeSingle();

                    if (!existingUser) {
                        setStatusText("Creando perfil de usuario...");
                        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
                        const firstName = user.user_metadata?.given_name || fullName.split(' ')[0] || "Usuario";
                        const lastName = user.user_metadata?.family_name || fullName.split(' ').slice(1).join(' ') || "";

                        const { error: insertError } = await supabase
                            .from('usuarios_buscadores')
                            .insert([{
                                auth_user_id: user.id,
                                nombre: firstName,
                                apellido_p: lastName,
                            }]);

                        if (insertError && insertError.code === '23505') {
                            if (mounted) {
                                setRegistrationConflict(true);
                                setExistingEmail(user.email || "");
                                setIsProcessing(false);
                            }
                            return;
                        } else if (insertError) {
                            throw insertError;
                        }
                    } else if (router.query.flow === 'register') {
                        if (mounted) {
                            setRegistrationConflict(true);
                            setExistingEmail(user.email || "");
                            setIsProcessing(false);
                        }
                        return;
                    }

                    if (mounted) {
                        setStatusText("¡Listo! Redirigiendo a explorar servicios...");
                        setIsSuccess(true);
                        setIsProcessing(false);
                        setTimeout(() => router.replace('/explorar'), 1500);
                    }
                }

            } catch (err: any) {
                console.error("Error processing confirm flow:", err);
                setStatusText(`Error interno: ${err.message || 'Desconocido'}`);
                if (mounted) {
                    setIsProcessing(false);
                    setShowManualButton(true);
                }
            }
        };

        const checkAuthTokens = async () => {
            // 1. PKCE Check (Query Params / ?code=XX)
            const code = new URLSearchParams(window.location.search).get('code');
            if (code) {
                setStatusText("Verificando código de seguridad...");
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (data.session) {
                        handleSession(data.session);
                        return; // Romper ejecución
                    }
                    if (error) throw error;
                } catch (err: any) {
                    setStatusText(`Error de Validación PKCE: ${err.message}`);
                    if (mounted) { setIsProcessing(false); setShowManualButton(true); }
                }
                return;
            }

            // 2. Implicit / Recovery Hash fallback
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                setStatusText("Procesando token temporal...");
                const params = new URLSearchParams(hash.replace('#', ''));
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    try {
                        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (data.session) {
                            handleSession(data.session);
                            return;
                        }
                        if (error) throw error;
                    } catch (e: any) {
                        setStatusText(`Token expirado o inválido: ${e.message}`);
                        if (mounted) { setIsProcessing(false); setShowManualButton(true); }
                    }
                }
            }

            // 3. Chequeo local por remanente de sesión
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session) {
                    handleSession(data.session);
                } else if (!hash.includes('access_token') && !code) {
                    setStatusText("Sesión ausente. Esperando respuesta del servidor...");
                    if (mounted) setTimeout(() => setShowManualButton(true), 2500);
                }
            } catch (err: any) {
                setStatusText(`Error genérico de Sesión: ${err.message}`);
                if (mounted) { setIsProcessing(false); setShowManualButton(true); }
            }
        };

        checkAuthTokens();

        // Suscriptor para cambios de estado si el componente montó antes o PKCE se resolvió detrás de banbalinas
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
                    <Card padding="l" className="w-full max-w-[520px] text-center relative pointer-events-auto">
                        <div className="absolute top-0 left-0 w-full h-2 bg-amber-500 rounded-t-2xl" />
                        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-amber-100 text-amber-600 text-4xl shadow-sm">
                            ⚠️
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 m-0 mb-2">
                            Ya tienes una cuenta
                        </h1>
                        <p className="text-lg text-slate-600 mb-6">
                            El correo <strong>{existingEmail}</strong> ya está registrado en Pawnecta.
                            <br /><br />
                            Por favor, inicia sesión para acceder a tu perfil.
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

                ) : isSuccess ? (

                    <Card padding="l" className="w-full max-w-[500px] text-center animate-in zoom-in-95 duration-500">
                        <CheckCircle size={64} className="text-emerald-600 mx-auto mb-6 drop-shadow-sm" />
                        <h1 className="text-3xl font-black text-slate-900 mb-3">¡Correo Confirmado!</h1>
                        <p className="text-lg text-slate-600 mb-2">Gracias por verificar tu cuenta electrónica.</p>
                        <p className="text-emerald-700 font-semibold mb-6 animate-pulse">
                            {statusText}
                        </p>
                    </Card>

                ) : (

                    <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-6"></div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Validando Email...</h2>
                        <p className="text-slate-500 mb-1 max-w-sm text-center">{statusText}</p>

                        {/* Botones de Respaldo por fallos de enrutado LocalStorage */}
                        {showManualButton && (
                            <div className="mt-8 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl animate-in slide-in-from-bottom-2 fade-in max-w-md w-full text-center">
                                <p className="text-sm font-semibold text-slate-700 mb-1">Parece que tu navegador bloqueó el redireccionamiento.</p>
                                <p className="text-xs text-slate-500 mb-4">Haz clic abajo dependiendo de qué perfil querías crear:</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => router.replace('/explorar')}
                                        className="text-sm font-bold text-slate-700 bg-slate-100 px-4 py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                    >
                                        Explorar servicios (Cliente)
                                    </button>
                                    <button
                                        onClick={() => router.replace('/proveedor')}
                                        className="text-sm font-bold text-emerald-700 bg-emerald-100 px-4 py-3 rounded-xl hover:bg-emerald-200 transition-colors"
                                    >
                                        Ofrecer servicios (Proveedor)
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
