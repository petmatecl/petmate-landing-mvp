import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { useConsent, ConsentPrefs } from '../lib/useConsent';

type View = 'banner' | 'preferences' | null;

export default function CookieBanner() {
    const { isSet, hydrated, accept, rejectAll, acceptAll } = useConsent();
    const [view, setView] = useState<View>(null);
    const [draftPrefs, setDraftPrefs] = useState<ConsentPrefs>({ analytics: false, marketing: false });
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null);
    const firstFocusRef = useRef<HTMLButtonElement>(null);

    // Show banner on first visit (no consent saved)
    useEffect(() => {
        if (!hydrated) return;
        if (!isSet) setView('banner');
    }, [hydrated, isSet]);

    // Listen for footer "Configurar cookies" trigger
    useEffect(() => {
        const handler = () => {
            setDraftPrefs({ analytics: false, marketing: false });
            setView('preferences');
        };
        window.addEventListener('open-cookie-settings', handler);
        return () => window.removeEventListener('open-cookie-settings', handler);
    }, []);

    // Focus management + keyboard for preferences view
    useEffect(() => {
        if (view !== 'preferences') return;
        previousFocusRef.current = document.activeElement as HTMLElement;
        setTimeout(() => firstFocusRef.current?.focus(), 0);

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setView('banner');
            } else if (e.key === 'Tab' && dialogRef.current) {
                const focusables = Array.from(
                    dialogRef.current.querySelectorAll<HTMLElement>(
                        'button:not([disabled]), [role="switch"]:not([disabled])'
                    )
                );
                if (!focusables.length) return;
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
    }, [view]);

    if (!hydrated || view === null) return null;

    const handleSavePrefs = () => {
        accept(draftPrefs);
        setView(null);
    };

    if (view === 'banner') {
        return (
            <div
                role="region"
                aria-label="Aviso de cookies"
                className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-slate-200 shadow-lg p-4 sm:p-5"
            >
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-4 lg:items-center">
                    <div className="flex items-start gap-3 flex-1">
                        <Cookie className="text-emerald-700 shrink-0 mt-0.5" size={20} aria-hidden="true" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Usamos cookies para mejorar tu experiencia y analizar el uso del sitio. Las necesarias son
                            obligatorias. Puedes aceptar todas, rechazar las opcionales o personalizar tus preferencias.{' '}
                            <Link href="/privacidad" className="text-emerald-700 underline hover:text-emerald-800">
                                Más información
                            </Link>
                            .
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                            onClick={() => { rejectAll(); setView(null); }}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Rechazar todas
                        </button>
                        <button
                            onClick={() => {
                                setDraftPrefs({ analytics: false, marketing: false });
                                setView('preferences');
                            }}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Personalizar
                        </button>
                        <button
                            onClick={() => { acceptAll(); setView(null); }}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
                        >
                            Aceptar todas
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // view === 'preferences'
    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cookie-prefs-title"
                aria-describedby="cookie-prefs-desc"
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Cookie className="text-emerald-700" size={20} aria-hidden="true" />
                            <h2 id="cookie-prefs-title" className="text-lg font-bold text-slate-900">
                                Preferencias de cookies
                            </h2>
                        </div>
                        <button
                            ref={firstFocusRef}
                            onClick={() => setView('banner')}
                            aria-label="Volver al aviso"
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-5">
                        <p id="cookie-prefs-desc" className="text-sm text-slate-600 leading-relaxed">
                            Elige qué tipos de cookies quieres permitir. Tu elección se guarda en este dispositivo y
                            puedes cambiarla cuando quieras desde el footer.
                        </p>

                        {/* Necesarias */}
                        <ConsentRow
                            title="Necesarias"
                            description="Cookies esenciales para autenticación, seguridad y funcionamiento básico del sitio. No se pueden desactivar."
                            checked={true}
                            disabled={true}
                            onToggle={() => { }}
                        />

                        {/* Analíticas */}
                        <ConsentRow
                            title="Analíticas"
                            description="Google Analytics. Nos ayuda a entender cómo usás el sitio para mejorarlo. Datos agregados y anónimos."
                            checked={draftPrefs.analytics}
                            onToggle={() => setDraftPrefs(p => ({ ...p, analytics: !p.analytics }))}
                        />

                        {/* Marketing */}
                        <ConsentRow
                            title="Marketing"
                            description="Pixels de redes sociales (Meta, TikTok) para medir efectividad de campañas. Actualmente no estamos cargando ninguno."
                            checked={draftPrefs.marketing}
                            onToggle={() => setDraftPrefs(p => ({ ...p, marketing: !p.marketing }))}
                        />
                    </div>

                    {/* Footer buttons */}
                    <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
                        <button
                            onClick={() => setView('banner')}
                            className="px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSavePrefs}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors"
                        >
                            Guardar preferencias
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function ConsentRow({
    title,
    description,
    checked,
    disabled = false,
    onToggle,
}: {
    title: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    onToggle: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={title}
                disabled={disabled}
                onClick={onToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors mt-0.5 ${checked ? 'bg-emerald-600' : 'bg-slate-300'
                    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                />
            </button>
        </div>
    );
}
