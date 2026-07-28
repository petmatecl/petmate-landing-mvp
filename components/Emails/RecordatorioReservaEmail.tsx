import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

// TREN RECORDATORIOS DE CITA — R4.2: dirección de arte con fecha protagonista.
//
// UN componente cubre las 6 combinaciones (2 destinatarios × 3 familias):
//   destinatario ∈ { tutor, proveedor }
//   familia      ∈ { F1, F2, legacy }
//
// El endpoint (R3) resuelve la familia por semáforos canónicos F2-3-B y
// arma los props del listado server-side. Este template solo pinta.
//
// LAYOUT (R4.2, feedback PO — "estructura mejoró, interior muy plano"):
//   1. Card blanca con borde IZQUIERDO 4px accent-600, radius 10px.
//   2. Header verde deep-900 con logo (sin cambios).
//   3. Prosa intro "Hola X, Te recordamos que mañana..." (sin cambios).
//   4. PILL "MAÑANA" (accent-600 bg, white, 11px, uppercase, letter-spacing).
//   5. BANDA DE FECHA full-width, accent-50 bg, fecha 20px bold deep-900
//      centrada. F2 con `sub` "(2 noches)" abajo en 13px slate-600.
//   6. LISTADO refinado (filas: contraparte, servicio, hora/horario, dónde):
//      etiquetas 11px uppercase slate-500 letter-spacing 0.5px; valores
//      15-16px slate-900 con peso 600 en Hora y Dónde (accionable);
//      separadores hairline #e2e8f0; padding vertical ≈14px por fila.
//   7. Copy de cancelación (solo tutor).
//   8. CTA + footer (sin cambios).
//
// EMAIL-SAFE: tablas + inline styles, sin flexbox, sin SVG, sin fuentes
// custom. Verificado con render-diff que funciona en Gmail y clientes
// Outlook (React Email genera markup MSO-compatible por default).

export type RecordatorioDestinatario = 'tutor' | 'proveedor';
export type RecordatorioFamilia = 'F1' | 'F2' | 'legacy';

interface RecordatorioReservaEmailProps {
    destinatario: RecordatorioDestinatario;
    familia: RecordatorioFamilia;
    nombreDestinatario: string;
    nombreOtro: string;
    servicioTitulo: string;
    // Banda de fecha protagonista. Contenido según familia:
    //   F1 / legacy V1 / V4b: formatFechaSinHora → "Viernes 31 de julio"
    //   F2 / legacy V2/V4a:   formatRangoNochesPartes.principal
    //                         → "Del viernes 31 de julio al domingo 2 de agosto"
    fechaLinea: string;
    // Sub-línea opcional debajo de la banda (solo F2/V2/V4a con rango).
    //   F2 / V2 / V4a: "2 noches" (o "1 noche")
    //   F1 / legacy V1 / V4b: null
    fechaSub?: string | null;
    // Fila "Hora" del listado. Ver R4.1 para semántica por familia.
    horaLinea?: string | null;
    // F2 — bloque check-in/out en la fila "Horario" del listado. Fallback
    // italica si ambos null.
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // Fila "Dónde" — cascada resuelta server-side.
    donde: string;
    // Solo tutor.
    copyCancelacion?: string | null;
    panelUrl: string;
}

