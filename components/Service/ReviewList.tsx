import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Flag } from 'lucide-react';
import ReportModal from '../Shared/ReportModal';

interface ReviewListProps {
    servicioId?: string;
    proveedorId?: string;
}

export default function ReviewList({ servicioId, proveedorId }: ReviewListProps) {
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reportTarget, setReportTarget] = useState<string | null>(null);

    useEffect(() => {
        const fetchReviews = async () => {
            if (!servicioId && !proveedorId) {
                setLoading(false);
                return;
            }

            try {
                let query = supabase
                    .from('evaluaciones')
                    .select(`
                        id, rating, comentario, created_at,
                        respuesta_proveedor, respuesta_at,
                        usuarios_buscadores(nombre, apellido_p, foto_perfil)
                    `)
                    .eq('estado', 'aprobado')
                    .order('created_at', { ascending: false });

                if (servicioId) {
                    query = query.eq('servicio_id', servicioId);
                } else if (proveedorId) {
                    query = query.eq('proveedor_id', proveedorId);
                }

                const { data, error } = await query;

                if (error) throw error;
                setReviews(data || []);

            } catch (err) {
                console.error("Error cargando lista de evaluaciones:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [servicioId, proveedorId]);

    if (loading) {
        return (
            <div className="flex flex-col gap-6 w-full animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-50 h-32 w-full rounded-2xl border border-slate-100"></div>
                ))}
            </div>
        );
    }

    if (!reviews || reviews.length === 0) {
        return null;
    }

    return (
        <>
            <div className="flex flex-col gap-6">
                {reviews.map(review => {
                    const u = review.usuarios_buscadores;
                    return (
                        <div key={review.id} className="border-t border-slate-100 pt-6 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                        {u?.foto_perfil ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={u.foto_perfil} alt={u.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">{u?.nombre?.[0] || '?'}</div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{u?.nombre} {u?.apellido_p}</h4>
                                        <p className="text-xs text-slate-500">
                                            Hace {formatDistanceToNow(new Date(review.created_at), { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex text-amber-400">
                                        {[...Array(5)].map((_, i) => (
                                            <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-current text-amber-400' : 'text-slate-200 fill-current'}`} viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setReportTarget(review.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        aria-label="Reportar evaluación"
                                        title="Reportar"
                                    >
                                        <Flag size={14} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-600 mt-2 text-sm leading-relaxed whitespace-pre-wrap">{review.comentario}</p>

                            {/* Respuesta del proveedor */}
                            {review.respuesta_proveedor && (
                                <div className="bg-slate-50 border-l-2 border-emerald-600 pl-4 mt-3 py-2">
                                    <p className="text-xs font-bold text-emerald-700 mb-1">Respuesta del proveedor</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">{review.respuesta_proveedor}</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <ReportModal
                isOpen={!!reportTarget}
                onClose={() => setReportTarget(null)}
                tipo="evaluacion"
                referenciaId={reportTarget || ''}
            />
        </>
    );
}
