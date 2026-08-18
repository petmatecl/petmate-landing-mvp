import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Heading,
    Text,
    Section,
    Img,
    Hr,
} from '@react-email/components';

interface WelcomeEmailProps {
    firstName: string;
}

// Deuda emails 2026-08-18: React.FC → signature explícita (ver comentario
// en AprobacionProveedorEmail.tsx).
export function WelcomeEmail(props: Readonly<WelcomeEmailProps>): React.ReactElement {
    const { firstName } = props;
    const baseUrl = 'https://www.pawnecta.com';

    return (
        <Html lang="es">
            <Head />
            <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
                <Container style={{ margin: '0 auto', padding: '20px 0 48px' }}>
                    <Img
                        src={`${baseUrl}/pawnecta_logo_final-trans.png`}
                        width="150"
                        alt="Pawnecta"
                        style={{ margin: '0 auto 24px' }}
                    />
                    <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                        ¡Bienvenido a Pawnecta, {firstName}! 🐾
                    </Heading>
                    <Section>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            Estamos muy felices de que te unas a nuestra comunidad.
                            Ahora puedes buscar cuidadores de confianza o gestionar tus reservas fácilmente.
                        </Text>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', marginTop: '32px' }}>
                            Saludos,<br />
                            El equipo de Pawnecta
                        </Text>
                        <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
                        <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                            Este es un mensaje enviado automáticamente, por favor no respondas a este correo.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

export default WelcomeEmail;
