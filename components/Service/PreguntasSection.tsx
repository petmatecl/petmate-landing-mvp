import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { MessageCircle, Loader2, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
    servicioId: string;
    proveedorId: string;
    proveedorAuthId: string;
}

export default function PreguntasSection({ servicioId, proveedorId, proveedorAuthId }: Props) {
    const { user } = useUser();
    const [preguntas, setPreguntas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pregunta, setPregunta] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [replyId, setReplyId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    const isProveedor = user?.id === proveedorAuthId;

    useEffect(() => {
        fetchPreguntas();
    }, [servicioId]);

    const fetchPreguntas = async () => {
        const { data } = await supabase
            .from('preguntas')
            .select('*')
            .eq('servicio_id', servicioId)
            .order('created_at', { ascending: false });
        setPreguntas(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) { toast.error('Inicia sesión para hacer una pregunta'); return; }
        if (!pregunta.trim()) return;
        if (pregunta.trim().length < 10) { toast.error('La pregunta debe tener al menos 10 caracteres'); return; }

        setSubmitting(true);
        try {
            const { error } = await supabase.from('preguntas').insert({
                servicio_id: servicioId,
                proveedor_id: proveedorId,
                auth_user_id: user.id,
                pregunta: pregunta.trim(),
            });
            if (error) throw error;
            toast.success('Pregunta enviada');
            setPregunta('');
            fetchPreguntas();
        } catch (err: any) {
            toast.error(err.message || 'Error al enviar pregunta');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (id: string) => {
        if (!replyText.trim()) return;
        setReplying(true);
        try {
            const { error } = await supabase.from('preguntas')
                .update({ respuesta: replyText.trim(), respuesta_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast.success('Respuesta publicada');
            setReplyId(null);
            setReplyText('');
            fetchPreguntas();
        } catch (err: any) {
            toast.error(err.message || 'Error al responder');
        } finally {
            setReplying(false);
        }
    };

    if (loading) return <div className="h-20 bg-slate-50 rounded-xl animate-pulse" />;

    const visible = showAll ? preguntas : preguntas.slice(0, 3);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <MessageCircle size={22} className="text-emerald-500" />
                Preguntas al proveedor
            </h3>
            <p className="text-sm text-slate-400 mb-6">Las preguntas y respuestas son públicas y ayudan a otros tutores.</p>

            {/* Ask form */}
            {!isProveedor && (
                <form onSubmit={handleSubmit} className="mb-6">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={pregunta}
                            onChange={e => setPregunta(e.target.value)}
                            placeholder={user ? 'Escribe tu pregunta...' : 'Inicia sesión para preguntar'}
                            disabled={!user}
                            maxLength={300}
                            className="flex-1 h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={submitting || !user || !pregunta.trim()}
                            className="px-4 h-10 bg-emerald-700 text-white text-sm font-semibold rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                            {submitting && <Loader2 size={14} className="animate-spin" />}
                            Preguntar
                        </button>
                    </div>
                </form>
            )}

            {/* Q&A List */}
            {preguntas.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">
                    {isProveedor ? 'Aún no te han hecho preguntas.' : 'Sé el primero en preguntar.'}
                </p>
            ) : (
                <div className="space-y-4">
                    {visible.map(q => (
                        <div key={q.id} className="border-t border-slate-100 pt-4">
                            <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0 mt-0.5">P</span>
                                <div className="flex-1">
                                    <p className="text-sm text-slate-800">{q.pregunta}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>

                            {q.respuesta ? (
                                <div className="flex items-start gap-2 mt-3 ml-4">
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">R</span>
                                    <div>
                                        <p className="text-sm text-slate-600">{q.respuesta}</p>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            {formatDistanceToNow(new Date(q.respuesta_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                </div>
                            ) : isProveedor ? (
                                <div className="mt-2 ml-4">
                                    {replyId === q.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                                                placeholder="Escribe tu respuesta..."
                                                maxLength={500}
                                                className="flex-1 h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                            <button onClick={() => handleReply(q.id)} disabled={replying || !replyText.trim()}
                                                className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
                                                {replying ? <Loader2 size={12} className="animate-spin" /> : 'Responder'}
                                            </button>
                                            <button onClick={() => { setReplyId(null); setReplyText(''); }}
                                                className="text-xs text-slate-400 px-2">Cancelar</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setReplyId(q.id)}
                                            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                                            Responder esta pregunta
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-300 mt-2 ml-6 italic">Esperando respuesta del proveedor</p>
                            )}
                        </div>
                    ))}

                    {preguntas.length > 3 && !showAll && (
                        <button onClick={() => setShowAll(true)}
                            className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors mx-auto mt-2">
                            Ver todas las preguntas ({preguntas.length})
                            <ChevronDown size={14} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
