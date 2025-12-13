import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import SitterDetailModal from "../components/Admin/SitterDetailModal";

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"cliente" | "petmate">("petmate");
    const [users, setUsers] = useState<any[]>([]);

    // Modal State
    const [selectedSitter, setSelectedSitter] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    // --- CONFIGURACIÓN: Lista de administradores ---
    const ADMIN_EMAILS = ["admin@petmate.cl", "aldo@petmate.cl", "canocortes@gmail.com"];

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.push("/login");
            return;
        }

        // Verificar si el email está en la lista de permitidos
        if (!ADMIN_EMAILS.includes(session.user.email || "")) {
            alert("Acceso denegado: No tienes permisos de administrador.");
            router.push("/");
            return;
        }

        setLoading(false);
        fetchUsers();
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from("registro_petmate")
            .select("*")
            .eq("tipo_usuario", activeTab)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
    };

    const toggleApproval = async (userId: string, currentStatus: boolean) => {
        if (!confirm(`¿Estás seguro de cambiar el estado a ${currentStatus ? "Pendiente" : "Aprobado"}?`)) return;

        const { error } = await supabase
            .from("registro_petmate")
            .update({ aprobado: !currentStatus })
            .eq("id", userId);

        if (error) {
            alert("Error al actualizar estado");
            console.error(error);
        } else {
            // Recargar lista y cerrar modal si está abierto pero no es necesario cerrarlo obligatoriamente
            fetchUsers();

            // Si estamos en el modal, actualizamos el objeto local para reflejar el cambio inmediato
            if (selectedSitter && selectedSitter.id === userId) {
                setSelectedSitter((prev: any) => ({ ...prev, aprobado: !currentStatus }));
            }
        }
    };

    const handleViewDetail = (user: any) => {
        setSelectedSitter(user);
        setIsModalOpen(true);
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-slate-50 py-10">
            <Head>
                <title>Panel de Administración | PetMate</title>
            </Head>

            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Administración</h1>
                        <p className="text-slate-500 mt-1">Gestión de usuarios registrados</p>
                    </div>
                    <div className="flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
                        <button
                            onClick={() => setActiveTab("petmate")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "petmate"
                                ? "bg-emerald-100 text-emerald-700"
                                : "text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            PetMates
                        </button>
                        <button
                            onClick={() => setActiveTab("cliente")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "cliente"
                                ? "bg-emerald-100 text-emerald-700"
                                : "text-slate-600 hover:bg-slate-50"
                                }`}
                        >
                            Clientes
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">Contacto</th>
                                    <th className="px-6 py-4">Ubicación</th>
                                    {activeTab === "petmate" && <th className="px-6 py-4">Documentos & Estado</th>}
                                    <th className="px-6 py-4">Registro</th>
                                    {activeTab === "petmate" && <th className="px-6 py-4 text-right">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan={activeTab === "petmate" ? 6 : 4} className="px-6 py-12 text-center text-slate-400">
                                            No hay usuarios registrados en esta categoría aún.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 w-1/4">
                                                <div className="flex items-center gap-3">
                                                    {user.foto_perfil ? (
                                                        <img src={user.foto_perfil} alt="Perfil" className="h-10 w-10 rounded-full object-cover bg-slate-100" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                                                            {user.nombre?.[0] || "?"}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold">{user.nombre} {user.apellido}</div>
                                                        <span className="block text-xs font-normal text-slate-400">ID: {user.id.slice(0, 8)}...</span>
                                                        {activeTab === "petmate" && (
                                                            <button
                                                                onClick={() => handleViewDetail(user)}
                                                                className="text-xs text-emerald-600 hover:underline mt-0.5 font-medium"
                                                            >
                                                                Ver perfil completo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 w-1/4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-emerald-500">✉</span> {user.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className="text-emerald-500">📞</span> {user.telefono || "N/A"}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 w-1/4">
                                                {user.direccion_completa ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={user.direccion_completa}>
                                                            {user.calle ? `${user.calle} ${user.numero}` : user.direccion_completa}
                                                        </span>
                                                        <span className="text-xs text-slate-500">{user.comuna}, {user.region}</span>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                        {user.comuna || "Sin comuna"}
                                                    </span>
                                                )}
                                            </td>
                                            {activeTab === "petmate" && (
                                                <td className="px-6 py-4">
                                                    <div className="space-y-2">
                                                        {user.certificado_antecedentes ? (
                                                            <a href={`https://vujyabfrlqjnjrccylmp.supabase.co/storage/v1/object/public/documents/${user.certificado_antecedentes}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                                                📄 Ver Antecedentes
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Sin antecedentes</span>
                                                        )}
                                                        <div>
                                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${user.aprobado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                                {user.aprobado ? "Aprobado" : "Pendiente"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-xs text-slate-400 w-1/6">
                                                {new Date(user.created_at).toLocaleDateString("es-CL", {
                                                    day: 'numeric', month: 'short'
                                                })}
                                            </td>
                                            {activeTab === "petmate" && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <button
                                                            onClick={() => toggleApproval(user.id, user.aprobado)}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${user.aprobado
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-sm"
                                                                }`}
                                                        >
                                                            {user.aprobado ? "Revocar" : "Aprobar"}
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewDetail(user)}
                                                            className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                                                        >
                                                            Ver Detalle
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de Detalle */}
            <SitterDetailModal
                sitter={selectedSitter}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onApprove={toggleApproval}
            />
        </div>
    );
}
