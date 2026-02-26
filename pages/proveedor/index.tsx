import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import RoleGuard from '../../components/Shared/RoleGuard';
import ServiceFormModal from '../../components/Proveedor/ServiceFormModal';
import ConversationList from '../../components/Chat/ConversationList';
import MessageThread from '../../components/Chat/MessageThread';
import ReviewSummary from '../../components/Service/ReviewSummary';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import {
    Clock, AlertTriangle, Briefcase, User as UserIcon,
    Star, MessageSquare, BarChart, Edit, Trash2, LayoutDashboard, Eye, Camera,
    Image as ImageIcon, Loader2, CheckCircle, XCircle, CheckCircle2, Circle
} from 'lucide-react';

type TabType = 'servicios' | 'perfil' | 'evaluaciones' | 'mensajes' | 'estadisticas';

export default function ProveedorDashboard() {
    const router = useRouter();
    const { user, isLoading: userLoading } = useUser();
    const [proveedor, setProveedor] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<TabType>('servicios');

    // Modals
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

    // Tab Data
    const [servicios, setServicios] = useState<any[]>([]);
    const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ vistas: 0, activos: 0, evaluaciones: 0, consultas: 0 });

    // Chat Data
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    // Profile Edit State
    const [bio, setBio] = useState('');
    const [comuna, setComuna] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [telefono, setTelefono] = useState('');
    const [emailPublico, setEmailPublico] = useState('');
    const [mostrarWhatsapp, setMostrarWhatsapp] = useState(true);
    const [mostrarTelefono, setMostrarTelefono] = useState(false);
    const [mostrarEmail, setMostrarEmail] = useState(false);
    const [fotoPerfil, setFotoPerfil] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (user && !userLoading) {
            checkProviderStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, userLoading]);

    const checkProviderStatus = async () => {
        setStatusLoading(true);
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .eq('auth_user_id', user.id)
                .single();

            if (error) throw error;
            setProveedor(data);

            // Init profile state
            setBio(data.bio || '');
            setComuna(data.comuna || '');
            setWhatsapp(data.whatsapp || '');
            setTelefono(data.telefono || '');
            setEmailPublico(data.email_publico || '');
            setMostrarWhatsapp(data.mostrar_whatsapp ?? true);
            setMostrarTelefono(data.mostrar_telefono ?? false);
            setMostrarEmail(data.mostrar_email ?? false);
            setFotoPerfil(data.foto_perfil || '');

            if (data.estado === 'aprobado') {
                loadTabData('servicios', data.id, data.auth_user_id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setStatusLoading(false);
        }
    };

    const loadTabData = async (tab: TabType, provId: string, authId: string) => {
        if (tab === 'servicios') {
            const { data } = await supabase
                .from('servicios_publicados')
                .select(`*, categoria:categorias_servicio(nombre, icono)`)
                .eq('proveedor_id', provId)
                .order('created_at', { ascending: false });
            setServicios(data || []);
        } else if (tab === 'evaluaciones') {
            const { data } = await supabase
                .from('evaluaciones')
                .select(`*, servicio:servicios_publicados(titulo)`)
                .eq('proveedor_id', provId)
                .order('created_at', { ascending: false });
            setEvaluaciones(data || []);
        } else if (tab === 'estadisticas') {
            const [vistasRes, activosRes, evalRes, chatRes] = await Promise.all([
                supabase.from('servicios_publicados').select('vistas').eq('proveedor_id', provId),
                supabase.from('servicios_publicados').select('id', { count: 'exact' }).eq('proveedor_id', provId).eq('activo', true),
                supabase.from('evaluaciones').select('id', { count: 'exact' }).eq('proveedor_id', provId).eq('estado', 'aprobado'),
                supabase.from('conversations').select('id', { count: 'exact' }).eq('sitter_id', authId)
            ]);

            const totalVistas = vistasRes.data?.reduce((acc, curr) => acc + (curr.vistas || 0), 0) || 0;
            setStats({
                vistas: totalVistas,
                activos: activosRes.count || 0,
                evaluaciones: evalRes.count || 0,
                consultas: chatRes.count || 0
            });
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (proveedor) {
            loadTabData(tab, proveedor.id, proveedor.auth_user_id);
        }
    };

    // Profile Handlers
    const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploadingAvatar(true);
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

        if (uploadError) {
            toast.error('Error al subir imagen');
            setUploadingAvatar(false);
            return;
        }

        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const url = `${publicData.publicUrl}?t=${Date.now()}`;
        setFotoPerfil(url);

        await supabase.from('proveedores').update({ foto_perfil: url }).eq('auth_user_id', user.id);
        // Also update shared registry
        await supabase.from('registro_petmate').update({ foto_perfil: url }).eq('auth_user_id', user.id);

        setUploadingAvatar(false);
        toast.success('Foto de perfil actualizada');
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingProfile(true);
        const { error } = await supabase.from('proveedores').update({
            bio, comuna, whatsapp, telefono, email_publico: emailPublico,
            mostrar_whatsapp: mostrarWhatsapp, mostrar_telefono: mostrarTelefono, mostrar_email: mostrarEmail
        }).eq('auth_user_id', user.id);

        setSavingProfile(false);
        if (error) {
            toast.error('Error al guardar el perfil');
        } else {
            toast.success('Perfil actualizado correctamente');
        }
    };

    // Services Handlers
    const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('servicios_publicados').update({ activo: !currentStatus }).eq('id', id);
        if (!error) {
            setServicios(prev => prev.map(s => s.id === id ? { ...s, activo: !currentStatus } : s));
            toast.success(currentStatus ? 'Servicio desactivado' : 'Servicio activado');
        }
    };

    const deleteService = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este servicio temporalmente?')) return;
        const { error } = await supabase.from('servicios_publicados').update({ activo: false }).eq('id', id); // Soft delete / deactivate
        if (!error) {
            setServicios(prev => prev.map(s => s.id === id ? { ...s, activo: false } : s));
            toast.success('Servicio desactivado correctamente');
        }
    };


    if (userLoading || statusLoading) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </>
        );
    }

    if (proveedor?.estado === 'pendiente') {
        return (
            <>
                <Head><title>Cuenta en revisión | Pawnecta</title></Head>
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-sm border border-slate-200 p-8">
                        {/* Header Centralizado */}
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock size={40} className="text-amber-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">
                                Tu solicitud está en revisión
                            </h1>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                Revisamos cada proveedor manualmente para garantizar la confianza en la plataforma.
                            </p>
                        </div>

                        {/* Timeline de 3 pasos */}
                        <div className="mb-8 pl-4 space-y-6">
                            {/* Paso 1: Completado */}
                            <div className="relative flex items-center gap-4">
                                <div className="absolute left-[11px] top-8 w-[2px] h-6 bg-slate-200"></div>
                                <div className="bg-white z-10 text-emerald-500 rounded-full bg-emerald-50 w-6 h-6 flex items-center justify-center shrink-0">
                                    <CheckCircle2 size={24} className="fill-current text-white bg-emerald-500 rounded-full border-2 border-white" />
                                </div>
                                <span className="text-slate-900 font-medium line-through decoration-slate-300">Solicitud recibida</span>
                            </div>

                            {/* Paso 2: Activo */}
                            <div className="relative flex items-center gap-4">
                                <div className="absolute left-[11px] top-8 w-[2px] h-6 bg-slate-100"></div>
                                <div className="bg-white z-10 text-amber-500 shrink-0">
                                    <Clock size={24} className="bg-white" />
                                </div>
                                <span className="text-amber-700 font-bold">En revisión por el equipo</span>
                            </div>

                            {/* Paso 3: Pendiente */}
                            <div className="relative flex items-center gap-4">
                                <div className="bg-white z-10 text-slate-300 shrink-0">
                                    <Circle size={24} className="bg-white" />
                                </div>
                                <span className="text-slate-400 font-medium">Perfil aprobado y activo</span>
                            </div>
                        </div>

                        {/* Mensaje de Plaza */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 flex items-start gap-3">
                            <Clock size={20} className="text-slate-400 shrink-0 mt-0.5" />
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Te notificaremos a tu correo en un plazo de <strong>24 a 48 horas</strong> hábiles.
                            </p>
                        </div>

                        {/* Mientras esperas */}
                        <div className="border border-slate-100 rounded-xl p-5 mb-8 bg-white shadow-sm">
                            <h3 className="font-bold text-slate-800 text-sm mb-3">Mientras esperas...</h3>
                            <ul className="space-y-3">
                                <li className="flex gap-2 items-start text-sm text-slate-600">
                                    <span className="text-slate-300 mt-0.5">•</span>
                                    <span>Prepara fotos de tu espacio o de los servicios que ofreces para subirlas apenas tu perfil esté activo.</span>
                                </li>
                                <li className="flex gap-2 items-start text-sm text-slate-600">
                                    <span className="text-slate-300 mt-0.5">•</span>
                                    <span>Revisa los consejos para proveedores en nuestra sección de ayuda o FAQs.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Acciones */}
                        <button
                            onClick={() => router.push('/')}
                            className="w-full bg-slate-100 text-slate-700 font-bold py-3 px-6 rounded-xl hover:bg-slate-200 transition-colors shadow-sm"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </>
        );
    }

    if (proveedor?.estado === 'suspendido') {
        return (
            <>
                <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-4">Tu cuenta fue suspendida</h1>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            Si crees que esto es un error o deseas apelar esta decisión, por favor contáctanos en soporte@pawnecta.com.
                        </p>
                    </div>
                </div>
            </>
        );
    }

    // MAIN DASHBOARD
    return (
        <>
            <Head><title>Mi Panel | Pawnecta</title></Head>
            <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex w-[260px] flex-col bg-white border-r border-slate-200 h-[calc(100vh-64px)] shrink-0 sticky top-16">
                    <div className="p-6">
                        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-2">Menú Principal</h2>
                        <nav className="flex flex-col gap-2">
                            {[
                                { id: 'servicios', label: 'Mis Servicios', icon: <Briefcase size={20} /> },
                                { id: 'perfil', label: 'Mi Perfil', icon: <UserIcon size={20} /> },
                                { id: 'evaluaciones', label: 'Evaluaciones', icon: <Star size={20} /> },
                                { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={20} /> },
                                { id: 'estadisticas', label: 'Estadísticas', icon: <BarChart size={20} /> },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabChange(item.id as TabType)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-left ${activeTab === item.id ? 'bg-emerald-50 text-[#1A6B4A]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Mobile Tabs (Horizontal Scroll) */}
                <div className="lg:hidden w-full bg-white border-b border-slate-200 overflow-x-auto flex px-4 pt-2 pb-0 snap-x hide-scrollbar sticky top-16 z-20">
                    {[
                        { id: 'servicios', label: 'Servicios', icon: <Briefcase size={16} /> },
                        { id: 'perfil', label: 'Perfil', icon: <UserIcon size={16} /> },
                        { id: 'evaluaciones', label: 'Evaluaciones', icon: <Star size={16} /> },
                        { id: 'mensajes', label: 'Mensajes', icon: <MessageSquare size={16} /> },
                        { id: 'estadisticas', label: 'Métricas', icon: <BarChart size={16} /> },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm whitespace-nowrap snap-start border-b-2 transition-all ${activeTab === item.id ? 'border-[#1A6B4A] text-[#1A6B4A]' : 'border-transparent text-slate-500'}`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">

                    {/* MIS SERVICIOS */}
                    {activeTab === 'servicios' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-8">
                                <h1 className="text-2xl font-black text-slate-900">Mis Servicios</h1>
                                <button
                                    onClick={() => { setEditingServiceId(null); setIsServiceModalOpen(true); }}
                                    className="bg-[#1A6B4A] hover:bg-emerald-800 text-white font-bold py-2.5 px-5 rounded-xl transition-colors shadow-sm flex items-center gap-2"
                                >
                                    <span>+</span><span className="hidden sm:inline">Publicar nuevo servicio</span><span className="sm:hidden">Nuevo</span>
                                </button>
                            </div>

                            {servicios.length === 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Briefcase size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">No tienes servicios publicados</h3>
                                    <p className="text-slate-500 mb-6">Ofrece hospedaje, guardería, paseos o visitas para empezar a ganar clientes.</p>
                                    <button
                                        onClick={() => { setEditingServiceId(null); setIsServiceModalOpen(true); }}
                                        className="bg-[#1A6B4A] text-white font-bold py-2.5 px-6 rounded-xl"
                                    >
                                        Crear mi primer servicio
                                    </button>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {servicios.map(servicio => (
                                        <div key={servicio.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row gap-5 shadow-sm hover:shadow-md transition-shadow">
                                            {/* Imagen */}
                                            <div className="w-full sm:w-40 sm:h-32 h-40 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative">
                                                {servicio.fotos && servicio.fotos[0] ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img src={servicio.fotos[0]} alt={servicio.titulo} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={32} /></div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                                    <span>{servicio.categoria?.icono}</span>
                                                    <span className="truncate max-w-[80px]">{servicio.categoria?.nombre}</span>
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 flex flex-col">
                                                <h3 className="text-lg font-bold text-slate-900 mb-1">{servicio.titulo}</h3>
                                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium mb-3">
                                                    <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">${servicio.precio_desde?.toLocaleString('es-CL')} / {servicio.unidad_precio}</span>
                                                    <span className="flex items-center gap-1"><Eye size={14} /> {servicio.vistas || 0} vistas</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 mr-auto">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={servicio.activo}
                                                            onChange={() => toggleServiceStatus(servicio.id, servicio.activo)}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1A6B4A] relative"></div>
                                                        <span className="text-sm font-bold text-slate-700">{servicio.activo ? 'Activo' : 'Pausado'}</span>
                                                    </label>

                                                    <button
                                                        onClick={() => { setEditingServiceId(servicio.id); setIsServiceModalOpen(true); }}
                                                        className="p-2 text-slate-400 hover:text-[#1A6B4A] hover:bg-emerald-50 rounded-xl transition-colors tooltip flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <Edit size={16} /> <span className="hidden sm:inline">Editar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteService(servicio.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors tooltip flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <Trash2 size={16} /> <span className="hidden sm:inline">Eliminar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <ServiceFormModal
                                isOpen={isServiceModalOpen}
                                onClose={() => setIsServiceModalOpen(false)}
                                proveedorId={proveedor.id}
                                existingServiceId={editingServiceId}
                                onSuccess={() => loadTabData('servicios', proveedor.id, proveedor.auth_user_id)}
                            />
                        </div>
                    )}

                    {/* MI PERFIL */}
                    {activeTab === 'perfil' && (
                        <div className="animate-in fade-in duration-300 max-w-3xl">
                            <h1 className="text-2xl font-black text-slate-900 mb-8">Mi Perfil</h1>

                            <form onSubmit={saveProfile} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Avatar Section */}
                                <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden border-4 border-white shadow-sm flex items-center justify-center text-slate-400">
                                            {fotoPerfil ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={fotoPerfil} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={40} />
                                            )}
                                        </div>
                                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 cursor-pointer hover:text-[#1A6B4A] hover:border-[#1A6B4A] transition-colors">
                                            {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                            <input type="file" className="hidden" accept="image/*" onChange={uploadAvatar} disabled={uploadingAvatar} />
                                        </label>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-slate-900 text-lg flex items-center justify-center sm:justify-start gap-2">
                                            {proveedor.nombre} {proveedor.apellido_p}
                                            <span className="text-slate-400"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></span>
                                        </h3>
                                        <p className="text-slate-500 text-sm mt-1">Proveedor registrado desde {new Date(proveedor.created_at).getFullYear()}</p>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 space-y-6">
                                    {/* Datos no editables */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-70">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Nombre Completo</label>
                                            <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-center justify-between">
                                                {proveedor.nombre} {proveedor.apellido_p}
                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                            </div>
                                        </div>
                                        {proveedor.rut && (
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-500 mb-1.5 flex items-center gap-2">
                                                    RUT Oficial
                                                    {proveedor.rut_verificado && <span className="bg-emerald-100 text-[#1A6B4A] text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider">Verificado ✓</span>}
                                                </label>
                                                <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-center justify-between">
                                                    {proveedor.rut}
                                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Editables */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Biografía / Acerca de mí</label>
                                        <textarea
                                            value={bio} onChange={e => setBio(e.target.value)}
                                            rows={4} maxLength={300}
                                            placeholder="Cuéntale a los clientes sobre tu experiencia y amor por las mascotas..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                        />
                                        <div className="text-right text-xs text-slate-400 mt-1">{bio.length}/300</div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comuna de Residencia <span className="text-red-500">*</span></label>
                                        <input
                                            type="text" value={comuna} onChange={e => setComuna(e.target.value)} required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        />
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Información de Contacto Externo</h3>

                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-3">
                                        <div className="text-blue-500 mt-0.5"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></div>
                                        <p className="text-sm text-blue-800 leading-relaxed">
                                            El chat interno de Pawnecta es seguro y siempre está disponible para tus clientes. Además, puedes configurar qué datos externos mostrar públicamente en tu perfil.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">WhatsApp</label>
                                                <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+56912345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={mostrarWhatsapp} onChange={e => setMostrarWhatsapp(e.target.checked)} className="w-5 h-5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-slate-700">Mostrar botón de WhatsApp público</span>
                                            </label>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono Alternativo</label>
                                                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56912345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={mostrarTelefono} onChange={e => setMostrarTelefono(e.target.checked)} className="w-5 h-5 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-slate-700">Mostrar botón Llamar Teléfono</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                                        <button type="submit" disabled={savingProfile} className="bg-[#1A6B4A] text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
                                            {savingProfile && <Loader2 size={18} className="animate-spin" />} Guardar Cambios
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* EVALUACIONES */}
                    {activeTab === 'evaluaciones' && (
                        <div className="animate-in fade-in duration-300">
                            <h1 className="text-2xl font-black text-slate-900 mb-8">Evaluaciones Recibidas</h1>

                            {/* Metrics using ReviewSummary */}
                            <div className="mb-10">
                                <ReviewSummary proveedorId={proveedor.id} />
                            </div>

                            {evaluaciones.length === 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">Aún no tienes evaluaciones</h3>
                                    <p className="text-slate-500">¡Cuando tus primeros clientes te contraten podrán dejarte una reseña para impulsar tu perfil!</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {evaluaciones.map(ev => (
                                        <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row gap-6">
                                            <div className="sm:w-3/4">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex text-amber-400">
                                                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className={i <= ev.rating ? "fill-current" : "text-slate-200"} />)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">{ev.servicio?.titulo}</span>
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed mb-3">&quot;{ev.comentario}&quot;</p>
                                                <span className="text-xs font-semibold text-slate-400">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: es })}</span>
                                            </div>
                                            <div className="sm:w-1/4 flex flex-col justify-center sm:items-end sm:border-l sm:border-slate-100 sm:pl-6 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                                {ev.estado === 'aprobado' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-[#1A6B4A] rounded-full text-xs font-bold uppercase"><CheckCircle size={14} /> Publicada</span>}
                                                {ev.estado === 'pendiente' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase"><Clock size={14} /> En revisión</span>}
                                                {ev.estado === 'rechazado' && <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase"><XCircle size={14} /> No Publicada</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MENSAJES */}
                    {activeTab === 'mensajes' && (
                        <div className="animate-in fade-in duration-300 h-[calc(100vh-140px)] min-h-[500px]">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full flex overflow-hidden">
                                <div className={`${selectedChatId ? 'hidden sm:block' : 'block'} w-full sm:w-[320px] shrink-0 border-r border-slate-200 h-full flex flex-col`}>
                                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                                        <h2 className="font-bold text-slate-800">Bandeja de Entrada</h2>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <ConversationList
                                            userId={proveedor.auth_user_id}
                                            selectedId={selectedChatId}
                                            onSelect={setSelectedChatId}
                                        />
                                    </div>
                                </div>
                                <div className={`${!selectedChatId ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-slate-50 h-full relative`}>
                                    {selectedChatId ? (
                                        <>
                                            <button onClick={() => setSelectedChatId(null)} className="sm:hidden absolute top-3 left-3 z-20 bg-white p-2 rounded-full shadow-md text-slate-700">← Volver</button>
                                            <MessageThread userId={proveedor.auth_user_id} conversationId={selectedChatId} />
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                            <MessageSquare size={48} className="mb-4 text-slate-300" />
                                            <p>Selecciona una conversación para responder</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ESTADÍSTICAS */}
                    {activeTab === 'estadisticas' && (
                        <div className="animate-in fade-in duration-300">
                            <h1 className="text-2xl font-black text-slate-900 mb-8">Tus Resultados en Pawnecta</h1>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4"><Eye size={24} /></div>
                                    <h3 className="text-blue-900 text-3xl font-black mb-1">{stats.vistas}</h3>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Vistas de Perfil</p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><Briefcase size={24} /></div>
                                    <h3 className="text-emerald-900 text-3xl font-black mb-1">{stats.activos}</h3>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Servicios Activos</p>
                                    <div className="absolute right-0 bottom-0 text-slate-50 p-4"><LayoutDashboard size={80} /></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4"><MessageSquare size={24} /></div>
                                    <h3 className="text-purple-900 text-3xl font-black mb-1">{stats.consultas}</h3>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Consultas por Chat</p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                                    <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center mb-4"><Star size={24} /></div>
                                    <h3 className="text-amber-900 text-3xl font-black mb-1">{stats.evaluaciones}</h3>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Reseñas Públicas</p>
                                </div>
                            </div>

                        </div>
                    )}

                </main>
            </div>
            <Toaster position="top-center" richColors />
        </>
    );
}
