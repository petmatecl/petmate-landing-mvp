import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

// TREN RECORDATORIOS DE CITA — R4.1: template único con branching por props
// y LAYOUT DE LISTADO etiqueta/valor escaneable (feedback PO revisión visual).
//
// UN componente cubre las 6 combinaciones (2 destinatarios × 3 familias):
//   destinatario ∈ { tutor, proveedor }
//   familia      ∈ { F1, F2, legacy }
//
// El endpoint (R3) resuelve la familia por semáforos canónicos F2-3-B y
// arma los props del listado server-side. Este template solo pinta.
//
// LAYOUT DEL INFO BOX (R4.1):
//   Proveedor (tutor) / Cliente (proveedor)   → nombreOtro
//   Servicio                                   → servicioTitulo
//   Fecha                                      → fechaLinea (formatFechaSinHora F1/V1/V4b; formatRangoNoches F2/V2/V4a)
//   Hora / Horario                             → horaLinea (opcional) O bloque check-in/out (F2)
//   Dónde                                      → donde (cascada dirección → comuna → fallback chat)
//
// Copy chileno tuteo, sin emojis. Estilos alineados con
// ReservaConfirmadaTutorEmail.

export type RecordatorioDestinatario = 'tutor' | 'proveedor';
export type RecordatorioFamilia = 'F1' | 'F2' | 'legacy';

interface RecordatorioReservaEmailProps {
    destinatario: RecordatorioDestinatario;
    familia: RecordatorioFamilia;
    // Saludo (Camila si tutor; Aldo si proveedor).
    nombreDestinatario: string;
    // El otro rol de la reserva.
    nombreOtro: string;
    servicioTitulo: string;
    // Fila "Fecha" del listado — SIEMPRE presente. Contenido según familia:
    //   F1 / legacy V1 / legacy V4b: formatFechaSinHora → "Viernes 31 de julio"
    //   F2 / legacy V2/V4a:          formatRangoNoches → "Del ... al ... (N noches)"
    fechaLinea: string;
    // Fila "Hora" del listado — OPCIONAL, null cuando F2 (F2 usa el bloque
    // check-in/out abajo). Contenido:
    //   F1:            formatBloqueHorarioSinFecha → "de 14:00 a 15:00 · 1 hora"
    //   legacy V4b:    idem F1
    //   legacy V1:     formatHoraCorta → "15:00"
    //   F2, V2, V4a:   null
    horaLinea?: string | null;
    // Solo relevante para F2 — bloque check-in/out del servicio en el
    // listado. Si ambos null, fallback italica "Check-in y check-out se
    // coordinan por chat.".
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // Fila "Dónde" — SIEMPRE presente. Cascada resuelta server-side:
    //   1. formatDireccionLinea (estructurada o legacy) → "Calle N, Comuna, Región"
    //   2. Primera comuna de servicio.comunas_cobertura → "En {comuna}"
    //   3. Fallback → "Se coordina por chat con {nombreOtro}"
    donde: string;
    // Solo destinatario='tutor' — copy server-side según ventana de
    // cancelación. null/undefined en variante proveedor.
    copyCancelacion?: string | null;
    // URL absoluta del panel destino.
    panelUrl: string;
}

export const RecordatorioReservaEmail = ({
    destinatario,
    familia,
    nombreDestinatario,
    nombreOtro,
    servicioTitulo,
    fechaLinea,
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

    // Etiqueta del contraparte (fila 1 del listado).
    const otroLabel = esTutor ? 'Proveedor' : 'Cliente';

    // Etiqueta de la fila hora — "Hora" para bloques puntuales, "Horario"
    // para F2 (más neutro con check-in/out).
    const horaLabel = esRango ? 'Horario' : 'Hora';

    // Cuerpo (prosa se mantiene según el brief).
    const cuerpoIntro = esTutor
        ? (<>Te recordamos que <strong>mañana</strong> tienes una reserva con <strong>{nombreOtro}</strong> para <strong>{servicioTitulo}</strong>.</>)
        : (<>Te recordamos que <strong>mañana</strong> tienes una reserva de <strong>{nombreOtro}</strong> para tu servicio <strong>{servicioTitulo}</strong>.</>);

    const ctaLabel = esTutor ? 'Ver mis reservas' : 'Ver reservas';

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreDestinatario},</Text>
                        <Text style={text}>{cuerpoIntro}</Text>

                        {/* Info box — layout de listado etiqueta/valor
                            escaneable. Orden fijo: contraparte, servicio,
                            fecha, hora/horario, dónde. */}
                        <Section style={infoBox}>
                            <Text style={infoLabel}>{otroLabel}</Text>
                            <Text style={infoValue}>{nombreOtro}</Text>

                            <Hr style={hrLight} />
                            <Text style={infoLabel}>Servicio</Text>
                            <Text style={infoValue}>{servicioTitulo}</Text>

                            <Hr style={hrLight} />
                            <Text style={infoLabel}>Fecha</Text>
                            <Text style={infoValue}>{fechaLinea}</Text>

                            {/* F2 muestra bloque check-in/out en la fila
                                "Horario"; F1/legacy con hora puntual muestra
                                horaLinea; legacy sin hora (V2/V4a rango sin
                                bloque F2) omite la fila entera. */}
                            {esRango ? (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>{horaLabel}</Text>
                                    {checkInHora || checkOutHora ? (
                                        <Text style={infoValue}>
                                            {checkInHora && <>Check-in: <strong>{checkInHora}</strong></>}
                                            {checkInHora && checkOutHora && ' · '}
                                            {checkOutHora && <>Check-out: <strong>{checkOutHora}</strong></>}
                                        </Text>
                                    ) : (
                                        <Text style={infoValueItalic}>Check-in y check-out se coordinan por chat.</Text>
                                    )}
                                </>
                            ) : horaLinea ? (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>{horaLabel}</Text>
                                    <Text style={infoValue}>{horaLinea}</Text>
                                </>
                            ) : null}

                            <Hr style={hrLight} />
                            <Text style={infoLabel}>Dónde</Text>
                            <Text style={infoValue}>{donde}</Text>
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

// ── styles (idénticos a ReservaConfirmadaTutorEmail) ──
const main = {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};
const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    maxWidth: '600px',
};
const header = { backgroundColor: '#134E4A', padding: '32px', textAlign: 'center' as const };
const logo = { margin: '0 auto' };
const content = { padding: '40px' };
const h1 = { color: '#0f172a', fontSize: '22px', fontWeight: 'bold' as const, margin: '0 0 16px' };
const text = { color: '#334155', fontSize: '16px', lineHeight: '24px', margin: '0 0 16px' };
const infoBox = {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    margin: '24px 0',
    border: '1px solid #e2e8f0',
};
const infoLabel = {
    color: '#64748b',
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontWeight: 600 as const,
    margin: '0 0 4px',
};
const infoValue = {
    color: '#0f172a',
    fontSize: '16px',
    lineHeight: '22px',
    margin: '0 0 12px',
};
const infoValueItalic = {
    color: '#334155',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
    fontStyle: 'italic' as const,
};
const hrLight = { borderColor: '#f1f5f9', margin: '16px 0' };
const buttonContainer = { textAlign: 'center' as const, margin: '32px 0' };
const button = {
    backgroundColor: '#1A6B4A',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};
const hr = { borderColor: '#e2e8f0', margin: '32px 0 24px' };
const footer = { color: '#64748b', fontSize: '13px', lineHeight: '20px', textAlign: 'center' as const };
