import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
// import dynamic from 'next/dynamic'; // Removed unused dynamic import
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import ImageLightbox from '../ImageLightbox';
import ModalAlert from '../ModalAlert';
// import AddressFormModal from './AddressFormModal'; // Removed
import { Address } from './AddressCard';
import { User, LogOut, Edit2, Mail, Phone, CheckCircle2 } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import ClientContext from './ClientContext';

interface ClientLayoutProps {
    children: React.ReactNode;
    userId: string | null;
    title?: string;
}

export default function ClientLayout({ children, userId, title = "Panel Usuario — Pawnecta" }: ClientLayoutProps) {
    const router = useRouter();
    const [clientProfile, setClientProfile] = useState<any>(null);
    const [nombre, setNombre] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Address State (for Context)
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchClientProfile(userId);
            fetchAddresses(userId); // Fetch addresses
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) {
                    setEmail(data.user.email || null);
                    if (data.user.user_metadata?.nombre) {
                        setNombre(data.user.user_metadata.nombre);
                    }
                }
            });
        }
    }, [userId]);

    async function fetchAddresses(uid: string) {
        try {
            setLoadingAddresses(true);
            const { data, error } = await supabase
                .from("direcciones")
                .select("*")
                .eq("user_id", uid)
                .order("es_principal", { ascending: false })
                .order("created_at", { ascending: false });
            if (error) throw error;
            setAddresses(data as Address[]);
        } catch (err) {
            console.error("Error fetching addresses:", err);
        } finally {
            setLoadingAddresses(false);
        }
    }

    async function fetchClientProfile(uid: string) {
        const { data } = await supabase.from("registro_petmate").select("*").eq("auth_user_id", uid).single();
        if (data) {
            setClientProfile(data);
            if (data.nombre && !nombre) setNombre(data.nombre);
        }
    }

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!userId) return;
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('Debes seleccionar una imagen.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('registro_petmate')
                .update({ foto_perfil: publicUrl })
                .eq('auth_user_id', userId);

            if (updateError) throw updateError;

            setClientProfile((prev: any) => ({ ...prev, foto_perfil: publicUrl }));
            showAlert('¡Foto actualizada!', 'Tu foto de perfil ha sido actualizada correctamente.', 'success');

        } catch (error: any) {
            console.error('Error uploading photo:', error);
            showAlert('Error', error.message || 'Error subiendo la imagen.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
        setAlertConfig({ isOpen: true, title, message, type });
    };

    const closeAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const displayName = nombre || "Usuario";

    // Provide context
    const contextValue = {
        addresses,
        loadingAddresses,
        loading: userId ? !clientProfile : false,
        refreshAddresses: () => userId && fetchAddresses(userId),
        userId
    };

    return (
        <ClientContext.Provider value={contextValue}>
            <div className="ambient-bg min-h-screen">
                <Head>
                    <title>{title}</title>
                </Head>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                    {/* Header */}
                    <header className="mb-6 sm:mb-8 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            {/* Mobile Avatar */}
                            <div className="md:hidden relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 bg-white shrink-0">
                                {clientProfile?.foto_perfil ? (
                                    <Image
                                        src={clientProfile.foto_perfil}
                                        alt="Foto perfil"
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300 text-lg">👤</div>
                                )}
                            </div>

                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                                    {title === "Panel Usuario — Pawnecta" ? <span className="block sm:inline">Hola, {displayName.split(' ')[0]} 👋</span> : title}
                                </h1>
                                {/* Mobile Status Badge */}
                                <div className="md:hidden mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Usuario Verificado
                                </div>

                                {title === "Panel Usuario — Pawnecta" && (
                                    <p className="hidden md:block text-sm text-slate-600 mt-1">
                                        Gestiona tus viajes, mascotas y perfil.
                                    </p>
                                )}
                            </div>
                        </div>
                        {userId && <NotificationCenter userId={userId} />}
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                        {/* SIDEBAR */}
                        <aside className="lg:col-span-4 space-y-6 order-2 lg:order-1">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group hover:shadow-md transition-all duration-300">
                                {/* Subtle Accent Header instead of harsh gradient */}
                                <div className="h-24 bg-gradient-to-b from-emerald-50/80 to-white"></div>

                                <div className="px-6 pb-6 text-center -mt-12 relative flex flex-col items-center">
                                    <div className="relative w-24 h-24 mb-3">
                                        <div
                                            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white cursor-pointer group-hover:scale-105 transition-transform duration-300"
                                            onClick={() => setIsLightboxOpen(true)}
                                        >
                                            {clientProfile?.foto_perfil ? (
                                                <Image
                                                    src={clientProfile.foto_perfil}
                                                    alt="Foto perfil"
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-200 bg-slate-50 text-3xl">
                                                    <User size={32} />
                                                </div>
                                            )}
                                        </div>

                                        <label className="absolute bottom-0 right-0 p-2 bg-white border border-slate-200 rounded-full shadow-md cursor-pointer hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-all z-10">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <span className="block w-4 h-4 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></span>
                                            ) : (
                                                <Edit2 size={14} /> // Using Lucide Edit2 icon if available, or fallback
                                            )}
                                        </label>
                                    </div>

                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        {displayName}
                                    </h2>

                                    <div className="flex flex-col items-center gap-1 mt-2 text-sm">
                                        <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            <Mail size={14} className="text-slate-400" />
                                            {email}
                                        </div>
                                        {clientProfile?.telefono && (
                                            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 mt-1">
                                                <Phone size={14} className="text-slate-400" />
                                                {clientProfile.telefono}
                                            </div>
                                        )}
                                    </div>

                                    <div className="hidden md:inline-flex mt-4 items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100/50 shadow-sm">
                                        <CheckCircle2 size={12} strokeWidth={3} />
                                        Usuario Verificado
                                    </div>
                                </div>

                                {/* Navigation Links */}
                                <nav className="border-t border-slate-100 p-2">
                                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-500 rounded-xl hover:bg-slate-50 hover:text-rose-600 transition-all group/logout">
                                        <LogOut size={18} className="text-slate-400 group-hover/logout:text-rose-500 transition-colors" />
                                        Cerrar Sesión
                                    </button>
                                </nav>
                            </div>
                        </aside>

                        {/* MAIN CONTENT */}
                        <div className="lg:col-span-8 order-1 lg:order-2">
                            {children}
                        </div>

                    </div>
                </div>

                {/* Lightbox */}
                {
                    clientProfile?.foto_perfil && (
                        <ImageLightbox
                            src={clientProfile.foto_perfil}
                            alt="Foto de perfil"
                            isOpen={isLightboxOpen}
                            onClose={() => setIsLightboxOpen(false)}
                        />
                    )
                }

                <ModalAlert
                    isOpen={alertConfig.isOpen}
                    onClose={closeAlert}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type}
                />
            </div >
        </ClientContext.Provider >
    );
}
