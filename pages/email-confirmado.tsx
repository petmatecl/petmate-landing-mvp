import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../contexts/UserContext";
import { resetInactivityTimer } from "../lib/sessionTimeout";

/**
 * Sprint email-landing loader fix (2026-08-25) — refactor total del handler
 * para eliminar el race condition que dejaba el loader pegado indefinidamente.
 *
 * HISTORIA DEL BUG
 *   Aldo reportó: pantalla "Procesando token..." pegada 60+ segundos post-
 *   click del correo de confirmación. Solo salía con Ctrl+Shift+R, y el
 *   hard refresh mostraba éxito inmediato — o sea la sesión SÍ estaba
 *   hidratada, lo que fallaba era el render. Cero errores console, cero
 *   requests pending. Estado React que quedaba pegado.
 *
 * ROOT CAUSE
 *   El handler viejo declaraba `sessionReady` state que dependía de:
 *   (a) resolución del `setSession(access_token, refresh_token)` sobre el
 *       hash, o (b) evento `SIGNED_IN` capturado por el listener local
 *       `onAuthStateChange`. Supabase JS con `detectSessionInUrl: true`
 *       (default) procesa el hash automáticamente al mount del cliente,
 *       ANTES de que la página monte. El SIGNED_IN se disparaba en ese
 *       instante — el listener local aún no estaba suscrito. Perdía el
 *       evento para siempre. El `setSession()` posterior sobre tokens ya
 *       consumidos por el SDK global podía devolver `{ data: null, error:
 *       null }` silencioso (idempotencia rara de Supabase) y no seteaba
 *       `sessionReady`. Loader pegado indefinido.
 *
 * FIX — DOS PARTES
 *   (a) ELIMINAR `sessionReady`. Es state redundante que depende de events
 *       que se pierden. La señal correcta ya existe en el UserContext:
 *       `user` está poblado ⇔ sesión hidratada. UserContext hidrata por
 *       dos canales (getSession() inicial + SIGNED_IN listener), ambos
 *       inevitables — el listener LOCAL de la página es superfluo. Eliminado.
 *   (b) TIMEOUT DEFENSIVO 4s (kill-switch). Cualquier pantalla de tránsito
 *       que dependa de eventos async debe tener red de seguridad temporal.
 *       Aunque la causa raíz vuelva por otra vía (bump SDK, nueva ruta
 *       OAuth, cache stale), el user siempre sale del limbo en ≤4s con
 *       un CTA manual. Copy del timeout AFIRMA que la cuenta está activa
 *       porque Supabase valida el token server-side ANTES del redirect —
 *       no es una promesa, es un hecho verificado (email_confirmed_at
 *       poblado aunque la pantalla no lo comunicara).
 *
 * 4 ESTADOS DE RENDER MUTUAMENTE EXCLUSIVOS
 *   (1) `errorKind` set → pantalla "Este enlace ya no sirve" con CTAs
 *       login/register. Dispara cuando el URL trae ?error=access_denied
 *       o error_code=otp_expired (link consumido o vencido — Supabase
 *       no los distingue, ambos van al mismo copy).
 *   (2) `hasSomethingToProcess === false` → pantalla "Entra a tu cuenta"
 *       instantánea. Dispara cuando el URL está limpio (bookmark, second
 *       click cuando el fragment ya fue limpiado, navegación directa).
 *       Copy sugerido por PO: habla de la acción del usuario, no de la
 *       mecánica interna de la página.
 *   (3) UserContext aún hidratando (`userLoading || !user`) → loader.
 *       Si a los 4s sigue en (3), avanza a (3b) timeout screen "Tu
 *       cuenta ya está activa" con CTA único "Iniciar sesión".
 *   (4) `user` poblado → pantalla success con detección de rol
 *       (proveedor → CTA con `?abrirServicio=1`, tutor → CTA a /explorar,
 *       huérfano → CTA a /completar-registro).
 *
 * NO REQUIERE cambio de env, config Supabase, ni migration.
 */
