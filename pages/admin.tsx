import Link from "next/link";
import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import SitterDetailModal from "../components/Admin/SitterDetailModal";
import { ConfirmationModal } from "../components/Shared/ConfirmationModal";
import { Skeleton } from "../components/Shared/Skeleton";
import AdminLayout from "../components/Admin/AdminLayout";
import { Search, Bell, Users, Star, Handshake, CheckCircle, Trash2, FileText, Download, AlertTriangle, MapPin, Phone, Mail, User } from "lucide-react";

function AdminDashboardSkeleton() {
    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
            <div className="mb-8">
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-4 w-48" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <Skeleton className="h-10 w-48 rounded-xl" />
                <Skeleton className="h-10 w-full md:w-96 rounded-xl" />
            </div>

            <div className="bg-white rounded-3xl p-6 border-2 border-slate-300">
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}

import * as XLSX from "xlsx";

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tableLoading, setTableLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"cliente" | "sitter" | "solicitudes">("sitter");
    // ... rest of state


    // ... rest of state

    const checkProfileCompleteness = (user: any, role: "cliente" | "sitter") => {
        const missing: string[] = [];
        if (!user.nombre) missing.push("Nombre");
        if (!user.rut) missing.push("RUT");
        if (!user.telefono) missing.push("Teléfono");
        if (!user.direccion_completa) missing.push("Dirección");

        if (role === "sitter") {
            if (!user.descripcion) missing.push("Descripción");
            if (!user.ocupacion) missing.push("Ocupación");
            if (!user.fecha_nacimiento && !user.edad) missing.push("Fecha Nacimiento/Edad");
            // Check photo? Assuming boolean for now or check string length
            if (!user.foto_perfil) missing.push("Foto Perfil");
        }
        return missing;
    };
    const [users, setUsers] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
        isDestructive: false,
        confirmText: "Confirmar"
    });

    // Stats State
    const [stats, setStats] = useState({
        clientes: 0,
        clientesPendientes: 0,
        clientesAprobados: 0,
        sitters: 0,
        sittersPendientes: 0,
        sittersAprobados: 0,
        solicitudesPendientes: 0,
        solicitudesAsignadas: 0,
        serviciosRealizados: 0
    });

    // Modal State
    const [selectedSitter, setSelectedSitter] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // ... (rest of state)

    const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "confirmed" | "reserved" | "completed" | "cancelled">("all");

    // ... (rest of state)

    useEffect(() => {
        console.log("Admin Dashboard v1.1 - Loaded");
        setCurrentPage(1);
    }, [activeTab, searchTerm, filterStatus]);

    // ... (fetch logic remains)

    // --- CONFIGURACIÓN: Lista de administradores ---
    const ADMIN_EMAILS = ["admin@petmate.cl", "aldo@petmate.cl", "canocortes@gmail.com", "eduardo.a.cordova.d@gmail.com", "acanocts@gmail.com"];

    const checkAuth = async () => {
        setLoading(true); // Ensure loading is true when starting check/fetch
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

        // Verify auth matched, fetch stats but NOT users yet
        await fetchStats();
        setLoading(false);
    };



    const fetchStats = async () => {
        // 1. Clientes
        const { data: clientes } = await supabase
            .from("registro_petmate")
            .select("aprobado")
            .contains("roles", ["cliente"]);

        const clientesTotal = clientes?.length || 0;
        const clientesPendientes = clientes?.filter(c => !c.aprobado).length || 0;
        const clientesAprobados = clientes?.filter(c => c.aprobado).length || 0;

        // 2. Sitters
        const { data: sitters } = await supabase
            .from("registro_petmate")
            .select("aprobado")
            .contains("roles", ["sitter"]);

        const sittersTotal = sitters?.length || 0;
        const sittersPendientes = sitters?.filter(s => !s.aprobado).length || 0;
        const sittersAprobados = sitters?.filter(s => s.aprobado).length || 0;

        // 3. Solicitudes Pendientes (En búsqueda, sin sitter)
        const { count: pendientesCount } = await supabase
            .from("viajes")
            .select("*", { count: "exact", head: true })
            .is("sitter_id", null)
            .neq("estado", "cancelado")
            .neq("estado", "completado");

        // 4. Solicitudes Asignadas (Con sitter, en curso)
        const { count: asignadasCount } = await supabase
            .from("viajes")
            .select("*", { count: "exact", head: true })
            .not("sitter_id", "is", null)
            .neq("estado", "cancelado")
            .neq("estado", "completado");

        // 5. Servicios Realizados (Completados)
        const { count: completadosCount } = await supabase
            .from("viajes")
            .select("*", { count: "exact", head: true })
            .eq("estado", "completado");

        setStats({
            clientes: clientesTotal,
            clientesPendientes,
            clientesAprobados,
            sitters: sittersTotal,
            sittersPendientes,
            sittersAprobados,
            solicitudesPendientes: pendientesCount || 0,
            solicitudesAsignadas: asignadasCount || 0,
            serviciosRealizados: completadosCount || 0
        });
    };

    const fetchUsers = async (shouldSetLoading = true) => {
        if (shouldSetLoading) setTableLoading(true);

        // Si estamos en la tab de solicitudes, usamos la funcion dedicada
        if (activeTab === "solicitudes") {
            await fetchViajes();
            if (shouldSetLoading) setTableLoading(false);
            return;
        }

        // Optimize: Select only necessary columns instead of *
        const { data, error } = await supabase
            .from("registro_petmate")
            .select("*")
            .contains("roles", [activeTab])
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
        if (shouldSetLoading) setTableLoading(false);
    };

    const fetchViajes = async () => {
        // Fetch raw trips
        const { data: viajes, error } = await supabase
            .from("viajes")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching viajes:", error);
            setUsers([]);
            return;
        }

        // Consultar perfiles de usuarios para enriquecer la data
        // Obtenemos los IDs únicos de usuarios involucrados
        const userIds = Array.from(new Set(viajes.map(v => v.user_id).concat(viajes.map(v => v.sitter_id).filter(Boolean))));

        let profilesMap: any = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from("registro_petmate")
                .select("auth_user_id, nombre, apellido_p, email, telefono")
                .in("auth_user_id", userIds);

            if (profiles) {
                profiles.forEach(p => {
                    profilesMap[p.auth_user_id] = p;
                });
            }
        }

        // Combinar data
        const enrichedViajes = viajes.map(v => ({
            ...v,
            cliente: (v.user_id && profilesMap[v.user_id]) || { nombre: "Desconocido", email: "N/A" },
            sitter: (v.sitter_id && profilesMap[v.sitter_id]) || null
        }));

        setUsers(enrichedViajes);
    };

    const executeApproval = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from("registro_petmate")
            .update({ aprobado: !currentStatus })
            .eq("id", userId);

        if (error) {
            alert("Error al actualizar estado");
            console.error(error);
        } else {
            fetchUsers();
            if (selectedSitter && selectedSitter.id === userId) {
                setSelectedSitter((prev: any) => ({ ...prev, aprobado: !currentStatus }));
            }
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false })); // Close modal after action
    };

    const toggleApproval = (userId: string, currentStatus: boolean) => {
        setConfirmModal({
            isOpen: true,
            title: currentStatus ? "Revocar Aprobación" : "Aprobar Usuario",
            message: `¿Estás seguro de que deseas ${currentStatus ? "revocar la aprobación de" : "aprobar a"} este usuario? Esta acción afectará su visibilidad en la plataforma.`,
            confirmText: currentStatus ? "Sí, Revocar" : "Sí, Aprobar",
            isDestructive: currentStatus, // Red for revoking
            onConfirm: () => executeApproval(userId, currentStatus)
        });
    };

    const handleViewDetail = async (user: any) => {
        let enrichedUser = { ...user };

        // Calcular campos faltantes
        // Para calcular campos faltantes, asumimos el rol de la tab activa si es que lo tiene, o el principal
        const roleToCheck = activeTab === "sitter" ? "sitter" : "cliente";
        const missing = checkProfileCompleteness(user, roleToCheck);
        enrichedUser.missingFields = missing;

        // Si es cliente, obtener mascotas
        if (roleToCheck === "cliente") {
            const { data: pets } = await supabase
                .from("mascotas")
                .select("*")
                .eq("user_id", user.auth_user_id);
            if (pets) {
                enrichedUser.pets = pets;
            }
        }

        setSelectedSitter(enrichedUser);
        setIsModalOpen(true);
    };

    // --- ACTIONS ---

    const handleViewDocument = async (path: string) => {
        if (!path) return;

        // Si es una URL completa (http/https), abrirla directamente
        // Esto maneja los archivos subidos al bucket público 'avatars'
        if (path.startsWith('http')) {
            window.open(path, "_blank");
            return;
        }

        // Fallback para paths relativos en bucket privado 'documents'
        try {
            const { data, error } = await supabase.storage
                .from("documents")
                .createSignedUrl(path, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (err) {
            console.error("Error opening document:", err);
            alert("No se pudo abrir el documento. Verifica permisos.");
        }
    };

    const handleDeleteUser = (user: any) => {
        setConfirmModal({
            isOpen: true,
            title: "Eliminar Usuario",
            message: `¿Estás seguro de que deseas eliminar a ${user.nombre}? Esta acción es irreversible y eliminará todos sus datos.`,
            onConfirm: async () => {
                const { error } = await supabase
                    .from("registro_petmate")
                    .delete()
                    .eq("id", user.id);

                if (error) {
                    alert("Error al eliminar usuario: " + error.message);
                } else {
                    // Refresh data
                    await fetchUsers();
                    await fetchStats();
                }
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            isDestructive: true,
            confirmText: "Eliminar"
        });
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only check auth on mount

    useEffect(() => {
        // Fetch on tab change OR when loading finishes
        if (!loading) {
            fetchUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, loading]);


    // --- FILTRADO Y ORDENAMIENTO ---
    const filteredItems = users.filter(item => {
        // 1. Filtro por Texto
        let matchesTerm = true;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            if (activeTab === "solicitudes") {
                const clientName = item.cliente?.nombre?.toLowerCase() || "";
                const clientEmail = item.cliente?.email?.toLowerCase() || "";
                const sitterName = item.sitter?.nombre?.toLowerCase() || "";
                const idStr = item.id?.toLowerCase() || "";
                matchesTerm = clientName.includes(term) || clientEmail.includes(term) || sitterName.includes(term) || idStr.includes(term);
            } else {
                const name = item.nombre ? item.nombre.toLowerCase() : "";
                const lastName = item.apellido_p ? item.apellido_p.toLowerCase() : "";
                const email = item.email ? item.email.toLowerCase() : "";
                const rut = item.rut ? item.rut.toLowerCase() : "";
                const idStr = item.id ? item.id.toLowerCase() : "";
                matchesTerm = name.includes(term) || lastName.includes(term) || email.includes(term) || rut.includes(term) || idStr.includes(term);
            }
        }

        // 2. Filtro por Fecha (Rango)
        let matchesDate = true;
        if (startDate || endDate) {
            const itemDate = new Date(item.created_at); // Asumimos created_at para todos. Para viajes es fecha creación, no inicio travel.
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start && itemDate < start) matchesDate = false;
            if (end) {
                // Ajustar end al final del día
                const endDay = new Date(end);
                endDay.setHours(23, 59, 59, 999);
                if (itemDate > endDay) matchesDate = false;
            }
        }

        // 3. Filtro por Estado (Nuevo)
        let matchesStatus = true;
        if (filterStatus !== 'all') {
            if (activeTab === "solicitudes") {
                const s = item.estado;
                if (filterStatus === 'pending') matchesStatus = ['pendiente', 'publicado', 'solicitado', 'borrador'].includes(s);
                if (filterStatus === 'confirmed') matchesStatus = ['confirmado', 'en_curso', 'aceptado', 'pagado'].includes(s);
                if (filterStatus === 'reserved') matchesStatus = s === 'reservado';
                if (filterStatus === 'completed') matchesStatus = s === 'completado';
                if (filterStatus === 'cancelled') matchesStatus = s === 'cancelado';
            } else {
                if (filterStatus === "pending") matchesStatus = !item.aprobado;
                if (filterStatus === "approved") matchesStatus = item.aprobado;
            }
        }

        return matchesTerm && matchesDate && matchesStatus;
    }).sort((a, b) => {
        if (sortOrder === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortOrder === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

        const nameA = activeTab === "solicitudes"
            ? (a.cliente?.nombre || "")
            : (a.nombre || "");
        const nameB = activeTab === "solicitudes"
            ? (b.cliente?.nombre || "")
            : (b.nombre || "");

        if (sortOrder === "name_asc") return nameA.localeCompare(nameB);
        if (sortOrder === "name_desc") return nameB.localeCompare(nameA);
        return 0;
    });

    // --- PAGINACIÓN ---
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // --- EXPORTAR ---
    const handleExport = () => {
        if (filteredItems.length === 0) {
            alert("No hay datos para exportar con los filtros actuales.");
            return;
        }

        let dataToExport = [];

        if (activeTab === "solicitudes") {
            // ... (export logic logic same as before, abbreviated here if unchanged, but need to keep it for replace)
            dataToExport = filteredItems.map(item => ({
                ID: item.id,
                Estado: item.estado,
                "Cliente Nombre": `${item.cliente?.nombre || ""} ${item.cliente?.apellido_p || ""}`.trim(),
                "Cliente Email": item.cliente?.email || "",
                "Sitter Nombre": item.sitter ? `${item.sitter.nombre} ${item.sitter.apellido_p}` : "Pendiente",
                "Sitter Email": item.sitter?.email || "",
                Servicio: item.servicio,
                "Fecha Inicio": item.fecha_inicio,
                "Fecha Fin": item.fecha_fin,
                Total: item.total,
                "Creado en": new Date(item.created_at).toLocaleString("es-CL")
            }));
        } else {
            dataToExport = filteredItems.map(item => ({
                ID: item.id,
                Nombre: item.nombre,
                Apellido: item.apellido_p,
                Email: item.email,
                RUT: item.rut,
                Telefono: item.telefono,
                Comuna: item.comuna,
                Region: item.region,
                Direccion: item.direccion_completa,
                Estado: item.aprobado ? "Aprobado" : "Pendiente",
                "Registrado en": new Date(item.created_at).toLocaleString("es-CL"),
                ...(activeTab === "sitter" ? {
                    Ocupacion: item.ocupacion,
                    Edad: item.edad,
                    "En Casa": item.servicio_en_casa ? "Sí" : "No",
                    "A Domicilio": item.servicio_a_domicilio ? "Sí" : "No"
                } : {})
            }));
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab.toUpperCase());
        XLSX.writeFile(workbook, `PetMate_Export_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <AdminLayout>
            <Head>
                <title>Panel de Administración | Pawnecta</title>
            </Head>

            {loading ? (
                <div className="w-full p-8 px-4">
                    <AdminDashboardSkeleton />
                </div>
            ) : (<div className="w-full pb-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                    <h1 className="text-3xl font-bold text-slate-900">Administrador</h1>
                    <div className="flex items-center justify-between mt-1">
                        <p className="text-slate-500">Gestión de usuarios y solicitudes</p>
                        <Link href="/admin/notificaciones" className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
                            <Bell className="w-4 h-4" /> <span className="hidden sm:inline">Notificaciones</span>
                            {stats.solicitudesPendientes + stats.sittersPendientes > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                    {stats.solicitudesPendientes + stats.sittersPendientes}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {/* RESUMEN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usuarios</p>
                            <Users className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{stats.clientes}</p>
                        <div className="flex gap-2 mt-2 text-[10px]">
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{stats.clientesAprobados} OK</span>
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{stats.clientesPendientes} Pend.</span>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sitters</p>
                            <Star className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-3xl font-bold text-emerald-600">{stats.sitters}</p>
                        <div className="flex gap-2 mt-2 text-[10px]">
                            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{stats.sittersAprobados} OK</span>
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">{stats.sittersPendientes} Pend.</span>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-amber-100 bg-gradient-to-br from-white to-amber-50/20">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">En Búsqueda</p>
                            <Search className="w-5 h-5 text-amber-400" />
                        </div>
                        <p className="text-3xl font-bold text-amber-600">{stats.solicitudesPendientes}</p>
                        <p className="text-[10px] text-amber-600/70 mt-1">Sin Sitter</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Asignadas</p>
                            <Handshake className="w-5 h-5 text-indigo-400" />
                        </div>
                        <p className="text-3xl font-bold text-indigo-600">{stats.solicitudesAsignadas}</p>
                        <p className="text-[10px] text-indigo-600/70 mt-1">Con Sitter</p>
                    </div>

                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Servicios OK</p>
                            <CheckCircle className="w-5 h-5 text-sky-400" />
                        </div>
                        <p className="text-3xl font-bold text-sky-600">{stats.serviciosRealizados}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Histórico</p>
                    </div>
                </div>

                <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    {/* CONTROLES SUPERIORES (Tabs, Buscador, Orden) */}
                    <div className="flex flex-col gap-6 mb-8">

                        {/* Modern Tabs */}
                        <div className="border-b border-slate-200">
                            <nav className="-mb-px flex gap-6" aria-label="Tabs">
                                <button
                                    onClick={() => setActiveTab("sitter")}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all
                                        ${activeTab === "sitter"
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}
                                    `}
                                >
                                    Sitters
                                </button>
                                <button
                                    onClick={() => setActiveTab("cliente")}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all
                                        ${activeTab === "cliente"
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}
                                    `}
                                >
                                    Usuarios
                                </button>
                                <button
                                    onClick={() => setActiveTab("solicitudes")}
                                    className={`
                                        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all
                                        ${activeTab === "solicitudes"
                                            ? "border-emerald-500 text-emerald-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"}
                                    `}
                                >
                                    Solicitudes
                                </button>
                            </nav>
                        </div>

                        {/* Buscador y Filtros Row */}
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">

                            {/* Search Left */}
                            <div className="relative w-full xl:w-96">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, email, rut..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-11 w-full pl-11 pr-4 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-0 text-sm transition-all"
                                />
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            </div>

                            {/* Filters Right */}
                            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">

                                {/* Status Filter */}
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer text-slate-600"
                                >
                                    <option value="all">Todos los Estados</option>
                                    {activeTab === "solicitudes" ? (
                                        <>
                                            <option value="pending">Pendientes / Buscando</option>
                                            <option value="confirmed">Confirmados / En Curso</option>
                                            <option value="reserved">Por Confirmar (Reservado)</option>
                                            <option value="completed">Completados</option>
                                            <option value="cancelled">Cancelados</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="pending">Pendientes de Aprobación</option>
                                            <option value="approved">Aprobados</option>
                                        </>
                                    )}
                                </select>

                                {/* Date Range */}
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none w-32"
                                    />
                                    <span className="text-slate-400">-</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-9 px-2 rounded-lg bg-white border border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 outline-none w-32"
                                    />
                                </div>

                                {/* Sort */}
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer text-slate-600"
                                >
                                    <option value="newest">Más recientes</option>
                                    <option value="oldest">Más antiguos</option>
                                    <option value="name_asc">Nombre A-Z</option>
                                    <option value="name_desc">Nombre Z-A</option>
                                </select>

                                {/* Export */}
                                <button
                                    onClick={handleExport}
                                    className="h-10 bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-900/10"
                                >
                                    <Download className="w-4 h-4" /> <span className="hidden xl:inline">Exportar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABLA DE RESULTADOS */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">

                    {/* MOBILE CARDS VIEW (Visible < md) */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {tableLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                <p className="text-sm text-slate-500 font-medium">Cargando datos...</p>
                            </div>
                        ) : paginatedItems.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                No se encontraron resultados
                                {searchTerm && <button onClick={() => setSearchTerm("")} className="block w-full mt-2 text-emerald-600 text-xs font-bold hover:underline">Limpiar búsqueda</button>}
                            </div>
                        ) : (
                            paginatedItems.map((item) => (
                                <div key={item.id} className="p-4 space-y-3">
                                    {/* Cabecera Card */}
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            {activeTab !== "solicitudes" && (
                                                <div className="relative">
                                                    {item.foto_perfil ? (
                                                        <img src={item.foto_perfil} alt="Perfil" className="h-10 w-10 rounded-full object-cover bg-slate-100" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                                                            {item.nombre?.[0] || "?"}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div>
                                                {activeTab === "solicitudes" ? (
                                                    <span className="font-mono text-xs text-slate-500 font-bold">#{item.id.slice(0, 8).toUpperCase()}</span>
                                                ) : (
                                                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2" onClick={() => handleViewDetail(item)}>
                                                        {item.nombre} {item.apellido_p}
                                                        {(() => {
                                                            const missing = checkProfileCompleteness(item, activeTab === "sitter" ? "sitter" : "cliente");
                                                            return missing.length > 0 ? <span className="text-base">⚠️</span> : null;
                                                        })()}
                                                    </div>
                                                )}
                                                <div className="text-xs text-slate-500">
                                                    {activeTab === "solicitudes" ? item.servicio : item.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Estado Badge */}
                                        {activeTab === "solicitudes" ? (
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold 
                                                ${item.estado === 'completado' ? 'bg-blue-100 text-blue-700' :
                                                    item.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                                                        item.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                                            item.estado === 'reservado' ? 'bg-amber-100 text-amber-700' :
                                                                item.estado === 'solicitado' ? 'bg-indigo-100 text-indigo-700' :
                                                                    item.estado === 'publicado' ? 'bg-sky-100 text-sky-700' :
                                                                        'bg-slate-100 text-slate-700'}`}>
                                                {(item.estado || "Desconocido").toUpperCase()}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => toggleApproval(item.id, item.aprobado)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold ${item.aprobado ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}
                                            >
                                                {item.aprobado ? "APROBADO" : "PENDIENTE"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Detalles Body */}
                                    <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2">
                                        {activeTab === "solicitudes" ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Usuario</span>
                                                        <span className="font-medium text-slate-700">{item.cliente?.nombre} {item.cliente?.apellido_p}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-slate-400 text-[10px] uppercase font-bold">Sitter</span>
                                                        <span className="font-medium text-slate-700">{item.sitter?.nombre ? `${item.sitter.nombre} ${item.sitter.apellido_p}` : '--'}</span>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-300 mt-2">
                                                    <span className="block text-slate-400 text-[10px] uppercase font-bold mb-1">Fechas</span>
                                                    <div className="flex justify-between text-slate-700">
                                                        <span>{item.fecha_inicio}</span>
                                                        <span>→</span>
                                                        <span>{item.fecha_fin}</span>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3 h-3 text-emerald-500" /> {item.telefono || "N/A"}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3 h-3 text-emerald-500" /> {item.rut || "N/A"}
                                                    </div>
                                                    <div className="flex items-center gap-2 line-clamp-1">
                                                        <MapPin className="w-3 h-3 text-emerald-500" /> {item.direccion_completa || "Sin dirección"}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Acciones Footer */}
                                    <div className="flex justify-end gap-3 pt-1">
                                        {activeTab === "solicitudes" ? (
                                            item.estado !== 'cancelado' && item.estado !== 'completado' && (
                                                <button
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: "Cancelar Solicitud",
                                                            message: "¿Estás seguro de cancelar esta solicitud? Esta acción no se puede deshacer.",
                                                            onConfirm: () => alert("Funcionalidad de cancelar en construcción"),
                                                            isDestructive: true,
                                                            confirmText: "Sí, Cancelar"
                                                        });
                                                    }}
                                                    className="text-xs text-red-600 hover:text-red-800 font-bold px-3 py-2 bg-red-50 rounded-lg w-full"
                                                >
                                                    Cancelar Solicitud
                                                </button>
                                            )
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleDeleteUser(item)}
                                                    className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    Eliminar
                                                </button>
                                                <button
                                                    onClick={() => handleViewDetail(item)}
                                                    className="flex-1 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                >
                                                    Ver Detalles
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                                <tr>
                                    {activeTab === "solicitudes" ? (
                                        <>
                                            <th className="px-6 py-4">ID</th>
                                            <th className="px-6 py-4">Origen</th>
                                            <th className="px-6 py-4">Estado</th>
                                            <th className="px-6 py-4">Cliente</th>
                                            <th className="px-6 py-4">Sitter Asignado</th>
                                            <th className="px-6 py-4">Detalles</th>
                                            <th className="px-6 py-4">Fechas</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4">Usuario</th>
                                            <th className="px-6 py-4">Contacto & RUT</th>
                                            <th className="px-6 py-4">Ubicación</th>
                                            <th className="px-6 py-4">Documentos & Estado</th>
                                            <th className="px-6 py-4">Registro</th>
                                            <th className="px-6 py-4 text-right">Acciones</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p className="text-sm text-slate-500 font-medium">Cargando datos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center">
                                            <div className="text-slate-400 mb-2">No se encontraron resultados</div>
                                            {searchTerm && <button onClick={() => setSearchTerm("")} className="text-emerald-600 text-xs font-bold hover:underline">Limpiar búsqueda</button>}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedItems.map((item) => {
                                        if (activeTab === "solicitudes") {
                                            // Render fila de solicitud
                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-mono text-xs text-slate-500 font-bold">#{item.id.slice(0, 8).toUpperCase()}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.postulaciones_count > 0 ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                                                                🌐 Public
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                                                                Directa
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold 
                                                            ${item.estado === 'completado' ? 'bg-blue-100 text-blue-700' :
                                                                item.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                                                                    item.estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                                                                        item.estado === 'reservado' ? 'bg-amber-100 text-amber-700' :
                                                                            item.estado === 'solicitado' ? 'bg-indigo-100 text-indigo-700' :
                                                                                item.estado === 'publicado' ? 'bg-sky-100 text-sky-700' :
                                                                                    'bg-slate-100 text-slate-700'}`}>
                                                            {(item.estado || "Desconocido").toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900 truncate max-w-[150px]">{item.cliente?.nombre || 'Desc.'} {item.cliente?.apellido_p || ''}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.cliente?.email || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.sitter ? (
                                                            <div>
                                                                <div className="font-medium text-slate-900 truncate max-w-[150px]">{item.sitter.nombre} {item.sitter.apellido_p}</div>
                                                                <div className="text-xs text-slate-500 truncate max-w-[150px]">{item.sitter.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">-- Pendiente --</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        <div><span className="font-semibold">{item.servicio || "N/A"}</span></div>
                                                        <div className="text-slate-500">
                                                            {item.perros > 0 && <span>🐶 {item.perros} </span>}
                                                            {item.gatos > 0 && <span>🐱 {item.gatos} </span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        <div>Desde: {item.fecha_inicio || "-"}</div>
                                                        <div>Hasta: {item.fecha_fin || "-"}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {item.estado !== 'cancelado' && item.estado !== 'completado' && (
                                                            <button
                                                                onClick={() => {
                                                                    setConfirmModal({
                                                                        isOpen: true,
                                                                        title: "Cancelar Solicitud",
                                                                        message: "¿Estás seguro de cancelar esta solicitud? Esta acción no se puede deshacer.",
                                                                        onConfirm: () => alert("Funcionalidad de cancelar en construcción"), // To come: actual logic
                                                                        isDestructive: true,
                                                                        confirmText: "Sí, Cancelar"
                                                                    });
                                                                }}
                                                                className="text-xs text-red-600 hover:text-red-800 font-medium"
                                                            >
                                                                Cancelar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Render fila de usuario (cliente/sitter)
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-900 w-1/4">
                                                    <div className="flex items-center gap-3">
                                                        {item.foto_perfil ? (
                                                            <img src={item.foto_perfil} alt="Perfil" className="h-10 w-10 rounded-full object-cover bg-slate-100" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xs uppercase">
                                                                {item.nombre?.[0] || "?"}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="font-bold cursor-pointer hover:text-emerald-700 flex items-center gap-2" onClick={() => handleViewDetail(item)}>
                                                                {item.nombre} {item.apellido_p}
                                                                {(() => {
                                                                    const missing = checkProfileCompleteness(item, activeTab === "sitter" ? "sitter" : "cliente");
                                                                    return missing.length > 0 ? (
                                                                        <span title={`Faltan datos: ${missing.join(', ')}`} className="flex items-center">
                                                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                                        </span>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                            <span className="block text-xs font-normal text-slate-400">ID: {item.id.slice(0, 8)}...</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 w-1/4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs truncate max-w-[200px]" title={item.email}>
                                                            <Mail className="w-3 h-3 text-emerald-500" /> {item.email}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Phone className="w-3 h-3 text-emerald-500" /> {item.telefono || "N/A"}
                                                        </div>
                                                        {item.rut && (
                                                            <div className="flex items-center gap-2 text-xs text-slate-700 font-bold border-t border-slate-300 pt-1 mt-1">
                                                                <span className="text-slate-400">RUT:</span> {item.rut}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 w-1/4">
                                                    {item.direccion_completa ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={item.direccion_completa}>
                                                                {item.calle ? `${item.calle} ${item.numero}` : item.direccion_completa}
                                                            </span>
                                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                <MapPin className="w-3 h-3" />
                                                                {item.comuna}, {item.region}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                            {item.comuna || "Sin comuna"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-2">
                                                        {activeTab === "sitter" && item.certificado_antecedentes ? (
                                                            <button
                                                                onClick={() => handleViewDocument(item.certificado_antecedentes)}
                                                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                            >
                                                                <FileText className="w-3 h-3" /> Ver Antecedentes
                                                            </button>
                                                        ) : activeTab === "sitter" ? (
                                                            <span className="text-xs text-slate-400 italic">Sin antecedentes</span>
                                                        ) : null}
                                                        <div>
                                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold ${item.aprobado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                                {item.aprobado ? "Aprobado" : "Pendiente"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-400 w-1/6">
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString("es-CL", {
                                                        day: 'numeric', month: 'short'
                                                    }) : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col gap-2 items-end">
                                                        <button
                                                            onClick={() => toggleApproval(item.id, item.aprobado)}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${item.aprobado
                                                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                                                : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-sm"
                                                                }`}
                                                        >
                                                            {item.aprobado ? "Revocar" : "Aprobar"}
                                                        </button>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleViewDetail(item)}
                                                                className="text-xs text-slate-500 hover:text-slate-800 font-medium bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200"
                                                            >
                                                                Ver Todo
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(item)}
                                                                className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                                                                title="Eliminar usuario"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-300 flex items-center justify-between bg-white">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border-2 border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <span className="text-sm text-slate-600">
                                Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 border-2 border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                            </button>
                        </div>
                    )}
                </div>
                {/* Modal de Detalle (Genérico para Sitter y Cliente) */}
                <SitterDetailModal
                    sitter={selectedSitter}
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onApprove={toggleApproval}
                    onViewDocument={handleViewDocument}
                />

                {/* Modal Global de Confirmación */}
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText={confirmModal.confirmText}
                    isDestructive={confirmModal.isDestructive}
                />
            </div>
            )}
        </AdminLayout>
    );
}
