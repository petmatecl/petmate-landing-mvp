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
    Link,
    Hr,
} from '@react-email/components';

// Sprint PROVEEDOR-PERFIL-NUDGE-7D Sprint A PR 3 (nudge-email) refined per
// dispatch 2026-11-26. Template React Email para el nudge "¿por qué no has
// publicado?" enviado a proveedores aprobados sin servicios activos post-7d
// de signup. Spec: docs/sprints/proveedor-perfil-nudge-plan.md.
//
// Max 2 nudges strict:
//   - isFirstNudge=true  → tono "sabemos que la vida se complica".
//   - isFirstNudge=false → tono "último recordatorio".
//
// Cero emojis (regla EMAILS-EMOJI-POLICY 2026-11-23). Español tuteo
// (anti-voseo blacklist verified).

interface NudgePerfilEmailProps {
    nombre: string;
    isFirstNudge: boolean;
    panelUrl: string;
    unsubscribeUrl?: string;
}

export function NudgePerfilEmail(props: Readonly<NudgePerfilEmailProps>): React.ReactElement {
    const { nombre, isFirstNudge, panelUrl, unsubscribeUrl } = props;
    const baseUrl = 'https://www.pawnecta.com';

    return (
        <Html lang="es">
            <Head />
            <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
                <Container style={{ margin: '0 auto', padding: '20px 0 48px', maxWidth: '600px' }}>
                    <Img
                        src={`${baseUrl}/pawnecta_logo_final-trans.png`}
                        width="150"
                        alt="Pawnecta"
                        style={{ margin: '0 auto 24px' }}
                    />
                    <Heading style={{ fontSize: '24px', fontWeight: 'bold', color: '#047857', marginBottom: '16px' }}>
                        ¡Hola, {nombre}!
                    </Heading>
                    <Section>
                        {isFirstNudge ? (
                            <>
                                <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#1e293b' }}>
                                    Pasó ya una semana desde que aprobamos tu perfil en Pawnecta.
                                    Sabemos que a veces la vida se complica y empezar un flujo nuevo
                                    lleva tiempo.
                                </Text>
                                <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#1e293b' }}>
                                    Si aún quieres recibir consultas de tutores en tu comuna, solo
                                    te falta un paso: publicar tu primer servicio. Toma 5 minutos
                                    y te va a ayudar para que tutores cerca tuyo te encuentren.
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#1e293b' }}>
                                    Te escribimos una vez hace una semana porque notamos que tu
                                    perfil está aprobado pero aún no has publicado tu primer servicio.
                                </Text>
                                <Text style={{ fontSize: '16px', lineHeight: '24px', color: '#1e293b' }}>
                                    Este es el último recordatorio que te enviaremos — no queremos
                                    insistir. Si aún te sirve la plataforma, 5 minutos para publicar
                                    un servicio te van a ayudar a recibir tus primeras consultas.
                                </Text>
                            </>
                        )}
                        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
                            <Link
                                href={panelUrl}
                                style={{
                                    display: 'inline-block',
                                    background: '#047857',
                                    color: '#ffffff',
                                    padding: '14px 28px',
                                    borderRadius: '12px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '16px',
                                }}
                            >
                                Publicar mi servicio
                            </Link>
                        </Section>
                        <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#64748b' }}>
                            Si decides no seguir con Pawnecta, está perfecto — puedes dejar tu
                            cuenta inactiva o escribirnos a contacto@pawnecta.com si quieres
                            eliminar tus datos.
                        </Text>
                    </Section>
                    <Hr style={{ borderColor: '#e5e7eb', margin: '32px 0 16px' }} />
                    <Text style={{ fontSize: '12px', lineHeight: '18px', color: '#94a3b8', textAlign: 'center' }}>
                        Pawnecta — Conectando mascotas con cuidadores de confianza
                    </Text>
                    {unsubscribeUrl && (
                        <Text style={{ fontSize: '12px', lineHeight: '18px', color: '#94a3b8', textAlign: 'center' }}>
                            ¿No quieres recibir más recordatorios?{' '}
                            <Link href={unsubscribeUrl} style={{ color: '#64748b', textDecoration: 'underline' }}>
                                Dejar de recibir
                            </Link>
                        </Text>
                    )}
                </Container>
            </Body>
        </Html>
    );
}

export default NudgePerfilEmail;
