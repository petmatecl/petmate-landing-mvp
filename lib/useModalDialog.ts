import { useEffect, useRef } from 'react';

// Sweep #2 finding [82]: hook compartido para modales tipo dialog. Aplica
// el patron canonico de ExampleCTAModal.tsx a los modales grandes
// (SolicitarAgendamientoModal, ServiceFormModal) sin duplicar codigo:
//
//   - Escape cierra el dialog (llamando `onClose`), silenciado durante
//     `blockClose` (submit en vuelo).
//   - Focus trap: Tab / Shift+Tab ciclan entre el primer y ultimo elemento
//     tabeable del container. Elementos disabled quedan afuera.
//   - Foco inicial: al primer elemento tabeable (o al container si no hay
//     ninguno) al abrir. Sin salto brusco — usa setTimeout(0).
//   - Return focus: al cerrar, restaura el foco al elemento que lo tenia
//     antes de abrir el modal.
//
// El caller sigue siendo responsable de:
//   - Setear `role="dialog"`, `aria-modal="true"`, `aria-labelledby` en el
//     wrapper.
//   - Pasar `containerRef` al wrapper.
//   - Detectar isOpen y no renderear el modal cuando esta cerrado (el hook
//     igual limpia listeners si el open cambia).

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useModalDialog<T extends HTMLElement>(opts: {
    isOpen: boolean;
    onClose: () => void;
    blockClose?: boolean;   // true durante submit — Escape queda no-op
    containerRef: React.RefObject<T | null>;
    /**
     * Sweep #2 M1 (2026-08-07 — Auditoría #2 finding). Ref al elemento que
     * debe recibir focus al abrir el dialog. Si se omite, cae al primer
     * tabbable del container (comportamiento previo). Los 3 modales críticos
     * de conversión / decisión (ExampleCTAModal, VerificationGateModal,
     * SitterDetailModal) DEBEN pasarlo apuntando al primary CTA — antes de
     * la migración a este hook, cada uno usaba refs explícitos que la
     * migración eliminó, con la regresión de que el focus caía al close-X
     * (primer tabbable DOM). Screen readers anunciaban "Cerrar" al abrir;
     * keyboard user Enter DISMISS el modal en vez de convertir.
     */
    initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
    const { isOpen, onClose, blockClose = false, containerRef, initialFocusRef } = opts;
    // onClose y blockClose cambian entre renders. Guardamos en refs para que
    // el listener siempre lea el valor actual sin re-registrarse (evita
    // remontar el efecto en cada render y perder el trap+foco).
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const blockCloseRef = useRef(blockClose);
    blockCloseRef.current = blockClose;

    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const container = containerRef.current;
        if (!container) return;

        previousFocusRef.current = document.activeElement as HTMLElement;

        // Foco inicial. Prioridad: initialFocusRef explícito > primer tabbable
        // del container > container mismo (tabindex=-1). Sweep #2 M1: los
        // modales de conversión / decisión pasan initialFocusRef al primary
        // CTA para no perder la señal de intent al usuario keyboard/AT.
        const focusInitial = () => {
            const explicitTarget = initialFocusRef?.current;
            if (explicitTarget && typeof explicitTarget.focus === 'function') {
                explicitTarget.focus();
                return;
            }
            const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            if (focusables.length > 0) {
                focusables[0].focus();
            } else {
                container.setAttribute('tabindex', '-1');
                container.focus();
            }
        };
        const focusTimer = setTimeout(focusInitial, 0);

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !blockCloseRef.current) {
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab') return;

            // Re-query cada Tab porque el modal puede tener campos que
            // aparecen/desaparecen (branches por variante, campos disabled
            // por loading, etc). Query es barata.
            const focusables = Array.from(
                container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            ).filter(el => el.offsetParent !== null || el === document.activeElement);
            if (focusables.length === 0) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            } else if (active && !container.contains(active)) {
                // Foco escapo del container (ej. por click en tab de browser
                // que devuelve foco a body). Traelo de vuelta al primer
                // focusable interno.
                e.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKey);

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKey);
            previousFocusRef.current?.focus?.();
        };
    }, [isOpen, containerRef, initialFocusRef]);
}
