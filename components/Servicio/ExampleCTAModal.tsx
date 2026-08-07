import { useRef } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useModalDialog } from '../../lib/useModalDialog';

export type ExampleAction = 'mensaje' | 'whatsapp' | 'llamar' | 'evaluar' | 'pregunta' | 'favorito' | 'agendamiento';

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
    favorito: 'guardar en favoritos',
    agendamiento: 'reservar el servicio',
};

export default function ExampleCTAModal({ isOpen, onClose, action }: ExampleCTAModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const primaryCTARef = useRef<HTMLAnchorElement>(null);

    // Sweep #2 M1 (2026-08-07): initialFocusRef restaurado al primary CTA
    // ("Registrarme como tutor"). Antes de M1, el hook focuseaba el primer
    // tabbable (close-X) en vez del primary CTA — regresión de la migración
    // a useModalDialog. Screen readers anunciaban "Cerrar" al abrir;
    // keyboard user Enter dismiss en vez de convertir signup.
    useModalDialog({ isOpen, onClose, containerRef, initialFocusRef: primaryCTARef });

    if (!isOpen) return null;

    const actionText = action ? ACTION_TEXT[action] : 'contactar a un proveedor';

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
            <div
                ref={containerRef}
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
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-50 text-accent-700">
                                <Sparkles size={20} aria-hidden="true" />
                            </div>
                            <h2 id="example-cta-title" className="text-base font-semibold text-slate-900 mt-2">
                                Esta es una vista de ejemplo
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
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
                            className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-700 transition-colors"
                        >
                            Registrarme como tutor
                        </Link>
                        <Link
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
