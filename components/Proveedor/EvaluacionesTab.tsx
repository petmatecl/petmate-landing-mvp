import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Star, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ReviewSummary from '../../components/Service/ReviewSummary';
import { toast } from 'sonner';
import EmptyState from '../Shared/EmptyState';

interface Props {
    evaluaciones: any[];
    proveedorId: string;
}

export default function EvaluacionesTab({ evaluaciones, proveedorId }: Props) {
    const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
    const [openReply, setOpenReply] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<Set<string>>(new Set());

    const handleSubmitReply = async (evalId: string) => {
        const text = replyTexts[evalId]?.trim();
        if (!text) return;
        setSubmitting(evalId);
        try {
            const { error } = await supabase
                .from('evaluaciones')
                .update({ respuesta_proveedor: text, respuesta_at: new Date().toISOString() })
                .eq('id', evalId);
            if (error) throw error;
            setSubmitted(prev => new Set(Array.from(prev).concat(evalId)));
            setOpenReply(null);
            toast.success('Respuesta publicada');
        } catch (err: any) {
            toast.error(err.message || 'Error al publicar respuesta');
        } finally {
            setSubmitting(null);
        }
    };

    return (
        <div className="animate-in fade-in duration-300">
            <h1 className="text-2xl font-bold text-slate-900 mb-8">Evaluaciones Recibidas</h1>

            <div className="mb-10">
                <ReviewSummary proveedorId={proveedorId} />
            </div>

            {evaluaciones.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <EmptyState
                        icon={<Star size={36} />}
                        title="Aún no tienes evaluaciones"
                        description="Cuando tus primeros clientes te contraten podrán dejarte una reseña aquí."
                    />
                </div>
            ) : (
                <div className="grid gap-4">
                    {evaluaciones.map(ev => {
                        const hasReplied = submitted.has(ev.id) || ev.respuesta_proveedor;
                        return (
                            <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex flex-col sm:flex-row gap-6">
                                    <div className="sm:w-3/4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="flex text-amber-400">
                                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className={i <= ev.rating ? 'fill-current' : 'text-slate-200'} />)}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">{ev.servicio?.titulo}</span>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed mb-3">&quot;{ev.comentario}&quot;</p>
                                        <span className="text-xs font-semibold text-slate-400">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: es })}</span>

                                        {/* Respuesta existente */}
                                        {ev.respuesta_proveedor && (
                                            <div className="bg-slate-50 border-l-2 border-emerald-600 pl-4 mt-4 py-2">
                                                <p className="text-xs font-bold text-emerald-700 mb-1">Tu respuesta</p>
                                                <p className="text-sm text-slate-600">{ev.respuesta_proveedor}</p>
                                            </div>
                                        )}

                                        {/* Inline reply textarea */}
                                        {ev.estado === 'aprobado' && !hasReplied && (
                                            <div className="mt-4">
                                                {openReply === ev.id ? (
                                                    <div>
                                                        <textarea
                                                            value={replyTexts[ev.id] || ''}
                                                            onChange={e => setReplyTexts(p => ({ ...p, [ev.id]: e.target.value }))}
                                                            placeholder="Escribe tu respuesta pública..."
                                                            maxLength={300}
                                                            rows={3}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                        />
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-slate-400">{(replyTexts[ev.id] || '').length}/300</span>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => setOpenReply(null)} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg transition-colors">Cancelar</button>
                                                                <button
                                                                    onClick={() => handleSubmitReply(ev.id)}
                                                                    disabled={!replyTexts[ev.id]?.trim() || submitting === ev.id}
                                                                    className="flex items-center gap-1.5 text-sm font-bold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                                                >
                                                                    {submitting === ev.id && <Loader2 size={12} className="animate-spin" />}
                                                                    Publicar respuesta
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setOpenReply(ev.id)} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
                                                        Responder
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="sm:w-1/4 flex flex-col justify-center sm:items-end sm:border-l sm:border-slate-100 sm:pl-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                        {ev.estado === 'aprobado' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-[#1A6B4A] rounded-full text-xs font-bold uppercase"><CheckCircle size={14} /> Publicada</span>}
                                        {ev.estado === 'pendiente' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase"><Clock size={14} /> En revisión</span>}
                                        {ev.estado === 'rechazado' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase"><XCircle size={14} /> No Publicada</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
