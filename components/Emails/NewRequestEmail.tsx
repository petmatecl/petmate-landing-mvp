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

interface NewRequestEmailProps {
    sitterName: string;
    clientName: string;
    serviceType: string;
    startDate: string;
    endDate: string;
    dashboardUrl: string;
}

export const NewRequestEmail: React.FC<NewRequestEmailProps> = ({
    sitterName,
    clientName,
    serviceType,
    startDate,
    endDate,
    dashboardUrl,
}) => {
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
                        ¡Hola {sitterName}, tienes una nueva solicitud! 🐾
                    </Heading>
                    <Section>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            <strong>{clientName}</strong> te ha enviado una solicitud para un servicio de <strong>{serviceType}</strong>.
                        </Text>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            📅 <strong>Fechas:</strong> del {startDate} al {endDate}
                        </Text>
                        <Button
                            href={dashboardUrl}
                            style={{
                                backgroundColor: '#10b981',
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
                            Ver Solicitud
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default NewRequestEmail;
