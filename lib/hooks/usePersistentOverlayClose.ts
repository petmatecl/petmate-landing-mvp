// ============================================================================
// lib/hooks/usePersistentOverlayClose.ts
// ----------------------------------------------------------------------------
// Sprint notifs-panel C6 + C7b (2026-09-01) — hook común para overlays
// persistentes que viven fuera del árbol de la ruta actual (mounted en
// `_app.tsx` o `Header.tsx` — sobreviven a cambios de ruta con su state
// local).
//
// Cierra el overlay cuando:
//   1. El user aprieta Escape.
//   2. El user navega a otra ruta (`router.events.routeChangeStart`).
//   3. Otro overlay se abre (C7b — event bus custom `overlay:open`).
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
// SOBRE C7b Y LA REGLA P10 DE CLAUDE.md:
//   P10 dice "no construir lógica sobre eventos del SDK cuya semántica
//   no esté garantizada por contrato". El event bus de C7b NO viola esa
//   regla porque el emisor Y el receptor son NUESTROS (el helper
//   `dispatchOverlayOpen()` acá + este mismo hook). Cero SDK involucrado,
//   cero semántica externa. Es exactamente el patrón "generar tu propia
//   señal desde acción intencional del usuario" que la regla recomienda
//   como antídoto — el overlay dispatchea cuando el user lo abre
//   deliberadamente. Anotado para futuros lectores que vean "event bus"
//   y sospechen del patrón.
//
// Consumers actuales:
//   - `components/Shared/NotificationBell.tsx` — vive en `Header.tsx`.
//     id: 'notifs'.
//   - `components/Shared/FeedbackWidget.tsx` — vive en `_app.tsx` dentro
//     de `FeedbackProvider`. id: 'feedback'.
//
// Consumer NO tocado por decisión PO (D7):
//   - `components/Client/NotificationCenter.tsx` — dead code confirmado
//     (grep del import en pages/components solo aparece en el archivo
//     mismo + docs). Item BACKLOG D8 para eliminar en sprint aparte.
// ============================================================================

import { useEffect } from 'react';
import { useRouter } from 'next/router';

const OVERLAY_OPEN_EVENT = 'pawnecta:overlay-open';

/**
 * Dispatchea al bus custom que un overlay se abrió. Cualquier otro overlay
 * registrado con `usePersistentOverlayClose(_, _, otroId)` se cierra al
 * recibir el event con `detail.id !== otroId`. Llamar SOLO desde la acción
 * intencional del user que abre el overlay (onClick del trigger, o dentro
 * del setTimeout(open, 0) para no colisionar con re-renders).
 *
 * Namespace `pawnecta:` en el event name para no colisionar con otros
 * emitters (analytics, extensions, etc.).
 */
export function dispatchOverlayOpen(id: string): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(OVERLAY_OPEN_EVENT, { detail: { id } }));
}

/**
 * Cierra un overlay persistente cuando el user aprieta Escape, navega a
 * otra ruta, o abre otro overlay. Solo registra listeners cuando
 * `isOpen === true` — cero overhead cuando el overlay está cerrado.
 *
 * @param isOpen  Estado del overlay (state local del caller).
 * @param onClose Callback para cerrar el overlay. **Debe ser estable**
 *                entre renders (envolver en `useCallback` si viene de
 *                un context o closure). Sino el `useEffect` re-registra
 *                listeners en cada render.
 * @param id      Identificador único del overlay (por ejemplo 'notifs',
 *                'feedback'). Opcional. Si se pasa, el hook cierra el
 *                overlay cuando OTRO overlay dispatcha `overlay:open`
 *                con un id distinto. Sin id, cero suscripción al bus.
 */
export function usePersistentOverlayClose(isOpen: boolean, onClose: () => void, id?: string): void {
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

        // C7b — cerrar si otro overlay se abrió. Solo si el caller pasó id
        // (si no, el overlay no participa del bus de exclusión mutua).
        let handleOverlayOpen: ((e: Event) => void) | null = null;
        if (id) {
            handleOverlayOpen = (e: Event) => {
                const detail = (e as CustomEvent).detail;
                if (detail?.id && detail.id !== id) onClose();
            };
            window.addEventListener(OVERLAY_OPEN_EVENT, handleOverlayOpen);
        }

        return () => {
            window.removeEventListener('keydown', handleEscape);
            router.events.off('routeChangeStart', handleRouteChange);
            if (handleOverlayOpen) {
                window.removeEventListener(OVERLAY_OPEN_EVENT, handleOverlayOpen);
            }
        };
    }, [isOpen, onClose, router.events, id]);
}
