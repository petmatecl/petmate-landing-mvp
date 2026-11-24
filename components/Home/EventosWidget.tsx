import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { getProxyImageUrl } from '../../lib/utils';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';

// Sprint EVENTOS MVP (2026-11-24) — PR 4 · widget home.
// Scope issue #164 Q6: widget entre Hero y "Explorar por categoría",
// próximos 3 eventos (fecha ASC), fallback 0 eventos = widget OCULTO.
//
// Fetch client-side con anon key — las RLS policies (public_read filtrado
// por publicado=true AND deleted_at IS NULL) hacen el filtrado real.
// Fallback explícito a NULL cuando length=0 → zero DOM, cero copy
// "próximamente" (decisión PO Q6).

interface EventoWidgetRow {
    id: string;
    nombre: string;
    fecha: string;
    lugar_nombre: string;
    comuna: string;
    tipo: string;
    imagen_url: string | null;
}

const TIPO_LABELS: Record<string, string> = {
    feria: 'Feria',
    jornada: 'Jornada',
    charla: 'Charla',
    competencia: 'Competencia',
    meetup: 'Meetup',
};

function formatFechaCorta(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function EventosWidget() {
    const [eventos, setEventos] = useState<EventoWidgetRow[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetch = async () => {
            try {
                const today = new Date().toISOString().slice(0, 10);
                const { data, error } = await supabase
                    .from('eventos')
                    .select('id, nombre, fecha, lugar_nombre, comuna, tipo, imagen_url')
                    .eq('publicado', true)
                    .is('deleted_at', null)
                    .gte('fecha', today)
                    .order('fecha', { ascending: true })
                    .limit(3);
                if (cancelled) return;
                if (error) {
                    // eslint-disable-next-line no-console
                    console.warn('[EventosWidget] fetch error, hiding widget:', error.message);
                    setEventos([]);
                } else {
                    setEventos(data ?? []);
                }
            } catch (err: any) {
                // eslint-disable-next-line no-console
                console.warn('[EventosWidget] unexpected error, hiding widget:', err?.message ?? err);
                if (!cancelled) setEventos([]);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        };
        fetch();
        return () => { cancelled = true; };
    }, []);

    // Fallback Q6: widget OCULTO cuando 0 eventos (o aún no cargó).
    // Zero DOM para no reservar espacio vacío.
    if (!loaded || eventos.length === 0) return null;

    return (
        <section className="bg-slate-50 py-10 md:py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-100">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-end justify-between mb-6 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-50 border border-accent-200 rounded-full text-accent-700 text-xs font-medium mb-2">
                            <Calendar size={14} /> Comunidad
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                            Próximos eventos
                        </h2>
                    </div>
                    <Link
                        href="/eventos"
                        className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-accent-600 hover:text-accent-700 shrink-0"
                    >
                        Ver todos <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                    {eventos.map((ev) => (
                        <Link
                            key={ev.id}
                            href="/eventos"
                            className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-accent-300 hover:shadow-md transition-all"
                        >
                            {/* Sprint EVENTOS-MVP-PULIDO (2026-11-24): aspect-[4/3]
                                + object-contain + fondo slate-50 para preservar
                                flyers verticales completos sin recortar (match
                                del card de /eventos listado). */}
                            {ev.imagen_url ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={getProxyImageUrl(ev.imagen_url) || ''}
                                    alt={ev.nombre}
                                    className="w-full aspect-[4/3] object-contain bg-slate-50"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full aspect-[4/3] bg-gradient-to-br from-accent-100 to-accent-50 flex items-center justify-center">
                                    <Calendar className="w-8 h-8 text-accent-400" />
                                </div>
                            )}
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-accent-100 text-accent-800 rounded-full">
                                        {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {formatFechaCorta(ev.fecha)}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-accent-700 transition-colors">
                                    {ev.nombre}
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-auto">
                                    <MapPin size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate">
                                        {ev.lugar_nombre}
                                        <span className="text-slate-400">{', '}{ev.comuna}</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="sm:hidden mt-5 text-center">
                    <Link
                        href="/eventos"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-accent-600"
                    >
                        Ver todos los eventos <ChevronRight size={16} />
                    </Link>
                </div>
            </div>
        </section>
    );
}
