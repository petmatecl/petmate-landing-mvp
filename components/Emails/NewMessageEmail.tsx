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

interface NewMessageEmailProps {
    recipientName: string;
    senderName: string;
    messagePreview: string;
    chatUrl: string;
}

export const NewMessageEmail: React.FC<NewMessageEmailProps> = ({
    recipientName,
    senderName,
    messagePreview,
    chatUrl,
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
                        Tienes un nuevo mensaje de {senderName} 💬
                    </Heading>
                    <Section style={{
                        backgroundColor: '#f9fafb',
                        padding: '24px',
                        borderRadius: '12px',
                        margin: '24px 0',
                        borderLeft: '4px solid #059669',
                    }}>
                        <Text style={{ margin: 0, fontSize: '16px', fontStyle: 'italic', color: '#555' }}>
                            &quot;{messagePreview}&quot;
                        </Text>
                    </Section>
                    <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', marginBottom: '24px' }}>
                        Responde lo antes posible para mantener una buena comunicación.
                    </Text>
                    <Button
                        href={chatUrl}
                        style={{
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            fontSize: '16px',
                            marginTop: '16px'
                        }}
                    >
                        Ver Mensaje
                    </Button>
                    <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
                    <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                        Este es un mensaje enviado automáticamente, por favor no respondas a este correo.
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default NewMessageEmail;
