import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

interface AgendamientoProveedorEmailProps {
    nombreProveedor: string;
    nombreTutor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    mensaje: string | null;
    // Fase 2 — opcionales. Solo se renderizan cuando vienen poblados.
    modalidadLabel?: string | null;
    direccionServicio?: string | null;
    duracionLabel?: string | null;
    // Ola 1 feat direcciones — info adicional opcional (depto/casa
    // interior/instrucciones). Se renderiza como linea italica debajo
    // de direccionServicio cuando esta presente.
    direccionInfo?: string | null;
    // F1 agenda con disponibilidad real: cuando true, el copy cambia de
    // "solicitud que necesita respuesta" a "reserva confirmada al
    // instante" (el tutor tomo hora desde el picker rigido). Default false
    // preserva el flujo viejo.
    esConfirmadaAuto?: boolean;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta del bloque de fecha cambia de "Fecha (reservada|preferida)"
    // a "Estadía", y aparece un bloque adicional con check-in/check-out.
    // Default false preserva el render V1/V2/V4 sin cambios.
    esRango?: boolean;
    // F2 — horas sugeridas de check-in/out del servicio ('HH:MM' o null).
    // Solo se renderizan cuando esRango es true. Si ambos null y esRango
    // true, se muestra fallback "Check-in y check-out se coordinan por chat."
    checkInHora?: string | null;
    checkOutHora?: string | null;
}

export const AgendamientoProveedorEmail = ({
    nombreProveedor,
    nombreTutor,
    servicioTitulo,
    fechaFormateada,
    mensaje,
    modalidadLabel,
    direccionServicio,
    duracionLabel,
    direccionInfo,
    esConfirmadaAuto,
    esRango,
    checkInHora,
    checkOutHora,
}: AgendamientoProveedorEmailProps) => {
    // Etiqueta del bloque de fecha. F2 (esRango) siempre dice "Estadía";
    // sino respeta el branching viejo por esConfirmadaAuto.
    const fechaLabel = esRango
        ? 'Estadía'
        : esConfirmadaAuto ? 'Fecha reservada' : 'Fecha preferida';
    return (
        <Html>
            <Head />
            <Preview>{esConfirmadaAuto
                ? `${nombreTutor} reservó ${servicioTitulo} en Pawnecta.`
                : `Nueva solicitud de agendamiento de ${nombreTutor} para tu servicio en Pawnecta.`}
            </Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreProveedor},</Text>
                        <Text style={text}>
                            {esConfirmadaAuto ? (
                                <><strong>{nombreTutor}</strong> reservó tu servicio <strong>{servicioTitulo}</strong>. La reserva ya está <strong>confirmada</strong> — no necesitas responder.</>
                            ) : (
                                <><strong>{nombreTutor}</strong> te solicitó un agendamiento para tu servicio <strong>{servicioTitulo}</strong>.</>
                            )}
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

                            <Hr style={hrLight} />
                            <Text style={infoLabel}>Mensaje del tutor</Text>
                            <Text style={infoValueItalic}>
                                {mensaje ? `"${mensaje}"` : 'Sin mensaje adicional.'}
                            </Text>
                        </Section>

                        <Text style={text}>
                            {esConfirmadaAuto
                                ? 'Puedes ver el detalle desde tu panel. Si por algún motivo no puedes atender esta reserva, tienes opción de cancelarla con una nota para el tutor.'
                                : 'Confirma o rechaza la solicitud desde tu panel:'}
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href="https://www.pawnecta.com/proveedor?tab=solicitudes">
                                {esConfirmadaAuto ? 'Ver reserva' : 'Ver solicitud'}
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

export default AgendamientoProveedorEmail;

// ── styles (mismo lenguaje que NewEvaluationEmail) ──
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
    // Sin text-transform — el helper de formato ya devuelve el casing
    // correcto (primera letra mayuscula, resto minuscula segun convencion
    // del espanol). Fase 1 commit 973c4ae aplico el mismo fix en /mis-
    // solicitudes y panel proveedor (el viejo `capitalize` aplicaba Title
    // Case ingles y rompia "Del miercoles 1 de julio" → "Del Miercoles 1 De
    // Julio").
};
const infoValueItalic = {
    color: '#334155',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
    fontStyle: 'italic' as const,
};
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
const hrLight = { borderColor: '#f1f5f9', margin: '16px 0' };
const footer = { color: '#64748b', fontSize: '13px', lineHeight: '20px', textAlign: 'center' as const };
