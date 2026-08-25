import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../contexts/UserContext";

/**
 * Sprint email-landing (2026-08-20) — landing post-confirmación de correo.
 *
 * Historia del archivo:
 *  (1) Sprint orphan-fix (2026-08-18): refactor total desde la versión que
 *      hacía INSERT client-side del perfil y `signOut()` de rollback (bug
 *      root que generó 92 huérfanos históricos). Se dejó como router pasivo
 *      que hidrataba sesión y mandaba a `/` para que el guard H3 tomara
 *      el volante — pero terminaba huérfana del flow real porque el Site
 *      URL del Dashboard apuntaba a la raíz.
 *  (2) Sprint email-landing (2026-08-20): responsabilidad expandida a
 *      página de aterrizaje explícita. `admin.generateLink` en
 *      `/api/auth/signup.ts:74` ahora pasa `redirectTo:
 *      <SITE_URL>/email-confirmado`. Site URL Dashboard queda en raíz
 *      como fallback global (magic link / change email / invite usan
 *      copy propio, no este).
 *
 * Requisitos de producto (PO 2026-08-20):
 *  - Confirmación explícita y visible del correo verificado (no inferible).
 *  - Aterrizaje en el panel que corresponde al ROL, no al home público.
 *  - CTA es acción concreta (publicar/explorar), no lugar ("Ir a mi panel").
 *  - Cero auto-redirect: usuario post-click no está apurado, tiene el control.
 *  - Copy chileno con tuteo, cero voseo, sin promesas de revisión ni ventanas.
 *
 * Flujo:
 *  (a) Procesa PKCE `?code=` o hash `#access_token=` (`exchangeCodeForSession`
 *      o `setSession`). Errores del hash (`error`, `error_code`, `error_description`
 *      — típicos de token expirado o consumido dos veces) se muestran con
 *      copy amable + CTA a re-registro o login.
 *  (b) Espera a que UserContext termine de hidratar perfil (`isLoading=false`).
 *  (c) Detecta rol vía `proveedorRow` / `hasSeekerProfile` / huérfano.
 *      Muestra copy + CTA según ese rol.
 *  (d) Botón CTA principal:
 *      - Proveedor: `/proveedor?abrirServicio=1` (dashboard abre
 *        ServiceFormModal automáticamente por query param, cero fricción).
 *      - Tutor: `/explorar`.
 *      - Huérfano (fallback defensivo): `/completar-registro` — el guard H3
 *        también captura desde acá si el user navega manualmente a
 *        cualquier ruta no-safe.
 *  (e) Link secundario discreto "Ir a mi panel" para proveedores que
 *      prefieren llegar sin modal abierto.
 */
