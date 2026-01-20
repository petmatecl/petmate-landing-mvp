import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Heading,
    Text,
    Section,
    Button,
    Img,
    Hr,
} from '@react-email/components';

interface RequestStatusEmailProps {
    clientName: string;
    sitterName: string;
    status: 'Aceptada' | 'Rechazada';
    dashboardUrl: string;
}

export const RequestStatusEmail: React.FC<RequestStatusEmailProps> = ({
    clientName,
    sitterName,
    status,
    dashboardUrl,
}) => {
    const baseUrl = 'https://www.pawnecta.com';
    const isAccepted = status === 'Aceptada';
    const color = isAccepted ? '#10b981' : '#ef4444'; // Emerald for Success, Red for Rejected

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
                        ¡Hola {clientName}!
                    </Heading>
                    <Section>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            Tu solicitud con <strong>{sitterName}</strong> ha sido{' '}
                            <strong style={{ color }}>{status.toLowerCase()}</strong>.
                        </Text>
                        {isAccepted ? (
                            <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                                ¡Genial! Ahora puedes coordinar los detalles del servicio a través de nuestra plataforma.
                            </Text>
                        ) : (
                            <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                                Lo sentimos, el cuidador no puede aceptar tu solicitud en este momento. Te invitamos a buscar otros cuidadores disponibles.
                            </Text>
                        )}
                        <Button
                            href={dashboardUrl}
                            style={{
                                backgroundColor: isAccepted ? '#10b981' : '#6b7280',
                                color: '#ffffff',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                marginTop: '20px',
                                display: 'inline-block',
                            }}
                        >
                            Ver detalles
                        </Button>
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

export default RequestStatusEmail;
