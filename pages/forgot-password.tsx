import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { Card } from "../components/Shared/Card";

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

      // La URL de redirección debe ser absoluta o relativa a la raíz.
      // Ajusta 'http://localhost:3000' si estás en producción.
      // Supabase usará Site URL por defecto si no se especifica, pero es mejor ser explícito o usar window.location.origin
      const redirectTo = typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        // Por seguridad, a veces es mejor no decir si el email existe o no, 
        // pero para UX mostraremos el error si es algo obvio.
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

      <main className="pmLogin page">
        <div className="wrap">
          {/* Card */}
          <Card padding="l">
            <h1 className="title">Recuperar contraseña</h1>
            <p className="subtitle">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>

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

              {message && (
                <div
                  className={`message ${message.type === "error" ? "error" : "success"}`}
                  role="alert"
                >
                  {message.text}
                </div>
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
                  fontWeight: 800,
                  cursor: loading ? "default" : "pointer",
                }}
              >
                {loading ? "Enviando..." : "Enviar enlace"}
              </button>

              {/* Links */}
              <div className="links">
                <Link href="/login" className="a">
                  Volver al inicio de sesión
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </main>

      <style jsx>{`
        :root {
          --brand: #111827;
          --muted: #f6f7f9;
          --border: #94a3b8; /* slate-400 */
        }

        .page {
          min-height: calc(100vh - 200px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px;
          background: var(--page-bg);
        }
        .wrap {
          width: 100%;
          max-width: 480px; /* Un poco más estrecho que login */
        }

        /* Card styles removed - using component */

        .title {
          font-size: 1.8rem;
          margin: 0 0 4px;
        }
        .subtitle {
          color: #6b7280;
          margin: 0 0 18px;
          line-height: 1.5;
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
          padding: 0 12px;
          padding-left: 12px;
          border: 2px solid #94a3b8;
          border-radius: 10px;
          background: #fff;
        }
        input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
        }

        /* Messages */
        .message {
          padding: 12px;
          border-radius: 8px;
          font-size: 0.95rem;
          line-height: 1.4;
        }
        .message.error {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .message.success {
          background-color: #d1fae5;
          color: #047857;
        }

        /* Links */
        .links {
          display: flex;
          justify-content: center;
          font-size: 0.95rem;
          margin-top: 10px;
        }
        .a {
          text-decoration: underline;
          color: #111827;
        }
      `}</style>
    </>
  );
}
