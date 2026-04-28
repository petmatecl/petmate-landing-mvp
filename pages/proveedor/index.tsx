import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useUser } from '../../contexts/UserContext';
import { getProxyImageUrl } from '../../lib/utils';
import { useProveedorStats } from '../../lib/useProveedorStats';
import RoleGuard from '../../components/Shared/RoleGuard';
import ServiceFormModal from '../../components/Proveedor/ServiceFormModal';
import ConversationList from '../../components/Chat/ConversationList';
import MessageThread from '../../components/Chat/MessageThread';
import ReviewSummary from '../../components/Service/ReviewSummary';
import EvaluacionesTab from '../../components/Proveedor/EvaluacionesTab';
import CertificacionesSection from '../../components/Proveedor/CertificacionesSection';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { validateRut, formatRut } from '../../lib/rutValidation';
import { COMUNAS_CHILE } from '../../lib/comunas';
import Link from 'next/link';
import {
    Clock, AlertTriangle, Briefcase, User as UserIcon, Shield, ShieldCheck, ShieldX,
    Star, MessageSquare, BarChart, Edit, Trash2, LayoutDashboard, Eye, Camera,
    Image as ImageIcon, Loader2, CheckCircle, XCircle, CheckCircle2, Circle, Upload, ExternalLink
} from 'lucide-react';

type TabType = 'servicios' | 'perfil' | 'evaluaciones' | 'mensajes' | 'estadisticas';

