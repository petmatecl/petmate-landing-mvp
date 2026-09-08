import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import * as Sentry from '@sentry/nextjs';
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
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    // Sprint error-audit Case 5-perfil (2026-09-08) — profileError distingue
    // "fallo de red al cargar el perfil" de "sin perfil legítimo" (ambos casos
    // dejaban clientProfile en null antes; ahora solo el segundo). Banner en
    // el header con Reintentar cuando error truthy; retryTrigger fuerza
    // re-invocación del useEffect abajo. Ver banner condicional en el JSX.
    //
    // P10: fetchClientProfile se llama desde useEffect sobre userId + retryTrigger.
    // NO desde onAuthStateChange callback ni desde el lock del SDK Auth.
    // userId viene del state del wrapper (pages/usuario.tsx) que lo setea con
    // getSession() al mount. Cero riesgo de deadlock.
    const [profileError, setProfileError] = useState<any>(null);
    const [retryTrigger, setRetryTrigger] = useState(0);
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
        }
    }, [userId, retryTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchClientProfile(uid: string) {
        // Sprint error-audit Case 5-perfil — destructurar .error para distinguir
        // "fallo de red" de "no hay fila en esta tabla". Antes ambos casos
        // devolvían data:null → fallthrough silente → clientProfile queda null
        // sin señal al user (avatar genérico + badge "Usuario Verificado" fijo
        // afirmando verificación aunque no cargamos ningún dato).
        const { data: buscadorData, error: buscadorError } = await supabase
            .from('usuarios_buscadores')
            .select('*')
            .eq('auth_user_id', uid)
            .maybeSingle();

        if (buscadorError) {
            console.warn('[client_layout] fetch usuarios_buscadores failed:', buscadorError);
            Sentry.captureMessage('profile_fetch_failed', {
                level: 'warning',
                tags: {
                    subsystem: 'client_layout',
                    route: router.pathname,
                    table: 'usuarios_buscadores',
                    errorCode: buscadorError.code || 'unknown',
                },
                extra: {
                    errorMessage: buscadorError.message,
                    errorDetails: buscadorError.details,
                    errorHint: buscadorError.hint,
                },
            });
            setProfileError(buscadorError);
            return;
        }

        if (buscadorData) {
            setClientProfile(buscadorData);
            setProfileError(null);
            return;
        }

        const { data: proveedorData, error: proveedorError } = await supabase
            .from('proveedores')
            .select('*')
            .eq('auth_user_id', uid)
            .maybeSingle();

        if (proveedorError) {
            console.warn('[client_layout] fetch proveedores failed:', proveedorError);
            Sentry.captureMessage('profile_fetch_failed', {
                level: 'warning',
                tags: {
                    subsystem: 'client_layout',
                    route: router.pathname,
                    table: 'proveedores',
                    errorCode: proveedorError.code || 'unknown',
                },
                extra: {
                    errorMessage: proveedorError.message,
                    errorDetails: proveedorError.details,
                    errorHint: proveedorError.hint,
                },
            });
            setProfileError(proveedorError);
            return;
        }

        if (proveedorData) {
            setClientProfile(proveedorData);
        }
        // "Sin perfil legítimo" (ambas queries succeed sin data) preserva
        // el comportamiento previo: clientProfile queda null y NO se dispara
        // profileError. El banner NO aparece. Verificado por lectura del diff
        // (no ejercitado en runtime — escenario edge difícil de construir).
        setProfileError(null);
    }

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

    const handleRetryProfile = () => {
        setProfileError(null);
        setRetryTrigger(prev => prev + 1);
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!userId) return;
        try {
            if (!event.target.files || event.target.files.length === 0) return;
            const file = event.target.files[0];

            // ORDEN CRÍTICO: verificar el rol ANTES de subir el archivo.
            // Motivo:
            //   1. Sin saber el rol, cualquier UPDATE cae en una tabla con
            //      WHERE que no matchea 0 filas. PostgREST NO reporta esto
            //      como error → mentira silenciosa al user + data no
            //      persistida ("¡Foto actualizada!" verde, F5 borra la foto).
            //   2. Si el upload sucede antes de saber el rol y el flujo se
            //      corta después (rol es tutor → alert "no disponible" +
            //      return; o rolError → toast + return), el archivo queda
            //      HUÉRFANO en el bucket avatars sin referencia desde BD.
            //      El bug del camino tutor era 100% reproducible en cada
            //      intento de subida antes del reorden (sprint error-audit).
            // NO mover el .storage.upload() más arriba pensando que "es más
            // eficiente subir primero mientras se resuelve el rol" — ambos
            // bugs vuelven de inmediato. Verificar antes de escribir.
            const { data: esBuscador, error: rolError } = await supabase
                .from('usuarios_buscadores')
                .select('id')
                .eq('auth_user_id', userId)
                .maybeSingle();

            if (rolError) {
                showAlert('No pudimos guardar la foto', 'Vuelve a intentar.', 'error');
                return;
            }

            // usuarios_buscadores no tiene columna foto_perfil (solo proveedores
            // la tiene). Feature de foto de perfil para tutores queda pendiente
            // (requiere agregar la columna).
            if (esBuscador) {
                showAlert('No disponible aún', 'La foto de perfil todavía no está habilitada para tutores.', 'info');
                return;
            }

            // Rol confirmado como proveedor: recién ahora subimos el archivo.
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('proveedores')
                .update({ foto_perfil: publicUrl })
                .eq('auth_user_id', userId);

            if (updateError) throw updateError;

            setClientProfile((prev: any) => ({ ...prev, foto_perfil: publicUrl }));
            showAlert('¡Foto actualizada!', 'Tu foto de perfil ha sido actualizada correctamente.', 'success');
        } catch (error: any) {
            console.error('Error uploading photo:', error);
            showAlert('Error', error.message || 'Error subiendo la imagen.', 'error');
        }
    };

    // Declare for use in future nav items
    void handleLogout;

    return (
        <div className="ambient-bg min-h-screen">
            <Head>
                <title>{title}</title>
                <meta name="description" content="Tu panel de usuario en Pawnecta. Gestiona tus mensajes, favoritos y servicios consultados." />
            </Head>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
                {/* Sprint error-audit Case 5-perfil (2026-09-08) — banner de
                    error cuando fetchClientProfile falla por red. NO bloquea
                    children (a diferencia de RoleGuard: este layout es chrome,
                    no gate — el user puede tener trabajo pendiente en la
                    página: formulario, edición, mensaje sin enviar). Copy y
                    patrón alineados con RoleGuard error state. Desaparece con
                    retry exitoso o cuando la query devuelve data ok. */}
                {profileError && (
                    <div className="mb-4 p-4 border border-danger-100 bg-danger-50 rounded-xl flex items-center justify-between gap-4">
                        <div>
                            <p className="text-slate-900 font-semibold text-sm">No pudimos cargar tu perfil</p>
                            <p className="text-slate-500 text-xs mt-1">Revisa tu conexión y vuelve a intentar.</p>
                        </div>
                        <button
                            onClick={handleRetryProfile}
                            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent-600 focus:ring-offset-2"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* #11 Fix: was <header> causing duplicate semantic header — now a <div> */}
                <div className="mb-6 sm:mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {/* Avatar con opción de cambio de foto */}
                        <label
                            htmlFor="avatar-upload"
                            className="md:hidden relative w-10 h-10 rounded-full overflow-hidden border-2 border-slate-300 bg-white shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            title="Cambiar foto de perfil"
                        >
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
                        </label>
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                                {title !== "Panel Usuario — Pawnecta" ? title : null}
                            </h1>
                            {/* Sprint error-audit Case 5-perfil (2026-09-08) —
                                badge condicionado a clientProfile !== null.
                                Antes era texto fijo → afirmación falsa cuando
                                fetchClientProfile fallaba (mostraba "Usuario
                                Verificado" aunque no habíamos cargado ningún
                                dato). Con profileError o con perfil aún
                                cargando, el badge no aparece. Copy y estilo
                                intactos, solo cambia la condición de render. */}
                            {clientProfile && (
                                <div className="md:hidden mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-accent-800 bg-accent-50 px-1.5 py-0.5 rounded border border-accent-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-600" />
                                    Usuario Verificado
                                </div>
                            )}
                        </div>
                    </div>
                </div>

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
