import { useRef } from 'react';
import { Shield, ShieldCheck, ShieldX, Clock, X } from 'lucide-react';
import { useModalDialog } from '../../lib/useModalDialog';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const primaryButtonRef = useRef<HTMLButtonElement>(null);

    // Sweep #2 M1 (2026-08-07): initialFocusRef restaurado al primary CTA
    // ("Verificar ahora" / "Ir a mi perfil" / "Entendido"). Antes de M1 el
    // hook focuseaba el close-X (primer tabbable) — screen readers anunciaban
    // "Cerrar" al abrir; keyboard user Enter dismiss en vez de navegar al
    // flow de verificación (que era todo el punto del gate).
    // ZB1 sprint ZONAB-1: migrado a useModalDialog. Comportamiento
    // equivalente (Escape cierra, focus-trap, return-focus).
    useModalDialog({ isOpen, onClose, containerRef, initialFocusRef: primaryButtonRef });

    if (!isOpen) return null;

    let icon, iconColor, title, body, primaryLabel, primaryAction;

    // Sprint badge-f1 (2026-08-18) — verificación opcional con badge de
    // confianza. Todos los branches son ahora invitaciones descartables
    // (excepto 'pendiente' que reporta estado sin acción). Copy alineado
    // con el badge unificado "Identidad verificada" que aterriza en F2.
    if (verificacionEstado === 'pendiente') {
        icon = Clock;
        iconColor = 'text-warning-600 bg-warning-50';
        title = 'Verificación en revisión';
        // Merge conflict resuelto 2026-08-18: HEAD (badge-f1) mantiene
        // "puedes seguir publicando" porque F1 quita el gate; main
        // (orphan-fix) decía "no puedes publicar" cuando aún había gate
        // pre-F1. Post-merge de badge-f1 a main, el gate ya no existe.
        body = 'Tu verificación está siendo revisada por nuestro equipo. Te avisamos por correo apenas esté lista. Mientras tanto puedes seguir publicando servicios y recibiendo consultas normalmente.';
        primaryLabel = 'Entendido';
        primaryAction = onClose;
    } else if (verificacionEstado === 'rechazado') {
        icon = ShieldX;
        iconColor = 'text-danger-600 bg-danger-50';
        title = 'Verificación rechazada';
        body = verificacionNota
            ? `Tu verificación fue rechazada: ${verificacionNota}. Puedes reenviar los documentos desde tu perfil cuando quieras.`
            : 'Tu verificación fue rechazada. Puedes reenviar los documentos desde tu perfil cuando quieras.';
        primaryLabel = 'Ir a mi perfil';
        primaryAction = onGoToVerification;
    } else {
        // 'sin_enviar' (default) — invitación descartable, no bloqueante.
        icon = Shield;
        iconColor = 'text-accent-600 bg-accent-50';
        title = 'Verifica tu identidad y gana el badge';
        body = 'Los proveedores con identidad verificada aparecen destacados en las búsquedas y generan más confianza en los tutores. Solo necesitas subir una foto de tu carnet (frontal y dorso) desde tu perfil — toma menos de dos minutos.';
        primaryLabel = 'Verificar ahora';
        primaryAction = onGoToVerification;
    }

    const Icon = icon;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
            <div
                ref={containerRef}
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
                                <h2 id="verification-gate-title" className="text-base font-semibold text-slate-900">
                                    {title}
                                </h2>
                            </div>
                        </div>
                        <button
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
                                {verificacionEstado === 'sin_enviar' ? 'Más tarde' : 'Cancelar'}
                            </button>
                        )}
                        <button
                            ref={primaryButtonRef}
                            onClick={primaryAction}
                            className="px-4 py-2 text-sm font-semibold text-white bg-accent-600 rounded-xl hover:bg-accent-700 transition-colors"
                        >
                            {primaryLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
