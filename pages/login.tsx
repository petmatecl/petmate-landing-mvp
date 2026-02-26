// pages/login.tsx
import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Shared/Card";
import GoogleAuthButton from "../components/GoogleAuthButton";
import LinkedInAuthButton from "../components/LinkedInAuthButton";
import { AuthService, Role } from "../lib/authService";
import { RoleSelector } from "../components/Auth/RoleSelector";

// ==== Íconos mono (inline SVG) ====
const MailIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);
const LockIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <rect x="4" y="11" width="16" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const EyeIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);
const EyeOffIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M17.94 17.94C16.1 19.24 14.12 20 12 20 5 20 1 12 1 12a20.1 20.1 0 0 1 6.05-6.05m4.31-1.55C19 4.4 23 12 23 12a20.14 20.14 0 0 1-2.83 3.94" />
    <path d="M1 1l22 22" />
  </svg>
);



export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // New State for Profile Selection
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>("");

  React.useEffect(() => {
    if (router.query.timeout === "true") {
      setError("Por seguridad, tu sesión se ha cerrado tras 10 minutos de inactividad.");
    }
  }, [router.query.timeout]);

  const handleRoleSelect = async (selectedRole: Role) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("activeRole", selectedRole);
    }
    // Redirect
    if (selectedRole === 'admin') {
      await router.push("/admin");
    } else {
      await router.push(selectedRole === "cliente" ? "/usuario" : "/proveedor");
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("Completa tu correo y contraseña.");
      return;
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("activeRole");
        window.localStorage.removeItem("pm_auth_role_pending");
      }
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Error al iniciar sesión:", error);
        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Debes confirmar tu correo antes de iniciar sesión. Revisa tu lista de spam.");
        } else {
          setError("Correo o contraseña incorrectos.");
        }
        setLoading(false);
        return;
      }

      if (!data?.user) {
        setError("No se pudo iniciar sesión. Intenta nuevamente.");
        setLoading(false);
        return;
      }

      // Fetch Profile — busca en registro_petmate Y proveedores
      const profile = await AuthService.fetchProfile(data.user.id);

      // Si no hay perfil en NINGUNA tabla → es usuario nuevo, completa registro
      if (!profile) {
        window.location.replace('/register?resume=true');
        return;
      }

      // Para proveedores y buscadores normales
      const { data: proveedorData } = await supabase
        .from('proveedores')
        .select('estado')
        .eq('auth_user_id', data.user.id)
        .single();

      const hasApprovedProvider = proveedorData?.estado === 'aprobado';
      const savedMode = typeof window !== 'undefined'
        ? window.localStorage.getItem('pawnecta_active_mode') || 'buscador'
        : 'buscador';

      if (hasApprovedProvider && savedMode === 'proveedor') {
        window.location.replace('/proveedor');
        return;
      } else if (proveedorData?.estado === 'pendiente') {
        window.location.replace('/usuario');
        return;
      } else {
        window.location.replace('/explorar');
        return;
      }

    } catch (err: any) {
      console.error(err);
      setError("No se pudo iniciar sesión. Intenta nuevamente.");
      setLoading(false);
    }
  }

  // == Render: Login Form ==
  return (
    <>
      <Head>
        <title>Iniciar sesión — Pawnecta</title>
      </Head>

      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <Card variant="elevated" padding="l" className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h1>
            <p className="text-sm text-slate-500 mb-6">
              Ingresa a tu cuenta de Pawnecta
            </p>

            {/* Config Warning for Production */}
            {process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder") && (
              <div className="bg-amber-100 text-amber-800 p-4 rounded-lg mb-4 text-sm font-bold border border-amber-300">
                ⚠️ ALERTA: Supabase no está configurado.
                <br />
                Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel.
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Correo */}
              <div className="flex flex-col gap-1 mb-4">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MailIcon /> <span>Correo</span>
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400"
                    placeholder="tu@correo.com"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="flex flex-col gap-1 mb-4">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <LockIcon /> <span>Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder-slate-400 pr-12"
                    placeholder="••••••••"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPass((v) => !v)}
                    title={showPass ? "Ocultar" : "Mostrar"}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 mt-1" role="alert">
                  {error}
                </p>
              )}

              {/* Botón */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2 disabled:bg-slate-700 disabled:cursor-default"
                disabled={loading}
              >
                {loading && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "spin 0.8s linear infinite" }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                )}
                {loading ? "Verificando..." : "Ingresar"}
              </button>

              <div style={{ marginTop: 12 }}>
                <GoogleAuthButton source="login" />
                <LinkedInAuthButton role="client" source="login" />
              </div>

              {/* Links */}
              <div className="flex justify-between flex-wrap gap-2 text-sm mt-4">
                <Link href="/register" className="text-emerald-700 hover:underline font-medium">
                  ¿No tienes cuenta? Regístrate
                </Link>
                <Link href="/forgot-password" className="text-emerald-700 hover:underline font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </main >
    </>
  );
}
