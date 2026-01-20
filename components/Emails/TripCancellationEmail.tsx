
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

interface TripCancellationEmailProps {
    recipientName: string;
    tripId: string;
    cancelledBy: 'client' | 'sitter';
    serviceType: string;
    startDate: string;
    endDate: string;
}

export const TripCancellationEmail: React.FC<TripCancellationEmailProps> = ({
    recipientName,
    tripId,
    cancelledBy,
    serviceType,
    startDate,
    endDate
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
                        Servicio Cancelado
                    </Heading>
                    <Section>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            Hola <strong>{recipientName}</strong>,
                        </Text>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151' }}>
                            Te informamos que la reserva <strong>#{tripId.slice(0, 8).toUpperCase()}</strong> ha sido cancelada.
                        </Text>

                        <Section style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '12px', marginTop: '20px', marginBottom: '20px' }}>
                            <Text style={{ margin: '0 0 10px', fontSize: '14px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                Detalles del servicio cancelado
                            </Text>
                            <Text style={{ margin: '5px 0', fontSize: '16px', color: '#111827' }}>
                                <strong>Servicio:</strong> {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}
                            </Text>
                            <Text style={{ margin: '5px 0', fontSize: '16px', color: '#111827' }}>
                                <strong>Fechas:</strong> {startDate} {endDate ? `- ${endDate}` : ''}
                            </Text>
                        </Section>

                        <Text style={{ fontSize: '14px', color: '#6b7280' }}>
                            Si crees que esto es un error o tienes dudas, por favor contáctanos.
                        </Text>
                    </Section>
                    <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />
                    <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                        Pawnecta - Cuidado de mascotas de confianza
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default TripCancellationEmail;
