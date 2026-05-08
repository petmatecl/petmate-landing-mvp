import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { MessageCircle, X, Send, Loader2, Check, AlertCircle } from 'lucide-react';

type Rol = 'tutor' | 'proveedor' | 'admin' | 'otro';
type Categoria = 'bug' | 'sugerencia' | 'pregunta' | 'otro';

const RATE_LIMIT_KEY = 'feedback-last-submit';
const RATE_LIMIT_MS = 30_000; // 30s entre envíos

const CATEGORIA_PLACEHOLDERS: Record<Categoria, string> = {
    bug: 'Describe qué pasó, qué esperabas que pasara y los pasos para reproducirlo',
    sugerencia: '¿Qué te gustaría que mejoremos?',
    pregunta: '¿En qué te podemos ayudar?',
    otro: 'Cuéntanos lo que tengas en mente',
};

const ROL_LABELS: Record<Rol, string> = {
    tutor: 'Tutor',
    proveedor: 'Proveedor',
    admin: 'Admin',
    otro: 'Otro',
};

/**
 * Mapea el array `roles` del UserContext al rol de feedback.
 * Prioridad: admin > proveedor > tutor (default).
 */
function rolFromUserRoles(roles: string[]): Rol {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('proveedor')) return 'proveedor';
    return 'tutor';
}

export default function FeedbackWidget() {
    const router = useRouter();
    const { user, roles, isAuthenticated } = useUser();

    const [open, setOpen] = useState(false);
    const [categoria, setCategoria] = useState<Categoria | ''>('');
    const [rolAnonimo, setRolAnonimo] = useState<Rol | ''>('');
    const [mensaje, setMensaje] = useState('');
    const [permitirContacto, setPermitirContacto] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const rolDetectado: Rol = useMemo(
        () => (isAuthenticated ? rolFromUserRoles(roles) : 'tutor'),
        [isAuthenticated, roles]
    );

    if (router.pathname.startsWith('/admin')) return null;

    const reset = () => {
        setCategoria('');
        setRolAnonimo('');
        setMensaje('');
        setPermitirContacto(false);
        setError(null);
        setSent(false);
    };

    const closeAndReset = () => {
        setOpen(false);
        reset();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Rate limit local
        try {
            const last = Number(localStorage.getItem(RATE_LIMIT_KEY) ?? 0);
            if (Date.now() - last < RATE_LIMIT_MS) {
                setError('Espera unos segundos antes de enviar otro feedback.');
                return;
            }
        } catch {
            // localStorage puede fallar en modo incógnito — ignoramos
        }

        // Validaciones
        if (!categoria) { setError('Elige un tipo de feedback.'); return; }
        if (!isAuthenticated && !rolAnonimo) { setError('Cuéntanos quién eres.'); return; }
        const trimmed = mensaje.trim();
        if (trimmed.length < 10) { setError('Escribe al menos 10 caracteres.'); return; }
        if (trimmed.length > 2000) { setError('El mensaje no puede pasar de 2000 caracteres.'); return; }

        const rolFinal: Rol = isAuthenticated ? rolDetectado : (rolAnonimo as Rol);
        const userIdToSave = isAuthenticated && permitirContacto ? user?.id : null;

        const payload = {
            rol: rolFinal,
            categoria,
            mensaje: trimmed,
            user_id: userIdToSave,
            pagina_url: typeof window !== 'undefined' ? window.location.href : null,
            viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        };

        setSending(true);
        try {
            const { error: insertError } = await supabase.from('feedback_submissions').insert(payload);
            if (insertError) throw insertError;

            try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch { /* ignore */ }

            setSent(true);
            setTimeout(closeAndReset, 3000);
        } catch (err: any) {
            console.warn('[FeedbackWidget] insert failed:', err);
            setError('Hubo un problema. Inténtalo de nuevo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Trigger flotante: bottom-right, mobile icon-only, desktop con texto */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={false}
                    aria-controls="feedback-widget-panel"
                    aria-label="Enviar feedback"
                    className="fixed bottom-6 right-6 z-40 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 rounded-full shadow-lg font-medium opacity-60 hover:opacity-100 transition-all w-12 h-12 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 sm:text-sm"
                >
                    <MessageCircle size={16} aria-hidden="true" />
                    <span className="hidden sm:inline">Feedback</span>
                </button>
            )}

            {/* Panel */}
            {open && (
                <div
                    id="feedback-widget-panel"
                    role="dialog"
                    aria-label="Enviar feedback"
                    aria-modal="false"
                    className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 sm:w-96 max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Tu opinión nos importa</h3>
                        <button
                            onClick={closeAndReset}
                            aria-label="Cerrar feedback"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center -mr-2 text-slate-400 hover:text-slate-600"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {sent ? (
                        <div className="p-6 text-center">
                            <Check size={32} className="text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-800">Gracias, te leeremos.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            {/* Identificación: read-only si logueado, dropdown si anon */}
                            {isAuthenticated ? (
                                <div className="text-xs text-slate-500">
                                    Vas a enviar como: <span className="font-semibold text-slate-800">{ROL_LABELS[rolDetectado]}</span>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="feedback-rol" className="block text-xs font-semibold text-slate-700 mb-1">
                                        ¿Quién eres? <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="feedback-rol"
                                        value={rolAnonimo}
                                        onChange={e => setRolAnonimo(e.target.value as Rol)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                    >
                                        <option value="">Elige una opción</option>
                                        <option value="tutor">Tutor (busco servicios)</option>
                                        <option value="proveedor">Proveedor (ofrezco servicios)</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            )}

                            {/* Categoría */}
                            <div>
                                <label htmlFor="feedback-categoria" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Tipo de feedback <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="feedback-categoria"
                                    value={categoria}
                                    onChange={e => setCategoria(e.target.value as Categoria)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    <option value="">Elige una opción</option>
                                    <option value="bug">Bug</option>
                                    <option value="sugerencia">Sugerencia</option>
                                    <option value="pregunta">Pregunta</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            {/* Mensaje */}
                            <div>
                                <label htmlFor="feedback-mensaje" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Mensaje <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="feedback-mensaje"
                                    value={mensaje}
                                    onChange={e => setMensaje(e.target.value)}
                                    placeholder={categoria ? CATEGORIA_PLACEHOLDERS[categoria] : 'Cuéntanos qué piensas...'}
                                    rows={4}
                                    maxLength={2000}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder:text-slate-400"
                                />
                                <div className="flex justify-end mt-1">
                                    <span className={`text-[10px] ${mensaje.length > 2000 || (mensaje.length > 0 && mensaje.length < 10) ? 'text-red-500' : 'text-slate-400'}`}>
                                        {mensaje.length}/2000 (mín 10)
                                    </span>
                                </div>
                            </div>

                            {/* Checkbox contacto (solo logueado) */}
                            {isAuthenticated && (
                                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={permitirContacto}
                                        onChange={e => setPermitirContacto(e.target.checked)}
                                        className="mt-0.5 accent-emerald-600"
                                    />
                                    <span>Permitir asociar mi cuenta para que me contactes (opcional)</span>
                                </label>
                            )}

                            {/* Error */}
                            {error && (
                                <div role="alert" className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors"
                            >
                                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
