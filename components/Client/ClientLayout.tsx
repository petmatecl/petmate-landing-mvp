import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { getProxyImageUrl } from '../../lib/utils';
import ImageLightbox from '../ImageLightbox';
import ModalAlert from '../ModalAlert';
import { User } from 'lucide-react';

interface ClientLayoutProps {
    children: React.ReactNode;
    userId: string | null;
    title?: string;
}

export default function ClientLayout({ children, userId, title = "Panel Usuario — Pawnecta" }: ClientLayoutProps) {
    const router = useRouter();
    const [clientProfile, setClientProfile] = useState<any>(null);
    const [nombre, setNombre] = useState<string | null>(null);
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

    useEffect(() => {
        if (userId) {
            fetchClientProfile(userId);
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) {
                    if (data.user.user_metadata?.nombre) {
                        setNombre(data.user.user_metadata.nombre);
                    }
                }
            });
        }
    }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchClientProfile(uid: string) {
        const { data: buscadorData } = await supabase
            .from('usuarios_buscadores')
            .select('*')
            .eq('auth_user_id', uid)
            .maybeSingle();

        if (buscadorData) {
            setClientProfile(buscadorData);
            if (buscadorData.nombre && !nombre) setNombre(buscadorData.nombre);
            return;
        }

        const { data: proveedorData } = await supabase
            .from('proveedores')
            .select('*')
            .eq('auth_user_id', uid)
            .maybeSingle();

        if (proveedorData) {
            setClientProfile(proveedorData);
            if (proveedorData.nombre && !nombre) setNombre(proveedorData.nombre);
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

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { data: esBuscador } = await supabase
                .from('usuarios_buscadores')
                .select('id')
                .eq('auth_user_id', userId)
                .maybeSingle();

            const tabla = esBuscador ? 'usuarios_buscadores' : 'proveedores';

            const { error: updateError } = await supabase
                .from(tabla)
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
    };

    // suppress unused warning — handleLogout kept for future nav item
    void handleLogout;
    void uploading;
    void handlePhotoUpload;

    return (
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
                                    src={getProxyImageUrl(clientProfile.foto_perfil) || ''}
                                    alt="Foto perfil"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-300 text-lg"><User size={24} /></div>
                            )}
                        </div>

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                                {title !== "Panel Usuario — Pawnecta" ? title : null}
                            </h1>
                            {/* Mobile Status Badge */}
                            <div className="md:hidden mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Usuario Verificado
                            </div>
                        </div>
                    </div>
                </header>

                <div>
                    {children}
                </div>
            </div>

            {/* Lightbox */}
            {clientProfile?.foto_perfil && (
                <ImageLightbox
                    src={getProxyImageUrl(clientProfile.foto_perfil) || ''}
                    alt="Foto de perfil"
                    isOpen={isLightboxOpen}
                    onClose={() => setIsLightboxOpen(false)}
                />
            )}

            <ModalAlert
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
}
