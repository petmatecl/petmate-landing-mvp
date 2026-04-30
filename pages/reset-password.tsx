import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Leer el hash ANTES de que Supabase lo limpie — debe ser lazy initializer
    const [linkError, setLinkError] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        const hash = window.location.hash;
        if (hash.includes('error=access_denied') || hash.includes('error_code=otp_expired')) {
            return 'El enlace expiró (tienen validez de 1 hora). Solicita uno nuevo desde la página de login.';
        }
        return null;
    });

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === "PASSWORD_RECOVERY") {
                // User is in password recovery mode — no action needed here
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
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT')), 8000)
            );
            const { error } = await Promise.race([
                supabase.auth.updateUser({ password }),
                timeout,
            ]) as { error: any };

            if (error) {
                console.error(error);
                setMessage({ type: "error", text: "No se pudo actualizar la contraseña. El token puede haber expirado." });
            } else {
                setMessage({ type: "success", text: "Contraseña actualizada correctamente. Redirigiendo..." });
                setTimeout(() => { router.push("/login"); }, 2000);
            }
        } catch (err: any) {
            if (err?.message === 'TIMEOUT') {
                setMessage({ type: "error", text: "La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo." });
            } else {
                console.error(err);
                setMessage({ type: "error", text: "Ocurrió un error inesperado." });
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Head>
                <title>Nueva Contraseña | Pawnecta</title>
                <meta name="description" content="Establece una nueva contraseña para tu cuenta de Pawnecta." />
            </Head>

            <div className="min-h-screen bg-slate-50 flex flex-col">
                {/* Mini header */}
                <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between max-w-7xl mx-auto w-full">
                    <Link href="/">
                        <Image src="/pawnecta_logo_final-trans.png" alt="Pawnecta" width={110} height={32} className="h-7 w-auto" />
                    </Link>
                    <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors">
                        ← Volver al inicio de sesión
                    </Link>
                </header>

                <main className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md shadow-sm">

                        {linkError ? (
                            /* Estado: link expirado */
                            <div className="text-center">
                                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock size={24} className="text-red-400" />
                                </div>
                                <h1 className="text-xl font-bold text-slate-900 mb-2">Enlace expirado</h1>
                                <p className="text-sm text-slate-500 mb-6">{linkError}</p>
                                <Link
                                    href="/forgot-password"
                                    className="inline-block w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors leading-[3rem] text-center text-sm"
                                >
                                    Solicitar nuevo enlace
                                </Link>
                            </div>
                        ) : (
                            /* Formulario normal */
                            <>
                                <div className="mb-6">
                                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Nueva contraseña</h1>
                                    <p className="text-sm text-slate-500">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                    {/* Nueva contraseña */}
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="password" className="text-sm font-medium text-slate-700 block">
                                            Nueva contraseña
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Lock size={18} />
                                            </span>
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Mínimo 8 caracteres"
                                                required
                                                className="w-full h-12 pl-10 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm text-slate-900"
                                            />
                                            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirmar contraseña */}
                                    <div className="flex flex-col gap-1">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 block">
                                            Confirmar contraseña
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                                <Lock size={18} />
                                            </span>
                                            <input
                                                id="confirmPassword"
                                                name="confirmPassword"
                                                type={showConfirm ? "text" : "password"}
                                                placeholder="Repite tu contraseña"
                                                required
                                                className="w-full h-12 pl-10 pr-10 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm text-slate-900"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {message && (
                                        <div
                                            className={`p-4 rounded-lg text-sm font-medium border ${message.type === "error"
                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                }`}
                                            role="alert"
                                        >
                                            {message.text}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                                        disabled={loading}
                                    >
                                        {loading ? <><Loader2 size={18} className="animate-spin" /> Actualizando...</> : "Actualizar contraseña"}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