/** Convert a relative storage path to a full public URL */
function toServicePhotoUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    if (!base) return null;
    const KNOWN_BUCKETS = ['avatars', 'servicios-fotos', 'documents'];
    const bucket = KNOWN_BUCKETS.find(b => path.startsWith(b + '/'));
    if (bucket) {
        return `${base}/storage/v1/object/public/${path}`;
    }
    return `${base}/storage/v1/object/public/servicios-fotos/${path}`;
}

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

    // Stats via shared hook — uses proveedor.id once loaded
    const { stats, refetch: fetchStats } = useProveedorStats(
        proveedor?.id || '',
        proveedor?.auth_user_id || ''
    );

    // Chat Data
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

    // Profile Edit State
    const [bio, setBio] = useState('');
    const [galeria, setGaleria] = useState<string[]>([]);
    const [uploadingGaleria, setUploadingGaleria] = useState(false);
    const [comuna, setComuna] = useState('');
    const [comunaOpen, setComunaOpen] = useState(false);
    const [whatsapp, setWhatsapp] = useState('');
    const [telefono, setTelefono] = useState('');
    const [emailPublico, setEmailPublico] = useState('');
    const [mostrarWhatsapp, setMostrarWhatsapp] = useState(true);
    const [mostrarTelefono, setMostrarTelefono] = useState(false);
    const [mostrarEmail, setMostrarEmail] = useState(false);
    const [fotoPerfil, setFotoPerfil] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Nuevos campos Perfil-01 (Empresa)
    const [tipoEntidad, setTipoEntidad] = useState<'persona_natural' | 'empresa'>('persona_natural');
    const [razonSocial, setRazonSocial] = useState('');
    const [rutEmpresa, setRutEmpresa] = useState('');
    const [nombreFantasia, setNombreFantasia] = useState('');
    const [giro, setGiro] = useState('');

    // Persona natural
    const [genero, setGenero] = useState('');
    const [ocupacion, setOcupacion] = useState('');
    const [nombrePublico, setNombrePublico] = useState('');

    // Nuevos campos Perfil-02 (Credenciales)
    const [aniosExperiencia, setAniosExperiencia] = useState<string>('');
    const [certificaciones, setCertificaciones] = useState('');
    const [sitioWeb, setSitioWeb] = useState('');
    const [instagram, setInstagram] = useState('');
    const [primeraAyuda, setPrimeraAyuda] = useState(false);
    const [miembroAsociacion, setMiembroAsociacion] = useState(false);

    // P12 - Verificación de identidad
    const [verificacionEstado, setVerificacionEstado] = useState<'sin_enviar' | 'pendiente' | 'aprobado' | 'rechazado'>('sin_enviar');
    const [verificacionNota, setVerificacionNota] = useState<string | null>(null);
    const [rutInput, setRutInput] = useState('');
    const [rutInputError, setRutInputError] = useState('');
    const [carnetFile, setCarnetFile] = useState<File | null>(null);
    const [carnetPreview, setCarnetPreview] = useState<string | null>(null);
    const [carnetDorsoFile, setCarnetDorsoFile] = useState<File | null>(null);
    const [carnetDorsoPreview, setCarnetDorsoPreview] = useState<string | null>(null);
    const [uploadingCarnet, setUploadingCarnet] = useState(false);

    useEffect(() => {
        if (userLoading) return;
        if (user) {
            checkProviderStatus();
        } else {
            // No user after loading = session expired, redirect to login
            setStatusLoading(false);
            router.push('/login?redirect=/proveedor');
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
            setFotoPerfil(getProxyImageUrl(data.foto_perfil) || data.foto_perfil || '');
            setGaleria((data.galeria || []).map((url: string) => getProxyImageUrl(url) || url));

            setTipoEntidad(data.tipo_entidad || 'persona_natural');
            setRazonSocial(data.razon_social || '');
            setRutEmpresa(data.rut_empresa || '');
            setNombreFantasia(data.nombre_fantasia || '');
            setGiro(data.giro || '');

            setGenero(data.genero || '');
            setOcupacion(data.ocupacion || '');
            setNombrePublico(data.nombre_publico || '');
            setAniosExperiencia(data.anios_experiencia?.toString() || '');
            setCertificaciones(data.certificaciones || '');
            setSitioWeb(data.sitio_web || '');
            setInstagram(data.instagram || '');
            setPrimeraAyuda(data.primera_ayuda ?? false);
            setMiembroAsociacion(data.miembro_asociacion ?? false);

            // P12
            setVerificacionEstado(data.verificacion_estado || 'sin_enviar');
            setVerificacionNota(data.verificacion_nota || null);
            setRutInput(data.rut ? formatRut(data.rut) : '');

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
            await fetchStats();
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
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/avatar.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const url = `${publicData.publicUrl}?t=${Date.now()}`;

            // Show preview immediately from local file
            setFotoPerfil(URL.createObjectURL(file));

            const { error: updateError } = await supabase.from('proveedores').update({ foto_perfil: url }).eq('auth_user_id', user.id);
            if (updateError) throw updateError;

            // Update with real URL
            setFotoPerfil(url);
            toast.success('Foto de perfil actualizada');
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            toast.error(err.message || 'Error al subir imagen');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const uploadGaleriaFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !proveedor) return;
        if (galeria.length >= 8) {
            toast.error('Puedes subir máximo 8 fotos');
            return;
        }

        setUploadingGaleria(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `proveedor-galeria/${proveedor.id}/${fileName}`;

        try {
            const { error: uploadError } = await supabase.storage.from('servicios-fotos').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('servicios-fotos').getPublicUrl(filePath);
            setGaleria(prev => [...prev, publicUrl]);
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Error al subir la foto');
        } finally {
            setUploadingGaleria(false);
        }
    };

    const removeGaleriaFoto = (index: number) => {
        setGaleria(prev => prev.filter((_, i) => i !== index));
    };

    const moveGaleriaFoto = (index: number, direction: 'left' | 'right') => {
        if (direction === 'left' && index === 0) return;
        if (direction === 'right' && index === galeria.length - 1) return;

        const newGaleria = [...galeria];
        const swapIndex = direction === 'left' ? index - 1 : index + 1;
        [newGaleria[index], newGaleria[swapIndex]] = [newGaleria[swapIndex], newGaleria[index]];
        setGaleria(newGaleria);
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error('Tu sesión expiró. Recarga la página e intenta nuevamente.');
            return;
        }
        setSavingProfile(true);
        try {
            const payload: Record<string, any> = {
                nombre_publico: nombrePublico.trim() || null,
                bio: bio || null,
                comuna: comuna || null,
                whatsapp: whatsapp || null,
                telefono: telefono || null,
                email_publico: emailPublico || null,
                mostrar_whatsapp: mostrarWhatsapp,
                mostrar_telefono: mostrarTelefono,
                mostrar_email: mostrarEmail,
                tipo_entidad: tipoEntidad,
                razon_social: tipoEntidad === 'empresa' ? (razonSocial || null) : null,
                rut_empresa: tipoEntidad === 'empresa' ? (rutEmpresa || null) : null,
                nombre_fantasia: tipoEntidad === 'empresa' ? (nombreFantasia || null) : null,
                giro: tipoEntidad === 'empresa' ? (giro || null) : null,
                genero: tipoEntidad === 'persona_natural' ? (genero || null) : null,
                ocupacion: tipoEntidad === 'persona_natural' ? (ocupacion || null) : null,
                anios_experiencia: aniosExperiencia && !isNaN(Number(aniosExperiencia)) ? parseInt(aniosExperiencia) : null,
                certificaciones: certificaciones || null,
                sitio_web: sitioWeb || null,
                instagram: instagram || null,
                primera_ayuda: primeraAyuda,
                galeria,
            };

            const { error } = await supabase
                .from('proveedores')
                .update(payload)
                .eq('auth_user_id', user.id);

            if (error) {
                console.error('Save profile error:', error);
                toast.error(`Error al guardar: ${error.message}`);
            } else {
                toast.success('Perfil actualizado correctamente');
            }
        } catch (err: any) {
            console.error('Save profile exception:', err);
            toast.error(`Error al guardar: ${err?.message || 'Error inesperado. Recarga la página.'}`);

        } finally {
            setSavingProfile(false);
        }
    };

    // P12 - Upload carnet handler
    const handleCarnetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCarnetFile(file);
        setCarnetPreview(URL.createObjectURL(file));
    };

    const handleCarnetDorsoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCarnetDorsoFile(file);
        setCarnetDorsoPreview(URL.createObjectURL(file));
    };

    const handleEnviarVerificacion = async () => {
        // Validate RUT
        const cleanedRut = rutInput.replace(/[^0-9kK]/g, '');
        if (!validateRut(cleanedRut)) {
            setRutInputError('RUT inválido. Verifica el dígito verificador.');
            return;
        }
        if (!carnetFile && !proveedor.foto_carnet) {
            toast.error('Debes subir la foto frontal de tu carnet de identidad.');
            return;
        }
        if (!carnetDorsoFile && !proveedor.foto_carnet_dorso) {
            toast.error('Debes subir la foto del dorso (trasera) de tu carnet de identidad.');
            return;
        }
        setRutInputError('');
        setUploadingCarnet(true);
        try {
            // Upload frontal
            let carnetUrl = proveedor.foto_carnet || null;
            if (carnetFile) {
                const ext = carnetFile.name.split('.').pop();
                const path = `carnets/${user.id}/carnet.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('documents')
                    .upload(path, carnetFile, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
                carnetUrl = urlData.publicUrl;
            }
            // Upload dorso
            let dorsoUrl = proveedor.foto_carnet_dorso || null;
            if (carnetDorsoFile) {
                const ext = carnetDorsoFile.name.split('.').pop();
                const path = `carnets/${user.id}/carnet_dorso.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('documents')
                    .upload(path, carnetDorsoFile, { upsert: true });
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
                dorsoUrl = urlData.publicUrl;
            }
            const formatted = formatRut(cleanedRut);
            const { error: saveErr } = await supabase.from('proveedores').update({
                rut: formatted,
                foto_carnet: carnetUrl,
                foto_carnet_dorso: dorsoUrl,
                verificacion_estado: 'pendiente',
                verificacion_nota: null,
            }).eq('auth_user_id', user.id);
            if (saveErr) throw saveErr;
            setVerificacionEstado('pendiente');
            setRutInput(formatted);
            toast.success('Solicitud de verificación enviada. Revisaremos en 24-48h.');
        } catch (err: any) {
            toast.error(err.message || 'Error al enviar verificación');
        } finally {
            setUploadingCarnet(false);
        }
    };

    const handleReiniciarVerificacion = async () => {
        await supabase.from('proveedores').update({
            verificacion_estado: 'sin_enviar',
            verificacion_nota: null,
        }).eq('auth_user_id', user.id);
        setVerificacionEstado('sin_enviar');
        setCarnetFile(null);
        setCarnetPreview(null);
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


    // Safety: redirect to login if loading takes too long (10s)
    useEffect(() => {
        if (!userLoading && !statusLoading) return;
        const timer = setTimeout(() => {
            if (userLoading || statusLoading) {
                router.push('/login?redirect=/proveedor');
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [userLoading, statusLoading, router]);

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
                    <div className="bg-white max-w-lg w-full rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center">
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
                <aside className="hidden lg:flex w-[260px] flex-col bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen overflow-y-auto">
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

                            {/* INDICADOR DE COMPLETITUD */}
                            {(() => {
                                const pasos = [
                                    { label: 'Foto de perfil', done: !!fotoPerfil, puntos: 15 },
                                    { label: 'Nombre público definido', done: !!nombrePublico, puntos: 10 },
                                    { label: 'Descripción de más de 100 caracteres', done: (bio?.length || 0) > 100, puntos: 15 },
                                    { label: 'Número de WhatsApp o teléfono', done: !!(whatsapp || telefono), puntos: 15 },
                                    { label: 'Al menos 1 servicio activo', done: servicios.some(s => s.activo), puntos: 15 },
                                    { label: 'Fotos de tu espacio (3+ fotos)', done: galeria.length >= 3, puntos: 10 },
                                    { label: 'Comuna de residencia', done: !!comuna, puntos: 10 },
                                    { label: 'Experiencia o certificación', done: !!(aniosExperiencia || certificaciones), puntos: 10 },
                                ];
                                const computedScore = pasos.filter(p => p.done).reduce((a, p) => a + p.puntos, 0);
                                const score = computedScore > 100 ? 100 : computedScore;
                                const pendientes = pasos.filter(p => !p.done);

                                if (score >= 100) {
                                    return (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shrink-0">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm">¡Perfil completo!</h3>
                                                    <p className="text-slate-600 text-sm mt-0.5">
                                                        Los clientes ven tu perfil mejor posicionado en los resultados.
                                                    </p>
                                                </div>
                                            </div>
                                            <a href={`/proveedor/${proveedor.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-emerald-700 font-bold text-sm bg-white border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors inline-block text-center whitespace-nowrap w-full sm:w-auto">
                                                Ver mi perfil público
                                            </a>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-slate-900 text-sm">Completitud del perfil</h3>
                                            <span className="text-sm font-bold text-emerald-700">{score}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: score + '%' }} />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            {pendientes.map(p => (
                                                <div key={p.label} className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Circle size={14} className="text-slate-300 shrink-0" />
                                                    {p.label}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

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
                                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Briefcase size={32} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">No tienes servicios publicados</h3>
                                    <p className="text-slate-500 mb-6">Ofrece hospedaje, guardería, paseos o visitas para empezar a ganar clientes.</p>
                                    <button
                                        onClick={() => { setEditingServiceId(null); setIsServiceModalOpen(true); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 transition-colors text-white font-bold py-2.5 px-6 rounded-xl"
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
                                                    <img src={toServicePhotoUrl(servicio.fotos[0]) || ''} alt={servicio.titulo} className="w-full h-full object-cover" />
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

                                                    <Link
                                                        href={`/servicio/${servicio.id}`}
                                                        target="_blank"
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-semibold"
                                                    >
                                                        <ExternalLink size={16} /> <span className="hidden sm:inline">Ver</span>
                                                    </Link>
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

                            <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                                        <p className="text-slate-500 text-sm mt-1">Proveedor desde {new Date(proveedor.created_at).getFullYear()}</p>
                                    </div>
                                </div>

                                <div className="p-6 sm:p-8 space-y-6">
                                    {/* Datos legales (no editables) + nombre público */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="opacity-70">
                                            <label className="block text-sm font-semibold text-slate-500 mb-1.5">Nombre legal</label>
                                            <div className="bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium flex items-center justify-between">
                                                {proveedor.nombre} {proveedor.apellido_p} {proveedor.apellido_m}
                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-1">Datos de registro. No se muestran públicamente.</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre público</label>
                                            <input
                                                type="text"
                                                value={nombrePublico}
                                                onChange={e => setNombrePublico(e.target.value)}
                                                placeholder={`${proveedor.nombre} ${proveedor.apellido_p}`}
                                                maxLength={60}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">Así te verán los clientes en tu perfil y servicios.</p>
                                        </div>
                                    </div>

                                    {/* === P12: VERIFICACIÓN DE IDENTIDAD === */}
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                        <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-slate-50/50">
                                            {verificacionEstado === 'aprobado'
                                                ? <ShieldCheck size={22} className="text-emerald-700" />
                                                : verificacionEstado === 'rechazado'
                                                    ? <ShieldX size={22} className="text-red-500" />
                                                    : <Shield size={22} className="text-slate-400" />
                                            }
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900 text-sm">Verificación de Identidad</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">Confirma tu identidad con tu RUT y una foto de tu carnet</p>
                                            </div>
                                            {verificacionEstado === 'aprobado' && (
                                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Verificado</span>
                                            )}
                                            {verificacionEstado === 'pendiente' && (
                                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                                    En revisión
                                                </span>
                                            )}
                                            {verificacionEstado === 'rechazado' && (
                                                <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">Rechazado</span>
                                            )}
                                        </div>

                                        <div className="p-5">
                                            {/* ESTADO: aprobado */}
                                            {verificacionEstado === 'aprobado' && (
                                                <div className="flex items-center gap-3 text-emerald-700">
                                                    <CheckCircle size={20} className="shrink-0" />
                                                    <div>
                                                        <p className="font-bold text-sm">Identidad verificada</p>
                                                        <p className="text-xs text-emerald-700 mt-0.5">Tu RUT <span className="font-mono font-bold">{rutInput}</span> fue validado por el equipo de Pawnecta.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESTADO: pendiente */}
                                            {verificacionEstado === 'pendiente' && (
                                                <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-xl p-4">
                                                    <Clock size={20} className="shrink-0" />
                                                    <div>
                                                        <p className="font-bold text-sm">Solicitud enviada — en revisión</p>
                                                        <p className="text-xs text-amber-600 mt-0.5">Revisamos las solicitudes en un plazo de 24 a 48 horas hábiles.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESTADO: rechazado */}
                                            {verificacionEstado === 'rechazado' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4">
                                                        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-bold text-sm text-red-800">Verificación rechazada</p>
                                                            {verificacionNota && <p className="text-xs text-red-700 mt-1 leading-relaxed">{verificacionNota}</p>}
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={handleReiniciarVerificacion}
                                                        className="w-full py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                                                        Volver a intentar
                                                    </button>
                                                </div>
                                            )}

                                            {/* ESTADO: sin_enviar */}
                                            {verificacionEstado === 'sin_enviar' && (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">RUT Chileno <span className="text-red-500">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={rutInput}
                                                            onChange={e => {
                                                                const formatted = formatRut(e.target.value);
                                                                setRutInput(formatted);
                                                                setRutInputError('');
                                                            }}
                                                            placeholder="Ej: 12.345.678-9"
                                                            maxLength={12}
                                                            className={`w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono ${rutInputError ? 'border-red-400 focus:border-red-400 focus:ring-red-300' : 'border-slate-200 focus:border-emerald-500'
                                                                }`}
                                                        />
                                                        {rutInputError && <p className="text-xs text-red-500 mt-1 font-medium">{rutInputError}</p>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                            Foto del Carnet de Identidad <span className="text-red-500">*</span>
                                                            <span className="text-slate-400 font-normal ml-1">(lado con tu foto)</span>
                                                        </label>
                                                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${carnetPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                                            }`}>
                                                            {carnetPreview ? (
                                                                <div className="flex items-center gap-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={carnetPreview} alt="Vista previa carnet" className="h-16 w-24 object-cover rounded-lg border border-emerald-200" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-emerald-700">Foto lista</p>
                                                                        <p className="text-xs text-slate-500">{carnetFile?.name}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload size={24} className="text-slate-400" />
                                                                    <p className="text-sm text-slate-500 font-medium">Arrastra o haz click para subir la foto</p>
                                                                    <p className="text-xs text-slate-400">JPG, PNG o HEIC — Máx. 5 MB</p>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleCarnetChange} />
                                                        </label>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                            Dorso del Carnet <span className="text-red-500">*</span>
                                                            <span className="text-slate-400 font-normal ml-1">(lado trasero)</span>
                                                        </label>
                                                        <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${carnetDorsoPreview ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50'
                                                            }`}>
                                                            {carnetDorsoPreview ? (
                                                                <div className="flex items-center gap-3">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img src={carnetDorsoPreview} alt="Vista previa dorso" className="h-16 w-24 object-cover rounded-lg border border-emerald-200" />
                                                                    <div>
                                                                        <p className="text-sm font-bold text-emerald-700">Foto lista</p>
                                                                        <p className="text-xs text-slate-500">{carnetDorsoFile?.name}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <Upload size={24} className="text-slate-400" />
                                                                    <p className="text-sm text-slate-500 font-medium">Arrastra o haz click para subir el dorso</p>
                                                                    <p className="text-xs text-slate-400">JPG, PNG o HEIC — Máx. 5 MB</p>
                                                                </>
                                                            )}
                                                            <input type="file" className="hidden" accept="image/*" onChange={handleCarnetDorsoChange} />
                                                        </label>
                                                    </div>

                                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
                                                        <Shield size={14} className="shrink-0 mt-0.5" />
                                                        <span>Tu documento es tratado de forma confidencial y solo lo revisa el equipo de Pawnecta para validar tu identidad.</span>
                                                    </div>

                                                    <button type="button" onClick={handleEnviarVerificacion} disabled={uploadingCarnet}
                                                        className="w-full py-3 bg-[#1A6B4A] hover:bg-emerald-800 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60">
                                                        {uploadingCarnet ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                                        {uploadingCarnet ? 'Enviando...' : 'Enviar para verificación'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tipo de Entidad */}
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Tipo de Cuenta</h3>
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button type="button"
                                            onClick={() => setTipoEntidad("persona_natural")}
                                            className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "persona_natural"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <p className="font-bold text-slate-900 text-sm">Persona Natural</p>
                                        </button>
                                        <button type="button"
                                            onClick={() => setTipoEntidad("empresa")}
                                            className={`p-4 rounded-xl border-2 text-left transition-colors ${tipoEntidad === "empresa"
                                                ? "border-emerald-500 bg-emerald-50"
                                                : "border-slate-200 hover:border-slate-300"
                                                }`}
                                        >
                                            <p className="font-bold text-slate-900 text-sm">Empresa o Emprendimiento</p>
                                        </button>
                                    </div>

                                    {tipoEntidad === 'empresa' && (
                                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 mb-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Razón social *</label>
                                                <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">RUT de la empresa *</label>
                                                <input type="text" value={rutEmpresa} onChange={e => setRutEmpresa(e.target.value)} required maxLength={12} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre fantasía (marca)</label>
                                                <input type="text" value={nombreFantasia} onChange={e => setNombreFantasia(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Giro o rubro</label>
                                                <input type="text" value={giro} onChange={e => setGiro(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Información General</h3>

                                    {tipoEntidad === 'persona_natural' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ocupación o profesión</label>
                                                <input
                                                    type="text"
                                                    value={ocupacion}
                                                    onChange={e => setOcupacion(e.target.value)}
                                                    placeholder="Ej: Veterinaria, Paseadora, Bióloga..."
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Género</label>
                                                <select
                                                    value={genero}
                                                    onChange={e => setGenero(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                >
                                                    <option value="">Prefiero no indicar</option>
                                                    <option value="mujer">Mujer</option>
                                                    <option value="hombre">Hombre</option>
                                                    <option value="no_binario">No binario</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Editables */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Biografía / Acerca de mí</label>
                                        <textarea
                                            value={bio} onChange={e => setBio(e.target.value)}
                                            rows={6} maxLength={600}
                                            placeholder="Cuéntale a los clientes sobre tu experiencia y amor por las mascotas..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                                        />
                                        <div className="text-right text-xs text-slate-400 mt-1">{bio?.length || 0}/600</div>
                                    </div>

                                    <div className="relative">
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comuna de Residencia <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={comuna}
                                            onChange={e => { setComuna(e.target.value); setComunaOpen(true); }}
                                            onFocus={() => setComunaOpen(true)}
                                            onBlur={() => setTimeout(() => setComunaOpen(false), 150)}
                                            placeholder="Escribe tu comuna..."
                                            autoComplete="off"
                                            required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                        />
                                        {comunaOpen && comuna && (
                                            <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                {COMUNAS_CHILE.filter(c => c.toLowerCase().includes(comuna.toLowerCase())).slice(0, 8).map(c => (
                                                    <li key={c}>
                                                        <button
                                                            type="button"
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                            onMouseDown={() => { setComuna(c); setComunaOpen(false); }}
                                                        >
                                                            {c}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Credenciales y Confianza</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Años de experiencia (Gral.)</label>
                                            <input type="number" min="0" value={aniosExperiencia} onChange={e => setAniosExperiencia(e.target.value)} placeholder="Ej: 3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Certificaciones Relevantes</label>
                                            <input type="text" value={certificaciones} onChange={e => setCertificaciones(e.target.value)} placeholder="Ej: Adiestrador CCPDT, Auxiliar Veterinario..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                                            <input type="checkbox" checked={primeraAyuda} onChange={e => setPrimeraAyuda(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
                                            <div>
                                                <span className="text-sm font-bold text-slate-800 block">Primeros auxilios para mascotas</span>
                                                <span className="text-xs text-slate-500 block">Tengo conocimientos en primeros auxilios veterinarios</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Certificaciones verificables */}
                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Certificaciones y diplomas</h3>
                                    <p className="text-sm text-slate-500 mb-4">Sube tus certificaciones para que Pawnecta las verifique. Los usuarios verán un badge de certificación verificada en tu perfil.</p>
                                    <CertificacionesSection proveedorId={proveedor.id} />

                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Fotos de tu espacio / galería</h3>
                                    <p className="text-sm text-slate-500 mb-4">Muestra tu espacio, ambiente y forma de trabajar (Máx 8 fotos).</p>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                                        {galeria.map((url, idx) => (
                                            <div key={idx} className="aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Foto espacio ${idx + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                                    <div className="flex justify-end">
                                                        <button type="button" onClick={() => removeGaleriaFoto(idx)} className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 tooltip">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between items-center bg-white/90 rounded-lg p-1">
                                                        <button type="button" disabled={idx === 0} onClick={() => moveGaleriaFoto(idx, 'left')} className="p-1 disabled:opacity-30 hover:text-[#1A6B4A]">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                                        </button>
                                                        {idx === 0 && <span className="text-[10px] font-bold text-[#1A6B4A]">PORTADA</span>}
                                                        <button type="button" disabled={idx === galeria.length - 1} onClick={() => moveGaleriaFoto(idx, 'right')} className="p-1 disabled:opacity-30 hover:text-[#1A6B4A]">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {galeria.length < 8 && (
                                            <label className="aspect-square bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#1A6B4A] hover:bg-emerald-50 transition-colors text-slate-500 hover:text-[#1A6B4A]">
                                                {uploadingGaleria ? (
                                                    <Loader2 className="w-8 h-8 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera size={24} className="mb-2" />
                                                        <span className="text-sm font-semibold">Añadir foto</span>
                                                    </>
                                                )}
                                                <input type="file" accept="image/*" className="hidden" onChange={uploadGaleriaFoto} disabled={uploadingGaleria} />
                                            </label>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2 mt-8 mb-4">Presencia Web</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sitio Web</label>
                                            <input type="text" value={sitioWeb} onChange={e => setSitioWeb(e.target.value)} placeholder="Ej: www.pawnecta.com o https://linktr.ee/tu-perfil" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Instagram</label>
                                            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Ej: @tucuenta" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                        </div>
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
                                                <input type="checkbox" checked={mostrarWhatsapp} onChange={e => setMostrarWhatsapp(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
                                                <span className="text-sm font-semibold text-slate-700">Mostrar botón de WhatsApp público</span>
                                            </label>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono Alternativo</label>
                                                <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56912345678" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                                            </div>
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" checked={mostrarTelefono} onChange={e => setMostrarTelefono(e.target.checked)} className="w-5 h-5 rounded text-emerald-700 border-slate-300 focus:ring-emerald-500" />
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
                        <EvaluacionesTab evaluaciones={evaluaciones} proveedorId={proveedor.id} />
                    )}
                    {activeTab === 'mensajes' && (
                        <div className="animate-in fade-in duration-300 h-[calc(100vh-140px)] min-h-[500px]">
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex overflow-hidden">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* STAT 1: Vistas */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center mb-3"><Eye size={20} /></div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.vistas}</h3>
                                    <p className="text-slate-500 text-sm mb-1">Vistas de Perfil (7 días)</p>
                                    {stats.vistasTrend && (
                                        <p className={`text-xs font-semibold ${stats.vistasTrendValue >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                                            {stats.vistasTrend}
                                        </p>
                                    )}
                                </div>

                                {/* STAT 2: Conversaciones */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center mb-3"><MessageSquare size={20} /></div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.consultas}</h3>
                                    <p className="text-slate-500 text-sm">Nuevos mensajes (30 días)</p>
                                </div>

                                {/* STAT 3: WhatsApp Clicks */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.whatsappClicks}</h3>
                                    <p className="text-slate-500 text-sm">Clics en WhatsApp (30 días)</p>
                                </div>

                                {/* STAT: Contactos totales */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.contactosTotal}</h3>
                                    <p className="text-slate-500 text-sm">Contactos recibidos (30 días)</p>
                                    <p className="text-xs text-slate-400 mt-1">Mensajes + WhatsApp + Llamadas</p>
                                </div>

                                {/* STAT 4: Tasa de Conversión */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    </div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.conversionRate}</h3>
                                    <p className="text-slate-500 text-sm">Tasa de conversión</p>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        (Contactos / Vistas)
                                    </p>
                                </div>

                                {/* STAT 5: Rating */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center mb-3"><Star size={20} /></div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-slate-900 text-3xl font-bold">{stats.ratingAvg}</h3>
                                        <div className="flex text-amber-400">
                                            <Star size={20} fill="currentColor" />
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm">Rating promedio ({stats.evalCount} reseñas)</p>
                                </div>

                                {/* STAT 6: Servicios Activos */}
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col pt-5 relative overflow-hidden">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center mb-3"><Briefcase size={20} /></div>
                                    <h3 className="text-slate-900 text-3xl font-bold mb-1">{stats.activos} <span className="text-lg text-slate-400">/ {stats.totalActivos}</span></h3>
                                    <p className="text-slate-500 text-sm mb-3">Servicios activos</p>

                                    {/* Emerald Progress Bar */}
                                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${stats.totalActivos > 0 ? (stats.activos / stats.totalActivos) * 100 : 0}%` }}
                                        ></div>
                                    </div>
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
