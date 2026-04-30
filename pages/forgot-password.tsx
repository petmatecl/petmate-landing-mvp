import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../lib/supabaseClient";
import { Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();

    if (!email) {
      setMessage({ type: "error", text: "Por favor ingresa tu correo." });
      return;
    }

    try {
      setLoading(true);

      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        setMessage({ type: "error", text: "No se pudo enviar el correo. Intenta nuevamente." });
      } else {
        setMessage({
          type: "success",
          text: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
        });
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
        <title>Recuperar Contraseña | Pawnecta</title>
        <meta name="description" content="Recupera el acceso a tu cuenta de Pawnecta. Te enviaremos un enlace para restablecer tu contraseña." />
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

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md shadow-sm">
            <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-emerald-700 transition-colors mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </Link>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Recuperar contraseña</h1>
              <p className="text-sm text-slate-500">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 block">
                  Correo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail size={18} />
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    autoComplete="off"
                    required
                    className="w-full h-12 pl-10 pr-4 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-sm text-slate-900"
                  />
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
                {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : "Enviar enlace"}
              </button>

              <div className="flex items-center justify-between mt-2 text-sm text-slate-500">
                <Link href="/login" className="hover:text-emerald-700 hover:underline">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="hover:text-emerald-700 hover:underline">
                  Crear cuenta
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