export default function EmailConfirmadoPage() {
    const router = useRouter();
    const { proveedorRow, hasSeekerProfile, isLoading: userLoading, user } = useUser();

    const [statusText, setStatusText] = useState("Verificando confirmación...");
    const [sessionReady, setSessionReady] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    // Sprint email-landing hotfix (2026-08-25) — Aldo detectó empíricamente
    // que Supabase Auth devuelve `error_code=otp_expired` tanto para link
    // VENCIDO como para link CONSUMIDO. Son indistinguibles desde el
    // response (design decision de Supabase para no leak estado del user
    // — mismo error code cubre ambos casos). Antes había dos kinds
    // separados (`expired` vs `invalid`) que dividían por regex sobre el
    // description, pero el desc "Email link is invalid or has expired"
    // matchea AMBAS palabras — el ramo `invalid` era código muerto y el
    // ramo `expired` mostraba copy engañoso para el caso más frecuente
    // (usuario hace click dos veces post-confirmación exitosa).
    // Colapsados en un solo `used_or_expired` con copy honesto que no
    // afirma cuál de los dos ocurrió. `unknown` se mantiene para catch-all
    // de códigos genuinos inesperados.
    const [errorKind, setErrorKind] = useState<'used_or_expired' | 'unknown' | null>(null);

    // Procesar token una vez al mount.
    useEffect(() => {
        let mounted = true;

        const failWith = (msg: string, kind: 'used_or_expired' | 'unknown') => {
            if (!mounted) return;
            console.warn('[email-confirmado] fail:', kind, msg);
            setErrorMsg(msg);
            setErrorKind(kind);
        };

        // Detectar errores del hash o query params ANTES de procesar tokens.
        // Supabase Auth redirige acá con `error=access_denied&error_code=otp_expired`
        // en el hash cuando el link expiró O cuando el token ya fue consumido.
        // Ambos casos caen en `used_or_expired` — Supabase no los distingue.
        const detectErrorInUrl = (): boolean => {
            const hash = window.location.hash;
            const search = window.location.search;
            const params = new URLSearchParams(
                hash.startsWith('#') ? hash.slice(1) : (search.startsWith('?') ? search.slice(1) : '')
            );
            const error = params.get('error');
            const errorCode = params.get('error_code');
            const errorDesc = params.get('error_description');

            if (!error && !errorCode) return false;

            // Códigos conocidos que representan "link usado o vencido":
            // - otp_expired (Supabase manda esto para ambos casos).
            // - access_denied (variante que se ve en algunos flows PKCE).
            // - description que menciona "expired" o "invalid".
            const desc = errorDesc?.toLowerCase() || '';
            const isUsedOrExpired = errorCode === 'otp_expired'
                || errorCode === 'access_denied'
                || desc.includes('expired')
                || desc.includes('invalid');

            if (isUsedOrExpired) {
                failWith('El enlace ya no sirve.', 'used_or_expired');
                return true;
            }

            failWith(`No pudimos completar la confirmación (${errorCode || error}).`, 'unknown');
            return true;
        };

        const processTokens = async () => {
            if (detectErrorInUrl()) return;

            // PKCE: `?code=XX` en query params.
            const code = new URLSearchParams(window.location.search).get('code');
            if (code) {
                setStatusText("Verificando código de seguridad...");
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    if (data.session) {
                        if (mounted) setSessionReady(true);
                        return;
                    }
                    failWith('No recibimos sesión del servidor.', 'unknown');
                } catch (err: any) {
                    const msg = err?.message || 'desconocido';
                    // Colapsado a used_or_expired — mismo motivo que
                    // detectErrorInUrl: Supabase no distingue link consumido
                    // de link vencido en el mensaje de error del SDK.
                    const kind = /expired|invalid|already|used/i.test(msg) ? 'used_or_expired' : 'unknown';
                    failWith(msg, kind);
                }
                return;
            }

            // Implicit / recovery: `#access_token=...` en hash.
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                setStatusText("Procesando token...");
                const params = new URLSearchParams(hash.slice(1));
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (access_token && refresh_token) {
                    try {
                        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (error) throw error;
                        if (data.session) {
                            if (mounted) setSessionReady(true);
                            return;
                        }
                        failWith('No recibimos sesión del servidor.', 'unknown');
                    } catch (err: any) {
                        const msg = err?.message || 'desconocido';
                        // Mismo colapso que detectErrorInUrl y el catch de PKCE.
                        const kind = /expired|invalid|already|used/i.test(msg) ? 'used_or_expired' : 'unknown';
                        failWith(msg, kind);
                    }
                    return;
                }
                failWith('El enlace del correo está incompleto.', 'used_or_expired');
                return;
            }

            // Nada en URL — chequear si la sesión ya está activa por otra tab.
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session) {
                    if (mounted) setSessionReady(true);
                    return;
                }
                failWith('No detectamos un enlace válido en esta página.', 'invalid');
            } catch (err: any) {
                failWith(err?.message || 'Error verificando sesión.', 'unknown');
            }
        };

        processTokens();

        // Suscriptor por si el flow resuelve tarde (ej. token propagándose).
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && mounted) {
                setSessionReady(true);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Loading state: procesando token o UserContext aún hidratando perfil.
    const isLoading = !errorKind && (!sessionReady || userLoading || !user);

    // Detección de rol post-hidratación.
    // proveedor > tutor > huérfano (fallback defensivo — el guard H3 también
    // captura si el user navega manualmente a ruta protegida).
    type Rol = 'proveedor' | 'tutor' | 'orphan';
    const rol: Rol | null = isLoading
        ? null
        : proveedorRow
            ? 'proveedor'
            : hasSeekerProfile
                ? 'tutor'
                : 'orphan';

    // Copy + CTA según rol.
    const roleContent = (() => {
        if (rol === 'proveedor') {
            return {
                subtitle: 'Tu cuenta ya está activa. Publica tu primer servicio y empieza a recibir consultas.',
                primaryLabel: 'Publicar mi primer servicio',
                primaryHref: '/proveedor?abrirServicio=1',
                secondaryLabel: 'Ir a mi panel',
                secondaryHref: '/proveedor',
            };
        }
        if (rol === 'tutor') {
            return {
                subtitle: 'Tu cuenta ya está activa. Busca el servicio que necesitas para tu mascota.',
                primaryLabel: 'Explorar servicios',
                primaryHref: '/explorar',
                secondaryLabel: null,
                secondaryHref: null,
            };
        }
        // orphan (raro post-F1 — signup crea perfil server-side). Defensivo:
        // ofrecemos /completar-registro. El guard H3 también captura si el
        // user intenta navegar a ruta protegida.
        return {
            subtitle: 'Tu cuenta quedó activa pero falta un paso para elegir tu rol y completar el perfil.',
            primaryLabel: 'Completar mi registro',
            primaryHref: '/completar-registro',
            secondaryLabel: null,
            secondaryHref: null,
        };
    })();

    return (
        <>
            <Head>
                <title>Correo confirmado — Pawnecta</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-accent-50 to-white">
                <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                    {errorKind ? (
                        <div className="text-center">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warning-100 flex items-center justify-center text-warning-700">
                                <AlertTriangle size={28} aria-hidden="true" />
                            </div>
                            {/*
                              Copy unificado (sprint email-landing hotfix 2026-08-25).
                              Antes había dos ramos separados 'expired' vs 'invalid'
                              con copy distinto, pero Supabase Auth manda el mismo
                              error_code (`otp_expired`) para link consumido Y para
                              link vencido — imposible distinguir. El ramo 'invalid'
                              era código muerto y el 'expired' engañaba al usuario
                              más común (click doble post-confirmación exitosa) que
                              leía "el enlace expiró" cuando en realidad su cuenta
                              ya estaba activa. Un solo mensaje honesto cubre ambos.
                            */}
                            <h1 className="text-xl font-bold text-slate-900 mb-2">
                                {errorKind === 'used_or_expired'
                                    ? 'Este enlace ya no sirve'
                                    : 'No pudimos completar el proceso'}
                            </h1>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                {errorKind === 'used_or_expired'
                                    ? 'Puede que ya lo hayas usado o que haya pasado mucho tiempo. Si ya confirmaste tu cuenta, inicia sesión y listo.'
                                    : errorMsg || 'Por favor intenta de nuevo o contáctanos si el problema persiste.'}
                            </p>
                            <div className="flex flex-col gap-2">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors"
                                >
                                    Iniciar sesión
                                </Link>
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center h-11 px-6 rounded-xl text-slate-700 hover:bg-slate-50 border border-slate-200 font-medium text-sm transition-colors"
                                >
                                    Registrarme de nuevo
                                </Link>
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 mx-auto text-accent-600 animate-spin mb-5" aria-hidden="true" />
                            <h1 className="text-lg font-semibold text-slate-800 mb-1">
                                Confirmando tu cuenta
                            </h1>
                            <p className="text-sm text-slate-500" aria-live="polite">{statusText}</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-accent-50 flex items-center justify-center text-accent-700">
                                <CheckCircle size={36} aria-hidden="true" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                                ¡Listo, tu correo está confirmado!
                            </h1>
                            <p className="text-sm text-slate-600 mb-7 leading-relaxed">
                                {roleContent.subtitle}
                            </p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    href={roleContent.primaryHref}
                                    className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors"
                                >
                                    {roleContent.primaryLabel}
                                </Link>
                                {roleContent.secondaryLabel && roleContent.secondaryHref && (
                                    <Link
                                        href={roleContent.secondaryHref}
                                        className="inline-flex items-center justify-center h-10 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                                    >
                                        {roleContent.secondaryLabel}
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
