import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Sprint admin-visibilidad (2026-08-27) — FeedbackContext.
 *
 * Extrae el estado `open` del `FeedbackWidget` a un context global para que
 * cualquier superficie de la app pueda dispararlo. Motivación inmediata: el
 * copy nuevo de la franja lanzamiento en `components/Header.tsx` incluye un
 * CTA "cuéntanos" que debe abrir el widget de feedback existente sin
 * navegación. Sin este context, el `open` local del widget no es alcanzable
 * desde afuera.
 *
 * Diseño operativo:
 *   - `isOpen` boolean único. El widget consume el hook y renderiza panel
 *     cuando isOpen=true, trigger flotante cuando false.
 *   - `open()` / `close()` idempotentes. Múltiples calls a open() cuando
 *     ya está abierto son no-op.
 *   - Sin refs, sin event bus custom. Patrón idiomático React que se puede
 *     testear con mock del provider.
 *
 * Trade-off vs `window.dispatchEvent`: 20 líneas más de código, pero la
 * próxima superficie que quiera abrir el widget (footer, CTAs de landing,
 * empty states) solo consume `useFeedback()` — cero conocimiento de eventos
 * globales, cero riesgo de listener leaks.
 *
 * Wrapper vive en `pages/_app.tsx` envolviendo el árbol (dentro del
 * UserContextProvider — orden irrelevante, no dependen entre sí).
 */

type FeedbackContextValue = {
    isOpen: boolean;
    open: () => void;
    close: () => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);

    const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

    return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

/**
 * Hook para consumir el context. Throw si se llama fuera del provider —
 * exactamente el mismo patrón que useUser() en UserContext, tratamos como
 * error de programador (nunca debería pasar en un árbol correcto).
 */
export function useFeedback(): FeedbackContextValue {
    const ctx = useContext(FeedbackContext);
    if (!ctx) {
        throw new Error('useFeedback debe usarse dentro de <FeedbackProvider>');
    }
    return ctx;
}
