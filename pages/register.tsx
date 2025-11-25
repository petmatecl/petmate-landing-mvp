// pages/register.tsx
import PetsSelectorAirbnb, { PetsValue } from "../components/PetsSelectorAirbnb";
import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import type { DateRange } from "react-day-picker";
import DateRangeAirbnb from "../components/DateRangeAirbnb";

type Role = "cliente" | "petmate";

const DogIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 10l3-3h5l3 3v9H6a3 3 0 0 1-3-3v-6z" />
    <circle cx="15.5" cy="9.5" r="1" />
    <path d="M13 6l2-2h3l2 2v4M6 15h6" />
  </svg>
);

const CatIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M4 20c0-6 4-9 8-9s8 3 8 9" />
    <path d="M8 8V4l3 2 1-2 4 3v1" />
    <circle cx="10" cy="12" r=".8" />
    <circle cx="14" cy="12" r=".8" />
  </svg>
);

// Iconos para tipo de vivienda
const HouseIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path d="M3 11.5l9-7 9 7" />
    <path d="M5 10v9h14v-9" />
    <path d="M10 19v-6h4v6" />
  </svg>
);

const BuildingIcon = (p: any) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
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

type Alojamiento = "en_petmate" | "a_domicilio";

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Role>("cliente");

  // Estado para selector de mascotas estilo Airbnb
  const [pets, setPets] = React.useState<PetsValue>({ dogs: 0, cats: 0 });

  // Selección automática de tab según ?role=...
  React.useEffect(() => {
    if (!router.isReady) return;
    const r = String(router.query.role || "").toLowerCase();
    if (["petmate", "sitter"].includes(r)) setTab("petmate");
    else if (["cliente", "client", "owner"].includes(r)) setTab("cliente");
  }, [router.isReady, router.query.role]);

  // --- Estado para el tab Cliente ---
  const [region, setRegion] = React.useState("RM");
  const [comuna, setComuna] = React.useState("");
  const [alojamiento, setAlojamiento] = React.useState<Alojamiento>("en_petmate");
  const [tipoVivienda, setTipoVivienda] = React.useState<"casa" | "departamento" | "">("");
  const [rango, setRango] = React.useState<DateRange | undefined>(undefined);
  const [sinFechas, setSinFechas] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // visibilidad contraseña Cliente
  const [showClientePass, setShowClientePass] = React.useState(false);
  const [showClientePassConfirm, setShowClientePassConfirm] = React.useState(false);
  // visibilidad contraseña PetMate
  const [showPetmatePass, setShowPetmatePass] = React.useState(false);
  const [showPetmatePassConfirm, setShowPetmatePassConfirm] = React.useState(false);

  const comunasOriente = ["Las Condes", "Vitacura", "Lo Barnechea", "La Reina", "Providencia", "Ñuñoa"];

  // --- submits ---
  function submitCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
    const nombre = String(data.get("nombre") || "").trim();
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

    if (!sinFechas && (!rango?.from || !rango?.to)) {
      setFormError("Selecciona las fechas de inicio y fin o marca que aún no tienes claridad.");
      return;
    }

    if (alojamiento === "a_domicilio" && !tipoVivienda) {
      setFormError("Selecciona el tipo de vivienda.");
      return;
    }

    setFormError(null);

    if (typeof window !== "undefined" && nombre) {
      window.localStorage.setItem("pm_cliente_nombre", nombre);
    }

    router.push("/cliente");
  }

  function submitPetmate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const data = new FormData(form);
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

    setFormError(null);
    router.push("/petmate/onboarding");
  }

  return (
    <>
      <Head>
        <title>Registro — PetMate</title>
      </Head>

      <main className="page">
        <div className="wrap">
          {/* Tabs registro */}
          <div className="tabs" role="tablist" aria-label="Tipo de registro">
            <button
              className={`tab ${tab === "cliente" ? "active" : ""}`}
              onClick={() => setTab("cliente")}
              type="button"
            >
              Necesito un PetMate
            </button>
            <button
              className={`tab ${tab === "petmate" ? "active" : ""}`}
              onClick={() => setTab("petmate")}
              type="button"
            >
              Quiero ser PetMate
            </button>
          </div>

          <div className="card">
            {tab === "cliente" ? (
              <form className="grid" onSubmit={submitCliente}>
                <h1>Regístrate como cliente</h1>
                <p className="sub">Cuéntanos quién eres, cuántas mascotas tienes y cuándo viajas.</p>

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

                {/* Tipo de servicio / alojamiento */}
                <div className="field">
                  <label>¿Dónde se quedará tu mascota?</label>
                  <div className="segmented segmented-lg">
                    <button
                      type="button"
                      className={`option ${alojamiento === "en_petmate" ? "active" : ""}`}
                      onClick={() => setAlojamiento("en_petmate")}
                    >
                      <span className="optionIcon">
                        <HouseIcon />
                      </span>
                      <span className="text-left text-sm">
                        En casa de un PetMate
                        <span className="block text-xs font-normal text-gray-500">
                          Tu mascota duerme en la casa del cuidador.
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`option ${alojamiento === "a_domicilio" ? "active" : ""}`}
                      onClick={() => setAlojamiento("a_domicilio")}
                    >
                      <span className="optionIcon">
                        <BuildingIcon />
                      </span>
                      <span className="text-left text-sm">
                        PetMate a domicilio
                        <span className="block text-xs font-normal text-gray-500">
                          El cuidador va a tu casa a cuidar a tu mascota.
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* Región + comuna (solo si aplica) */}
                <div className="cols">
                  <div className="field">
                    <label>Región</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      required
                      name="region"
                    >
                      <option value="RM">Región Metropolitana</option>
                    </select>
                  </div>

                  {alojamiento === "a_domicilio" && (
                    <div className="field">
                      <label>Comuna</label>
                      <select
                        value={comuna}
                        onChange={(e) => setComuna(e.target.value)}
                        required
                        name="comuna"
                      >
                        <option value="" disabled>
                          Selecciona tu comuna
                        </option>
                        {comunasOriente.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Tipo de vivienda: solo relevante si es a domicilio */}
                {alojamiento === "a_domicilio" && (
                  <div className="field">
                    <label>Tipo de vivienda</label>
                    <div className="segmented">
                      <button
                        type="button"
                        className={`option ${tipoVivienda === "casa" ? "active" : ""}`}
                        onClick={() => setTipoVivienda("casa")}
                      >
                        <span className="optionIcon">
                          <HouseIcon />
                        </span>
                        <span>Casa</span>
                      </button>
                      <button
                        type="button"
                        className={`option ${tipoVivienda === "departamento" ? "active" : ""}`}
                        onClick={() => setTipoVivienda("departamento")}
                      >
                        <span className="optionIcon">
                          <BuildingIcon />
                        </span>
                        <span>Departamento</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Calendario + checkbox (checkbox primero) */}
                <div className="field">
  <label>¿Cuándo viajas?</label>

  <label className="checkboxInline">
    <input
      type="checkbox"
      checked={sinFechas}
      onChange={() => setSinFechas((v) => !v)}
    />
    <span>Aún no tengo claridad de las fechas y quiero definirlas después.</span>
  </label>

  <div className={`calendarWrapper ${sinFechas ? "disabled" : ""}`}>
    <DateRangeAirbnb value={rango} onChange={setRango} minDate={new Date()} />
  </div>
</div>


                {/* Mascotas estilo Airbnb (huéspedes) */}
                <div className="field">
                  <PetsSelectorAirbnb value={pets} onChange={setPets} />
                </div>

                {formError && <p className="error">{formError}</p>}

                {/* hidden fields */}
                <input type="hidden" name="alojamiento" value={alojamiento} />
                <input type="hidden" name="tipo_vivienda" value={tipoVivienda} />
                <input
                  type="hidden"
                  name="start_date"
                  value={!sinFechas && rango?.from ? rango.from.toISOString() : ""}
                />
                <input
                  type="hidden"
                  name="end_date"
                  value={!sinFechas && rango?.to ? rango.to.toISOString() : ""}
                />
                <input type="hidden" name="perros" value={String(pets.dogs)} />
                <input type="hidden" name="gatos" value={String(pets.cats)} />

                {/* Botón Registrar */}
                <button
                  type="submit"
                  className="btnPrimary"
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
                  Registrar
                </button>

                <p className="muted">
                  ¿Ya tienes cuenta?{" "}
                  <Link className="a" href="/login">
                    Inicia sesión
                  </Link>
                </p>
              </form>
            ) : (
              <form className="grid" onSubmit={submitPetmate}>
                <h1>Registro rápido de PetMate</h1>
                <p className="sub">Solo datos básicos. Completarás el resto en tu perfil privado.</p>

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

                {formError && <p className="error">{formError}</p>}

                <button
                  type="submit"
                  className="btnPrimary"
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
                  Registrar
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        :root {
          --brand: #059669;
          --brand-dark: #047857;
          --muted: #ecfdf5;
          --border: #e5e7eb;
        }
        .page {
          min-height: calc(100vh - 200px);
          display: flex;
          justify-content: center;
          padding: 24px;
          background: linear-gradient(180deg, #fafafa, #fff);
        }
        .wrap {
          width: 100%;
          max-width: 920px;
        }
        .tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: #ecfdf5;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: 999px;
          margin-bottom: 18px;
        }
        .tab {
          appearance: none;
          border: 0;
          padding: 0.8rem 1rem;
          border-radius: 999px;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
          color: #047857;
          transition: all 0.15s ease;
          text-align: center;
          font-size: 0.95rem;
        }
        .tab:hover {
          background: rgba(255, 255, 255, 0.7);
        }
        .tab.active {
          background: #ffffff;
          color: #047857;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
        }
        .card {
          background: #fff;
          border: 1px solid var(--border);
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
          border: 1.5px solid #cbd5e1;
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
        .passwordToggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #9ca3af;
        }
        .passwordToggle:hover {
          color: #4b5563;
        }
      `}</style>
    </>
  );
}
