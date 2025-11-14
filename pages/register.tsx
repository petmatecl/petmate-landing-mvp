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
  const [formError, setFormError] = React.useState<string | null>(null);

  const comunasOriente = ["Las Condes", "Vitacura", "Lo Barnechea", "La Reina", "Providencia", "Ñuñoa"];

  // --- submits ---
  function submitCliente(e: React.FormEvent) {
    e.preventDefault();

    if (!rango?.from || !rango?.to) {
      setFormError("Selecciona las fechas de inicio y fin.");
      return;
    }

    // Tipo de vivienda solo es obligatorio si el servicio es a domicilio
    if (alojamiento === "a_domicilio" && !tipoVivienda) {
      setFormError("Selecciona el tipo de vivienda.");
      return;
    }

    setFormError(null);
    alert("Registro de cliente enviado (demo)");
  }

  function submitPetmate(e: React.FormEvent) {
    e.preventDefault();
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

                <div className="cols">
                  <div className="field">
                    <label>Nombre</label>
                    <input required placeholder="Tu nombre" />
                  </div>
                  <div className="field">
                    <label>Apellido Paterno</label>
                    <input required placeholder="Apellido paterno" />
                  </div>
                  <div className="field">
                    <label>Apellido Materno</label>
                    <input required placeholder="Apellido materno" />
                  </div>
                </div>

                <div className="field">
                  <label>Correo</label>
                  <input type="email" required placeholder="tu@correo.com" />
                </div>

                <div className="cols">
                  <div className="field">
                    <label>Región</label>
                    <select value={region} onChange={(e) => setRegion(e.target.value)} required>
                      <option value="RM">Región Metropolitana</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Comuna</label>
                    <select value={comuna} onChange={(e) => setComuna(e.target.value)} required>
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

                {/* Calendario estilo Airbnb */}
                <div className="field">
                  <DateRangeAirbnb value={rango} onChange={setRango} minDate={new Date()} />
                  <div className="muted" style={{ marginTop: 8 }}>
                    {rango?.from && rango?.to ? (
                      <>
                        Seleccionaste: <b>{rango.from.toLocaleDateString()}</b> —{" "}
                        <b>{rango.to.toLocaleDateString()}</b>
                      </>
                    ) : (
                      <>Selecciona fecha de inicio y fin.</>
                    )}
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
                  value={rango?.from ? rango.from.toISOString() : ""}
                />
                <input
                  type="hidden"
                  name="end_date"
                  value={rango?.to ? rango.to.toISOString() : ""}
                />
                <input type="hidden" name="perros" value={String(pets.dogs)} />
                <input type="hidden" name="gatos" value={String(pets.cats)} />

                {/* 🔥 Botón grande negro Registrar */}
                <button
                  type="submit"
                  className="btnPrimary"
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    height: "46px",
                    backgroundColor: "#111827", // mismo color que login
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
                    <input required placeholder="Tu nombre" />
                  </div>
                  <div className="field">
                    <label>Apellido Paterno</label>
                    <input required placeholder="Apellido paterno" />
                  </div>
                  <div className="field">
                    <label>Apellido Materno</label>
                    <input required placeholder="Apellido materno" />
                  </div>
                </div>

                <div className="cols">
                  <div className="field">
                    <label>Correo</label>
                    <input type="email" required placeholder="tu@correo.com" />
                  </div>
                  <div className="field">
                    <label>Contraseña</label>
                    <input type="password" required placeholder="••••••••" />
                  </div>
                  <div className="field">
                    <label>Confirmar contraseña</label>
                    <input type="password" required placeholder="••••••••" />
                  </div>
                </div>

                {/* 🔥 Botón grande negro Registrar */}
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
          --brand: #059669; /* emerald-500 */
          --brand-dark: #047857; /* emerald-600 */
          --muted: #ecfdf5; /* emerald-50 */
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
          gap: 8px;
          background: var(--muted);
          padding: 6px;
          border: 1px solid var(--border);
          border-radius: 14px;
          margin-bottom: 14px;
        }
        .tab {
          appearance: none;
          border: 0;
          padding: 0.9rem 1rem;
          border-radius: 10px;
          background: transparent;
          font-weight: 800;
          cursor: pointer;
          color: #065f46; /* emerald-700 */
          transition: all 0.15s ease;
        }
        .tab.active {
          background: var(--brand-dark);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
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
      `}</style>
    </>
  );
}
