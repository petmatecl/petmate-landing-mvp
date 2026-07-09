// components/Emails/InvitacionResenaEmail.tsx
// ----------------------------------------------------------------------------
// Email de invitación a dejar reseña post-servicio. Disparado por el cron
// `/api/cron/invitacion-resenas` una vez, 24h despues del fin del servicio.
//
// Framing: PREGUNTA, no suposicion — no asumimos que el servicio se
// concreto. Cerramos con salida natural para quien no lo tuvo ("Puedes
// ignorar este correo"). Menciona la mascota si el agendamiento tenia
// `mascota_id` — toque personal barato.
//
// Molde estetico: NewEvaluationEmail (styles reutilizados).
// ----------------------------------------------------------------------------
import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

interface InvitacionResenaEmailProps {
    tutorNombre: string;
    proveedorNombre: string;
    servicioTitulo: string;
    mascotaNombre?: string | null;
    reviewUrl: string;
}

export const InvitacionResenaEmail = ({
    tutorNombre,
    proveedorNombre,
    servicioTitulo,
    mascotaNombre,
    reviewUrl,
}: InvitacionResenaEmailProps) => {
    const forMascota = mascotaNombre ? ` para ${mascotaNombre}` : '';
    const previewText = `¿Cómo te fue con ${proveedorNombre}${forMascota}? Contanos tu experiencia.`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://firebasestorage.googleapis.com/v0/b/pawnecta-3fde6.appspot.com/o/pawnecta-logo-vector.png?alt=media&token=8e9e16cc-318e-4b47-abdc-e771e8081f96" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>Hola {tutorNombre},</Text>

                        <Text style={text}>
                            ¿Se realizó tu servicio con <strong>{proveedorNombre}</strong>{forMascota}?
                        </Text>

                        <Text style={text}>
                            Si lo tuviste, tu opinión ayuda a otros tutores a elegir con más
                            confianza y también le sirve a {proveedorNombre} para seguir
                            mejorando. Contanos brevemente cómo fue tu experiencia con
                            <strong> {servicioTitulo}</strong>.
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href={reviewUrl}>
                                Dejar mi reseña
                            </Button>
                        </Section>

                        <Text style={textHighlight}>
                            ¿No se concretó? Puedes ignorar este correo — no volveremos a preguntarte por este servicio.
                        </Text>

                        <Hr style={hr} />
                        <Text style={footer}>
                            Pawnecta SpA • El lugar seguro para el cuidado de mascotas.<br />
                            Si tienes dudas, contáctanos a soporte@pawnecta.com
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default InvitacionResenaEmail;

// Estilos — molde reutilizado de NewEvaluationEmail para consistencia visual.
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
const header = {
    backgroundColor: '#0f172a',
    padding: '32px',
    textAlign: 'center' as const,
};
const logo = { margin: '0 auto' };
const content = { padding: '40px' };
const h1 = {
    color: '#0f172a',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 24px',
};
const text = {
    color: '#334155',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 20px',
};
const textHighlight = {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '24px 0 0',
    fontStyle: 'italic',
};
const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0 8px',
};
const button = {
    backgroundColor: '#16A34A',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
};
const hr = {
    borderColor: '#e2e8f0',
    margin: '32px 0 24px',
};
const footer = {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: '20px',
    textAlign: 'center' as const,
};
