// pages/register.tsx
import PetsSelectorAirbnb, { PetsValue } from "../components/PetsSelectorAirbnb";
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { DateRange } from "react-day-picker";
import DateRangeAirbnb from "../components/DateRangeAirbnb";
import { supabase } from "../lib/supabaseClient";
import GoogleAuthButton from "../components/GoogleAuthButton";
import LinkedInAuthButton from "../components/LinkedInAuthButton";
import { Card } from "../components/Shared/Card";

type Role = "cliente" | "petmate";

const DogIcon = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...p}
  >
    <path d="M3 10l3-3h5l3 3v9H6a3 3 0 0 1-3-3v-6z" />
    <circle cx="15.5" cy="9.5" r="1" />
    <path d="M13 6l2-2h3l2 2v4M6 15h6" />
  </svg>
);

const CatIcon = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...p}
  >
    <path d="M4 20c0-6 4-9 8-9s8 3 8 9" />
    <path d="M8 8V4l3 2 1-2 4 3v1" />
    <circle cx="10" cy="12" r=".8" />
    <circle cx="14" cy="12" r=".8" />
  </svg>
);

// Iconos para tipo de vivienda
const HouseIcon = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...p}
  >
    <path d="M3 11.5l9-7 9 7" />
    <path d="M5 10v9h14v-9" />
    <path d="M10 19v-6h4v6" />
  </svg>
);

const BuildingIcon = (p: any) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...p}
  >
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <path d="M18 21V8h2a1 1 0 0 1 1 1v12z" />
    <path d="M7 7h4M7 11h4M7 15h4" />
  </svg>
);

// Iconos ojo / ojo tachado para ver contraseña
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
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const PawIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="2.5" />
    <circle cx="19" cy="8" r="2.5" />
    <circle cx="5" cy="8" r="2.5" />
    <path d="M12 12c-2.5 0-4.5 2-4.5 4.5S9.5 21 12 21s4.5-2 4.5-4.5S14.5 12 12 12z" />
  </svg>
);

type Alojamiento = "en_sitter" | "domicilio";

// Estado de modalidad multi-select Pawnecta Sitter
type ModalidadPetmateState = {
  enCasa: boolean;
  aDomicilio: boolean;
};

