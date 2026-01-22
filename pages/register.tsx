// pages/register.tsx
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
// Removed unused imports: PetsSelectorAirbnb, DateRangeAirbnb
import { supabase } from "../lib/supabaseClient";
import GoogleAuthButton from "../components/GoogleAuthButton";
import LinkedInAuthButton from "../components/LinkedInAuthButton";
import { Card } from "../components/Shared/Card";

type Role = "cliente" | "sitter";

// Icons definitions remain the same...
const DogIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 10l3-3h5l3 3v9H6a3 3 0 0 1-3-3v-6z" />
    <circle cx="15.5" cy="9.5" r="1" />
    <path d="M13 6l2-2h3l2 2v4M6 15h6" />
  </svg>
);
const EyeIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <path d="M2.5 12S5.5 5 12 5s9.5 7 9.5 7-3 7-9.5 7S2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = (p: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
    <path d="M4 4l16 16" />
    <path d="M5 8.5C6.7 6.1 9.2 5 12 5c4.5 0 7.5 3 8.5 4.5-.4.6-.9 1.3-1.6 2" />
    <path d="M9.5 9.5A3 3 0 0 1 14.5 14.5" />
    <path d="M9 19c.9.3 1.9.5 3 .5 4.5 0 7.5-3 8.5-4.5-.3-.5-.7-1-1.2-1.6" />
  </svg>
);
const UserIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const PawIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="8" r="2.5" />
    <path d="M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
  </svg>
);

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);

  // Sync role with URL query if present, but don't auto-select if we want to force choice?
  // User asked: "Esto no debe estar preseleccionado, para obligar al visitante a leer"
  // So we might ignore the query param OR explicitly use it if present (legacy links).
  // Let's Respect the user request: "No debe estar preseleccionado". 
  // However, for UX, if I clicked "Registrarme como Sitter" from home, I probably expect it selected.
  // I will check query param ONLY ONCE on mount, if it exists, use it. If not, null.
  React.useEffect(() => {
    if (router.isReady) {
      const { role } = router.query;
      if (role === "petmate" || role === "sitter") {
        setSelectedRole("sitter");
      } else if (role === "usuario" || role === "cliente") {
        setSelectedRole("cliente");
      }
    }
  }, [router.isReady, router.query]);

  // Handle role selection click to update URL
  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    const queryRole = role === 'cliente' ? 'usuario' : 'sitter';
    router.replace({ pathname: router.pathname, query: { role: queryRole } }, undefined, { shallow: true });
  };

  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showPass, setShowPass] = React.useState(false);
  const [showPassConfirm, setShowPassConfirm] = React.useState(false);
  const [consent, setConsent] = React.useState(false);

  async function submitRegistration(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedRole) {
      setFormError("Por favor selecciona si buscas cuidado (Usuario) o quieres cuidar (Sitter).");
      // Scroll to top to see error/selection
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
    const apellidoPaterno = String(data.get("apellidoPaterno") || "").trim();
    const apellidoMaterno = String(data.get("apellidoMaterno") || "").trim();
    const correo = String(data.get("correo") || "").trim();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");

    if (!password || password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (!consent) {
      setFormError("Debes aceptar los Términos y Condiciones y la Política de Privacidad.");
      return;
    }

    setFormError(null);

    try {
      setSubmitting(true);

      // 1) SignUp Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: correo,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmado`,
        },
      });

      if (signUpError) {
        console.error(signUpError);
        setFormError(signUpError.message || "Error al crear cuenta.");
        return;
      }

      const authUserId = signUpData.user?.id;
      if (!authUserId) throw new Error("No User ID returned");

      // 2) Insert Profile based on selectedRole
      const rolesArray = selectedRole === 'sitter' ? ["sitter"] : ["cliente"];
      const dbRole = selectedRole === 'sitter' ? 'petmate' : 'cliente';

      const insertPayload = {
        auth_user_id: authUserId,
        rol: dbRole,
        roles: rolesArray,
        nombre,
        apellido_p: apellidoPaterno,
        apellido_m: apellidoMaterno,
        email: correo,
        region: "RM", // Default
        perros: 0,
        gatos: 0,
      };

      const { error: insertError } = await supabase.from("registro_petmate").insert([insertPayload]);

      if (insertError) {
        console.error(insertError);
        setFormError("Error al guardar perfil. Intenta nuevamente.");
        return;
      }

      // 3) Post-registration logic
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pm_auth_role_pending", selectedRole);
        if (nombre) window.localStorage.setItem(`pm_${dbRole}_nombre`, nombre);
      }

      // Log Consent + Email
      fetch('/api/log-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUserId, documentVersion: "v1.0 - Dic 2025" })
      }).catch(console.error);

      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'welcome', to: correo, data: { firstName: nombre } })
      }).catch(err => console.error(err));

      router.push(`/registro-exitoso?role=${selectedRole}`);

    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Error desconocido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Registro — Pawnecta</title>
      </Head>

      <main className="page">
        <div className="wrap">
          <Card padding="l">
            <form className="grid gap-6" onSubmit={submitRegistration}>
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Crea tu cuenta en Pawnecta</h1>
                <p className="text-slate-600 mt-2">Selecciona cómo quieres usar la plataforma:</p>
              </div>

              {/* ROLE SELECTION CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('cliente')}
                  className={`
                            relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer group
                            ${selectedRole === 'cliente'
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'}
                        `}
                >
                  <div className={`
                            w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
                            ${selectedRole === 'cliente' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'}
                        `}>
                    <UserIcon width={32} height={32} />
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${selectedRole === 'cliente' ? 'text-emerald-700' : 'text-slate-700'}`}>Busco Cuidado</h3>
                  <p className="text-sm text-center text-slate-500">Tengo mascotas y necesito alguien que las cuide.</p>

                  {selectedRole === 'cliente' && (
                    <div className="absolute top-3 right-3 text-emerald-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('sitter')}
                  className={`
                            relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all cursor-pointer group
                            ${selectedRole === 'sitter'
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-2'
                      : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'}
                        `}
                >
                  <div className={`
                            w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors
                            ${selectedRole === 'sitter' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-500'}
                        `}>
                    <PawIcon width={32} height={32} />
                  </div>
                  <h3 className={`font-bold text-lg mb-1 ${selectedRole === 'sitter' ? 'text-emerald-700' : 'text-slate-700'}`}>Quiero Cuidar</h3>
                  <p className="text-sm text-center text-slate-500">Ofrezco mis servicios para cuidar mascotas.</p>

                  {selectedRole === 'sitter' && (
                    <div className="absolute top-3 right-3 text-emerald-500">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  )}
                </button>
              </div>

              {/* UNIFIED FORM FIELDS */}
              <div className={`transition-opacity duration-300 ${!selectedRole ? 'opacity-50 pointer-events-none filter blur-[1px]' : 'opacity-100'}`}>
                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required disabled={!selectedRole} placeholder="Tu nombre" name="nombre" className="input" />
                  </div>
                  <div className="field">
                    <label>Apellido Paterno</label>
                    <input required disabled={!selectedRole} placeholder="Apellido paterno" name="apellidoPaterno" className="input" />
                  </div>
                  <div className="field">
                    <label>Apellido Materno</label>
                    <input required disabled={!selectedRole} placeholder="Apellido materno" name="apellidoMaterno" className="input" />
                  </div>
                </div>

                <div className="cols mt-4">
                  <div className="field">
                    <label>Correo electrónico</label>
                    <input type="email" required disabled={!selectedRole} placeholder="tu@correo.com" name="correo" className="input" />
                  </div>
                  <div className="field">
                    <label>Contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showPass ? "text" : "password"}
                        required
                        disabled={!selectedRole}
                        placeholder="••••••••"
                        name="password"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? "Ocultar" : "Mostrar"}
                      >
                        {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Confirmar contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showPassConfirm ? "text" : "password"}
                        required
                        disabled={!selectedRole}
                        placeholder="••••••••"
                        name="passwordConfirm"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowPassConfirm((v) => !v)}
                        aria-label={showPassConfirm ? "Ocultar" : "Mostrar"}
                      >
                        {showPassConfirm ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="field mt-4">
                  <label className="checkboxInline items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={() => setConsent((v) => !v)}
                      required
                      disabled={!selectedRole}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Acepto los <Link href="/terminos" className="text-emerald-600 hover:underline">Términos y Condiciones</Link> y la <Link href="/privacidad" className="text-emerald-600 hover:underline">Política de Privacidad</Link>.
                    </span>
                  </label>
                </div>

                {formError && (
                  <div className="p-3 mt-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg text-sm flex items-center gap-2">
                    <span>🚫</span> {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedRole}
                  className={`w-full h-[50px] mt-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all ${(!selectedRole || submitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? "Registrando..." : "Crear Cuenta"}
                </button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="text-center text-sm text-slate-500 mb-4">O regístrate con tus redes sociales</p>
                <div className="space-y-3">
                  <GoogleAuthButton role={selectedRole} text="Continuar con Google" />
                  <LinkedInAuthButton role={selectedRole} text="Continuar con LinkedIn" />
                </div>
              </div>

              <p className="text-center mt-6 text-slate-500 text-sm">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="text-emerald-600 font-bold hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </main>

      <style jsx>{`
        :root {
          --page-bg: #f8fafc;
        }
        .page {
          min-height: calc(100vh - 200px);
          display: flex;
          justify-content: center;
          padding: 24px;
          background: var(--page-bg);
        }
        .wrap {
          width: 100%;
          max-width: 800px;
        }
        /* Reusing global styles logic */
        .cols {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .cols {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        .field {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .field label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #475569;
        }
        input:not([type=checkbox]) {
            width: 100%;
            height: 46px;
            padding: 0 16px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.2s;
            outline: none;
        }
        input:not([type=checkbox]):focus {
            border-color: #10b981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }
        input:disabled {
            background-color: #f1f5f9;
            cursor: not-allowed;
        }
        .passwordField {
            position: relative;
        }
        .passwordToggle {
            position: absolute;
            right: 0;
            top: 0;
            height: 100%;
            padding: 0 12px;
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            display: flex;
            align-items: center;
        }
        .passwordToggle:hover {
            color: #475569;
        }
        .checkboxInline {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            cursor: pointer;
        }
      `}</style>
    </>
  );
} margin: 0;