export const RecordatorioReservaEmail = ({
    destinatario,
    familia,
    nombreDestinatario,
    nombreOtro,
    servicioTitulo,
    fechaLinea,
    fechaSub,
    horaLinea,
    checkInHora,
    checkOutHora,
    donde,
    copyCancelacion,
    panelUrl,
}: RecordatorioReservaEmailProps) => {
    const esTutor = destinatario === 'tutor';
    const esRango = familia === 'F2';

    const preview = esTutor
        ? `Mañana tienes una reserva con ${nombreOtro}.`
        : `Mañana tienes una reserva de ${nombreOtro}.`;

    const otroLabel = esTutor ? 'Proveedor' : 'Cliente';
    const horaLabel = esRango ? 'Horario' : 'Hora';

    const cuerpoIntro = esTutor
        ? (<>Te recordamos que <strong>mañana</strong> tienes una reserva con <strong>{nombreOtro}</strong> para <strong>{servicioTitulo}</strong>.</>)
        : (<>Te recordamos que <strong>mañana</strong> tienes una reserva de <strong>{nombreOtro}</strong> para tu servicio <strong>{servicioTitulo}</strong>.</>);

    const ctaLabel = esTutor ? 'Ver mis reservas' : 'Ver reservas';

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={card}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreDestinatario},</Text>
                        <Text style={text}>{cuerpoIntro}</Text>

                        {/* PILL "MAÑANA" — refuerza urgencia útil del vistazo. */}
                        <Section style={pillContainer}>
                            <Text style={pill}>MAÑANA</Text>
                        </Section>

                        {/* BANDA DE FECHA PROTAGONISTA — accent-50 full-width,
                            fecha 20px bold deep-900 centrada. F2 con sub debajo. */}
                        <Section style={fechaBanda}>
                            <Text style={fechaGrande}>{fechaLinea}</Text>
                            {fechaSub && (
                                <Text style={fechaSubStyle}>{fechaSub}</Text>
                            )}
                        </Section>

                        {/* LISTADO — filas etiqueta/valor con hairlines. Sin
                            fondo gris; separadores marcan la estructura. */}
                        <Section style={listado}>
                            <Row label={otroLabel} value={nombreOtro} first />
                            <Row label="Servicio" value={servicioTitulo} />
                            {esRango ? (
                                <RowF2CheckInOut label={horaLabel} checkInHora={checkInHora} checkOutHora={checkOutHora} />
                            ) : horaLinea ? (
                                <Row label={horaLabel} value={horaLinea} valueStrong />
                            ) : null}
                            <Row label="Dónde" value={donde} valueStrong />
                        </Section>

                        {esTutor && copyCancelacion && (
                            <Text style={text}>{copyCancelacion}</Text>
                        )}

                        <Section style={buttonContainer}>
                            <Button style={button} href={panelUrl}>
                                {ctaLabel}
                            </Button>
                        </Section>

                        <Hr style={hr} />
                        <Text style={footer}>
                            Pawnecta · El lugar seguro para el cuidado de mascotas.<br />
                            Si tienes dudas, contáctanos a soporte@pawnecta.com
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default RecordatorioReservaEmail;

// ── Sub-componentes internos del listado ──

// Fila etiqueta/valor con hairline separator superior (excepto la primera).
// `valueStrong` sube el peso del valor a 600 — usado para Hora y Dónde
// (info accionable).
function Row({
    label, value, first, valueStrong,
}: { label: string; value: string; first?: boolean; valueStrong?: boolean }) {
    return (
        <Section style={first ? rowFirst : row}>
            <Text style={rowLabel}>{label}</Text>
            <Text style={valueStrong ? rowValueStrong : rowValue}>{value}</Text>
        </Section>
    );
}

// Fila especial F2 — check-in / check-out en el valor. Fallback italica
// cuando ambos null (servicio sin horas configuradas).
function RowF2CheckInOut({
    label, checkInHora, checkOutHora,
}: { label: string; checkInHora?: string | null; checkOutHora?: string | null }) {
    return (
        <Section style={row}>
            <Text style={rowLabel}>{label}</Text>
            {checkInHora || checkOutHora ? (
                <Text style={rowValueStrong}>
                    {checkInHora && <>Check-in: <strong>{checkInHora}</strong></>}
                    {checkInHora && checkOutHora && ' · '}
                    {checkOutHora && <>Check-out: <strong>{checkOutHora}</strong></>}
                </Text>
            ) : (
                <Text style={rowValueItalic}>Check-in y check-out se coordinan por chat.</Text>
            )}
        </Section>
    );
}

