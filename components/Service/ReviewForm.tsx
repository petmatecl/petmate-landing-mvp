import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewFormProps {
    servicioId: string;
    proveedorId: string;
    servicioTitulo: string;
    onSuccess: () => void;
}

export default function ReviewForm({ servicioId, proveedorId, servicioTitulo, onSuccess }: ReviewFormProps) {
    const [user, setUser] = useState<any>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            setLoadingAuth(false);
        };
        checkUser();
    }, []);

    const [rating, setRating] = useState<number>(0);
    const [hoverRating, setHoverRating] = useState<number>(0);
    const [comentario, setComentario] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Estados post-envío
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Si no está autenticado o cargando, no mostrar
    if (loadingAuth || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        // Validaciones Frontend
        if (rating === 0) {
            setErrorMsg("Por favor, selecciona una calificación (1 a 5 estrellas).");
            return;
        }
        if (comentario.length < 20) {
            setErrorMsg("El comentario debe tener al menos 20 caracteres.");
            return;
        }
        if (comentario.length > 500) {
            setErrorMsg("El comentario no puede exceder los 500 caracteres.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Intentamos insertar
            const { error } = await supabase
                .from('evaluaciones')
                .insert({
                    servicio_id: servicioId,
                    proveedor_id: proveedorId,
                    usuario_id: user.id,
                    rating,
                    comentario: comentario.trim(),
                    estado: 'pendiente'
                });

            if (error) {
                // Verificar si se debe a restriccion de unicidad (ya evaluo)
                if (error.code === '23505' || error.message.includes('unique')) {
                    setErrorMsg("Ya dejaste una evaluación para este servicio.");
                } else {
                    console.error("Error BD al insertar:", error);
                    setErrorMsg("Hubo un problema. Intenta nuevamente.");
                }
                setIsSubmitting(false);
                return;
            }

            // Éxito DB, despachar Fire-And-Forget Notification API
            fetch('/api/evaluaciones/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proveedorId,
                    servicioTitulo,
                    rating,
                    comentario: comentario.trim()
                })
            }).catch(err => console.error("Error despachando notificacion Email:", err));

            setIsSuccess(true);
            toast.success("Evaluación enviada con éxito.");
            onSuccess(); // Para que el padre se refrezque o actúe

        } catch (err) {
            console.error("Exception:", err);
            setErrorMsg("Hubo un problema de red. Intenta nuevamente.");
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in fade-in duration-500">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h4 className="text-emerald-800 font-bold text-lg mb-2">¡Gracias por tu evaluación!</h4>
                <p className="text-emerald-700 text-sm max-w-md mx-auto">
                    Será revisada por nuestro equipo antes de publicarse en el perfil del prestador.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Deja tu evaluación</h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                {/* 1. Rating interactivo */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        ¿Cómo calificarías el servicio? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((starValue) => (
                            <button
                                key={starValue}
                                type="button"
                                onClick={() => setRating(starValue)}
                                onMouseEnter={() => setHoverRating(starValue)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="p-1 transition-transform hover:scale-110 focus:outline-none"
                            >
                                <svg
                                    className={`w-8 h-8 transition-colors ${(hoverRating || rating) >= starValue
                                        ? 'text-amber-400 fill-current'
                                        : 'text-slate-200 fill-current'
                                        }`}
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        ))}
                        <span className="ml-3 text-sm font-medium text-slate-500">
                            {rating > 0 ? `${rating} de 5 estrellas` : 'Selecciona una calificación'}
                        </span>
                    </div>
                </div>

                {/* 2. Textarea */}
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label htmlFor="comentario" className="block text-sm font-bold text-slate-700">
                            Cuéntanos tu experiencia <span className="text-red-500">*</span>
                        </label>
                        <span className={`text-xs font-semibold ${comentario.length > 500 || (comentario.length > 0 && comentario.length < 20) ? 'text-red-500' : 'text-slate-400'}`}>
                            {comentario.length}/500
                        </span>
                    </div>
                    <textarea
                        id="comentario"
                        rows={4}
                        placeholder="Cuenta tu experiencia con este proveedor..."
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        className={`w-full bg-slate-50 border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 transition-all resize-none ${comentario.length > 500 ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                            }`}
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-500 mt-2">Mínimo 20 caracteres.</p>
                </div>

                {/* 3. Error state local */}
                {errorMsg && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p>{errorMsg}</p>
                    </div>
                )}

                {/* Botón Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting || rating === 0 || comentario.trim().length < 20 || comentario.length > 500}
                    className="w-full sm:w-auto self-end bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        'Publicar evaluación'
                    )}
                </button>
            </form>
        </div>
    );
}
