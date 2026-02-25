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
      await router.push(selectedRole === "cliente" ? "/usuario" : "/sitter");
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
        // Pero primero verifica si es admin por email (puede no tener perfil completo)
        const ADMIN_EMAILS = ['canocortes@gmail.com', 'admin@petmate.cl', 'aldo@petmate.cl', 'eduardo.a.cordova.d@gmail.com', 'acanocts@gmail.com'];
        if (data.user.email && ADMIN_EMAILS.includes(data.user.email)) {
          setTimeout(() => {
            window.location.href = '/admin';
          }, 500);
          return;
        }
        setTimeout(() => {
          window.location.href = '/register?resume=true';
        }, 500);
        return;
      }

      // Determina roles del perfil
      const userRoles = profile.roles || [];

      // Admin check por roles O por email whitelist
      const ADMIN_EMAILS = ['canocortes@gmail.com', 'admin@petmate.cl', 'aldo@petmate.cl', 'eduardo.a.cordova.d@gmail.com', 'acanocts@gmail.com'];
      const isAdminByEmail = data.user.email && ADMIN_EMAILS.includes(data.user.email);
      const isAdminByRole = userRoles.includes('admin');

      if (isAdminByEmail || isAdminByRole) {
        setTimeout(() => {
          window.location.href = '/admin';
        }, 500);
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
        setTimeout(() => { window.location.href = '/proveedor'; }, 500);
      } else if (proveedorData?.estado === 'pendiente') {
        setTimeout(() => { window.location.href = '/usuario'; }, 500);
      } else {
        setTimeout(() => { window.location.href = '/explorar'; }, 500);
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

      <main className="pmLogin page">
        <div className="wrap">
          <Card variant="elevated" padding="l" className="login-card">
            <h1 className="title">Iniciar sesión</h1>
            <p className="subtitle">
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

            <form onSubmit={handleSubmit} className="form">

              {/* Correo */}
              <div className="field">
                <label htmlFor="email" className="label">
                  <MailIcon /> <span>Correo</span>
                </label>
                <div className="inputWrap">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="field">
                <label htmlFor="password" className="label">
                  <LockIcon /> <span>Contraseña</span>
                </label>
                <div className="inputWrap">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="rightIconBtn"
                    aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowPass((v) => !v)}
                    title={showPass ? "Ocultar" : "Mostrar"}
                  >
                    {showPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}

              {/* Botón */}
              <button
                type="submit"
                className="btnPrimary"
                disabled={loading}
                style={{
                  display: "block",
                  width: "100%",
                  height: 48,
                  marginTop: 8,
                  border: "none",
                  borderRadius: 10,
                  background: "#111827",
                  color: "#fff",
                  fontWeight: 800 as any,
                  cursor: loading ? "default" : "pointer",
                }}
              >
                {loading ? "Verificando..." : "Ingresar"}
              </button>

              <div style={{ marginTop: 12 }}>
                <GoogleAuthButton source="login" />
                <LinkedInAuthButton role="client" source="login" />
              </div>

              {/* Links */}
              <div className="links">
                <Link href="/register" className="a">
                  ¿No tienes cuenta? Regístrate
                </Link>
                <Link href="/forgot-password" className="a">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </main >

      <style jsx>{`
        :root {
          --brand: #111827;
          --muted: #f6f7f9;
        }

        .page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: center; /* Centered Vertically */
          justify-content: center;
          padding: 24px;
          background: var(--page-bg);
        }
        .wrap {
          width: 100%;
          max-width: 480px; /* narrowed for single column */
        }

        .title {
          font-size: 1.9rem;
          margin: 0 0 4px;
        }
        .subtitle {
          color: #6b7280;
          margin: 0 0 24px;
        }

        /* Form */
        .form {
          display: grid;
          gap: 14px;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: #111827;
        }
        .inputWrap {
          position: relative;
        }
        input {
          height: 46px;
          width: 100%;
          padding: 0 44px 0 12px;
          border: 2px solid #94a3b8; /* Slate-400 */
          border-radius: 10px;
          background: #fff;
        }
        input:placeholder {
          color: #9ca3af;
        }
        input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        .rightIconBtn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          padding: 6px;
          border-radius: 8px;
          cursor: pointer;
          color: #374151;
        }
        .rightIconBtn:hover {
          background: #f3f4f6;
        }

        .links {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;
          margin-top: 10px;
        }
        .a {
          text-decoration: underline;
          color: #111827;
        }

        .error {
          color: #b91c1c;
        }
      `}</style>
    </>
  );
}
