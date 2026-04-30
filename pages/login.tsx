// pages/login.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const inputClass =
  "w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors";

export default function LoginPage() {
  const router = useRouter();
  // Validate redirect is a safe relative path (prevent open redirect)
  const rawRedirect = typeof router.query.redirect === "string" ? router.query.redirect : null;
  const redirect = rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  React.useEffect(() => {
    if (router.query.timeout === "true") {
      setError("Por seguridad, tu sesión se cerró tras 10 minutos de inactividad.");
    }
  }, [router.query.timeout]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("Ingresa tu correo y contraseña para continuar.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("activeRole");
      window.localStorage.removeItem("pawnecta_pending_role");
    }

    setLoading(true);
    setError(null);

    try {
      // Timeout de 8 segundos — si Supabase no responde, mostramos error inmediato
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), 8000)
      );

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ]);

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada o carpeta de spam.");
        } else {
          setError("El correo o la contraseña no son correctos. Inténtalo de nuevo.");
        }
        return;
      }

      if (!data?.user) {
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
        return;
      }

      // Determinar destino según rol
      if (redirect) {
        window.location.replace(redirect);
      } else {
        // Check if user is a provider
        const { data: provData } = await supabase
          .from('proveedores')
          .select('id, estado')
          .eq('auth_user_id', data.user.id)
          .maybeSingle();

        if (provData) {
          window.location.replace('/proveedor');
        } else {
          window.location.replace('/explorar');
        }
      }
    } catch (err: any) {
      if (err?.message === "TIMEOUT") {
        setError("La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.");
      } else {
        setError("No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar sesión — Pawnecta</title>
        <meta name="description" content="Ingresa a tu cuenta de Pawnecta y accede a proveedores verificados para el cuidado de tu mascota." />
      </Head>

      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Context banner when coming from protected action */}
          {redirect && (
            <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
              Ingresa a tu cuenta para continuar con tu acción.
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Ingresa a tu cuenta</h1>
            <p className="text-sm text-slate-500 mb-7">
              Accede a tu red de proveedores verificados
            </p>

            {/* Config warning */}
            {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") && (
              <div className="bg-amber-50 text-amber-800 p-4 rounded-xl mb-5 text-sm border border-amber-200">
                Advertencia: la base de datos no está configurada. Faltan variables de entorno de Supabase.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail size={15} className="text-slate-400" />
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={inputClass}
                  placeholder="tu@correo.cl"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Lock size={15} className="text-slate-400" />
                    Contraseña
                  </label>
                  <Link href="/forgot-password" className="text-xs text-emerald-700 hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    className={`${inputClass} pr-12`}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPass((v) => !v)}
                  >
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 -mt-1" role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              {/* CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {/* Secondary link */}
              <p className="text-sm text-center text-slate-500 mt-1">
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="text-emerald-700 font-semibold hover:underline">
                  Regístrate gratis
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>


    </>
  );
}
