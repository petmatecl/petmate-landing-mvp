import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';

interface NewEvaluationEmailProps {
    nombre: string;
    servicioTitulo: string;
    rating: number;
    comentario: string;
}

export const NewEvaluationEmail = ({
    nombre,
    servicioTitulo,
    rating,
    comentario,
}: NewEvaluationEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`🎉 Has recibido una nueva evaluación de ${rating} estrellas para tu servicio en Pawnecta.`}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-trans.png" width="180" alt="Pawnecta" style={logo} />
                    </Section>

                    <Section style={content}>
                        <Text style={h1}>¡Hola {nombre}!</Text>
                        <Text style={text}>
                            Alguien acaba de dejar una nueva evaluación para tu servicio <strong>{servicioTitulo}</strong>.
                        </Text>

                        <Section style={evaluationBox}>
                            <Text style={ratingStars}>
                                Calificación: <strong>{rating} de 5 estrellas</strong> {rating === 5 ? '🌟' : '⭐'}
                            </Text>
                            <Hr style={hrLight} />
                            <Text style={commentText}>
                                &quot;{comentario}&quot;
                            </Text>
                        </Section>

                        <Text style={textHighlight}>
                            Esta evaluación será revisada por nuestro equipo de moderación y aprobada públicamente en un plazo de 24 a 48 horas si cumple con los estándares comunitarios.
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href="https://www.pawnecta.com/proveedor">
                                Ver mi panel de proveedor
                            </Button>
                        </Section>

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

export default NewEvaluationEmail;

// Estilos (similares o reutilizados de la arquitectura email)
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

const logo = {
    margin: '0 auto',
};

const content = {
    padding: '40px',
};

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
    margin: '0 0 24px',
};

const textHighlight = {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '24px 0',
    fontStyle: 'italic',
};

const evaluationBox = {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    border: '1px solid #e2e8f0',
};

const ratingStars = {
    fontSize: '18px',
    color: '#0f172a',
    margin: '0 0 16px',
};

const commentText = {
    fontSize: '16px',
    lineHeight: '24px',
    color: '#334155',
    margin: '0',
    fontStyle: 'italic',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#1A6B4A',
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

const hrLight = {
    borderColor: '#f1f5f9',
    margin: '16px 0',
};

const footer = {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: '20px',
    textAlign: 'center' as const,
};
