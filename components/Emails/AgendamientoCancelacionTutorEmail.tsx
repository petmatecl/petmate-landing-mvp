import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Hr, Img } from '@react-email/components';
import { bandaStyles, listadoStyles, layoutStyles } from './_shared/tokens';

interface AgendamientoCancelacionTutorEmailProps {
    nombreProveedor: string;
    nombreTutor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    // Fase 2 — opcionales. Solo se renderizan cuando vienen poblados.
    modalidadLabel?: string | null;
    direccionServicio?: string | null;
    duracionLabel?: string | null;
    // Ola 1 feat direcciones — info adicional opcional (italica debajo
    // de direccionServicio cuando esta presente).
    direccionInfo?: string | null;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta cambia a "Estadía que tenían acordada" y aparece bloque
    // de check-in/check-out. Default false → render V1/V2/V4 sin cambios.
    esRango?: boolean;
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // R7 — sub-línea 13px opcional bajo la banda ("N noches" en F2/V2/V4a).
    fechaSub?: string | null;
    // R7 — cascada Dónde resuelta server-side.
    donde?: string | null;
}

// CANCELACIÓN: banda slate-100 neutra + border-left slate-300 (mapa PO 2026-
// 07-28). Fecha como dato histórico; sin peso emocional positivo.
const banda = bandaStyles('cancelacion');

// Sprint cierre agendamiento — email al proveedor cuando un tutor cancela
// una solicitud que ya estaba CONFIRMADA. NO se envia para cancelacion de
// pendientes (decision UX: ruido innecesario). Disparado desde el endpoint
// /api/agendamientos/notify-proveedor-cancel.
export const AgendamientoCancelacionTutorEmail = ({
    nombreProveedor,
    nombreTutor,
    servicioTitulo,
    fechaFormateada,
    modalidadLabel,
    direccionServicio,
    duracionLabel,
    direccionInfo,
    esRango,
    checkInHora,
    checkOutHora,
    fechaSub,
    donde,
}: AgendamientoCancelacionTutorEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{esRango
                ? `${nombreTutor} canceló la estadía confirmada en Pawnecta.`
                : `${nombreTutor} canceló la cita confirmada en Pawnecta.`}</Preview>
            <Body style={layoutStyles.main}>
                <Container style={layoutStyles.container}>
                    <Section style={layoutStyles.header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={layoutStyles.logo} />
                    </Section>

                    <Section style={layoutStyles.content}>
                        <Text style={layoutStyles.h1}>Hola {nombreProveedor},</Text>
                        <Text style={layoutStyles.text}>
                            <strong>{nombreTutor}</strong> canceló {esRango ? 'la estadía' : 'la cita'} que tenían confirmada para tu servicio <strong>{servicioTitulo}</strong>.
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
                                        ultima={!donde && !modalidadLabel && !direccionServicio && !duracionLabel}
                                    />
                                ) : duracionLabel ? (
                                    <Row
                                        label="Duración"
                                        value={duracionLabel}
                                        fuerte
                                        ultima={!donde && !modalidadLabel && !direccionServicio}
                                    />
                                ) : null}

                                {donde ? (
                                    <Row label="Dónde" value={donde} fuerte ultima />
                                ) : (
                                    <>
                                        {modalidadLabel && (
                                            <Row
                                                label="Modalidad"
                                                value={modalidadLabel}
                                                fuerte
                                                ultima={!direccionServicio}
                                            />
                                        )}
                                        {direccionServicio && (
                                            <Row
                                                label="Dirección"
                                                value={direccionInfo ? `${direccionServicio} · ${direccionInfo}` : direccionServicio}
                                                fuerte
                                                ultima
                                            />
                                        )}
                                    </>
                                )}
                            </Section>
                        </Section>

                        <Text style={layoutStyles.text}>
                            Te avisamos para que puedas reorganizar tu agenda. {esRango
                                ? 'Las noches quedaron libres.'
                                : 'El horario quedó libre.'}
                        </Text>

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

export default AgendamientoCancelacionTutorEmail;

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
