import React, { useId, useRef } from 'react';
import { useModalDialog } from '../../lib/useModalDialog';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /**
     * Estilo del boton confirmar:
     *   - default: slate-900 (neutro protector, ej. pausar).
     *   - danger: danger-600 (destructivo, ej. eliminar).
     *   - accent: accent-600 (accion positiva/publica, ej. activar).
     */
    variant?: 'default' | 'danger' | 'accent';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const CONFIRM_BTN_VARIANTS: Record<NonNullable<ConfirmDialogProps['variant']>, string> = {
    default: 'bg-slate-900 hover:bg-slate-800 text-white',
    danger: 'bg-danger-600 hover:bg-danger-700 text-white',
    accent: 'bg-accent-600 hover:bg-accent-700 text-white',
};

// Sweep #2 findings [78+78]: cascada a los 9 usos de ConfirmDialog. Se
// agrego role="dialog" + aria-modal + aria-labelledby (id en el <h3>);
// focus trap entre los dos botones + Escape cierra (silenciado durante
// loading); backdrop-click no cierra durante loading (evita perder la
// señal visual mientras un POST esta en vuelo); restauracion de foco al
// elemento previo al cerrar. Default `cancelLabel` cambio a 'Volver' —
// evita la ambigüedad "Cancelar-Cancelar" cuando la accion confirmada
// tambien es una cancelacion (ej. dialog "Cancelar estadia").
export default function ConfirmDialog({
    open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Volver',
    variant = 'default', loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
    const titleId = useId();
    const messageId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    // ZB1 sprint ZONAB-1 (2026-07-31): migrado a `useModalDialog` (patrón
    // canónico ya probado en SolicitarAgendamientoModal + ServiceFormModal).
    // Antes tenía lógica propia de focus-trap/Escape/return-focus en
    // useEffect (~55 líneas duplicadas del hook). Comportamiento equivalente
    // (Escape silenciado durante loading via blockClose, return-focus al
    // cerrar), pero delegado al hook. El hook enfoca el primer tabeable
    // (que es el botón Cancel por orden del DOM), matcheando el default
    // seguro para dialogs destructivos que ya teníamos.
    useModalDialog({
        isOpen: open,
        onClose: onCancel,
        blockClose: loading,
        containerRef,
    });

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={loading ? undefined : onCancel}
                aria-hidden="true"
            />
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
                className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            >
                <h3 id={titleId} className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p id={messageId} className="text-sm text-slate-500 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 ${CONFIRM_BTN_VARIANTS[variant]}`}
                    >
                        {loading ? 'Procesando...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
