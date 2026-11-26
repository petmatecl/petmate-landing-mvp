import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '../../../components/Admin/AdminLayout';
import RoleGuard from '../../../components/Shared/RoleGuard';
import EventoForm from '../../../components/Admin/EventoForm';
import { ArrowLeft, Calendar } from 'lucide-react';

// Sprint EVENTOS MVP (2026-11-24) — Admin crear evento.
// Scope issue #164 Q4 (form crear/editar en página full).

function AdminEventoNuevoContent() {
    return (
        <>
            <Head>
                <title>Crear evento | Admin Pawnecta</title>
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
                    Crear evento
                </h1>
                <p className="text-slate-600 mt-2">
                    El evento se crea como borrador por defecto. Marca &quot;Publicar inmediatamente&quot; para que aparezca en el listado público.
                </p>
            </div>

            <EventoForm mode="crear" />
        </>
    );
}

export default function AdminEventoNuevoPage() {
    return (
        <RoleGuard requiredRole="admin">
            <AdminLayout>
                <AdminEventoNuevoContent />
            </AdminLayout>
        </RoleGuard>
    );
}
