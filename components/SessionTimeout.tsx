import { useEffect } from "react";
import { useRouter } from "next/router";
import * as Sentry from "@sentry/nextjs";
import { supabase } from "../lib/supabaseClient";
import { isAuthTransitRoute } from "../lib/authTransitRoutes";

/**
 * Guard global de inactividad de sesión — monta en `_app.tsx`, corre en
 * TODAS las rutas (con excepciones documentadas abajo). Cierra la sesión
 * del usuario si no hay actividad detectable (mouse/keyboard/scroll/touch)
 * durante 10 minutos.
 *
 * Sprint email-landing session-timeout fix (2026-08-25) — 3 fixes en el
 * mismo commit tras diagnóstico de un bug crítico destapado por el fix
 * del loader (commit c8296a1):
 *
 *   (1) EXCLUSIÓN DE RUTAS DE TRÁNSITO AUTH. Antes el guard corría en
 *       toda ruta sin excepción. Cuando el user aterrizaba en
 *       `/email-confirmado` con un link recién generado, el
 *       `checkInactivityOnMount` leía un marker viejo del localStorage
 *       (de una sesión anterior del mismo browser, o de un signup >10min
 *       atrás donde el user se distrajo y volvió al correo), disparaba
 *       `handleLogout()` y expulsaba al usuario recién autenticado con
 *       copy "cerramos sesión por inactividad" — 29 segundos post-signup
 *       en el caso reportado. Fix: si `router.pathname` está en
 *       `AUTH_TRANSIT_ROUTES`, cero listener, cero timer, cero chequeo.
 *       El user está estableciendo/cerrando sesión — cualquier chequeo
 *       de inactividad ahí es contraproducente.
 *
 *   (2) SUBSCRIBE A `SIGNED_IN` PARA RESETEAR MARKER. El marker
 *       `pawnecta_last_activity` solo se actualizaba con eventos de
 *       interacción del user (mousedown, mousemove, keydown, scroll,
 *       touchstart). Un user que se registra y no toca el browser
 *       (se va al correo, hace click en el link 20 min después)
 *       vuelve con el marker viejo → expulsión aunque acabe de crear
 *       sesión. Fix: `onAuthStateChange` subscribe → en SIGNED_IN,
 *       resetear el marker a NOW. Cualquier autenticación (signup,
 *       login, confirmación de correo, magic link) reinicia el reloj.
 *
 *   (3) CATCH NO-EXPULSIVO. El catch de `getSession()` L44 (pre-fix)
 *       hacía `window.location.href = "/security-logout"` INCONDICIONAL
 *       ante cualquier throw. Un error de red transitorio expulsaba al
 *       usuario con copy que afirmaba "inactividad" — causa inferida
 *       falsa (regla nueva CLAUDE.md 2026-08-25: pantalla de estado
 *       no afirma causa que no verificó). Fix: log a Sentry + return
 *       silente. El próximo tick del check puede volver a intentar.
 *       Si el error persiste, el marker sigue avanzando y la lógica
 *       normal de expiración eventualmente aplica.
 */
export default function SessionTimeout() {
    const router = useRouter();
    const STORAGE_KEY = 'pawnecta_last_activity';

    useEffect(() => {
        // Fix (1): early exit en rutas de tránsito auth. Cero listener,
        // cero timer. El user está estableciendo/cerrando sesión.
        if (isAuthTransitRoute(router.pathname)) {
            return;
        }

        const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos
        let timeoutId: NodeJS.Timeout;

        const checkInactivityOnMount = async () => {
            const lastActivity = localStorage.getItem(STORAGE_KEY);
            if (lastActivity) {
                const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
                if (timeSinceLastActivity > INACTIVITY_LIMIT_MS) {
                    console.log("Sesión expirada detectada al inicio (persistencia).");
                    await handleLogout();
                    return true; // Expiró
                }
            }
            return false; // No expiró o no había registro
        };

        const handleLogout = async () => {
            try {
                // Verificar si hay sesión activa antes de intentar cerrar
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    console.log("Cerrando sesión por inactividad...");
                    await supabase.auth.signOut().catch((err) => {
                        console.error("Error al cerrar sesión (timeout):", err);
                    });
                    // Limpiar almacenamiento local
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.href = "/security-logout";
                } else {
                    // Si no hay sesión pero estamos aquí, limpiamos y redirigimos por si acaso
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch (error) {
                // Fix (3): CATCH NO-EXPULSIVO. Un throw de getSession()
                // (network transient, timing, cualquier cosa) NO debe
                // expulsar al user con copy falso de "inactividad". Log
                // a Sentry para diagnóstico y return silente. La lógica
                // normal (marker de localStorage) sigue avanzando; si la
                // inactividad real supera el umbral, el próximo tick del
                // timer expulsa correctamente.
                console.error("Error verificando sesión en timeout (no expulsivo):", error);
                Sentry.captureException(error, {
                    tags: { component: 'SessionTimeout', phase: 'handleLogout.getSession' },
                });
            }
        };

        const resetTimer = () => {
            // Actualizar timestamp en localStorage
            localStorage.setItem(STORAGE_KEY, Date.now().toString());

            // Limpiar timeout previo
            if (timeoutId) clearTimeout(timeoutId);

            // Configurar nuevo timeout
            timeoutId = setTimeout(async () => {
                await handleLogout();
            }, INACTIVITY_LIMIT_MS);
        };

        const init = async () => {
            const expired = await checkInactivityOnMount();
            if (!expired) {
                resetTimer(); // Iniciar timer si no ha expirado
            }
        };

        // Eventos a monitorear (interacción del user)
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        // Agregar listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Fix (2): subscribe a SIGNED_IN para resetear el marker cuando
        // el user se autentica (signup, login, confirmación de correo,
        // magic link). Sin este subscribe, un user que hace signup y
        // luego click al link del correo 20 min después vuelve con
        // marker viejo → expulsión aunque la sesión sea nueva.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                resetTimer();
            }
        });

        // Iniciar
        init();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.pathname]);

    return null; // Componente sin UI visible
}
