import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Bell, Calendar, ChevronRight, User } from "lucide-react";
import AdminLayout from "../../components/Admin/AdminLayout";

export default function AdminNotifications() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        sittersPendientes: 0,
        solicitudesPendientes: 0
    });
    const [activities, setActivities] = useState<any[]>([]);

    // --- CONFIGURACIÓN: Lista de administradores ---
    const ADMIN_EMAILS = ["admin@petmate.cl", "aldo@petmate.cl", "canocortes@gmail.com", "eduardo.a.cordova.d@gmail.com", "acanocts@gmail.com"];

    const fetchData = async () => {
        // 1. Stats Counters
        const { count: sittersPendientes } = await supabase
            .from("registro_petmate")
            .select("*", { count: "exact", head: true })
            .contains("roles", ["petmate"])
            .eq("aprobado", false);

        const { count: solicitudesPendientes } = await supabase
            .from("viajes")
            .select("*", { count: "exact", head: true })
            .is("sitter_id", null)
            .neq("estado", "cancelado")
            .neq("estado", "completado");

        setStats({
            sittersPendientes: sittersPendientes || 0,
            solicitudesPendientes: solicitudesPendientes || 0
        });

        // 2. Recent Activity (Latest 20 users)
        const { data: users } = await supabase
            .from("registro_petmate")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);

        setActivities(users || []);
    };

    const checkAuth = async () => {
        setLoading(true);
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

        await fetchData();
        setLoading(false);
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AdminLayout>
            <Head>
                <title>Notificaciones | Admin Pawnecta</title>
            </Head>

            <div className="w-full pb-20">
                {/* Header with Back Button */}
                <div className="mb-8 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white border-2 border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Centro de Notificaciones</h1>
                        <p className="text-slate-500">Actividad reciente y tareas pendientes</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* Quick Actions / Pending Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                                            <User size={20} />
                                        </div>
                                        <p className="font-bold text-slate-600 uppercase text-xs tracking-wider">Sitters Pendientes</p>
                                    </div>
                                    <p className="text-4xl font-extrabold text-slate-900">{stats.sittersPendientes}</p>
                                    <Link href="/admin?tab=petmate&filter=pending" className="mt-4 text-amber-600 font-bold text-sm hover:underline flex items-center gap-1">
                                        Revisar solicitudes <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                            <Calendar size={20} />
                                        </div>
                                        <p className="font-bold text-slate-600 uppercase text-xs tracking-wider">Solicitudes sin Sitter</p>
                                    </div>
                                    <p className="text-4xl font-extrabold text-slate-900">{stats.solicitudesPendientes}</p>
                                    <Link href="/admin?tab=solicitudes&filter=pending" className="mt-4 text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
                                        Gestionar viajes <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Feed */}
                        <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-300 overflow-hidden">
                            <div className="p-6 border-b border-slate-300 flex items-center gap-2">
                                <Bell className="text-slate-400" size={20} />
                                <h3 className="font-bold text-lg text-slate-900">Últimos Registros</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {activities.map((user) => (
                                    <div key={user.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0
                                            ${user.roles?.includes('petmate') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}
                                        `}>
                                            {user.nombre?.[0] || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                <span className="font-bold">{user.nombre} {user.apellido_p}</span> se registró como {user.roles?.includes('petmate') ? 'Sitter' : 'Cliente'}.
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {new Date(user.created_at).toLocaleString('es-CL')} • {user.email}
                                            </p>
                                        </div>

                                        {!user.aprobado ? (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                                Pendiente
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                                                Aprobado
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
