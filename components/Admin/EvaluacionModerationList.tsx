import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, Star, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EvaluacionModerationList() {
    const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    useEffect(() => {
        fetchPendientes();
    }, []);

    const fetchPendientes = async () => {
        setLoading(true);
        try {
            // Unimos con el servicio para el título, el proveedor para el nombre evaluado, 
            // y asumiendo que el usuario que deja la review viene por usuario_id hacia registro_petmate
            const { data, error } = await supabase
                .from('evaluaciones')
                .select(`
                    *,
                    servicio:servicios_publicados(titulo),
                    proveedor:proveedores(nombre, apellido_p),
                    usuario:registro_petmate(nombre, apellido_p)
                `)
                .eq('estado', 'pendiente')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEvaluaciones(data || []);
        } catch (error) {
            console.error('Error fetching evaluaciones', error);
            toast.error('Error al cargar evaluaciones pendientes');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (evalId: string, newState: 'aprobado' | 'rechazado') => {
        setIsSubmitting(evalId);
        try {
            const { error } = await supabase
                .from('evaluaciones')
                .update({ estado: newState })
                .eq('id', evalId);

            if (error) throw error;

            toast.success(newState === 'aprobado' ? 'Evaluación aprobada y publicada' : 'Evaluación rechazada');
            setEvaluaciones(prev => prev.filter(e => e.id !== evalId));
        } catch (error: any) {
            console.error('Error procesando evaluación', error);
            toast.error(error.message || 'Ocurrió un error al procesar');
        } finally {
            setIsSubmitting(null);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">Cargando evaluaciones pendientes...</p>
            </div>
        );
    }

    if (evaluaciones.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 text-emerald-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Sin revisiones pendientes</h3>
                <p className="text-slate-500">Todas las evaluaciones han sido moderadas.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-500" /> Moderación de Evaluaciones ({evaluaciones.length})
            </h2>

            <div className="grid gap-4">
                {evaluaciones.map(ev => (
                    <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">

                        {/* Status bar */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

                        <div className="flex flex-col xl:flex-row gap-6">
                            <div className="flex-1">
                                {/* Context */}
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">{ev.usuario?.nombre || 'Usuario Anónimo'}</span>
                                    evaluó a
                                    <span className="font-bold text-slate-700">{ev.proveedor?.nombre} {ev.proveedor?.apellido_p}</span>
                                    en el servicio
                                    <span className="font-bold text-slate-700 underline decoration-slate-300 underline-offset-2">&quot;{ev.servicio?.titulo || 'Servicio Desconocido'}&quot;</span>
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-1 text-amber-400 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={18} className={i < ev.rating ? 'fill-current' : 'text-slate-200'} />
                                    ))}
                                    <span className="ml-2 font-bold text-slate-900">{ev.rating}.0</span>
                                </div>

                                {/* Comment */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                    <MessageSquare size={16} className="absolute top-4 left-4 text-slate-300" />
                                    <p className="text-slate-700 leading-relaxed pl-8">
                                        &quot;{ev.comentario}&quot;
                                    </p>
                                </div>

                                <p className="text-xs font-semibold text-slate-400 mt-3">
                                    Enviada el {format(new Date(ev.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="xl:w-48 flex flex-row xl:flex-col justify-end gap-3 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-6">
                                <button
                                    onClick={() => handleAction(ev.id, 'aprobado')}
                                    disabled={isSubmitting === ev.id}
                                    className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {isSubmitting === ev.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} <span className="hidden sm:inline">Aprobar</span>
                                </button>
                                <button
                                    onClick={() => handleAction(ev.id, 'rechazado')}
                                    disabled={isSubmitting === ev.id}
                                    className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <X size={18} /> <span className="hidden sm:inline">Rechazar</span>
                                </button>

                                <div className="hidden xl:flex items-center gap-2 mt-auto justify-center text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-lg">
                                    <AlertCircle size={14} /> Requiere acción
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
