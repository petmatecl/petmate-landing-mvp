import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

// TREN RECORDATORIOS DE CITA — R4: template único con branching por props.
//
// UN componente cubre las 6 combinaciones (2 destinatarios × 3 familias):
//   destinatario ∈ { tutor, proveedor }
//   familia      ∈ { F1, F2, legacy }
//
// El endpoint (R3, pages/api/cron/recordatorio-reserva.ts) resuelve la
// familia por semáforos canónicos F2-3-B (capacidad_snapshot_estadia
// para F2, duracion_min para F1, else legacy), formatea `fechaLegible`
// con el helper apropiado (formatBloqueHorario / formatRangoNoches /
// formatFechaPreferida) y arma el `copyCancelacion` server-side según
// ventana. Este template solo pinta.
//
// Copy chileno tuteo (regla CLAUDE.md). Sin argentinismos. No emojis.
// Estilos alineados con ReservaConfirmadaTutorEmail y
// AgendamientoProveedorEmail para consistencia visual con el resto del
// pipeline transaccional.

export type RecordatorioDestinatario = 'tutor' | 'proveedor';
export type RecordatorioFamilia = 'F1' | 'F2' | 'legacy';

interface RecordatorioReservaEmailProps {
    destinatario: RecordatorioDestinatario;
    familia: RecordatorioFamilia;
    // Nombre del receptor del email (Camila si tutor; Aldo si proveedor).
    nombreDestinatario: string;
    // Nombre del otro rol de la reserva.
    nombreOtro: string;
    servicioTitulo: string;
    // Fecha ya formateada por familia — F1/V4b usan
    // "Jueves 4 de julio, de 14:00 a 15:00 · 1 hora" (formatBloqueHorario);
    // F2/V2/V4a usan "Del viernes 4 al lunes 7 de julio (3 noches)"
    // (formatRangoNoches); V1 puntual usa "Sábado 15 de junio, 14:00"
    // (formatFechaPreferida).
    fechaLegible: string;
    // Solo relevante para F2 — bloque check-in/out del servicio. Si ambos
    // NULL, fallback "Check-in y check-out se coordinan por chat.".
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // Solo destinatario='tutor' — copy server-side según ventana de
    // cancelación (F2 fuera de ventana → dirige a chat; F2 dentro +
    // F1/legacy → copy universal a Mis reservas). NULL/undefined en
    // destinatario='proveedor' (el proveedor no cancela desde el email).
    copyCancelacion?: string | null;
    // URL absoluta del panel destino (tutor → /mis-solicitudes; proveedor
    // → /proveedor?tab=solicitudes). El endpoint la arma con siteUrl.
    panelUrl: string;
}

export const RecordatorioReservaEmail = ({
    destinatario,
    familia,
    nombreDestinatario,
    nombreOtro,
    servicioTitulo,
    fechaLegible,
    checkInHora,
    checkOutHora,
    copyCancelacion,
    panelUrl,
}: RecordatorioReservaEmailProps) => {
    const esTutor = destinatario === 'tutor';
    const esRango = familia === 'F2';

    // Preview corto que aparece en la inbox al costado del subject.
    const preview = esTutor
        ? `Mañana tienes una reserva con ${nombreOtro}.`
        : `Mañana tienes una reserva de ${nombreOtro}.`;

    // Etiqueta del bloque de fecha en el info box. F2 dice "Estadía" para
    // matchear el vocabulario del picker; F1/legacy dice "Cuándo" como
    // término neutro (evita "Fecha reservada" que suena a form).
    const fechaLabel = esRango ? 'Estadía' : 'Cuándo';

    // Cuerpo principal según destinatario. El "para tu servicio" del
    // proveedor le recuerda que es SU inventario; el tutor no lo necesita.
    const cuerpoIntro = esTutor
        ? (<>Te recordamos que <strong>mañana</strong> tienes una reserva con <strong>{nombreOtro}</strong> para <strong>{servicioTitulo}</strong>.</>)
        : (<>Te recordamos que <strong>mañana</strong> tienes una reserva de <strong>{nombreOtro}</strong> para tu servicio <strong>{servicioTitulo}</strong>.</>);

    // Label del botón CTA. Tutor va a "sus reservas" (singular/plural del
    // panel /mis-solicitudes); proveedor va al tab agregado de reservas
    // recibidas.
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

                        <Section style={infoBox}>
                            <Text style={infoLabel}>{fechaLabel}</Text>
                            <Text style={infoValue}>{fechaLegible}</Text>

                            {esRango && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Check-in / Check-out</Text>
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
                            )}
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

// ── styles (idénticos a ReservaConfirmadaTutorEmail para consistencia
//    visual con el resto del pipeline transaccional del proyecto) ──
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
