import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Shared/Card";

export default function EmailConfirmadoPage() {
    const router = useRouter();

    useEffect(() => {
        // Escuchar cambios de estado (login con Google dispara SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = session.user;
                const pendingRole = window.localStorage.getItem('pm_auth_role_pending');

                try {
                    // 1. Check if profile exists
                    const { data: existingProfile } = await supabase
                        .from('registro_petmate')
                        .select('rol')
                        .eq('auth_user_id', user.id)
                        .single();

                    if (!existingProfile) {
                        // 2. Create Profile if it doesn't exist
                        // Extract metadata from Google
                        const fullName = user.user_metadata.full_name || user.user_metadata.name || "";
                        const firstName = user.user_metadata.given_name || fullName.split(' ')[0] || "Usuario";
                        const lastName = user.user_metadata.family_name || fullName.split(' ').slice(1).join(' ') || "";
                        const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture || "";

                        const roleToAssign = pendingRole === 'sitter' || pendingRole === 'petmate' ? 'petmate' : 'cliente';
                        const rolesArray = roleToAssign === 'petmate' ? ['sitter'] : ['cliente'];

                        const { error: insertError } = await supabase
                            .from('registro_petmate')
                            .insert([
                                {
                                    auth_user_id: user.id,
                                    rol: roleToAssign,
                                    roles: rolesArray,
                                    nombre: firstName,
                                    apellido_p: lastName,
                                    email: user.email,
                                    foto_perfil: avatarUrl,
                                    region: "RM", // Default
                                    perros: 0,
                                    gatos: 0
                                }
                            ]);

                        if (insertError) throw insertError;

                        // Set active role for immediate consistent UX
                        window.localStorage.setItem("activeRole", roleToAssign === 'petmate' ? 'petmate' : 'cliente');
                    } else {
                        // Existing profile - just set active role based on DB or preference
                        // If they just logged in, we might want to respect their "pendingRole" intent if they have that role?
                        // For now, let's just stick to their primary role or the one they requested if valid.
                        // Simple logic: default to their existing role.
                        const dbRole = existingProfile.rol;
                        window.localStorage.setItem("activeRole", dbRole === 'petmate' ? 'petmate' : 'cliente');
                    }

                    // 3. Redirect
                    if (pendingRole === 'sitter' || pendingRole === 'petmate' || existingProfile?.rol === 'petmate') {
                        router.replace("/sitter");
                    } else {
                        router.replace("/usuario");
                    }

                } catch (err) {
                    console.error("Error handling Google Auth profile:", err);
                    // Fallback redirect or error state
                    router.replace("/usuario");
                }
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    return (
        <>
            <Head>
                <title>¡Correo confirmado! — Pawnecta</title>
            </Head>

            <main className="min-h-[calc(100vh-200px)] flex items-center justify-center p-6 bg-gradient-to-b from-emerald-50 to-white">
                <Card padding="l" className="w-full max-w-[520px] text-center relative">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-emerald-100 text-emerald-600 text-4xl shadow-sm">
                        🎉
                    </div>

                    <h1 className="text-3xl font-extrabold text-slate-900 m-0 mb-2">
                        ¡Sesión iniciada!
                    </h1>

                    <p className="text-lg text-slate-600 mb-6">
                        Te estamos redirigiendo a tu cuenta...
                    </p>

                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center h-14 rounded-xl font-bold bg-emerald-600 text-white w-full text-lg shadow-emerald-200 shadow-lg hover:bg-emerald-700 hover:scale-[1.02] transition-all"
                        >
                            Ir a Iniciar Sesión
                        </Link>
                    </div>
                </Card>
            </main>
        </>
    );
}
