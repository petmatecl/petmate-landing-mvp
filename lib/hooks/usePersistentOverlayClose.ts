// ============================================================================
// lib/hooks/usePersistentOverlayClose.ts
// ----------------------------------------------------------------------------
// Sprint notifs-panel C6 (2026-09-01) — hook común para overlays persistentes
// que viven fuera del árbol de la ruta actual (mounted en `_app.tsx` o
// `Header.tsx` — sobreviven a cambios de ruta con su state local).
//
// Cierra el overlay cuando:
//   1. El user aprieta Escape.
//   2. El user navega a otra ruta (`router.events.routeChangeStart`).
//
// NO cubre el click en backdrop — cada overlay tiene su propio backdrop
// con estilo/z-index distinto (dropdown vs modal vs bottom-sheet), mejor
// lo maneja el caller. Aprobado por PO 2026-09-01 (decisión D7 del sprint).
//
// Motivación (síntoma reportado por PO ronda 1 del sprint): "abro el
// panel de notificaciones, no clickeo nada, navego desde el menú del
// header, y el panel me persigue por el sitio". Causa: NotificationBell y
// FeedbackWidget viven en `_app.tsx` (o Header, mounted persistente) y su
// `isOpen` es state local — al navegar, el componente NO se desmonta,
// entonces `isOpen` sobrevive. Este hook cierra el overlay en cada
// route change para que la navegación no arrastre overlays abiertos.
//
// Consumers actuales (C6):
//   - `components/Shared/NotificationBell.tsx` — vive en `Header.tsx`.
//   - `components/Shared/FeedbackWidget.tsx` — vive en `_app.tsx`
//     dentro de `FeedbackProvider`.
//
// Consumer NO tocado por decisión PO (D7):
//   - `components/Client/NotificationCenter.tsx` — dead code confirmado
//     (grep del import en pages/components solo aparece en el archivo
//     mismo + docs). Item BACKLOG D8 para eliminar en sprint aparte.
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Cierra un overlay persistente cuando el user aprieta Escape o navega
 * a otra ruta. Solo registra listeners cuando `isOpen === true` — cero
 * overhead cuando el overlay está cerrado.
 *
 * @param isOpen  Estado del overlay (state local del caller).
 * @param onClose Callback para cerrar el overlay. **Debe ser estable**
 *                entre renders (envolver en `useCallback` si viene de
 *                un context o closure). Sino el `useEffect` re-registra
 *                listeners en cada render.
 */
export function usePersistentOverlayClose(isOpen: boolean, onClose: () => void): void {
    const router = useRouter();

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);

        // routeChangeStart dispara ANTES del unmount de la ruta anterior —
        // damos oportunidad de cerrar el overlay antes de que la nueva
        // ruta se monte encima. Cubre navegación por Link, router.push,
        // router.replace, botón atrás del browser.
        const handleRouteChange = () => onClose();
        router.events.on('routeChangeStart', handleRouteChange);

        return () => {
            window.removeEventListener('keydown', handleEscape);
            router.events.off('routeChangeStart', handleRouteChange);
        };
    }, [isOpen, onClose, router.events]);
}
