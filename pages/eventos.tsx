import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Calendar, MapPin, Clock, ExternalLink, Ticket, PawPrint } from 'lucide-react';
import { getProxyImageUrl } from '../lib/utils';
import type { GetServerSideProps } from 'next';

// Sprint EVENTOS MVP (2026-11-24) — PR 3 · listado público.
// Scope issue #164 Q5 + Q6 + Q7.
//
// Query: WHERE publicado = true AND deleted_at IS NULL AND fecha >= CURRENT_DATE
//        ORDER BY fecha ASC.
// Layout: grilla 3-cols desktop / 1-col mobile.
// Q7 MVP: solo listado, SIN detalle individual. Link externo al Instagram
// del organizador o primer link de referencia.

interface EventoRow {
    id: string;
    nombre: string;
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    lugar_nombre: string;
    direccion: string;
    comuna: string;
    organizador_nombre: string;
    organizador_instagram: string | null;
    entrada_gratuita: boolean;
    entrada_monto: number | null;
    tipo: string;
    descripcion: string;
    imagen_url: string | null;
    links_referencia: string[];
}

interface Props {
    eventos: EventoRow[];
}

const TIPO_LABELS: Record<string, string> = {
    feria: 'Feria',
    jornada: 'Jornada',
    charla: 'Charla',
    competencia: 'Competencia',
    meetup: 'Meetup',
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        return { props: { eventos: [] } };
    }
    // SSR usa anon key — las RLS policies (public_read filtrado por publicado=true AND deleted_at IS NULL) hacen el resto.
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    try {
        const { data, error } = await supabase
            .from('eventos')
            .select('id, nombre, fecha, hora_inicio, hora_fin, lugar_nombre, direccion, comuna, organizador_nombre, organizador_instagram, entrada_gratuita, entrada_monto, tipo, descripcion, imagen_url, links_referencia')
            .eq('publicado', true)
            .is('deleted_at', null)
            .gte('fecha', today)
            .order('fecha', { ascending: true })
            .limit(50);
        if (error) {
            // eslint-disable-next-line no-console
            console.error('[/eventos] query error:', error.message);
            return { props: { eventos: [] } };
        }
        return { props: { eventos: data ?? [] } };
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[/eventos] unexpected error:', err?.message ?? err);
        return { props: { eventos: [] } };
    }
};

function formatFecha(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatHora(h: string | null) {
    if (!h) return null;
    return h.slice(0, 5);
}

function externalLink(ev: EventoRow): string | null {
    if (ev.organizador_instagram) {
        const handle = ev.organizador_instagram.replace(/^@/, '').trim();
        if (handle) return `https://www.instagram.com/${handle}/`;
    }
    if (ev.links_referencia && ev.links_referencia.length > 0) {
        const url = ev.links_referencia[0].trim();
        if (url) return url.startsWith('http') ? url : `https://${url}`;
    }
    return null;
}

export default function EventosPublicPage({ eventos }: Props) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>Eventos de la comunidad | Pawnecta</title>
                <meta name="description" content="Ferias, jornadas, charlas y meetups de la comunidad Pawnecta. Encuentra el próximo evento para ti y tu mascota." />
                <meta property="og:title" content="Eventos de la comunidad | Pawnecta" />
                <meta property="og:description" content="Ferias, jornadas, charlas y meetups de la comunidad Pawnecta." />
            </Head>

            <section className="bg-gradient-to-b from-accent-50 to-slate-50 py-12 md:py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-accent-200 rounded-full text-accent-700 text-sm font-medium mb-4">
                        <Calendar size={16} /> Comunidad Pawnecta
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                        Eventos cercanos
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Ferias, jornadas, charlas y meetups para ti y tu mascota. Elegidos con cariño por el equipo Pawnecta.
                    </p>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {eventos.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                        <PawPrint className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">
                            No hay eventos programados por ahora
                        </h2>
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            Estamos preparando la próxima tanda. Mientras tanto, revisa el catálogo de servicios para encontrar quien te ayude con tu mascota.
                        </p>
                        <Link
                            href="/explorar"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg"
                        >
                            Explorar servicios
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {eventos.map((ev) => (
                            <EventoCard key={ev.id} evento={ev} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function EventoCard({ evento }: { evento: EventoRow }) {
    const external = externalLink(evento);
    const horaInicio = formatHora(evento.hora_inicio);
    const horaFin = formatHora(evento.hora_fin);
    return (
        <article className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
            {/* Imagen (16:9) o placeholder gradiente */}
            {evento.imagen_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={getProxyImageUrl(evento.imagen_url) || ''}
                    alt={evento.nombre}
                    className="w-full aspect-video object-cover bg-slate-100"
                    loading="lazy"
                />
            ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-accent-100 to-accent-50 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-accent-400" />
                </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
                <div className="mb-3">
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-800 rounded-full">
                        {TIPO_LABELS[evento.tipo] ?? evento.tipo}
                    </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                    {evento.nombre}
                </h3>
                <div className="space-y-1.5 text-sm text-slate-600 mb-4">
                    <div className="flex items-start gap-2">
                        <Calendar size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span>
                            {formatFecha(evento.fecha)}
                            {horaInicio && (
                                <span className="text-slate-500">
                                    {' · '}{horaInicio}{horaFin ? ` – ${horaFin}` : ''}
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span>
                            <strong className="font-medium text-slate-700">{evento.lugar_nombre}</strong>
                            <span className="text-slate-500">{', '}{evento.comuna}</span>
                        </span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Ticket size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span>
                            {evento.entrada_gratuita ? (
                                <span className="text-green-700 font-medium">Entrada gratuita</span>
                            ) : evento.entrada_monto ? (
                                <span>
                                    ${evento.entrada_monto.toLocaleString('es-CL')} CLP
                                </span>
                            ) : (
                                <span className="text-slate-500">Consultar entrada</span>
                            )}
                        </span>
                    </div>
                </div>
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 flex-1">
                    {evento.descripcion}
                </p>
                <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Organizado por</p>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-700 truncate">
                            {evento.organizador_nombre}
                        </span>
                        {external && (
                            <a
                                href={external}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 font-medium shrink-0"
                            >
                                Ver más <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}
