import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';
import { bandaStyles, listadoStyles, layoutStyles } from './_shared/tokens';

// F1 agenda con disponibilidad real (F1.5) — email de COMPROBANTE al tutor
// cuando toma hora por el picker rigido y la reserva nace 'confirmada'
// automatica. Es distinto de AgendamientoTutorEmail.tsx, que se dispara
// cuando el PROVEEDOR responde una solicitud pendiente (flujo viejo).
// Aca el proveedor no respondio nada — la agenda dio el slot al instante,
// el tutor necesita su comprobante por escrito.
//
// R7 (retrofit dirección de arte): banda accent-50 sin pill (CONFIRMACIÓN
// según mapa PO), card blanca con border-left accent-600, listado
// etiqueta/valor con hairlines slate-200. `fechaSub` opcional para F2
// (rango de noches → "2 noches" bajo el rango en la banda). `donde`
// opcional para cascada de dirección server-side.
//
// Copy chileno (tu) — regla CLAUDE.md.
interface ReservaConfirmadaTutorEmailProps {
    nombreTutor: string;
    nombreProveedor: string;
    servicioTitulo: string;
    fechaFormateada: string;
    mensajeTutor: string | null;
    // Duracion del slot para reforzar el bloque temporal reservado
    // (ej. "60 minutos"). Se popula desde duracion_min de la reserva.
    // Null cuando es reserva F2 (rango de noches — no aplica duracion).
    duracionLabel: string | null;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta cambia a "Estadía" y aparece bloque de check-in/check-out.
    // Default false → render F1 (picker puntual) sin cambios.
    esRango?: boolean;
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // R7 — opcional: sub-línea 13px bajo la banda de fecha (típicamente
    // "N noches" para F2/V2/V4a). Cuando null, la banda muestra solo la
    // fecha grande.
    fechaSub?: string | null;
    // R7 — opcional: reemplaza la vieja fila de dirección/modalidad. Cascada
    // resuelta server-side (formatDireccionLinea → comuna → chat).
    donde?: string | null;
}

const banda = bandaStyles('confirmacion');

export const ReservaConfirmadaTutorEmail = ({
    nombreTutor,
    nombreProveedor,
    servicioTitulo,
    fechaFormateada,
    mensajeTutor,
    duracionLabel,
    esRango,
    checkInHora,
    checkOutHora,
    fechaSub,
    donde,
}: ReservaConfirmadaTutorEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>{`Tu reserva con ${nombreProveedor} para ${servicioTitulo} está confirmada.`}</Preview>
            <Body style={layoutStyles.main}>
                <Container style={layoutStyles.container}>
                    <Section style={layoutStyles.header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={layoutStyles.logo} />
                    </Section>

                    <Section style={layoutStyles.content}>
                        <Text style={layoutStyles.h1}>Hola {nombreTutor},</Text>
                        <Text style={layoutStyles.text}>
                            Tu reserva con <strong>{nombreProveedor}</strong> para <strong>{servicioTitulo}</strong> está <strong>confirmada</strong>. {esRango
                                ? 'Elegiste las noches disponibles en su agenda — no hace falta esperar respuesta.'
                                : 'Elegiste un horario disponible en su agenda — no hace falta esperar respuesta.'}
                        </Text>

                        <Section style={banda.card}>
                            {/* Banda de fecha protagonista */}
                            <Section style={banda.banda}>
                                <Text style={banda.bandaFecha}>{fechaFormateada}</Text>
                                {fechaSub && <Text style={banda.bandaSub}>{fechaSub}</Text>}
                            </Section>

                            {/* Listado etiqueta/valor */}
                            <Section style={listadoStyles.contenedor}>
                                <Row label="Proveedor" value={nombreProveedor} />
                                <Row label="Servicio" value={servicioTitulo} />

                                {(() => {
                                    // Última fila = mensajeTutor si viene, sino donde,
                                    // sino Horario/Duración. Marcamos `ultima` solo en la
                                    // última que efectivamente se renderiza para omitir el
                                    // hairline final.
                                    const ultimaEs = mensajeTutor
                                        ? 'mensaje'
                                        : donde
                                            ? 'donde'
                                            : (esRango ? 'horario' : 'duracion');
                                    return (
                                        <>
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
                                                    ultima={ultimaEs === 'horario'}
                                                />
                                            ) : duracionLabel ? (
                                                <Row label="Duración" value={duracionLabel} fuerte ultima={ultimaEs === 'duracion'} />
                                            ) : null}

                                            {donde && <Row label="Dónde" value={donde} fuerte ultima={ultimaEs === 'donde'} />}

                                            {mensajeTutor && (
                                                <Row label="Tu mensaje al proveedor" value={`"${mensajeTutor}"`} italic ultima />
                                            )}
                                        </>
                                    );
                                })()}
                            </Section>
                        </Section>

                        <Text style={layoutStyles.text}>
                            Si necesitas cancelar, puedes hacerlo desde <strong>Mis solicitudes</strong> — {esRango
                                ? 'las noches se liberan para otros tutores.'
                                : 'el horario se libera para otros tutores.'}
                        </Text>

                        <Section style={layoutStyles.buttonContainer}>
                            <Button style={layoutStyles.button} href="https://www.pawnecta.com/mis-solicitudes">
                                Ver mi reserva
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

export default ReservaConfirmadaTutorEmail;

// ── helpers de renderizado local (evitan repetir markup) ──

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