export default function EmailConfirmadoPage() {
    const { proveedorRow, hasSeekerProfile, isLoading: userLoading, user } = useUser();

    const [errorKind, setErrorKind] = useState<'used_or_expired' | 'unknown' | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // null = aún no evaluado (primer render antes del effect sync).
    // true = URL trae hash/code/error o sesión previa activa → esperar
    //        UserContext o mostrar error/loader.
    // false = URL "limpia" sin nada que procesar → pantalla directa
    //         "Entra a tu cuenta" sin loader.
    const [hasSomethingToProcess, setHasSomethingToProcess] = useState<boolean | null>(null);

    // Sprint session-timeout fix-de-fix (2026-08-25) — subset explícito
    // de `hasSomethingToProcess === true` que indica AUTENTICACIÓN
    // FRESH desde link (hash con access_token o query code), en oposición
    // a "sesión previa detectada por getSession fallback" o "error en URL".
    // Usado como AND-guard para resetear el marker de inactividad SOLO
    // cuando el user completó auth intencional post-click al link — nunca
    // por re-hidratación de sesión existente ni por aterrizaje mudo.
    // Ver `lib/sessionTimeout.ts` para regla operativa completa.
    const [freshAuthTokenSeen, setFreshAuthTokenSeen] = useState(false);

    // Kill-switch temporal (regla nueva CLAUDE.md 2026-08-25 —
    // pantallas de tránsito async con dependencia externa deben tener
    // red de seguridad temporal). 4s antes de mostrar la salida manual.
    const [timedOut, setTimedOut] = useState(false);

    // Sync check al mount: qué trae la URL. Sin async, sin listeners.
    // Se ejecuta una sola vez, deps vacío.
    useEffect(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        const params = new URLSearchParams(
            hash.startsWith('#') ? hash.slice(1) : (search.startsWith('?') ? search.slice(1) : '')
        );

        const error = params.get('error');
        const errorCode = params.get('error_code');
        const errorDesc = params.get('error_description');

        // Rama 1: error en URL (link consumido/vencido).
        // Supabase no distingue ambos casos — `otp_expired` cubre los dos.
        if (error || errorCode) {
            const desc = errorDesc?.toLowerCase() || '';
            const isUsedOrExpired = errorCode === 'otp_expired'
                || errorCode === 'access_denied'
                || desc.includes('expired')
                || desc.includes('invalid');
            if (isUsedOrExpired) {
                setErrorMsg('El enlace ya no sirve.');
                setErrorKind('used_or_expired');
            } else {
                setErrorMsg(`No pudimos completar la confirmación (${errorCode || error}).`);
                setErrorKind('unknown');
            }
            setHasSomethingToProcess(true);
            return;
        }

        // Rama 2/3: chequear si hay algo que el SDK deba procesar.
        const hasHashToken = hash && hash.includes('access_token');
        const hasCode = new URLSearchParams(search).get('code');
        const hasToken = !!(hasHashToken || hasCode);

        if (hasToken) {
            setHasSomethingToProcess(true);
            setFreshAuthTokenSeen(true);
            return;
        }

        // URL limpia. Puede haber sesión activa por otra tab (chequeo
        // async), o puede no haber nada — en cualquier caso la landing
        // resuelve una vez sabemos el resultado del getSession.
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                setHasSomethingToProcess(!!data?.session);
            } catch {
                setHasSomethingToProcess(false);
            }
        })();
    }, []);

    // Kill-switch temporal — activa a los 4s pase lo que pase.
    useEffect(() => {
        const t = setTimeout(() => setTimedOut(true), 4000);
        return () => clearTimeout(t);
    }, []);

    // Sprint session-timeout fix-de-fix (2026-08-25) — reset del marker
    // de inactividad SOLO si: (a) la URL trajo token fresh (hash o code
    // — no un aterrizaje mudo ni una sesión previa detectada por
    // getSession fallback), Y (b) el user se hidrató exitosamente.
    // Doble-guard: cero disparo por re-hidratación de sesión existente.
    // Cubre exactamente el escenario "signup + 20min al correo + click"
    // sin afectar el timeout de inactividad normal en el resto de la app.
    useEffect(() => {
        if (freshAuthTokenSeen && user) {
            resetInactivityTimer();
        }
    }, [freshAuthTokenSeen, user]);

    // Detección de rol post-hidratación.
    type Rol = 'proveedor' | 'tutor' | 'orphan';
    const rol: Rol | null = user
        ? proveedorRow
            ? 'proveedor'
            : hasSeekerProfile
                ? 'tutor'
                : 'orphan'
        : null;

    // Copy + CTA según rol (preservado del refactor anterior — cero cambio).
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
        return {
            subtitle: 'Tu cuenta quedó activa pero falta un paso para elegir tu rol y completar el perfil.',
            primaryLabel: 'Completar mi registro',
            primaryHref: '/completar-registro',
            secondaryLabel: null,
            secondaryHref: null,
        };
    })();

    // Cálculo del estado terminal (loading vs success) — solo relevante
    // si estamos en "tenemos algo que procesar".
    const isWaitingForSession = hasSomethingToProcess === true && (userLoading || !user);

    return (
        <>
            <Head>
                <title>Correo confirmado — Pawnecta</title>
                <meta name="robots" content="noindex,nofollow" />
            </Head>

            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-accent-50 to-white">
                <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

                    {/* ESTADO 1 — Error en URL. */}
                    {errorKind ? (
                        <div className="text-center">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warning-100 flex items-center justify-center text-warning-700">
                                <AlertTriangle size={28} aria-hidden="true" />
                            </div>
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
                    )
                    /* ESTADO 2 — URL "limpia" sin nada que procesar
                       (bookmark, navegación directa, second click con hash
                       ya limpiado). Copy PO 2026-08-25: habla de la acción
                       del usuario, no de la mecánica interna. */
                    : hasSomethingToProcess === false ? (
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-slate-900 mb-2">
                                Entra a tu cuenta
                            </h1>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                No hay nada que confirmar acá. Si ya confirmaste tu correo, inicia sesión. Si todavía no tienes cuenta, regístrate.
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
                                    Registrarme
                                </Link>
                            </div>
                        </div>
                    )
                    /* ESTADO 3b — Timeout defensivo. UserContext no hidrató
                       en 4s pero sabemos que Supabase valida el token
                       server-side antes del redirect (email_confirmed_at
                       poblado). Copy afirma en vez de dudar. */
                    : isWaitingForSession && timedOut ? (
                        <div className="text-center">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-accent-50 flex items-center justify-center text-accent-700">
                                <CheckCircle size={28} aria-hidden="true" />
                            </div>
                            <h1 className="text-xl font-bold text-slate-900 mb-2">
                                Tu cuenta ya está activa
                            </h1>
                            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                                Esta pantalla se demoró más de lo normal, pero tu correo quedó confirmado. Inicia sesión para entrar a tu panel.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-accent-600 hover:bg-accent-700 text-white font-semibold text-sm transition-colors w-full"
                            >
                                Iniciar sesión
                            </Link>
                        </div>
                    )
                    /* ESTADO 3a — Loading (< 4s). */
                    : isWaitingForSession ? (
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 mx-auto text-accent-600 animate-spin mb-5" aria-hidden="true" />
                            <h1 className="text-lg font-semibold text-slate-800 mb-1">
                                Confirmando tu cuenta
                            </h1>
                            <p className="text-sm text-slate-500" aria-live="polite">
                                Un segundo...
                            </p>
                        </div>
                    )
                    /* ESTADO 4 — Success con rol. */
                    : (
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
