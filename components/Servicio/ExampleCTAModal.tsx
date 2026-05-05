import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';

export type ExampleAction = 'mensaje' | 'whatsapp' | 'llamar' | 'evaluar' | 'pregunta';

interface ExampleCTAModalProps {
    isOpen: boolean;
    onClose: () => void;
    action?: ExampleAction;
}

const ACTION_TEXT: Record<ExampleAction, string> = {
    mensaje: 'enviar un mensaje',
    whatsapp: 'contactar por WhatsApp',
    llamar: 'llamar',
    evaluar: 'dejar una reseña',
    pregunta: 'hacer una pregunta',
};

export default function ExampleCTAModal({ isOpen, onClose, action }: ExampleCTAModalProps) {
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const primaryCTARef = useRef<HTMLAnchorElement>(null);
    const secondaryCTARef = useRef<HTMLAnchorElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        previousFocusRef.current = document.activeElement as HTMLElement;
        setTimeout(() => primaryCTARef.current?.focus(), 0);

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Tab') {
                const focusables = [primaryCTARef.current, secondaryCTARef.current, closeButtonRef.current].filter(Boolean) as HTMLElement[];
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
            previousFocusRef.current?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const actionText = action ? ACTION_TEXT[action] : 'contactar a un proveedor';

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="example-cta-title"
                aria-describedby="example-cta-desc"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between p-5 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-700">
                                <Sparkles size={20} aria-hidden="true" />
                            </div>
                            <h2 id="example-cta-title" className="text-base font-bold text-slate-900 mt-2">
                                Esta es una vista de ejemplo
                            </h2>
                        </div>
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4">
                        <p id="example-cta-desc" className="text-sm text-slate-600 leading-relaxed">
                            Para {actionText} con un proveedor real necesitas registrarte en Pawnecta. Es gratis y tarda menos de un minuto.
                        </p>
                    </div>

                    {/* CTAs apilados */}
                    <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2">
                        <Link
                            ref={primaryCTARef}
                            href="/register?rol=usuario"
                            className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
                        >
                            Registrarme como tutor
                        </Link>
                        <Link
                            ref={secondaryCTARef}
                            href="/register?rol=proveedor"
                            className="text-center px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Soy proveedor, quiero publicar
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
