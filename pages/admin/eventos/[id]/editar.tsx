import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AdminLayout from '../../../../components/Admin/AdminLayout';
import RoleGuard from '../../../../components/Shared/RoleGuard';
import EventoForm, { type EventoRow } from '../../../../components/Admin/EventoForm';
import { supabase } from '../../../../lib/supabaseClient';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';

// Sprint EVENTOS MVP (2026-11-24) — Admin editar evento.
// Scope issue #164 Q4.

function AdminEventoEditarContent() {
    const router = useRouter();
    const id = typeof router.query.id === 'string' ? router.query.id : null;
    const [evento, setEvento] = useState<EventoRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetch = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data, error: qErr } = await supabase
                    .from('eventos')
                    .select('*')
                    .eq('id', id)
                    .is('deleted_at', null)
                    .maybeSingle();
                if (qErr) throw qErr;
                if (!data) {
                    setError('Evento no encontrado o fue eliminado.');
                    return;
                }
                // Normalizar formato BD → EventoRow (hora_inicio y hora_fin vienen como "HH:MM:SS", input time espera "HH:MM").
                setEvento({
                    id: data.id,
                    nombre: data.nombre ?? '',
                    fecha: data.fecha ?? '',
                    hora_inicio: data.hora_inicio ? String(data.hora_inicio).slice(0, 5) : '',
                    hora_fin: data.hora_fin ? String(data.hora_fin).slice(0, 5) : '',
                    lugar_nombre: data.lugar_nombre ?? '',
                    direccion: data.direccion ?? '',
                    comuna: data.comuna ?? '',
                    organizador_nombre: data.organizador_nombre ?? '',
                    organizador_instagram: data.organizador_instagram ?? '',
                    entrada_gratuita: data.entrada_gratuita ?? false,
                    entrada_monto: data.entrada_monto ?? null,
                    tipo: data.tipo ?? 'feria',
                    descripcion: data.descripcion ?? '',
                    actividades: data.actividades ?? [],
                    imagen_url: data.imagen_url ?? null,
                    links_referencia: data.links_referencia ?? [],
                    publicado: data.publicado ?? false,
                });
            } catch (err: any) {
                setError(`Error cargando el evento: ${err?.message ?? err}`);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    return (
        <>
            <Head>
                <title>Editar evento | Admin Pawnecta</title>
            </Head>

            <div className="mb-8">
                <Link
                    href="/admin/eventos"
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-accent-600 mb-4"
                >
                    <ArrowLeft size={16} /> Volver a eventos
                </Link>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                    <Calendar className="text-accent-600" size={32} />
                    Editar evento
                </h1>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
                </div>
            ) : error ? (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800">
                    {error}
                </div>
            ) : evento ? (
                <EventoForm mode="editar" initial={evento} />
            ) : null}
        </>
    );
}

export default function AdminEventoEditarPage() {
    return (
        <RoleGuard requiredRole="admin">
            <AdminLayout>
                <AdminEventoEditarContent />
            </AdminLayout>
        </RoleGuard>
    );
}
