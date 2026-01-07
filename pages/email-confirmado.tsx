import React, { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function EmailConfirmadoPage() {
    const router = useRouter();

    useEffect(() => {
        // Escuchar cambios de estado (login con Google dispara SIGNED_IN)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                const pendingRole = window.localStorage.getItem('pm_auth_role_pending');
                if (pendingRole === 'petmate') {
                    window.localStorage.setItem("activeRole", "petmate");
                    router.replace("/sitter");
                } else {
                    window.localStorage.setItem("activeRole", "cliente");
                    router.replace("/cliente");
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
                <div className="w-full max-w-[520px] bg-white rounded-2xl p-8 shadow-xl border border-emerald-100 text-center relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-emerald-100 text-emerald-600 text-4xl shadow-sm">
                        🎉
                    </div>

                    <h1 className="text-3xl font-extrabold text-gray-900 m-0 mb-2">
                        ¡Sesión iniciada!
                    </h1>

                    <p className="text-lg text-gray-600 mb-6">
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
                </div>
            </main>
        </>
    );
}
