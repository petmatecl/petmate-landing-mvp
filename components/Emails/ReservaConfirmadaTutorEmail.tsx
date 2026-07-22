import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

// F1 agenda con disponibilidad real (F1.5) — email de COMPROBANTE al tutor
// cuando toma hora por el picker rigido y la reserva nace 'confirmada'
// automatica. Es distinto de AgendamientoTutorEmail.tsx, que se dispara
// cuando el PROVEEDOR responde una solicitud pendiente (flujo viejo).
// Aca el proveedor no respondio nada — la agenda dio el slot al instante,
// el tutor necesita su comprobante por escrito.
//
// Copy chileno (tu) — regla CLAUDE.md.
interface ReservaConfirmadaTutorEmailProps {
    nombreTutor: string;
    nombreProveedor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    mensajeTutor: string | null;
    // Duracion del slot para reforzar el bloque temporal reservado
    // (ej. "60 minutos"). Se popula desde duracion_min de la reserva.
    duracionLabel: string | null;
}

export const ReservaConfirmadaTutorEmail = ({
    nombreTutor,
    nombreProveedor,
    servicioTitulo,
    fechaFormateada,
    mensajeTutor,
    duracionLabel,
}: ReservaConfirmadaTutorEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`Tu reserva con ${nombreProveedor} para ${servicioTitulo} está confirmada.`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreTutor},</Text>
                        <Text style={text}>
                            Tu reserva con <strong>{nombreProveedor}</strong> para <strong>{servicioTitulo}</strong> está <strong>confirmada</strong>. Elegiste un horario disponible en su agenda — no hace falta esperar respuesta.
                        </Text>

                        <Section style={infoBox}>
                            <Text style={infoLabel}>Fecha reservada</Text>
                            <Text style={infoValue}>{fechaFormateada}</Text>

                            {duracionLabel && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Duración</Text>
                                    <Text style={infoValue}>{duracionLabel}</Text>
                                </>
                            )}

                            {mensajeTutor && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Tu mensaje al proveedor</Text>
                                    <Text style={infoValueItalic}>&quot;{mensajeTutor}&quot;</Text>
                                </>
                            )}
                        </Section>

                        <Text style={text}>
                            Si necesitas cancelar, puedes hacerlo desde <strong>Mis solicitudes</strong> — el horario se libera para otros tutores.
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href="https://www.pawnecta.com/mis-solicitudes">
                                Ver mi reserva
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

export default ReservaConfirmadaTutorEmail;

// ── styles (identicos a AgendamientoTutorEmail para consistencia visual) ──
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
