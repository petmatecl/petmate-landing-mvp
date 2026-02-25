import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/Admin/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import VideoList from '../../components/Admin/VideoList';
import { Loader2 } from 'lucide-react';

export default function AdminVideosPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const ADMIN_EMAILS = ["admin@petmate.cl", "aldo@petmate.cl", "canocortes@gmail.com", "eduardo.a.cordova.d@gmail.com", "acanocts@gmail.com"];

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        if (!ADMIN_EMAILS.includes(session.user.email || "")) {
            alert("Acceso denegado: No tienes permisos de administrador.");
            router.push("/");
            return;
        }

        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
            </div>
        );
    }

    return (
        <AdminLayout>
            <Head>
                <title>Videos de Sitters | Admin Pawnecta</title>
            </Head>
            <div className="mb-8">
                <h1 className="text-2xl font-extrabold text-slate-900">Gestión de Videos</h1>
                <p className="text-slate-500">Visualiza y descarga los videos de presentación de los cuidadores.</p>
            </div>

            <VideoList />
        </AdminLayout>
    );
}
