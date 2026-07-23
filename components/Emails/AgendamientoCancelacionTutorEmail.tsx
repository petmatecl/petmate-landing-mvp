import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Hr, Img } from '@react-email/components';

interface AgendamientoCancelacionTutorEmailProps {
    nombreProveedor: string;
    nombreTutor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    // Fase 2 — opcionales. Solo se renderizan cuando vienen poblados.
    modalidadLabel?: string | null;
    direccionServicio?: string | null;
    duracionLabel?: string | null;
    // Ola 1 feat direcciones — info adicional opcional (italica debajo
    // de direccionServicio cuando esta presente).
    direccionInfo?: string | null;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta cambia a "Estadía que tenían acordada" y aparece bloque
    // de check-in/check-out. Default false → render V1/V2/V4 sin cambios.
    esRango?: boolean;
    checkInHora?: string | null;
    checkOutHora?: string | null;
}

// Sprint cierre agendamiento — email al proveedor cuando un tutor cancela
// una solicitud que ya estaba CONFIRMADA. NO se envia para cancelacion de
// pendientes (decision UX: ruido innecesario). Disparado desde el endpoint
// /api/agendamientos/notify-proveedor-cancel.
export const AgendamientoCancelacionTutorEmail = ({
    nombreProveedor,
    nombreTutor,
    servicioTitulo,
    fechaFormateada,
    modalidadLabel,
    direccionServicio,
    duracionLabel,
    direccionInfo,
    esRango,
    checkInHora,
    checkOutHora,
}: AgendamientoCancelacionTutorEmailProps) => {
    const fechaLabel = esRango ? 'Estadía que tenían acordada' : 'Fecha que tenían acordada';
    return (
        <Html>
            <Head />
            <Preview>{`${nombreTutor} cancelo la cita confirmada en Pawnecta.`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreProveedor},</Text>
                        <Text style={text}>
                            <strong>{nombreTutor}</strong> canceló la cita que tenían confirmada para tu servicio <strong>{servicioTitulo}</strong>.
                        </Text>

                        <Section style={infoBox}>
                            <Text style={infoLabel}>{fechaLabel}</Text>
                            <Text style={infoValue}>{fechaFormateada}</Text>

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

                            {modalidadLabel && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Modalidad</Text>
                                    <Text style={infoValue}>{modalidadLabel}</Text>
                                </>
                            )}

                            {direccionServicio && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Dirección</Text>
                                    <Text style={infoValue}>{direccionServicio}</Text>
                                    {direccionInfo && (
                                        <Text style={infoValueItalic}>{direccionInfo}</Text>
                                    )}
                                </>
                            )}

                            {duracionLabel && (
                                <>
                                    <Hr style={hrLight} />
                                    <Text style={infoLabel}>Duración</Text>
                                    <Text style={infoValue}>{duracionLabel}</Text>
                                </>
                            )}
                        </Section>

                        <Text style={text}>
                            Te avisamos para que puedas reorganizar tu agenda. El horario quedó libre.
                        </Text>

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

export default AgendamientoCancelacionTutorEmail;

// Estilos compartidos con AgendamientoProveedorEmail / AgendamientoTutorEmail.
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
    // Sin text-transform — el helper de formato ya devuelve casing correcto
    // del espanol (primera letra mayuscula, resto minuscula).
};
const infoValueItalic = {
    color: '#334155',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0 0 12px',
    fontStyle: 'italic' as const,
};
const hr = { borderColor: '#e2e8f0', margin: '32px 0 24px' };
const hrLight = { borderColor: '#f1f5f9', margin: '16px 0' };
const footer = { color: '#64748b', fontSize: '13px', lineHeight: '20px', textAlign: 'center' as const };
