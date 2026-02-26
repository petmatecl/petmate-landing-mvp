import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ReviewSummaryProps {
    servicioId?: string;
    proveedorId?: string;
}

interface Stats {
    total: number;
    promedio: number;
    cinco: number;
    cuatro: number;
    tres: number;
    dos: number;
    uno: number;
}

export default function ReviewSummary({ servicioId, proveedorId }: ReviewSummaryProps) {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRatings = async () => {
            if (!servicioId && !proveedorId) {
                setLoading(false);
                return;
            }

            try {
                let query = supabase
                    .from('evaluaciones')
                    .select('rating')
                    .eq('estado', 'aprobado');

                if (servicioId) {
                    query = query.eq('servicio_id', servicioId);
                } else if (proveedorId) {
                    query = query.eq('proveedor_id', proveedorId);
                }

                const { data, error } = await query;

                if (error) throw error;

                const counts = { uno: 0, dos: 0, tres: 0, cuatro: 0, cinco: 0 };
                let sum = 0;
                const total = data ? data.length : 0;

                if (data && total > 0) {
                    data.forEach(r => {
                        sum += r.rating;
                        if (r.rating === 1) counts.uno++;
                        else if (r.rating === 2) counts.dos++;
                        else if (r.rating === 3) counts.tres++;
                        else if (r.rating === 4) counts.cuatro++;
                        else if (r.rating === 5) counts.cinco++;
                    });
                }

                setStats({
                    total,
                    promedio: total > 0 ? sum / total : 0,
                    ...counts
                });

            } catch (err) {
                console.error("Error cargando resumen de evaluaciones:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, [servicioId, proveedorId]);

    if (loading) {
        return <div className="animate-pulse bg-slate-100 rounded-2xl h-48 w-full border border-slate-200"></div>;
    }

    if (!stats || stats.total === 0) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-800 mb-1">Sin evaluaciones todavía</h4>
                <p className="text-sm text-slate-500">Sé el primero en evaluar este servicio.</p>
            </div>
        );
    }

    const calculatePercentage = (count: number) => {
        if (stats.total === 0) return 0;
        return (count / stats.total) * 100;
    };

    const renderStars = (promedio: number) => {
        return (
            <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className={`w-6 h-6 ${star <= Math.round(promedio) ? 'fill-current text-amber-400' : 'fill-current text-slate-200'}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        );
    };

    const starLevels = [
        { label: '5 estrellas', count: stats.cinco, stars: 5 },
        { label: '4 estrellas', count: stats.cuatro, stars: 4 },
        { label: '3 estrellas', count: stats.tres, stars: 3 },
        { label: '2 estrellas', count: stats.dos, stars: 2 },
        { label: '1 estrella', count: stats.uno, stars: 1 },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Resumen de Evaluaciones
            </h3>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Lado Izquierdo: Promedio General */}
                <div className="w-full md:w-1/3 flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-5xl md:text-6xl font-black text-slate-900 leading-none tracking-tight">
                        {stats.promedio.toFixed(1)}
                    </span>
                    <div className="mt-3 mb-2">
                        {renderStars(stats.promedio)}
                    </div>
                    <span className="text-sm font-semibold text-slate-500">
                        {stats.total} {stats.total === 1 ? 'evaluación' : 'evaluaciones'}
                    </span>
                </div>

                {/* Lado Derecho: Barras de Progreso */}
                <div className="w-full md:w-2/3 flex flex-col justify-center gap-3">
                    {starLevels.map((level) => (
                        <div key={level.stars} className="flex items-center gap-3 text-sm">
                            <span className="w-20 font-medium text-slate-600 shrink-0 text-right">
                                {level.label}
                            </span>
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden flex items-center">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${calculatePercentage(level.count)}%` }}
                                ></div>
                            </div>
                            <span className="w-8 font-medium text-slate-500 text-left shrink-0">
                                {level.count}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
