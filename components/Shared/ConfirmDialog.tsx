import React from 'react';

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

export default function ConfirmDialog({
    open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
    variant = 'default', loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 mb-6">{message}</p>
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
