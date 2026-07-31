import React, { useId, useRef } from 'react';
import { useModalDialog } from '../lib/useModalDialog';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'error' | 'warning' | 'success' | 'info';
};

// ZB1 sprint ZONAB-1 (2026-07-31): migrado al patrón canónico —
// useModalDialog + role="dialog" + aria-modal + aria-labelledby/describedby.
// Antes no tenía nada de accesibilidad de dialog.
export default function ModalAlert({ isOpen, onClose, title, message, type = 'warning' }: Props) {
    const titleId = useId();
    const messageId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    useModalDialog({ isOpen, onClose, containerRef });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 p-6 text-center animate-in fade-in zoom-in duration-200"
            >
                {/* Tokens semanticos alineados con el sistema:
                    error   → danger  (mismo hex que red, cero cambio visual)
                    warning → warning (amber; antes orange, cambio visual chico: naranja → ambar)
                    success → success (emerald; antes green Tailwind default, cambio visual chico)
                    info    → info    (blue, mismo hex, cero cambio visual)
                   El cambio visual es aceptable: alinea las variantes de este modal
                   con el resto del sistema semantico. */}
                <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4 ${type === 'error' ? 'bg-danger-100 text-danger-600' :
                    type === 'warning' ? 'bg-warning-100 text-warning-600' :
                        type === 'success' ? 'bg-success-100 text-success-600' :
                            'bg-info-100 text-info-600'
                    }`}>
                    {type === 'error' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
                    {type === 'warning' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>}
                    {type === 'success' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                    {type === 'info' && <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12v-.008z" /></svg>}
                </div>

                <h3 id={titleId} className="text-lg font-semibold text-slate-900 tracking-tight mb-2">
                    {title}
                </h3>
                <p id={messageId} className="text-sm text-slate-500 mb-6">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    className="w-full inline-flex justify-center rounded-xl bg-accent-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
                >
                    Entendido
                </button>
            </div>
        </div>
    );
}
