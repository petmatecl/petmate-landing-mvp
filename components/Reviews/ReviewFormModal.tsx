import React, { useState } from 'react';
import { createReview } from '../../lib/reviewsService';
import { supabase } from '../../lib/supabaseClient';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

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
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            // Limit to 3 files
            if (files.length + selectedFiles.length > 3) {
                alert("Máximo 3 fotos por reseña");
                return;
            }
            setSelectedFiles((prev) => [...prev, ...files]);

            // Create previews
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls((prev) => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async (): Promise<string[]> => {
        if (selectedFiles.length === 0) return [];

        const uploadedUrls: string[] = [];

        for (const file of selectedFiles) {
            const fileExt = file.name.split('.').pop();
            const fileName = `review-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${sitterId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('review-images')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('review-images')
                .getPublicUrl(filePath);

            uploadedUrls.push(data.publicUrl);
        }

        return uploadedUrls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setUploadError(null);

        try {
            const photoUrls = await uploadImages();

            const { error } = await createReview({
                sitter_id: sitterId,
                calificacion: rating,
                comentario: comment,
                fotos: photoUrls
            });

            if (error) {
                throw error;
            } else {
                onReviewSubmitted();
                onClose();
                setComment("");
                setRating(5);
                setSelectedFiles([]);
                setPreviewUrls([]);
            }
        } catch (err: any) {
            setUploadError(err.message || "Error al subir la reseña");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-300 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-bold text-gray-900">Escribir Reseña</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Rating Stars */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Calificación
                        </label>
                        <div className="flex gap-2 justify-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoverRating(star)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    className="text-4xl focus:outline-none transition-transform hover:scale-110 active:scale-95"
                                >
                                    <span className={star <= (hoverRating || rating) ? "text-amber-400 drop-shadow-sm" : "text-gray-200"}>
                                        ★
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tu opinión
                        </label>
                        <textarea
                            className="w-full border border-slate-400 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[100px] resize-none"
                            placeholder="Cuéntanos cómo fue tu experiencia con este cuidador..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                        />
                    </div>

                    {/* Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fotos (Opcional)
                        </label>

                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {previewUrls.map((url, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-300 group">
                                    <Image src={url} alt="Preview" fill className="object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(idx)}
                                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {previewUrls.length < 3 && (
                                <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer transition-all">
                                    <PhotoIcon className="w-6 h-6 text-gray-400" />
                                    <span className="text-[10px] text-gray-500 mt-1">Agregar</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                        multiple
                                    />
                                </label>
                            )}
                        </div>
                        <p className="text-xs text-gray-400">Máximo 3 fotos.</p>
                    </div>

                    {uploadError && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {uploadError}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3 justify-end border-t border-slate-300 mt-4">
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
                            className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {submitting && (
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {submitting ? "Publicando..." : "Publicar Reseña"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
