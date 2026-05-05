import { useEffect, useRef } from 'react';
import { Shield, ShieldCheck, ShieldX, Clock, X } from 'lucide-react';

type VerificacionEstado = 'sin_enviar' | 'pendiente' | 'aprobado' | 'rechazado';

interface VerificationGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    verificacionEstado: VerificacionEstado;
    verificacionNota?: string | null;
    onGoToVerification: () => void;
}

export default function VerificationGateModal({
    isOpen,
    onClose,
    verificacionEstado,
    verificacionNota,
    onGoToVerification,
}: VerificationGateModalProps) {
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const primaryButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        previousFocusRef.current = document.activeElement as HTMLElement;
        setTimeout(() => primaryButtonRef.current?.focus(), 0);

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'Tab') {
                const focusables = [primaryButtonRef.current, closeButtonRef.current].filter(Boolean) as HTMLElement[];
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

    let icon, iconColor, title, body, primaryLabel, primaryAction;

    if (verificacionEstado === 'pendiente') {
        icon = Clock;
        iconColor = 'text-amber-600 bg-amber-50';
        title = 'Verificación en revisión';
        body = 'Tu verificación está siendo revisada por nuestro equipo. Te avisaremos por email cuando esté lista (24-48h). Mientras tanto, no puedes publicar servicios.';
        primaryLabel = 'Entendido';
        primaryAction = onClose;
    } else if (verificacionEstado === 'rechazado') {
        icon = ShieldX;
        iconColor = 'text-red-600 bg-red-50';
        title = 'Verificación rechazada';
        body = verificacionNota
            ? `Tu verificación fue rechazada: ${verificacionNota}`
            : 'Tu verificación fue rechazada. Revisa tu perfil y reenvía los documentos.';
        primaryLabel = 'Ir a mi perfil';
        primaryAction = onGoToVerification;
    } else {
        // 'sin_enviar' (default)
        icon = Shield;
        iconColor = 'text-emerald-700 bg-emerald-50';
        title = 'Verificá tu identidad para publicar';
        body = 'Para publicar tu primer servicio necesitas verificar tu identidad. Esto incluye tu RUT y una foto de tu carnet (frontal y dorso). Es por seguridad de la plataforma y de quienes contratan tus servicios.';
        primaryLabel = 'Verificar ahora';
        primaryAction = onGoToVerification;
    }

    const Icon = icon;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="verification-gate-title"
                aria-describedby="verification-gate-desc"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between p-5 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
                                <Icon size={20} aria-hidden="true" />
                            </div>
                            <div>
                                <h2 id="verification-gate-title" className="text-base font-bold text-slate-900">
                                    {title}
                                </h2>
                            </div>
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
                        <p id="verification-gate-desc" className="text-sm text-slate-600 leading-relaxed">
                            {body}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
                        {verificacionEstado !== 'pendiente' && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            ref={primaryButtonRef}
                            onClick={primaryAction}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
                        >
                            {primaryLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
