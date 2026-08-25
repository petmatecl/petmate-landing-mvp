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
 *   (2) [REVERT 2026-08-25] SUBSCRIBE A `SIGNED_IN` PARA RESETEAR
 *       MARKER — DESACTIVADO. La versión original de este fix reseteaba
 *       el marker en el event `SIGNED_IN` de `onAuthStateChange`,
 *       asumiendo que solo dispararía en login genuino. Supabase JS
 *       v2.84 también dispara SIGNED_IN en cada F5 con sesión activa
 *       (refresh silente al mount) — cada carga de página reseteaba
 *       el marker, y el timeout de inactividad quedó desactivado en
 *       toda la app. PO detectó con smoke específico (positivo conocido).
 *       El objetivo original era legítimo (reset post autenticación
 *       intencional para cubrir "signup + 20min + click en correo"),
 *       pero el mecanismo (event del SDK) es frágil por semántica no
 *       garantizada por contrato. REEMPLAZADO por:
 *       `lib/sessionTimeout.ts resetInactivityTimer()` llamado desde
 *       4 puntos de INTENCIÓN EXPLÍCITA del usuario (login submit,
 *       register submit, confirmación de correo con token fresh en URL,
 *       complete-registration submit). Cero dependencia de events del
 *       SDK. Ver `lib/sessionTimeout.ts` para historia completa y
 *       `CLAUDE.md > "No construir lógica de sesión sobre eventos del
 *       SDK cuya semántica no esté garantizada por contrato"` para la
 *       regla operativa que motivó el diseño nuevo.
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

        // Fix (2) REVERTIDO 2026-08-25 — ver comentario ampliado arriba.
        // Reemplazado por lib/sessionTimeout.ts resetInactivityTimer()
        // llamado desde puntos de intención explícita del usuario, no
        // desde events del SDK cuya semántica no está garantizada por
        // contrato.

        // Iniciar
        init();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.pathname]);

    return null; // Componente sin UI visible
}
