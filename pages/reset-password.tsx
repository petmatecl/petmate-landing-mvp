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
        // Al cargar, verificar si tenemos el hash de recuperación de Supabase
        // Supabase maneja el intercambio de token por sesión automáticamente en el cliente,
        // pero idealmente deberíamos escuchar el evento PASSWORD_RECOVERY si quisiéramos ser muy estrictos.
        // Sin embargo, si el usuario llega aquí con una sesión válida (producto del link mágico),
        // updateUser funcionará.

        // Opcional: escuchar cambios de estado
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

        if (password.length < 6) {
            setMessage({ type: "error", text: "La contraseña debe tener al menos 6 caracteres." });
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

            <main className="pmLogin page">
                <div className="wrap">
                    {/* Card */}
                    <div className="card">
                        <h1 className="title">Nueva contraseña</h1>
                        <p className="subtitle">
                            Ingresa tu nueva contraseña para acceder a tu cuenta.
                        </p>

                        <form onSubmit={handleSubmit} className="form">
                            {/* Password */}
                            <div className="field">
                                <label htmlFor="password" className="label">
                                    <LockIcon /> <span>Nueva contraseña</span>
                                </label>
                                <div className="inputWrap">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="field">
                                <label htmlFor="confirmPassword" className="label">
                                    <LockIcon /> <span>Confirmar contraseña</span>
                                </label>
                                <div className="inputWrap">
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
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
                                {loading ? "Actualizando..." : "Actualizar contraseña"}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

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
          max-width: 480px; 
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
          border: 1.5px solid #cbd5e1;
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
      `}</style>
        </>
    );
}