function toDateString(d?: Date | null) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
}

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Role>("cliente");

  // Sync tab with URL query
  React.useEffect(() => {
    if (router.isReady) {
      const { role } = router.query;
      if (role === "petmate" || role === "sitter") {
        setTab("petmate");
      }
    }
  }, [router.isReady, router.query]);

  // --- Estado Cliente (simplificado) ---
  // (Campos extra eliminados)


  // --- Estado PetMate (multi-selección) ---
  const [modalidadPetmate, setModalidadPetmate] = React.useState<ModalidadPetmateState>({
    enCasa: true,
    aDomicilio: false,
  });
  const [regionPetmate, setRegionPetmate] = React.useState("RM");
  const [comunaPetmate, setComunaPetmate] = React.useState("");
  const [tipoViviendaPetmate, setTipoViviendaPetmate] = React.useState<"casa" | "departamento" | "">("");
  const [maxMascotasEnCasa, setMaxMascotasEnCasa] = React.useState(2);
  const [maxMascotasDomicilio, setMaxMascotasDomicilio] = React.useState(2);

  // UI / errores
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // visibilidad contraseña Cliente
  const [showClientePass, setShowClientePass] = React.useState(false);
  const [showClientePassConfirm, setShowClientePassConfirm] = React.useState(false);
  // visibilidad contraseña PetMate
  const [showPetmatePass, setShowPetmatePass] = React.useState(false);
  const [showPetmatePassConfirm, setShowPetmatePassConfirm] = React.useState(false);

  const [consentCliente, setConsentCliente] = React.useState(false);
  const [consentPetmate, setConsentPetmate] = React.useState(false);

  const comunasOriente = [
    "Las Condes",
    "Vitacura",
    "Lo Barnechea",
    "La Reina",
    "Providencia",
    "Ñuñoa",
  ];



  // ---------- SUBMIT CLIENTE ----------
  async function submitCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
    const apellidoPaterno = String(data.get("apellidoPaterno") || "").trim();
    const apellidoMaterno = String(data.get("apellidoMaterno") || "").trim();
    const correo = String(data.get("correo") || "").trim();
    const password = String(data.get("password") || "");
    const passwordConfirm = String(data.get("passwordConfirm") || "");

    // Validaciones de contraseña
    if (!password || password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== passwordConfirm) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (!consentCliente) {
      setFormError("Debes aceptar los Términos y Condiciones y la Política de Privacidad.");
      return;
    }

    setFormError(null);

    try {
      setSubmitting(true);

      // 1) Crear usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: correo,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmado`,
        },
      });

      if (signUpError) {
        console.error(signUpError);
        setFormError(
          signUpError.message ||
          "No fue posible crear tu cuenta. Revisa el correo o intenta más tarde."
        );
        return;
      }

      const authUserId = signUpData.user?.id;
      if (!authUserId) {
        setFormError("No se pudo obtener el identificador de usuario. Intenta nuevamente.");
        return;
      }

      // 2) Insertar registro vinculado a auth_user_id
      const { error: insertError } = await supabase.from("registro_petmate").insert([
        {
          auth_user_id: authUserId,
          rol: "cliente",
          roles: ["cliente"],
          nombre,
          apellido_p: apellidoPaterno,
          apellido_m: apellidoMaterno, // Re-incorporado
          email: correo,
          region: "RM",
          comuna: null,
          tipo_vivienda: null,
          perros: 0,
          gatos: 0,
          fecha_inicio: null,
          fecha_fin: null,
        },
      ]);

      if (insertError) {
        console.error(insertError);
        setFormError("Ocurrió un problema al guardar tu registro. Intenta nuevamente.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("pm_auth_role_pending", "cliente");
        if (nombre) window.localStorage.setItem("pm_cliente_nombre", nombre);
      }

      // Log Consent (Async, no blocking)
      fetch('/api/log-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUserId,
          documentVersion: "v1.0 - Dic 2025"
        })
      }).catch(console.error);

      // [NEW] Send Welcome Email
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          to: correo,
          data: {
            firstName: nombre
          }
        })
      }).catch(err => console.error('Failed to send welcome email:', err));

      router.push("/registro-exitoso?role=cliente");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- SUBMIT PETMATE ----------
  async function submitPetmate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);

    const nombre = String(data.get("nombre_petmate") || "").trim();
    const apellidoPaterno = String(data.get("apellidoPaterno_petmate") || "").trim();
    const apellidoMaterno = String(data.get("apellidoMaterno_petmate") || "").trim();
    const correo = String(data.get("correo_petmate") || "").trim();
    const pass = String(data.get("password_petmate") || "");
    const passConfirm = String(data.get("passwordConfirm_petmate") || "");

    if (!pass || pass.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (pass !== passConfirm) {
      setFormError("Las contraseñas no coinciden.");
      return;
    }

    if (!consentPetmate) {
      setFormError("Debes aceptar los Términos y Condiciones y la Política de Privacidad.");
      return;
    }

    // (Validaciones de modalidad/ubicación eliminadas)

    setFormError(null);

    // Default o nulo para modalidad
    // const modalidadTexto = "en_casa_petmate"; // O lo que se decida como default, o null si la BD lo permite.
    // Dejamos pasar null en el insert


    try {
      setSubmitting(true);

      // 1) Crear usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: correo,
        password: pass,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmado`,
        },
      });

      if (signUpError) {
        console.error(signUpError);
        setFormError(
          signUpError.message ||
          "No fue posible crear tu cuenta de Sitter. Revisa el correo o intenta más tarde."
        );
        return;
      }

      const authUserId = signUpData.user?.id;
      if (!authUserId) {
        setFormError("No se pudo obtener el identificador de usuario. Intenta nuevamente.");
        return;
      }

      // 2) Insertar registro vinculado a auth_user_id
      const { error: insertError } = await supabase.from("registro_petmate").insert([
        {
          auth_user_id: authUserId,
          rol: "petmate",
          roles: ["sitter"],
          nombre,
          apellido_p: apellidoPaterno,
          apellido_m: apellidoMaterno,
          email: correo,
          region: "RM", // Default hardcoded
          comuna: null,
          tipo_vivienda: null,
          max_mascotas_en_casa: null,
          max_mascotas_domicilio: null,
          perros: null,
          gatos: null,
          fecha_inicio: null,
          fecha_fin: null,
          // cuando tengas columna en BD:
          // modalidad_petmate: modalidadTexto,
        },
      ]);

      if (insertError) {
        console.error(insertError);
        setFormError("Ocurrió un problema al guardar tu registro. Intenta nuevamente.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("pm_auth_role_pending", "sitter");
        if (nombre) window.localStorage.setItem("pm_petmate_nombre", nombre);
      }

      // Log Consent (Async, no blocking)
      fetch('/api/log-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authUserId,
          documentVersion: "v1.0 - Dic 2025"
        })
      }).catch(console.error);

      // [NEW] Send Welcome Email
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'welcome',
          to: correo,
          data: {
            firstName: nombre
          }
        })
      }).catch(err => console.error('Failed to send welcome email:', err));

      router.push("/registro-exitoso?role=sitter");
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
          {/* Tabs registro */}
          <div className="tabs" role="tablist" aria-label="Tipo de registro">
            <button
              role="tab"
              aria-selected={tab === "cliente"}
              className={`tab ${tab === "cliente" ? "active" : ""} `}
              onClick={() => setTab("cliente")}
              type="button"
            >
              <UserIcon />
              <span>Usuario</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "petmate"}
              className={`tab ${tab === "petmate" ? "active" : ""} `}
              onClick={() => setTab("petmate")}
              type="button"
            >
              <PawIcon />
              <span>Sitter</span>
            </button>
          </div>

          <Card padding="m">
            {tab === "cliente" ? (
              <form className="grid" onSubmit={submitCliente}>
                <h1>Regístrate como usuario</h1>
                <p className="sub">Crea tu cuenta para comenzar.</p>

                {/* Datos básicos */}
                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required placeholder="Tu nombre" name="nombre" />
                  </div>
                  <div className="field">
                    <label>Apellido Paterno</label>
                    <input required placeholder="Apellido paterno" name="apellidoPaterno" />
                  </div>
                  <div className="field">
                    <label>Apellido Materno</label>
                    <input required placeholder="Apellido materno" name="apellidoMaterno" />
                  </div>
                </div>

                {/* Correo + contraseña */}
                <div className="cols">
                  <div className="field">
                    <label>Correo</label>
                    <input type="email" required placeholder="tu@correo.com" name="correo" />
                  </div>
                  <div className="field">
                    <label>Contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showClientePass ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        name="password"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowClientePass((v) => !v)}
                        aria-label={showClientePass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showClientePass ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Confirmar contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showClientePassConfirm ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        name="passwordConfirm"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowClientePassConfirm((v) => !v)}
                        aria-label={
                          showClientePassConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                      >
                        {showClientePassConfirm ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {formError && <p className="error">{formError}</p>}

                <div className="field">
                  <label className="checkboxInline items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consentCliente}
                      onChange={() => setConsentCliente((v) => !v)}
                      required
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Acepto los <Link href="/terminos" className="text-emerald-600 hover:underline">Términos y Condiciones</Link> y la <Link href="/privacidad" className="text-emerald-600 hover:underline">Política de Privacidad</Link>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btnPrimary"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    height: "46px",
                    backgroundColor: "#111827",
                    color: "#ffffff",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: 800,
                  }}
                >
                  {submitting ? "Registrando..." : "Registrar"}
                </button>

                <div style={{ marginTop: 12 }}>
                  <GoogleAuthButton role={tab === "cliente" ? "cliente" : "sitter"} text="Registrarse con Google" />
                  <LinkedInAuthButton role={tab === "cliente" ? "cliente" : "sitter"} text="Registrarse con LinkedIn" />
                </div>

                <p className="muted">
                  ¿Ya tienes cuenta?{" "}
                  <Link className="a" href="/login">
                    Inicia sesión
                  </Link>
                </p>
              </form>
            ) : (
              <form className="grid" onSubmit={submitPetmate}>
                <h1>Registro rápido de Pawnecta Sitter</h1>
                <p className="mt-2 text-sm text-slate-500">
                  Únete a nuestra red de cuidadores verificados.
                </p>
                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required placeholder="Tu nombre" name="nombre_petmate" />
                  </div>
                  <div className="field">
                    <label>Apellido Paterno</label>
                    <input required placeholder="Apellido paterno" name="apellidoPaterno_petmate" />
                  </div>
                  <div className="field">
                    <label>Apellido Materno</label>
                    <input required placeholder="Apellido materno" name="apellidoMaterno_petmate" />
                  </div>
                </div>

                <div className="cols">
                  <div className="field">
                    <label>Correo</label>
                    <input type="email" required placeholder="tu@correo.com" name="correo_petmate" />
                  </div>
                  <div className="field">
                    <label>Contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showPetmatePass ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        name="password_petmate"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowPetmatePass((v) => !v)}
                        aria-label={showPetmatePass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPetmatePass ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="field">
                    <label>Confirmar contraseña</label>
                    <div className="passwordField">
                      <input
                        type={showPetmatePassConfirm ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        name="passwordConfirm_petmate"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="passwordToggle"
                        onClick={() => setShowPetmatePassConfirm((v) => !v)}
                        aria-label={
                          showPetmatePassConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                      >
                        {showPetmatePassConfirm ? (
                          <EyeOffIcon className="h-4 w-4" />
                        ) : (
                          <EyeIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="checkboxInline items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consentPetmate}
                      onChange={() => setConsentPetmate((v) => !v)}
                      required
                      className="mt-1"
                    />
                    <span className="text-sm">
                      Acepto los <Link href="/terminos" className="text-emerald-600 hover:underline">Términos y Condiciones</Link> y la <Link href="/privacidad" className="text-emerald-600 hover:underline">Política de Privacidad</Link>.
                    </span>
                  </label>
                </div>

                {formError && <p className="error">{formError}</p>}


                <button
                  type="submit"
                  className="btnPrimary"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    height: "46px",
                    backgroundColor: "#111827",
                    color: "#ffffff",
                    borderRadius: "10px",
                    border: "none",
                    fontWeight: 800,
                  }}
                >
                  {submitting ? "Registrando..." : "Registrar"}
                </button>

                <div style={{ marginTop: 12 }}>
                  <GoogleAuthButton role="sitter" text="Registrarse con Google" />
                  <LinkedInAuthButton role="sitter" text="Registrarse con LinkedIn" />
                </div>

                <p className="muted">
                  ¿Ya tienes cuenta?{" "}
                  <Link className="a" href="/login">
                    Inicia sesión
                  </Link>
                </p>
              </form>
            )}
          </Card>
        </div>
      </main >

      <style jsx>{`
        :root {
          --brand: #059669;
          --brand-dark: #047857;
          --muted: #ecfdf5;
          --border: #94a3b8; /* reinforced */
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
          max-width: 920px;
        }
        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        .tab {
          appearance: none;
          border: 2px solid #94a3b8; /* reinforced */
          padding: 1rem;
          border-radius: 12px;
          background: #fff;
          font-weight: 800;
          cursor: pointer;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          font-size: 1rem;
        }
        .tab:hover {
          border-color: #94a3b8;
          background: #f9fafb;
        }
        .tab.active {
          background: #10b981;
          border-color: #10b981;
          color: #fff;
          box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2);
        }
        .tab.active svg {
          stroke-width: 2.5;
        }
        .card {
          background: #fff;
          border: 2px solid #94a3b8; /* Global Standard: Slate-300 */
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
        }
        .grid {
          display: grid;
          gap: 14px;
        }
        .cols {
          display: grid;
          gap: 12px;
        }
        @media (min-width: 920px) {
          .cols {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }
        h1 {
          margin: 0;
        }
        .sub {
          color: #6b7280;
          margin: -2px 0 8px;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        label {
          font-weight: 700;
        }
        input,
        select {
          height: 44px;
          padding: 0 12px;
          border: 2px solid #94a3b8; /* reinforced Slate-400 */
          border-radius: 10px;
        }
        input:focus,
        select:focus {
          outline: none;
          border-color: var(--brand-dark);
          box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.12);
        }
        .btnPrimary {
          height: 46px;
          border: none;
          border-radius: 10px;
          background: #111827;
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }
        .muted {
          color: #6b7280;
        }
        .a {
          text-decoration: underline;
          color: #111827;
        }
        .error {
          color: #b91c1c;
          margin-top: 4px;
        }
        .segmented {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .segmented-lg {
          grid-template-columns: 1fr 1fr;
        }
        .option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #fff;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .optionIcon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .option.active {
          border-color: var(--brand-dark);
          box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.12);
        }
        .calendarWrapper.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .checkboxInline {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          font-size: 0.85rem;
          color: #4b5563;
        }
        .checkboxInline input {
          width: 16px;
          height: 16px;
        }
        .passwordField {
          position: relative;
        }
        .passwordField input {
          width: 100%;
          padding-right: 40px;
        }
        /* Ocultar icono nativo de Edge/IE */
        .passwordField input::-ms-reveal,
        .passwordField input::-ms-clear {
          display: none;
        }
        .passwordToggle {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          padding: 6px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #9ca3af;
          outline: none;
          transition: all 0.2s ease;
        }
        .passwordToggle:hover {
          color: #4b5563;
          background-color: rgba(0,0,0,0.05);
        }
        .passwordToggle:active {
          transform: translateY(-50%) scale(0.9);
        }
      `}</style>
    </>
  );
}
