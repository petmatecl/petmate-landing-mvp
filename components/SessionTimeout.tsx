import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function SessionTimeout() {
    const router = useRouter();
    const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            // Limpiar timeout previo
            if (timeoutId) clearTimeout(timeoutId);

            // Configurar nuevo timeout
            timeoutId = setTimeout(async () => {
                // Verificar si hay sesión activa antes de intentar cerrar
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        console.log("Cerrando sesión por inactividad...");
                        // Intentamos cerrar sesión en Supabase
                        await supabase.auth.signOut().catch((err) => {
                            console.error("Error al cerrar sesión (timeout):", err);
                        });

                        // Forzamos la redirección con window.location para asegurar limpieza total
                        window.location.href = "/security-logout";
                    }
                } catch (error) {
                    console.error("Error verificando sesión en timeout:", error);
                    // Ante la duda, si falló verificar sesión pero saltó el timeout, redirigimos igual
                    window.location.href = "/security-logout";
                }
            }, INACTIVITY_LIMIT_MS);
        };

        // Eventos a monitorear
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];

        // Agregar listeners
        events.forEach((event) => {
            window.addEventListener(event, resetTimer);
        });

        // Iniciar timer
        resetTimer();

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
