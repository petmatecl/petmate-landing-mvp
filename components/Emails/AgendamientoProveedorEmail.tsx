import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';
import { bandaStyles, listadoStyles, layoutStyles } from './_shared/tokens';

interface AgendamientoProveedorEmailProps {
    nombreProveedor: string;
    nombreTutor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    mensaje: string | null;
    // Fase 2 — opcionales. Solo se renderizan cuando vienen poblados.
    modalidadLabel?: string | null;
    direccionServicio?: string | null;
    duracionLabel?: string | null;
    // Ola 1 feat direcciones — info adicional opcional (depto/casa
    // interior/instrucciones). Se renderiza como linea italica debajo
    // de direccionServicio cuando esta presente.
    direccionInfo?: string | null;
    // F1 agenda con disponibilidad real: cuando true, el copy cambia de
    // "solicitud que necesita respuesta" a "reserva confirmada al
    // instante" (el tutor tomo hora desde el picker rigido). Default false
    // preserva el flujo viejo.
    esConfirmadaAuto?: boolean;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta del bloque de fecha cambia de "Fecha (reservada|preferida)"
    // a "Estadía", y aparece un bloque adicional con check-in/check-out.
    // Default false preserva el render V1/V2/V4 sin cambios.
    esRango?: boolean;
    // F2 — horas sugeridas de check-in/out del servicio ('HH:MM' o null).
    // Solo se renderizan cuando esRango es true. Si ambos null y esRango
    // true, se muestra fallback "Check-in y check-out se coordinan por chat."
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // R7 — sub-línea 13px opcional bajo la banda ("N noches" en F2/V2/V4a).
    fechaSub?: string | null;
    // R7 — cascada Dónde resuelta server-side (formatDireccionLinea →
    // primera comuna → fallback chat). Si viene, reemplaza modalidad+dirección.
    donde?: string | null;
}

// Ambos escenarios (esConfirmadaAuto true/false) son eventos positivos
// desde la perspectiva del proveedor (reserva confirmada / nueva solicitud
// = potencial ingreso). Mapa PO: banda accent-50.
const banda = bandaStyles('confirmacion');

export const AgendamientoProveedorEmail = ({
    nombreProveedor,
    nombreTutor,
    servicioTitulo,
    fechaFormateada,
    mensaje,
    modalidadLabel,
    direccionServicio,
    duracionLabel,
    direccionInfo,
    esConfirmadaAuto,
    esRango,
    checkInHora,
    checkOutHora,
    fechaSub,
    donde,
}: AgendamientoProveedorEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{esConfirmadaAuto
                ? `${nombreTutor} reservó ${servicioTitulo} en Pawnecta.`
                : `Nueva solicitud de reserva de ${nombreTutor} para tu servicio en Pawnecta.`}
            </Preview>
            <Body style={layoutStyles.main}>
                <Container style={layoutStyles.container}>
                    <Section style={layoutStyles.header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={layoutStyles.logo} />
                    </Section>

                    <Section style={layoutStyles.content}>
                        <Text style={layoutStyles.h1}>Hola {nombreProveedor},</Text>
                        <Text style={layoutStyles.text}>
                            {esConfirmadaAuto ? (
                                <><strong>{nombreTutor}</strong> reservó tu servicio <strong>{servicioTitulo}</strong>. La reserva ya está <strong>confirmada</strong> — no necesitas responder.</>
                            ) : (
                                <><strong>{nombreTutor}</strong> quiere reservar tu servicio <strong>{servicioTitulo}</strong>.</>
                            )}
                        </Text>

                        <Section style={banda.card}>
                            <Section style={banda.banda}>
                                <Text style={banda.bandaFecha}>{fechaFormateada}</Text>
                                {fechaSub && <Text style={banda.bandaSub}>{fechaSub}</Text>}
                            </Section>

                            <Section style={listadoStyles.contenedor}>
                                <Row label="Cliente" value={nombreTutor} />
                                <Row label="Servicio" value={servicioTitulo} />

                                {esRango ? (
                                    <Row
                                        label="Horario"
                                        value={
                                            checkInHora || checkOutHora
                                                ? [
                                                    checkInHora ? `Check-in: ${checkInHora}` : null,
                                                    checkOutHora ? `Check-out: ${checkOutHora}` : null,
                                                ].filter(Boolean).join(' · ')
                                                : 'Check-in y check-out se coordinan por chat.'
                                        }
                                        italic={!(checkInHora || checkOutHora)}
                                        fuerte={!!(checkInHora || checkOutHora)}
                                    />
                                ) : duracionLabel ? (
                                    <Row label="Duración" value={duracionLabel} fuerte />
                                ) : null}

                                {donde ? (
                                    <Row label="Dónde" value={donde} fuerte />
                                ) : (
                                    <>
                                        {modalidadLabel && <Row label="Modalidad" value={modalidadLabel} fuerte />}
                                        {direccionServicio && (
                                            <Row
                                                label="Dirección"
                                                value={direccionInfo ? `${direccionServicio} · ${direccionInfo}` : direccionServicio}
                                                fuerte
                                            />
                                        )}
                                    </>
                                )}

                                <Row
                                    label="Mensaje del tutor"
                                    value={mensaje ? `"${mensaje}"` : 'Sin mensaje adicional.'}
                                    italic
                                    ultima
                                />
                            </Section>
                        </Section>

                        <Text style={layoutStyles.text}>
                            {esConfirmadaAuto
                                ? 'Puedes ver el detalle desde tu panel. Si por algún motivo no puedes atender esta reserva, tienes opción de cancelarla con una nota para el tutor.'
                                : 'Confirma o rechaza la solicitud desde tu panel:'}
                        </Text>

                        <Section style={layoutStyles.buttonContainer}>
                            <Button style={layoutStyles.button} href="https://www.pawnecta.com/proveedor?tab=solicitudes">
                                {esConfirmadaAuto ? 'Ver reserva' : 'Ver solicitud'}
                            </Button>
                        </Section>

                        <Hr style={layoutStyles.hr} />
                        <Text style={layoutStyles.footer}>
                            Pawnecta · El lugar seguro para el cuidado de mascotas.<br />
                            Si tienes dudas, contáctanos a soporte@pawnecta.com
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default AgendamientoProveedorEmail;

type RowProps = {
    label: string;
    value: string;
    italic?: boolean;
    fuerte?: boolean;
    ultima?: boolean;
};

const Row = ({ label, value, italic, fuerte, ultima }: RowProps) => (
    <Section style={ultima ? listadoStyles.filaUltima : listadoStyles.fila}>
        <Text style={listadoStyles.etiqueta}>{label}</Text>
        <Text style={italic ? listadoStyles.valorItalica : fuerte ? listadoStyles.valorFuerte : listadoStyles.valor}>
            {value}
        </Text>
    </Section>
);
