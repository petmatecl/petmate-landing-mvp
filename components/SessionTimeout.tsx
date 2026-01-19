import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function SessionTimeout() {
    const router = useRouter();
    const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos
    const STORAGE_KEY = 'pawnecta_last_activity';

    useEffect(() => {
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
                console.error("Error verificando sesión en timeout:", error);
                window.location.href = "/security-logout";
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

        // Eventos a monitorear
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        // Agregar listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Iniciar
        init();

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [router]);

    return null; // Componente sin UI visible
}
