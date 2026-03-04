// pages/login.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Mail, Lock, Eye, EyeOff, PawPrint, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { RoleSelector, Role } from "../components/Auth/RoleSelector";

const inputClass =
  "w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:bg-white placeholder:text-slate-400 transition-colors";

export default function LoginPage() {
  const router = useRouter();
  const redirect = typeof router.query.redirect === "string" ? router.query.redirect : null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Role selector state (multi-role users)
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>("");

  React.useEffect(() => {
    if (router.query.timeout === "true") {
      setError("Por seguridad, tu sesión se cerró tras 10 minutos de inactividad.");
    }
  }, [router.query.timeout]);

  const handleRoleSelect = (selectedRole: Role) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("activeRole", selectedRole);
    }
    if (selectedRole === "admin") {
      router.push("/admin");
    } else {
      router.push(selectedRole === "usuario" ? "/usuario" : "/proveedor");
    }
  };

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

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeRole");
        window.localStorage.removeItem("pm_auth_role_pending");
      }
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de ingresar. Revisa tu bandeja de entrada o carpeta de spam.");
        } else {
          setError("El correo o la contraseña no son correctos. Inténtalo de nuevo.");
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }

      // Check profiles
      const { data: proveedorData } = await supabase
        .from("proveedores")
        .select("estado")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      const { data: buscadorData } = await supabase
        .from("usuarios_buscadores")
        .select("id")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (!proveedorData && !buscadorData) {
        setLoading(false);
        window.location.replace("/register?resume=true");
        return;
      }

      // Redirect to origin if present, else to role default
      const target =
        redirect ||
        (proveedorData &&
          proveedorData.estado === "aprobado" &&
          typeof window !== "undefined" &&
          window.localStorage.getItem("pawnecta_active_mode") === "proveedor"
          ? "/proveedor"
          : "/explorar");

      window.location.replace(target);
    } catch (err: any) {
      console.error(err);
      setError("Ocurrió un problema al iniciar sesión. Inténtalo más tarde.");
      setLoading(false);
    }
  }

  if (showRoleSelector) {
    return (
      <RoleSelector
        roles={availableRoles}
        userName={userName}
        onSelect={handleRoleSelect}
      />
    );
  }

  return (
    <>
      <Head>
        <title>Iniciar sesión — Pawnecta</title>
        <meta name="description" content="Ingresa a tu cuenta de Pawnecta y accede a proveedores verificados para el cuidado de tu mascota." />
      </Head>

      {/* Minimal header */}
      <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-slate-900 font-bold text-lg hover:opacity-80 transition-opacity">
          <PawPrint size={22} className="text-emerald-600" />
          Pawnecta
        </Link>
        <Link
          href="/explorar"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft size={14} />
          Explorar servicios
        </Link>
      </header>

      <main className="min-h-[calc(100vh-3.5rem-2.5rem)] bg-slate-50 flex items-center justify-center px-4 py-10">
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
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
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

      {/* Minimal footer */}
      <footer className="h-10 bg-white border-t border-slate-100 flex items-center justify-center gap-4 px-4">
        <Link href="/terminos" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Términos de servicio</Link>
        <span className="text-slate-200">·</span>
        <Link href="/privacidad" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Privacidad</Link>
        <span className="text-slate-200">·</span>
        <a href="mailto:contacto@pawnecta.com" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Contacto</a>
      </footer>
    </>
  );
}
