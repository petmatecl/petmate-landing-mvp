// pages/login.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import GoogleAuthButton from "../components/GoogleAuthButton";

type Role = "client" | "petmate";

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
const EyeIcon = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3.2" />
  </svg>
);
const EyeOffIcon = (props: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    {...props}
  >
    <path d="M17.94 17.94C16.1 19.24 14.12 20 12 20 5 20 1 12 1 12a20.1 20.1 0 0 1 6.05-6.05m4.31-1.55C19 4.4 23 12 23 12a20.14 20.14 0 0 1-2.83 3.94" />
    <path d="M1 1l22 22" />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Role>("client");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPass, setShowPass] = React.useState(false);

  // (Opcional) si quieres que /login?role=petmate seleccione el tab solo
  React.useEffect(() => {
    if (!router.isReady) return;
    const q = String(router.query.role || "").toLowerCase();
    if (q === "petmate") setTab("petmate");
    if (q === "client" || q === "cliente") setTab("client");

    // Verificar si viene por timeout
    if (router.query.timeout === "true") {
      setError("Por seguridad, tu sesión se ha cerrado tras 10 minutos de inactividad.");
    }
  }, [router.isReady, router.query.role, router.query.timeout]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const role = ((form.get("role") as Role) || "client") as Role;
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      setError("Completa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Error al iniciar sesión:", error);

        const msg = error.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError(
            "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
          );
        } else {
          setError("Correo o contraseña incorrectos.");
        }
        return; // ⛔ NO redirigimos
      }

      if (!data?.user) {
        setError("No se pudo iniciar sesión. Intenta nuevamente.");
        return;
      }

      // ✅ Solo con login exitoso redirigimos
      await router.push(role === "client" ? "/cliente" : "/sitter");
    } catch (err: any) {
      console.error(err);
      setError("No se pudo iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Iniciar sesión — Pawnecta</title>
      </Head>

      <main className="pmLogin page">
        <div className="wrap">
          {/* Tabs */}
          <div className="tabs" role="tablist" aria-label="Selecciona tipo de cuenta">
            <button
              role="tab"
              aria-selected={tab === "client"}
              className={`tab ${tab === "client" ? "active" : ""} `}
              onClick={() => setTab("client")}
              type="button"
            >
              Cliente
            </button>
            <button
              role="tab"
              aria-selected={tab === "petmate"}
              className={`tab ${tab === "petmate" ? "active" : ""} `}
              onClick={() => setTab("petmate")}
              type="button"
            >
              Sitter
            </button>
          </div>

          {/* Card */}
          <div className="card">
            <h1 className="title">Iniciar sesión</h1>
            <p className="subtitle">
              Accede como {tab === "client" ? "cliente" : "Sitter"} para reservar y gestionar
              servicios.
            </p>

            <form onSubmit={handleSubmit} className="form">
              <input type="hidden" name="role" value={tab} />

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

              {/* Botón — estilos inline para ganar a cualquier CSS global */}
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
                {loading ? "Ingresando…" : "Iniciar sesión"}
              </button>

              <div style={{ marginTop: 12 }}>
                <GoogleAuthButton role={tab} />
              </div>

              {/* Links */}
              <div className="links">
                <Link
                  href={tab === "client" ? "/register?role=client" : "/register?role=petmate"}
                  className="a"
                >
                  ¿No tienes cuenta? Regístrate
                </Link>
                <Link href="/forgot-password" className="a">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main >

      <style jsx>{`
        :root {
          --brand: #111827;
          --muted: #f6f7f9;
          --border: #e5e7eb;
        }

        .page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg, #fafafa, #fff);
        }
        .wrap {
          width: 100%;
          max-width: 640px;
        }

        /* Tabs */
        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--muted);
          padding: 6px;
          border-radius: 14px;
          margin-bottom: 14px;
          border: 1px solid var(--border);
        }
        .tab {
          appearance: none;
          border: 0;
          padding: 0.9rem 1rem;
          border-radius: 10px;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
          color: #6b7280;
        }
        .tab.active {
          background: #fff;
          border: 2px solid var(--brand);
          color: var(--brand);
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        }

        /* Card */
        .card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
        }
        .title {
          font-size: 1.9rem;
          margin: 0 0 4px;
        }
        .subtitle {
          color: #6b7280;
          margin: 0 0 18px;
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
          border: 1.5px solid #cbd5e1;
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

        /* Ojo centrado */
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

        /* Links */
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
