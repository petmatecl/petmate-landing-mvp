import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    servicioId: string;
    proveedorId: string;
    serviceTitle: string;
}

export default function ReviewModal({ isOpen, onClose, servicioId, proveedorId, serviceTitle }: ReviewModalProps) {
    const [rating, setRating] = useState<number>(0);
    const [hoveredRating, setHoveredRating] = useState<number>(0);
    const [comentario, setComentario] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            setErrorMsg('Por favor selecciona una calificación.');
            return;
        }

        if (comentario.trim().length < 10) {
            setErrorMsg('Por favor escribe un comentario de al menos 10 caracteres.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setErrorMsg('Debes iniciar sesión para dejar una evaluación.');
                return;
            }

            const { error } = await supabase.from('evaluaciones').insert({
                servicio_id: servicioId,
                proveedor_id: proveedorId,
                usuario_id: session.user.id,
                rating: rating,
                comentario: comentario,
                estado: 'pendiente'
            });

            if (error) throw error;

            setSuccess(true);

            // Auto close after 3 seconds on success
            setTimeout(() => {
                onClose();
                // Reset state for next time
                setSuccess(false);
                setRating(0);
                setComentario('');
            }, 3000);

        } catch (error: any) {
            console.error('Error enviando evaluación:', error);
            setErrorMsg('Hubo un error al enviar tu evaluación. Intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Deja tu evaluación</h2>
                        <p className="text-sm text-slate-500 truncate max-w-[300px]">{serviceTitle}</p>
                    </div>
                    {!success && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Gracias por tu reseña!</h3>
                            <p className="text-slate-600 max-w-sm mx-auto">
                                Tu evaluación ha sido enviada y será revisada por nuestro equipo antes de ser publicada.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                            {/* Stars Rating */}
                            <div className="flex flex-col items-center gap-2">
                                <label className="text-sm font-semibold text-slate-700">¿Cómo calificarías este servicio?</label>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className="p-1 focus:outline-none transition-transform hover:scale-110"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                        >
                                            <svg
                                                className={`w-10 h-10 ${(hoveredRating ? star <= hoveredRating : star <= rating)
                                                        ? 'text-amber-400 fill-amber-400'
                                                        : 'text-slate-300 fill-slate-100 hover:fill-amber-100'
                                                    } transition-colors duration-200`}
                                                viewBox="0 0 24 24"
                                            >
                                                <polygon strokeWidth="1.5" stroke="currentColor" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                                <span className="text-xs text-slate-500 font-medium">
                                    {rating === 1 && 'Malo'}
                                    {rating === 2 && 'Regular'}
                                    {rating === 3 && 'Bueno'}
                                    {rating === 4 && 'Muy Bueno'}
                                    {rating === 5 && '¡Excelente!'}
                                </span>
                            </div>

                            {/* Comment */}
                            <div className="flex flex-col gap-2">
                                <label htmlFor="comentario" className="text-sm font-semibold text-slate-700">Cuéntanos más sobre tu experiencia</label>
                                <textarea
                                    id="comentario"
                                    rows={4}
                                    placeholder="¿Qué te gustó del servicio? ¿Cómo fue el trato con la mascota?"
                                    className="w-full rounded-xl border-slate-300 focus:border-emerald-500 focus:ring-emerald-500 text-sm p-3 resize-none shadow-sm"
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    disabled={isSubmitting}
                                ></textarea>
                                <div className="flex justify-between items-center text-xs">
                                    <span className={comentario.length > 0 && comentario.length < 10 ? 'text-amber-600' : 'text-slate-400'}>
                                        Mínimo 10 caracteres
                                    </span>
                                    <span className={comentario.length > 500 ? 'text-red-500' : 'text-slate-400'}>
                                        {comentario.length}/500
                                    </span>
                                </div>
                            </div>

                            {/* Error Message */}
                            {errorMsg && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex justify-center items-center shadow-md shadow-emerald-200"
                                    disabled={isSubmitting || comentario.length > 500}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        "Enviar Evaluación"
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
