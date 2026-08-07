// components/Servicio/MobileActionSheet.tsx
// ----------------------------------------------------------------------------
// Bottom sheet mobile (patron Airbnb/Uber). Container reusable — el contenido
// (botones de accion, gate hint, etc.) lo pasa el caller como children.
//
// Comportamiento:
//   - Sube desde abajo con animacion suave (translateY + transition).
//   - Backdrop oscurecido detras. Tap al backdrop cierra.
//   - Grabber (pill horizontal) arriba como indicador visual de swipe zone.
//   - Boton X para cerrar (accesible, tap target 44x44).
//   - ESC key cierra (accesibilidad teclado).
//   - Body scroll bloqueado mientras esta abierto.
//   - Content area con overflow-y auto — si excede 85vh scrollea internamente.
//
// SOLO MOBILE (lg:hidden). Desktop usa la sticky right como panel de accion.
// ----------------------------------------------------------------------------
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '../../lib/useModalDialog';

interface MobileActionSheetProps {
    isOpen: boolean;
    onClose: () => void;
    /** Titulo mostrado arriba del sheet. Opcional pero recomendado. */
    title?: string;
    children: React.ReactNode;
}

export default function MobileActionSheet({
    isOpen,
    onClose,
    title,
    children,
}: MobileActionSheetProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // ZB1 sprint ZONAB-1: migrado a useModalDialog (Escape + focus-trap +
    // return-focus). Antes tenía solo un ESC handler propio; ahora hereda
    // el patrón completo. El body scroll lock queda como useEffect propio —
    // no es parte del hook (que solo se ocupa de foco y teclado).
    useModalDialog({ isOpen, onClose, containerRef });

    // Body scroll lock cuando esta abierto (independiente del hook).
    useEffect(() => {
        if (!isOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, [isOpen]);

    const titleId = title ? 'mobile-action-sheet-title' : undefined;

    return (
        <>
            {/* Backdrop — tap para cerrar. Fade in/out con opacity. */}
            <div
                onClick={onClose}
                aria-hidden={!isOpen}
                className={`lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Sheet — sube desde abajo con translateY. */}
            <div
                ref={containerRef}
                role="dialog"
                aria-modal="true"
                aria-hidden={!isOpen}
                aria-labelledby={titleId}
                className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
                    isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
                }`}
                style={{ maxHeight: '85vh' }}
            >
                {/* Grabber — indicador visual de swipe zone. */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 bg-slate-300 rounded-full" aria-hidden="true" />
                </div>

                {/* Header — titulo + boton X. */}
                <div className="flex items-center justify-between px-6 pt-2 pb-3 shrink-0">
                    {title && (
                        <h3 id={titleId} className="text-lg font-semibold text-slate-900">
                            {title}
                        </h3>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors -mr-2"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Content — scroll interno si excede el viewport. Padding
                    inferior extra para dejar respiro contra el borde del sheet. */}
                <div className="px-6 pb-8 overflow-y-auto">
                    {children}
                </div>
            </div>
        </>
    );
}
