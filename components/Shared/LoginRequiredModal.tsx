import React, { useEffect, useId, useRef } from 'react';
import { useRouter } from 'next/router';
import { useModalDialog } from '../../lib/useModalDialog';
import { trackEvent } from '../../lib/gtag';
import Button from '../UI/Button';

interface LoginRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message?: string;
    // Sprint ANALYTICS-FUNNEL-TUTOR (2026-11-23): intento del usuario que
    // disparó el gate. Permite medir drop por tipo de acción intencionada.
    actionIntent?: 'contacto' | 'reserva' | 'favorito' | 'otro';
    // Sprint ANALYTICS-FUNNEL-TUTOR: id del servicio origen (si aplica).
    // Opcional; sin él, solo medimos el gate sin contexto.
    sourceServiceId?: string;
}

// ZB1 sprint ZONAB-1 (2026-07-31): migrado al patrón canónico —
// useModalDialog + role="dialog" + aria-modal + aria-labelledby/describedby.
// Antes no tenía nada de accesibilidad de dialog.
export default function LoginRequiredModal({
    isOpen,
    onClose,
    title = "Inicia sesión para continuar",
    message = "Necesitas una cuenta para enviar mensajes o dejar una evaluación.",
    actionIntent = 'otro',
    sourceServiceId,
}: LoginRequiredModalProps) {
    const router = useRouter();
    const titleId = useId();
    const messageId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    useModalDialog({ isOpen, onClose, containerRef });

    // Sprint ANALYTICS-FUNNEL-TUTOR (2026-11-23): gate_login_mostrado — fire
    // al mostrar el modal. Un evento por apertura; cerrar + reabrir dispara
    // 2 events (intencional: medir fricción repetida).
    useEffect(() => {
        if (!isOpen) return;
        trackEvent('gate_login_mostrado', {
            action_intent: actionIntent,
            ...(sourceServiceId ? { source_service_id: sourceServiceId } : {}),
        });
    }, [isOpen, actionIntent, sourceServiceId]);

    // Sprint ANALYTICS-FUNNEL-TUTOR (2026-11-23): gate_login_eleccion helper
    // disparado desde cada handler del modal con el `choice` correspondiente.
    const fireEleccion = (choice: 'iniciar_sesion' | 'registrarse' | 'cerrar') => {
        trackEvent('gate_login_eleccion', { choice });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
                className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
            >
                <button
                    onClick={() => { fireEleccion('cerrar'); onClose(); }}
                    aria-label="Cerrar"
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-600 transition-colors"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>

                <div className="w-16 h-16 bg-accent-100 text-accent-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>

                <h2 id={titleId} className="text-xl font-semibold text-center text-slate-900 tracking-tight mb-2">
                    {title}
                </h2>

                <p id={messageId} className="text-slate-600 text-center mb-6">
                    {message}
                </p>

                <div className="flex flex-col gap-3">
                    {/*
                     * BUTTON-CANON batch bloque-j-2-b2 (2026-09-21):
                     * migrado al componente `<Button>` con `size="modal-cta"`
                     * (legacy size, ver components/UI/Button.tsx JSDoc). El
                     * className renderizado matchea exact al ad-hoc previo:
                     * `bg-accent-600 hover:bg-accent-700 text-white
                     * font-medium tracking-wide px-4 py-3 text-sm rounded-xl
                     * w-full inline-flex items-center justify-center
                     * transition-colors`. Suite visual OK (este modal no
                     * está en las 8 baselines del gate — validación por
                     * grep del className en runtime).
                     */}
                    <Button
                        onClick={() => { fireEleccion('iniciar_sesion'); router.push(`/login?redirect=${encodeURIComponent(router.asPath)}`); }}
                        variant="primary"
                        size="modal-cta"
                        weight="medium"
                        fullWidth
                    >
                        Ingresar a mi cuenta
                    </Button>
                    {/*
                     * BUTTON-CANON justificado FUERA (2026-09-21):
                     * variant custom "outlined-accent" (bg-white +
                     * border-2 border-accent-600 + text-accent-700) no
                     * cubierta por las 4 variants canónicas (primary /
                     * secondary / ghost / danger). Cap PO = 4 variants,
                     * no se agrega una nueva. Sprint visual dedicado
                     * post-J decide si outlined-accent entra como 5º
                     * variant o si este botón unifica hacia secondary.
                     */}
                    <button
                        onClick={() => { fireEleccion('registrarse'); router.push('/register'); }}
                        className="w-full bg-white hover:bg-slate-50 text-accent-700 border-2 border-accent-600 font-medium tracking-wide py-3 px-4 rounded-xl transition-colors"
                    >
                        Registrarme gratis
                    </button>
                </div>
            </div>
        </div>
    );
}
