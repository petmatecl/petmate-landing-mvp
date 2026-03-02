import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

// ==== Íconos mono (inline SVG) ====
const MailIcon = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

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
      </Head>

      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 w-full max-w-md shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Recuperar contraseña</h1>
          <p className="text-sm text-slate-500 mb-6">
            Ingresa tu correo y te enviaremos un enlace para restablecerla.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 mb-4">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 block">
                Correo
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <MailIcon />
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
              <div className={`p-4 rounded-lg text-sm font-medium ${message.type === "error" ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"} border`} role="alert">
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>

            <div className="flex justify-center mt-4">
              <Link href="/login" className="text-sm text-slate-600 hover:text-emerald-700 hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
