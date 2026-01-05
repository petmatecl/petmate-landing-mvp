import React from 'react';
import { Review } from '../../lib/reviewsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReviewListProps {
    reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p>Aún no hay reseñas. ¡Sé el primero en opinar!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase text-sm">
                                {review.cliente?.nombre?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">
                                    {review.cliente?.nombre} {review.cliente?.apellido_p ? `${review.cliente.apellido_p.charAt(0)}.` : ''}
                                </h4>
                                <p className="text-xs text-slate-500">
                                    {format(new Date(review.created_at), "d MMMM yyyy", { locale: es })}
                                </p>
                            </div>
                        </div>
                        <div className="flex text-amber-400 text-sm">
                            {[...Array(5)].map((_, i) => (
                                <span key={i}>
                                    {i < review.calificacion ? '★' : '☆'}
                                </span>
                            ))}
                        </div>
                    </div>
                    {review.comentario && (
                        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                            {review.comentario}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}
