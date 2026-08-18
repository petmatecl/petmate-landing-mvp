import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/**
 * Sprint orphan-fix (2026-08-18) — SIMPLIFICADO. Antes era la fábrica
 * principal de cuentas huérfanas: el handler intentaba INSERT del perfil
 * client-side, y si fallaba, hacía `signOut()` como "rollback" — pero
 * `signOut()` solo cierra la sesión del browser, NO borra `auth.users`.
 * Cada INSERT fallido dejaba un auth.users vivo sin perfil. 74 cuentas
 * huérfanas por formulario email + 18 por Google OAuth confirmadas en
 * prod (12-dic-2025 → 21-mar-2026).
 *
 * Nueva responsabilidad: procesar el token/code de Supabase (PKCE o
 * implicit hash), setear la sesión, y navegar. NADA de INSERT — eso lo
 * hace el guard en UserContext (redirige a /completar-registro si no
 * hay perfil) + endpoint server-side /api/auth/complete-registration
 * con service_role.
 *
 * Beneficios:
 * - Cero cuentas huérfanas nuevas por esta página. El guard captura y
 *   la página /completar-registro los rescata con endpoint seguro.
 * - Handler mucho más simple. Cero rollback frágil. Cero race con RLS
 *   client-side (todos los INSERT pasan por service_role).
 * - Cubre TODAS las vías (Google, email link, magic link, futuras) con
 *   un solo mecanismo.
 */
export default function EmailConfirmadoPage() {
    const router = useRouter();
    const [statusText, setStatusText] = useState("Verificando confirmación...");
    const [isProcessing, setIsProcessing] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showManualButton, setShowManualButton] = useState(false);

    // Fallback si algo se cuelga.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isProcessing) setShowManualButton(true);
        }, 5000);
        return () => clearTimeout(timer);
    }, [isProcessing]);

    useEffect(() => {
        let mounted = true;

        // Una vez que hay sesión activa, el UserContext guard decide
        // adónde va el user (dashboard si tiene perfil, /completar-registro
        // si es huérfano). Nosotros solo aterrizamos en `/` y el guard
        // toma el volante.
        const navigateAfterSession = () => {
            if (!mounted) return;
            setStatusText("¡Listo! Continuando...");
            // Usamos router.replace('/') — el guard en UserContext detecta
            // sesión + estado de perfil y redirige apropiadamente.
            setTimeout(() => router.replace('/'), 800);
        };

        const failWith = (msg: string) => {
            if (!mounted) return;
            console.warn('[email-confirmado] fail:', msg);
            setErrorMsg(msg);
            setIsProcessing(false);
            setShowManualButton(true);
        };

        const processTokens = async () => {
            // 1. PKCE: `?code=XX` en query params.
            const code = new URLSearchParams(window.location.search).get('code');
            if (code) {
                setStatusText("Verificando código de seguridad...");
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    if (data.session) {
                        navigateAfterSession();
                        return;
                    }
                    failWith('No se recibió sesión del servidor.');
                } catch (err: any) {
                    failWith(`Error validando el enlace: ${err?.message || 'desconocido'}`);
                }
                return;
            }

            // 2. Implicit / recovery: `#access_token=...` en hash.
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                setStatusText("Procesando token...");
                const params = new URLSearchParams(hash.replace('#', ''));
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    try {
                        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (error) throw error;
                        if (data.session) {
                            navigateAfterSession();
                            return;
                        }
                        failWith('No se recibió sesión del servidor.');
                    } catch (err: any) {
                        failWith(`Token inválido: ${err?.message || 'desconocido'}`);
                    }
                    return;
                }
                failWith('Enlace incompleto.');
                return;
            }

            // 3. Nada en URL — puede que la sesión ya esté activa por
            //    otra tab o que el user llegó directo. Verificamos.
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session) {
                    navigateAfterSession();
                    return;
                }
                setStatusText("No detectamos un enlace válido. Puedes iniciar sesión desde el botón de abajo.");
                if (mounted) setTimeout(() => setShowManualButton(true), 1200);
            } catch (err: any) {
                failWith(`Error verificando sesión: ${err?.message || 'desconocido'}`);
            }
        };

        processTokens();

        // Suscriptor por si el flow PKCE resuelve tarde o llega vía tab.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
                navigateAfterSession();
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
                <title>Confirmando cuenta — Pawnecta</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-accent-50 to-white">
                {errorMsg ? (
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warning-100 flex items-center justify-center text-warning-700 text-2xl font-bold">!</div>
                        <h1 className="text-xl font-bold text-slate-900 mb-2">
                            No pudimos completar el proceso
                        </h1>
                        <p className="text-sm text-slate-600 mb-5">{errorMsg}</p>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors"
                        >
                            Ir a iniciar sesión
                        </Link>
                    </div>
                ) : (
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-14 h-14 mx-auto text-accent-600 animate-spin mb-5" />
                                <h1 className="text-xl font-bold text-slate-900 mb-2">
                                    Confirmando tu cuenta
                                </h1>
                                <p className="text-sm text-slate-600">{statusText}</p>
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-14 h-14 mx-auto text-accent-600 mb-5" />
                                <h1 className="text-xl font-bold text-slate-900 mb-2">
                                    ¡Correo confirmado!
                                </h1>
                                <p className="text-sm text-slate-600 mb-4">{statusText}</p>
                            </>
                        )}

                        {showManualButton && (
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <p className="text-xs text-slate-500 mb-3">
                                    Si esta pantalla no avanza sola, puedes ingresar manualmente:
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors"
                                >
                                    Iniciar sesión
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
