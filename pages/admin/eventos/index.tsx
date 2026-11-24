import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import AdminLayout from '../../../components/Admin/AdminLayout';
import RoleGuard from '../../../components/Shared/RoleGuard';
import ConfirmDialog from '../../../components/Shared/ConfirmDialog';
import { Calendar, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

// Sprint EVENTOS MVP (2026-11-24) — Admin list page.
// Scope issue #164 Q4-Q5.

interface EventoListRow {
    id: string;
    nombre: string;
    fecha: string;
    tipo: string;
    comuna: string;
    publicado: boolean;
    created_at: string;
}

function AdminEventosContent() {
    const router = useRouter();
    const [eventos, setEventos] = useState<EventoListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<EventoListRow | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: qErr } = await supabase
                .from('eventos')
                .select('id, nombre, fecha, tipo, comuna, publicado, created_at')
                .is('deleted_at', null)
                .order('fecha', { ascending: false });
            if (qErr) throw qErr;
            setEventos(data ?? []);
        } catch (err: any) {
            setError(`Error cargando eventos: ${err?.message ?? err}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const { error: delErr } = await supabase
                .from('eventos')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', deleteTarget.id);
            if (delErr) throw delErr;
            setDeleteTarget(null);
            await fetch();
        } catch (err: any) {
            setError(`Error eliminando: ${err?.message ?? err}`);
        } finally {
            setDeleting(false);
        }
    };

    const formatFecha = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <>
            <Head>
                <title>Eventos | Admin Pawnecta</title>
            </Head>

            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Calendar className="text-accent-600" size={32} />
                        Eventos
                    </h1>
                    <p className="text-slate-600 mt-2">Administra ferias, jornadas, charlas y otros eventos de la comunidad.</p>
                </div>
                <Link
                    href="/admin/eventos/nuevo"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg shadow-sm"
                >
                    <Plus size={18} /> Crear evento
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-accent-600 animate-spin" />
                </div>
            ) : error ? (
                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-800">
                    {error}
                </div>
            ) : eventos.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aún no hay eventos</h3>
                    <p className="text-slate-600 mb-6">Crea el primer evento de la comunidad para que aparezca en el listado público.</p>
                    <Link
                        href="/admin/eventos/nuevo"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg"
                    >
                        <Plus size={18} /> Crear primer evento
                    </Link>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nombre</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Comuna</th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Estado</th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {eventos.map((ev) => (
                                <tr key={ev.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{formatFecha(ev.fecha)}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{ev.nombre}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{ev.tipo}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{ev.comuna}</td>
                                    <td className="px-6 py-4">
                                        {ev.publicado ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Publicado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                Borrador
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="inline-flex gap-2">
                                            <Link
                                                href={`/admin/eventos/${ev.id}/editar`}
                                                className="p-2 text-slate-600 hover:text-accent-600 hover:bg-accent-50 rounded-lg"
                                                aria-label="Editar"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => setDeleteTarget(ev)}
                                                className="p-2 text-slate-600 hover:text-danger-600 hover:bg-danger-50 rounded-lg"
                                                aria-label="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="¿Eliminar evento?"
                message={deleteTarget ? `"${deleteTarget.nombre}" se moverá a papelera (soft delete). Zero impacto en producción si no estaba publicado. Si estaba publicado, deja de aparecer en el listado público al confirmar.` : ''}
                confirmLabel="Eliminar"
                variant="danger"
                loading={deleting}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </>
    );
}

export default function AdminEventosPage() {
    return (
        <RoleGuard requiredRole="admin">
            <AdminLayout>
                <AdminEventosContent />
            </AdminLayout>
        </RoleGuard>
    );
}
