// pages/solicitud.tsx
import * as React from "react";
import Head from "next/head";
import type { DateRange } from "react-day-picker";
import DateRangeAirbnb from "../components/DateRangeAirbnb";

function fmt(d?: Date | null) {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function SolicitudPage() {
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const [err, setErr] = React.useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!from || !to) {
      setErr("Selecciona las fechas de inicio y fin.");
      return;
    }
    setErr(null);

    // TODO: aquí conectas tu flujo real (API, router, etc.)
    console.log("Fechas seleccionadas:", { from, to });
    alert(`Fechas: ${fmt(from)} — ${fmt(to)}`);
  }

  return (
    <>
      <Head>
        <title>Solicitud — PetMate</title>
      </Head>

      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ fontSize: "1.6rem", margin: "0 0 10px" }}>Solicitud</h1>

        <form onSubmit={handleSubmit}>
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 16,
              background: "#fff",
              margin: "16px 0",
            }}
          >
            <h2 style={{ margin: "0 0 10px" }}>Fechas del viaje</h2>

            {/* Selector de rango estilo Airbnb */}
            <DateRangeAirbnb
              value={range}
              onChange={(r) => {
                setRange(r);
                if (r?.from && r?.to) setErr(null);
              }}
              minDate={new Date()}
            />

            {/* Resumen bajo el componente */}
            <div style={{ marginTop: 12, color: "#374151", fontSize: 14 }}>
              {from && to ? (
                <>Seleccionaste: <b>{fmt(from)}</b> — <b>{fmt(to)}</b></>
              ) : (
                <>Aún no seleccionas el rango de fechas.</>
              )}
            </div>

            {err && <p style={{ color: "#b91c1c", marginTop: 8 }}>{err}</p>}

            {/* Si necesitas enviar al backend, estos hidden ayudan */}
            <input type="hidden" name="start_date" value={from ? from.toISOString() : ""} />
            <input type="hidden" name="end_date" value={to ? to.toISOString() : ""} />
          </section>

          {/* El resto de tu formulario seguiría aquí… */}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="submit"
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 10,
                fontWeight: 800,
                background: "#111827",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                opacity: !from || !to ? 0.6 : 1,
              }}
              disabled={!from || !to}
            >
              Continuar
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