// ── STYLES ──
// Tokens (tailwind.config.js):
//   accent-50   #F0FDF4    accent-600  #16A34A    deep-900   #134E4A
//   slate-200   #E2E8F0    slate-500   #64748B    slate-600  #475569    slate-900  #0F172A
//   surface-subtle #F8FAFC

const main = {
    backgroundColor: '#F8FAFC',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

// Card blanca con borde izquierdo accent (identidad de marca sin invadir
// el layout). Border-left funciona en tablas Gmail/Outlook.
const card = {
    backgroundColor: '#FFFFFF',
    margin: '40px auto',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    borderLeft: '4px solid #16A34A',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    maxWidth: '600px',
};

const header = {
    backgroundColor: '#134E4A',
    padding: '32px',
    textAlign: 'center' as const,
};
const logo = { margin: '0 auto' };
const content = { padding: '32px 40px 40px' };

const h1 = {
    color: '#0F172A',
    fontSize: '22px',
    fontWeight: 'bold' as const,
    margin: '0 0 12px',
};
const text = {
    color: '#334155',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 16px',
};

// Pill "MAÑANA" — 11px uppercase, accent-600 con texto blanco, radius
// alto. Container con textAlign center para posicionar.
const pillContainer = {
    textAlign: 'center' as const,
    margin: '20px 0 0',
};
const pill = {
    display: 'inline-block' as const,
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    fontSize: '11px',
    fontWeight: 700 as const,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    padding: '4px 14px',
    borderRadius: '9999px',
    margin: '0',
    lineHeight: '18px',
};

// Banda de fecha full-width — accent-50 bg. La fecha en 20px bold deep-900
// centrada; sub-línea (F2) en 13px slate-600 debajo. word-break/hyphens
// permite wrap elegante en strings largos F2 en clientes que respetan
// CSS moderno; el ancho de 600px del container es amplio para el largo
// máximo esperado (~50 chars = ~500px con 20px Outfit).
const fechaBanda = {
    backgroundColor: '#F0FDF4',
    padding: '18px 24px',
    borderRadius: '8px',
    margin: '8px 0 24px',
    textAlign: 'center' as const,
};
const fechaGrande = {
    color: '#134E4A',
    fontSize: '20px',
    lineHeight: '26px',
    fontWeight: 700 as const,
    margin: '0',
    wordBreak: 'break-word' as const,
};
const fechaSubStyle = {
    color: '#475569',
    fontSize: '13px',
    lineHeight: '18px',
    fontWeight: 500 as const,
    margin: '4px 0 0',
};

// Listado — sin fondo gris (blanco), separadores hairline. Padding vertical
// ~14px por fila (más aire).
const listado = {
    margin: '0 0 24px',
};
const rowFirst = {
    padding: '0 0 14px',
};
const row = {
    padding: '14px 0',
    borderTop: '1px solid #E2E8F0',
};
const rowLabel = {
    color: '#64748B',
    fontSize: '11px',
    fontWeight: 600 as const,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
    margin: '0 0 4px',
    lineHeight: '16px',
};
const rowValue = {
    color: '#0F172A',
    fontSize: '15px',
    lineHeight: '22px',
    fontWeight: 400 as const,
    margin: '0',
};
// valueStrong: usado para Hora y Dónde (info accionable). Sube a peso 600
// y font-size 16px para jerarquía visual.
const rowValueStrong = {
    color: '#0F172A',
    fontSize: '16px',
    lineHeight: '22px',
    fontWeight: 600 as const,
    margin: '0',
};
const rowValueItalic = {
    color: '#475569',
    fontSize: '15px',
    lineHeight: '22px',
    fontStyle: 'italic' as const,
    margin: '0',
};

const buttonContainer = { textAlign: 'center' as const, margin: '24px 0 8px' };
const button = {
    backgroundColor: '#16A34A',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};
const hr = { borderColor: '#E2E8F0', margin: '24px 0 16px' };
const footer = {
    color: '#64748B',
    fontSize: '13px',
    lineHeight: '20px',
    textAlign: 'center' as const,
};
