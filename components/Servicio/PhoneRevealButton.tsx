import { useState } from 'react';
import { Phone, Copy, Check } from 'lucide-react';
import { useMediaQuery } from '../../lib/hooks/useMediaQuery';

interface PhoneRevealButtonProps {
    telefono: string;
    nombre: string;
    isExample: boolean;
    isLoggedIn: boolean;
    onExampleClick: () => void;
    onLoginRequired: () => void;
    onCallTracked: () => void;
}

/**
 * Formatea +569XXXXXXXX → "+56 9 XXXX XXXX". Si el formato no calza,
 * devuelve el string original.
 */
function formatearTelefono(t: string): string {
    const digits = t.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('569')) {
        return `+56 9 ${digits.slice(3, 7)} ${digits.slice(7)}`;
    }
    if (digits.length === 9 && digits.startsWith('9')) {
        return `+56 9 ${digits.slice(1, 5)} ${digits.slice(5)}`;
    }
    return t;
}

export default function PhoneRevealButton({
    telefono,
    nombre,
    isExample,
    isLoggedIn,
    onExampleClick,
    onLoginRequired,
    onCallTracked,
}: PhoneRevealButtonProps) {
    const isMobile = useMediaQuery('(max-width: 767px)');
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    const formatted = formatearTelefono(telefono);

    // ── Mobile: link tel: clásico (abre app nativa) ──
    if (isMobile) {
        const handleClick = (e: React.MouseEvent) => {
            if (isExample) { e.preventDefault(); onExampleClick(); return; }
            if (!isLoggedIn) { e.preventDefault(); onLoginRequired(); return; }
            onCallTracked();
        };

        return (
            <a
                href={`tel:${telefono}`}
                onClick={handleClick}
                aria-label={`Llamar a ${nombre}`}
                className="w-full border-2 border-slate-200 hover:border-emerald-400 text-slate-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
                <Phone size={18} aria-hidden="true" />
                Llamar
            </a>
        );
    }

    // ── Desktop estado 1: "Mostrar teléfono" ──
    if (!revealed) {
        const handleReveal = () => {
            if (isExample) { onExampleClick(); return; }
            if (!isLoggedIn) { onLoginRequired(); return; }
            onCallTracked();
            setRevealed(true);
        };

        return (
            <button
                type="button"
                onClick={handleReveal}
                aria-label={`Mostrar teléfono de ${nombre}`}
                className="w-full border-2 border-slate-200 hover:border-emerald-400 text-slate-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
                <Phone size={18} aria-hidden="true" />
                Mostrar teléfono
            </button>
        );
    }

    // ── Desktop estado 2: número revelado + botón copiar ──
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(telefono);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.warn('[PhoneRevealButton] copy failed:', err);
        }
    };

    return (
        <div className="w-full border-2 border-emerald-200 bg-emerald-50/40 rounded-xl py-3 px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
                <Phone size={18} className="text-emerald-700 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-slate-900 text-sm tabular-nums truncate">{formatted}</span>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copiar teléfono al portapapeles`}
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold text-sm shrink-0"
            >
                {copied ? (
                    <span aria-live="polite" className="inline-flex items-center gap-1.5">
                        <Check size={16} aria-hidden="true" />
                        ¡Copiado!
                    </span>
                ) : (
                    <>
                        <Copy size={16} aria-hidden="true" />
                        Copiar
                    </>
                )}
            </button>
        </div>
    );
}
