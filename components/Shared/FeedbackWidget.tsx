import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { MessageCircle, X, Send, Loader2, CheckCircle } from 'lucide-react';

export default function FeedbackWidget() {
    const [open, setOpen] = useState(false);
    const [tipo, setTipo] = useState<'general' | 'sugerencia' | 'problema'>('general');
    const [mensaje, setMensaje] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const { user } = useUser();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mensaje.trim()) return;
        setSending(true);
        try {
            await supabase.from('feedback').insert({
                auth_user_id: user?.id || null,
                tipo,
                mensaje: mensaje.trim(),
                pagina: router.asPath,
            });
            setSent(true);
            setTimeout(() => { setOpen(false); setSent(false); setMensaje(''); }, 2000);
        } catch {
            // silently fail
        } finally {
            setSending(false);
        }
    };

    // Don't show on admin
    if (router.pathname.startsWith('/admin')) return null;

    return (
        <>
            {/* Floating button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 left-6 z-40 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium transition-colors"
                >
                    <MessageCircle size={16} />
                    Feedback
                </button>
            )}

            {/* Panel */}
            {open && (
                <div className="fixed bottom-6 left-6 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900">Tu opinión nos importa</h3>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>

                    {sent ? (
                        <div className="p-6 text-center">
                            <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-800">Gracias por tu feedback</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            {/* Type selector */}
                            <div className="flex gap-1.5">
                                {([
                                    { value: 'general', label: 'General' },
                                    { value: 'sugerencia', label: 'Sugerencia' },
                                    { value: 'problema', label: 'Problema' },
                                ] as const).map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setTipo(t.value)}
                                        className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${
                                            tipo === t.value
                                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <textarea
                                value={mensaje}
                                onChange={e => setMensaje(e.target.value)}
                                placeholder="Cuéntanos qué piensas..."
                                rows={3}
                                maxLength={500}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none placeholder:text-slate-400"
                            />

                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-300">{mensaje.length}/500</span>
                                <button
                                    type="submit"
                                    disabled={sending || !mensaje.trim()}
                                    className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    Enviar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </>
    );
}
