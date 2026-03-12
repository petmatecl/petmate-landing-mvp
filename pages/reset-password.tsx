import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

// ==== Íconos mono (inline SVG) ====
const LockIcon = (props: any) => (
    <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        {...props}
    >
        <rect x="4" y="11" width="16" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
);

export default function ResetPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                // El usuario está en modo recuperación
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setMessage(null);

        const form = new FormData(e.currentTarget);
        const password = String(form.get("password") || "");
        const confirmPassword = String(form.get("confirmPassword") || "");

        if (!password || !confirmPassword) {
            setMessage({ type: "error", text: "Completa todos los campos." });
            return;
        }

        if (password !== confirmPassword) {
            setMessage({ type: "error", text: "Las contraseñas no coinciden." });
            return;
        }

        if (password.length < 8) {
            setMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres." });
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                console.error(error);
                setMessage({ type: "error", text: "No se pudo actualizar la contraseña. Token inválido o expirado." });
            } else {
                setMessage({
                    type: "success",
                    text: "Contraseña actualizada correctamente.",
                });
                // Redirigir después de unos segundos
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Ocurrió un error inesperado." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Head>
                <title>Restablecer Contraseña | Pawnecta</title>
            </Head>

            <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md shadow-sm">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Nueva contraseña</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        Ingresa tu nueva contraseña para acceder a tu cuenta.
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1 mb-4">
                            <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
                                Nueva contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LockIcon />
                                </span>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-12 pl-10 pr-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 mb-4">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 block">
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <LockIcon />
                                </span>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    className="w-full h-12 pl-10 pr-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm text-slate-900"
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"} border`} role="alert">
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                            disabled={loading}
                        >
                            {loading ? "Actualizando..." : "Actualizar contraseña"}
                        </button>
                    </form>
                </div>
            </main>
        </>
    );
}
