import React, { useState } from 'react';
import { X, Flag, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'evaluacion' | 'mensaje' | 'servicio';
    referenciaId: string;
}

const MOTIVOS = ['Contenido falso', 'Lenguaje ofensivo', 'Spam', 'Otro'];

export default function ReportModal({ isOpen, onClose, tipo, referenciaId }: Props) {
    const [motivo, setMotivo] = useState(MOTIVOS[0]);
    const [detalle, setDetalle] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { onClose(); return; }

            await supabase.from('reportes').insert({
                reporter_id: session.user.id,
                tipo,
                referencia_id: referenciaId,
                motivo,
                detalle: detalle.trim() || null,
            });
            setSuccess(true);
        } catch (err) {
            console.error('Error al enviar reporte:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSuccess(false);
        setDetalle('');
        setMotivo(MOTIVOS[0]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>

                {success ? (
                    <div className="text-center py-6">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Flag size={20} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Reporte enviado</h3>
                        <p className="text-slate-500 text-sm">Tu reporte fue enviado. Lo revisaremos pronto.</p>
                        <button
                            onClick={handleClose}
                            className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                <Flag size={18} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Reportar contenido</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motivo del reporte</label>
                                <select
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                >
                                    {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Describe el problema <span className="font-normal text-slate-400">(opcional)</span>
                                </label>
                                <textarea
                                    value={detalle}
                                    onChange={e => setDetalle(e.target.value)}
                                    placeholder="Describe el problema (opcional)"
                                    rows={3}
                                    maxLength={300}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-200 transition-colors text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Enviar reporte
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
