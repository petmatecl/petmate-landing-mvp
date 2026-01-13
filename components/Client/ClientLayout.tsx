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
import { User, LogOut } from 'lucide-react';
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
                            <div className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden">
                                <div className="h-24 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                                <div className="px-6 pb-6 text-center -mt-12 relative">
                                    <div className="relative w-24 h-24 mx-auto">
                                        <div
                                            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md bg-white cursor-pointer group"
                                            onClick={() => setIsLightboxOpen(true)}
                                        >
                                            {clientProfile?.foto_perfil ? (
                                                <Image
                                                    src={clientProfile.foto_perfil}
                                                    alt="Foto perfil"
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300 text-3xl">
                                                    👤
                                                </div>
                                            )}
                                        </div>

                                        <label className="absolute bottom-0 right-0 p-1.5 bg-white border-2 border-slate-300 rounded-full shadow-sm cursor-pointer hover:bg-slate-50 text-slate-600 transition-colors z-10">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoUpload}
                                                disabled={uploading}
                                            />
                                            {uploading ? (
                                                <span className="block w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></span>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            )}
                                        </label>
                                    </div>

                                    <h2 className="mt-3 text-lg font-bold text-slate-900">
                                        {displayName}
                                    </h2>
                                    <div className="flex flex-col items-center gap-1 mt-1">
                                        <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                                            {email}
                                        </p>
                                        {clientProfile?.telefono && (
                                            <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                                {clientProfile.telefono}
                                            </p>
                                        )}
                                    </div>

                                    <div className="hidden md:inline-flex mt-3 items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></svg>
                                        Usuario Verificado
                                    </div>
                                </div>

                                {/* Navigation Links (Active state logic could be added) */}
                                <nav className="border-t border-slate-300 p-2">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                        <LogOut size={18} />
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
