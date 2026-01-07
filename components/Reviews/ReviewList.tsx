import React, { useState } from 'react';
import { Review } from '../../lib/reviewsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import ImageLightbox from '../ImageLightbox';

interface ReviewListProps {
    reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentImage, setCurrentImage] = useState({ src: '', alt: '' });

    const openLightbox = (src: string, alt: string) => {
        setCurrentImage({ src, alt });
        setLightboxOpen(true);
    };

    if (!reviews || reviews.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p>Aún no hay reseñas. ¡Sé el primero en opinar!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <ImageLightbox
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                src={currentImage.src}
                alt={currentImage.alt}
            />

            {reviews.map((review) => (
                <div key={review.id} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold uppercase text-sm relative overflow-hidden">
                                {review.cliente?.foto_perfil ? (
                                    <Image
                                        src={review.cliente.foto_perfil}
                                        alt={review.cliente.nombre}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <span>{review.cliente?.nombre?.charAt(0) || 'U'}</span>
                                )}
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

                    {/* Review Photos */}
                    {review.fotos && review.fotos.length > 0 && (
                        <div className="mt-3 flex gap-2">
                            {review.fotos.map((foto, idx) => (
                                <div
                                    key={idx}
                                    className="relative w-24 h-24 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border border-slate-200"
                                    onClick={() => openLightbox(foto, `Foto reseña ${review.cliente?.nombre}`)}
                                >
                                    <Image
                                        src={foto}
                                        alt={`Foto reseña ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
