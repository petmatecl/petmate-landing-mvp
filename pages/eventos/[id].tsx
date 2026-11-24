import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Calendar, MapPin, Ticket, ArrowLeft, Instagram, ExternalLink } from 'lucide-react';
import { getProxyImageUrl } from '../../lib/utils';
import type { GetServerSideProps } from 'next';

// Sprint EVENTOS-MVP-PULIDO PR 2 (2026-11-24) — Página detalle individual.
// Scope issue #164 Q7 fase 2 (post-MVP original): sin esta ruta el usuario
// no puede ver todos los campos del evento ni compartir el link directo.
// PR 2 agrega /eventos/[id] + OG tags + sitemap dinámico.

interface EventoDetailRow {
    id: string;
    nombre: string;
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    lugar_nombre: string;
    direccion: string | null;
    comuna: string;
    organizador_nombre: string | null;
    organizador_instagram: string | null;
    entrada_gratuita: boolean;
    entrada_monto: number | null;
    tipo: string;
    descripcion: string;
    actividades: string[];
    imagen_url: string | null;
    links_referencia: string[];
}

interface Props {
    evento: EventoDetailRow | null;
    siteOrigin: string;
}

const TIPO_LABELS: Record<string, string> = {
    feria: 'Feria',
    jornada: 'Jornada',
    charla: 'Charla',
    competencia: 'Competencia',
    meetup: 'Meetup',
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://pawnecta.com';
    const id = typeof ctx.params?.id === 'string' ? ctx.params.id : null;
    if (!supabaseUrl || !supabaseAnonKey || !id) {
        return { notFound: true };
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    try {
        const { data, error } = await supabase
            .from('eventos')
            .select('id, nombre, fecha, hora_inicio, hora_fin, lugar_nombre, direccion, comuna, organizador_nombre, organizador_instagram, entrada_gratuita, entrada_monto, tipo, descripcion, actividades, imagen_url, links_referencia')
            .eq('id', id)
            .eq('publicado', true)
            .is('deleted_at', null)
            .maybeSingle();
        if (error) {
            // eslint-disable-next-line no-console
            console.error('[/eventos/[id]] query error:', error.message);
            return { notFound: true };
        }
        if (!data) {
            return { notFound: true };
        }
        return { props: { evento: data, siteOrigin } };
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[/eventos/[id]] unexpected error:', err?.message ?? err);
        return { notFound: true };
    }
};

function formatFecha(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CL', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
}

function formatHora(h: string | null) {
    if (!h) return null;
    return h.slice(0, 5);
}

function instagramUrl(handle: string): string {
    const clean = handle.replace(/^@/, '').trim();
    return `https://www.instagram.com/${clean}/`;
}

function normalizeLink(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;
}

function truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trimEnd() + '…';
}

export default function EventoDetailPage({ evento, siteOrigin }: Props) {
    if (!evento) return null;
    const horaInicio = formatHora(evento.hora_inicio);
    const horaFin = formatHora(evento.hora_fin);
    const ogTitle = `${evento.nombre} · Pawnecta`;
    const ogDescription = truncate(evento.descripcion, 160);
    const ogImage = evento.imagen_url
        ? getProxyImageUrl(evento.imagen_url) || `${siteOrigin}/logo.png`
        : `${siteOrigin}/logo.png`;
    const canonical = `${siteOrigin}/eventos/${evento.id}`;

    return (
        <div className="min-h-screen bg-slate-50">
            <Head>
                <title>{ogTitle}</title>
                <meta name="description" content={ogDescription} />
                <link rel="canonical" href={canonical} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={ogTitle} />
                <meta property="og:description" content={ogDescription} />
                <meta property="og:url" content={canonical} />
                <meta property="og:image" content={ogImage} />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={ogTitle} />
                <meta name="twitter:description" content={ogDescription} />
                <meta name="twitter:image" content={ogImage} />
            </Head>

            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <Link
                    href="/eventos"
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-accent-600 mb-6"
                >
                    <ArrowLeft size={16} /> Volver a eventos
                </Link>

                {/* Imagen principal object-contain para preservar flyer completo */}
                {evento.imagen_url ? (
                    <div className="bg-slate-100 rounded-xl overflow-hidden mb-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={getProxyImageUrl(evento.imagen_url) || ''}
                            alt={evento.nombre}
                            className="w-full max-h-[600px] object-contain bg-slate-100"
                        />
                    </div>
                ) : (
                    <div className="w-full aspect-[16/9] bg-gradient-to-br from-accent-100 to-accent-50 rounded-xl flex items-center justify-center mb-8">
                        <Calendar className="w-16 h-16 text-accent-400" />
                    </div>
                )}

                <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-accent-100 text-accent-800 rounded-full">
                        {TIPO_LABELS[evento.tipo] ?? evento.tipo}
                    </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-6">
                    {evento.nombre}
                </h1>

                <div className="space-y-3 text-slate-700 mb-8 bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-start gap-3">
                        <Calendar size={20} className="text-accent-600 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-semibold capitalize">{formatFecha(evento.fecha)}</div>
                            {horaInicio && (
                                <div className="text-sm text-slate-500">
                                    {horaInicio}{horaFin ? ` – ${horaFin}` : ''} hrs
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin size={20} className="text-accent-600 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-semibold">{evento.lugar_nombre}</div>
                            <div className="text-sm text-slate-500">
                                {evento.direccion ? `${evento.direccion}, ${evento.comuna}` : evento.comuna}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Ticket size={20} className="text-accent-600 mt-0.5 shrink-0" />
                        <div>
                            {evento.entrada_gratuita ? (
                                <span className="font-semibold text-green-700">Entrada gratuita</span>
                            ) : evento.entrada_monto ? (
                                <span className="font-semibold">
                                    ${evento.entrada_monto.toLocaleString('es-CL')} CLP
                                </span>
                            ) : (
                                <span className="text-slate-500">Consultar entrada</span>
                            )}
                        </div>
                    </div>
                </div>

                <section className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-3">Descripción</h2>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                        {evento.descripcion}
                    </p>
                </section>

                {evento.actividades && evento.actividades.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">Actividades</h2>
                        <ul className="list-disc list-inside space-y-1.5 text-slate-700">
                            {evento.actividades.map((act, i) => (
                                <li key={i}>{act}</li>
                            ))}
                        </ul>
                    </section>
                )}

                {(evento.organizador_nombre || evento.organizador_instagram) && (
                    <section className="mb-8 bg-white border border-slate-200 rounded-xl p-5">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Organizado por</h2>
                        {evento.organizador_nombre && (
                            <div className="text-lg font-medium text-slate-900 mb-3">
                                {evento.organizador_nombre}
                            </div>
                        )}
                        {evento.organizador_instagram && (
                            <a
                                href={instagramUrl(evento.organizador_instagram)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                <Instagram size={16} />
                                @{evento.organizador_instagram.replace(/^@/, '')}
                            </a>
                        )}
                    </section>
                )}

                {evento.links_referencia && evento.links_referencia.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-3">Más información</h2>
                        <div className="flex flex-col gap-2">
                            {evento.links_referencia.map((url, i) => {
                                const normalized = normalizeLink(url);
                                if (!normalized) return null;
                                return (
                                    <a
                                        key={i}
                                        href={normalized}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:border-accent-600 hover:text-accent-600 transition-colors"
                                    >
                                        <ExternalLink size={14} />
                                        <span className="truncate">{normalized}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </section>
                )}
            </article>
        </div>
    );
}
