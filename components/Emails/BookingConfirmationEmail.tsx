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
    Row,
    Column,
} from '@react-email/components';

interface BookingConfirmationEmailProps {
    applicationId: string;
    serviceType: string;
    startDate: string;
    endDate: string | null;
    price: number;
    clientName: string;
    sitterName: string;
    sitterPhone: string;
    sitterEmail: string;
    clientAddress?: string; // Optional, maybe we don't share it immediately or we do depending on logic
    dashboardUrl: string;
}

export const BookingConfirmationEmail: React.FC<BookingConfirmationEmailProps> = ({
    applicationId,
    serviceType,
    startDate,
    endDate,
    price,
    clientName,
    sitterName,
    sitterPhone,
    sitterEmail,
    dashboardUrl,
}) => {
    const baseUrl = 'https://www.pawnecta.com';

    return (
        <Html lang="es">
            <Head />
            <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
                <Container style={{ margin: '0 auto', padding: '20px 0 48px', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <Section style={{ padding: '24px', textAlign: 'center' }}>
                        <Img
                            src={`${baseUrl}/pawnecta_logo_final-trans.png`}
                            width="140"
                            alt="Pawnecta"
                            style={{ margin: '0 auto 16px' }}
                        />
                        <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', margin: '0 0 16px' }}>
                            ¡Servicio Confirmado!
                        </Heading>
                        <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#374151', margin: '0 0 24px' }}>
                            Hola <strong>{clientName}</strong>, tu solicitud ha sido aceptada por <strong>{sitterName}</strong>. Aquí tienes la ficha de tu servicio.
                        </Text>
                    </Section>

                    <Hr style={{ borderColor: '#e5e7eb', margin: '0' }} />

                    <Section style={{ padding: '24px' }}>
                        <Heading as="h2" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px' }}>
                            Detalles del Servicio
                        </Heading>
                        <Row style={{ marginBottom: '8px' }}>
                            <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>ID Solicitud:</Column>
                            <Column style={{ color: '#1f2937' }}>#{applicationId.slice(0, 8).toUpperCase()}</Column>
                        </Row>
                        <Row style={{ marginBottom: '8px' }}>
                            <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Servicio:</Column>
                            <Column style={{ color: '#1f2937', textTransform: 'capitalize' }}>{serviceType}</Column>
                        </Row>
                        <Row style={{ marginBottom: '8px' }}>
                            <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Fecha Inicio:</Column>
                            <Column style={{ color: '#1f2937' }}>{startDate}</Column>
                        </Row>
                        {endDate && (
                            <Row style={{ marginBottom: '8px' }}>
                                <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Fecha Fin:</Column>
                                <Column style={{ color: '#1f2937' }}>{endDate}</Column>
                            </Row>
                        )}
                        <Row style={{ marginBottom: '8px' }}>
                            <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Valor Acordado:</Column>
                            <Column style={{ color: '#10b981', fontWeight: 'bold' }}>${price.toLocaleString('es-CL')}</Column>
                        </Row>
                    </Section>

                    <Hr style={{ borderColor: '#e5e7eb', margin: '0' }} />

                    <Section style={{ padding: '24px' }}>
                        <Heading as="h2" style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: '0 0 16px' }}>
                            Datos del Cuidador
                        </Heading>
                        <Text style={{ fontSize: '14px', lineHeight: '24px', color: '#374151', margin: '0' }}>
                            Recuerda contactar a tu cuidador para coordinar los detalles finales.
                        </Text>
                        <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                            <Row style={{ marginBottom: '8px' }}>
                                <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Nombre:</Column>
                                <Column style={{ color: '#1f2937' }}>{sitterName}</Column>
                            </Row>
                            <Row style={{ marginBottom: '8px' }}>
                                <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Teléfono:</Column>
                                <Column style={{ color: '#1f2937' }}>
                                    <a href={`tel:${sitterPhone}`} style={{ color: '#10b981', textDecoration: 'none' }}>{sitterPhone}</a>
                                </Column>
                            </Row>
                            <Row style={{ marginBottom: '0' }}>
                                <Column style={{ width: '40%', fontWeight: 'bold', color: '#6b7280' }}>Email:</Column>
                                <Column style={{ color: '#1f2937' }}>
                                    <a href={`mailto:${sitterEmail}`} style={{ color: '#10b981', textDecoration: 'none' }}>{sitterEmail}</a>
                                </Column>
                            </Row>
                        </div>
                    </Section>

                    <Section style={{ padding: '0 24px 24px', textAlign: 'center' }}>
                        <Button
                            href={dashboardUrl}
                            style={{
                                backgroundColor: '#10b981',
                                color: '#ffffff',
                                padding: '14px 24px',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                display: 'inline-block',
                                marginTop: '16px'
                            }}
                        >
                            Ver en mi Dashboard
                        </Button>
                    </Section>

                    <Hr style={{ borderColor: '#e5e7eb', margin: '0' }} />

                    <Section style={{ padding: '24px', textAlign: 'center' }}>
                        <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '0' }}>
                            Este es un mensaje automático de Pawnecta. Si tienes dudas, contáctanos.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default BookingConfirmationEmail;
