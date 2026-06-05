import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

interface AgendamientoTutorEmailProps {
    estado: 'confirmada' | 'rechazada';
    nombreTutor: string;
    nombreProveedor: string;
    servicioTitulo: string;
    servicioId: string;
    fechaFormateada: string;
    notaProveedor: string | null;
    // Solo se usan en el caso confirmada y solo si el proveedor los expuso publicamente
    // (mostrar_whatsapp / mostrar_telefono). El endpoint resuelve esto y pasa
    // null cuando no aplica.
    telefonoVisible: string | null;
    whatsappLink: string | null;
}

export const AgendamientoTutorEmail = ({
    estado,
    nombreTutor,
    nombreProveedor,
    servicioTitulo,
    servicioId,
    fechaFormateada,
    notaProveedor,
    telefonoVisible,
    whatsappLink,
}: AgendamientoTutorEmailProps) => {
    const isConfirmada = estado === 'confirmada';
    const preview = isConfirmada
        ? `${nombreProveedor} confirmó tu solicitud para ${servicioTitulo}.`
        : `${nombreProveedor} no pudo confirmar tu solicitud para ${servicioTitulo}.`;

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://firebasestorage.googleapis.com/v0/b/pawnecta-3fde6.appspot.com/o/pawnecta-logo-vector.png?alt=media&token=8e9e16cc-318e-4b47-abdc-e771e8081f96" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {nombreTutor},</Text>

                        {isConfirmada ? (
                            <Text style={text}>
                                <strong>{nombreProveedor}</strong> confirmó tu solicitud para <strong>{servicioTitulo}</strong> el <strong>{fechaFormateada}</strong>.
                            </Text>
                        ) : (
                            <Text style={text}>
                                <strong>{nombreProveedor}</strong> no pudo confirmar tu solicitud para <strong>{servicioTitulo}</strong> el <strong>{fechaFormateada}</strong>.
                            </Text>
                        )}

                        <Section style={infoBox}>
                            <Text style={infoLabel}>Nota del proveedor</Text>
                            <Text style={infoValueItalic}>
                                {notaProveedor ? `"${notaProveedor}"` : 'Sin nota adicional.'}
                            </Text>
                        </Section>

                        {isConfirmada && (telefonoVisible || whatsappLink) && (
                            <Text style={text}>
                                Podés contactarlo directamente:
                                {telefonoVisible && <><br />Teléfono: <strong>{telefonoVisible}</strong></>}
                                {whatsappLink && <><br /><a href={whatsappLink} style={inlineLink}>Abrir WhatsApp</a></>}
                            </Text>
                        )}

                        <Section style={buttonContainer}>
                            {isConfirmada ? (
                                <Button style={button} href={`https://www.pawnecta.com/servicio/${servicioId}`}>
                                    Ver detalle
                                </Button>
                            ) : (
                                <Button style={button} href="https://www.pawnecta.com/explorar">
                                    Buscar otros proveedores
                                </Button>
                            )}
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

export default AgendamientoTutorEmail;

// ── styles (mismo lenguaje que AgendamientoProveedorEmail) ──
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
const header = { backgroundColor: '#0f172a', padding: '32px', textAlign: 'center' as const };
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
const inlineLink = { color: '#1A6B4A', fontWeight: 600 as const };
const hr = { borderColor: '#e2e8f0', margin: '32px 0 24px' };
const footer = { color: '#64748b', fontSize: '13px', lineHeight: '20px', textAlign: 'center' as const };
