import React, { useState } from 'react';
import { createReview } from '../../lib/reviewsService';

interface ReviewFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    sitterId: string;
    onReviewSubmitted: () => void;
}

export default function ReviewFormModal({ isOpen, onClose, sitterId, onReviewSubmitted }: ReviewFormModalProps) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { error } = await createReview({
            sitter_id: sitterId,
            calificacion: rating,
            comentario: comment
        });

        if (error) {
            alert("Error al enviar la reseña: " + error.message);
        } else {
            onReviewSubmitted();
            onClose();
            setComment("");
            setRating(5);
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Escribir Reseña</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calificación
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="text-3xl focus:outline-none transition-transform hover:scale-110"
                                >
                                    <span className={star <= (hoverRating || rating) ? "text-amber-400" : "text-gray-200"}>
                                        ★
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tu opinión
                        </label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow min-h-[100px]"
                            placeholder="Cuéntanos cómo fue tu experiencia con este cuidador..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                        />
                    </div>

                    <div className="pt-2 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Enviando..." : "Publicar Reseña"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
