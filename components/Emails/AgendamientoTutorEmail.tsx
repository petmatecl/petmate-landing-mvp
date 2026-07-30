import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Button, Hr, Img } from '@react-email/components';
import { bandaStyles, listadoStyles, layoutStyles } from './_shared/tokens';

interface AgendamientoTutorEmailProps {
    // F1 agenda con disponibilidad real agrega `cancelada_proveedor`: el
    // proveedor cancela una reserva confirmada-automatica desde su panel
    // (con nota obligatoria a nivel BD).
    estado: 'confirmada' | 'rechazada' | 'cancelada_proveedor';
    nombreTutor: string;
    nombreProveedor: string;
    servicioTitulo: string;
    servicioId: string;
    fechaFormateada: string;
    notaProveedor: string | null;
    // Solo se usan en el caso confirmada y solo si el proveedor los expuso publicamente
    // (mostrar_whatsapp / mostrar_telefono). El endpoint resuelve esto y pasa
    // null cuando no aplica.
    telefonoVisible: string | null;
    whatsappLink: string | null;
    // Fase 2 — opcionales. Solo se renderizan cuando vienen poblados.
    modalidadLabel?: string | null;
    direccionServicio?: string | null;
    duracionLabel?: string | null;
    // Ola 1 feat direcciones — info adicional opcional (italica debajo
    // de direccionServicio cuando esta presente).
    direccionInfo?: string | null;
    // F2 agenda por rango de noches (Incremento 2-3-B): cuando true, la
    // etiqueta del bloque de fecha cambia de "Fecha" a "Estadía", y
    // aparece un bloque adicional con check-in/check-out. Default false
    // preserva el render V1/V2/V4 sin cambios.
    esRango?: boolean;
    // F2 — horas sugeridas de check-in/out del servicio ('HH:MM' o null).
    // Solo se renderizan cuando esRango es true. Ambos null y esRango true
    // → fallback "Check-in y check-out se coordinan por chat."
    checkInHora?: string | null;
    checkOutHora?: string | null;
    // R7 — sub-línea 13px opcional (típicamente "N noches" en F2/V2/V4a).
    fechaSub?: string | null;
    // R7 — cascada Dónde resuelta server-side. Si viene, reemplaza el par
    // modalidad+dirección vieja como bloque unificado.
    donde?: string | null;
}

export const AgendamientoTutorEmail = ({
    estado,
    nombreTutor,
    nombreProveedor,
    servicioTitulo,
    servicioId,
    fechaFormateada,
    notaProveedor,
    telefonoVisible,
    whatsappLink,
    modalidadLabel,
    direccionServicio,
    duracionLabel,
    direccionInfo,
    esRango,
    checkInHora,
    checkOutHora,
    fechaSub,
    donde,
}: AgendamientoTutorEmailProps) => {
    const isConfirmada = estado === 'confirmada';
    const isCanceladaProveedor = estado === 'cancelada_proveedor';
    // Mapa PO 2026-07-28: confirmada → banda accent (celebración);
    // rechazada / cancelada_proveedor → banda slate neutra (dato histórico).
    const banda = bandaStyles(isConfirmada ? 'confirmacion' : 'cancelacion');
    const preview = isConfirmada
        ? `${nombreProveedor} confirmó tu solicitud para ${servicioTitulo}.`
        : isCanceladaProveedor
            ? `${nombreProveedor} canceló tu reserva de ${servicioTitulo}.`
            : `${nombreProveedor} no pudo confirmar tu solicitud para ${servicioTitulo}.`;

    return (
        <Html>
            <Head />
            <Preview>{preview}</Preview>
            <Body style={layoutStyles.main}>
                <Container style={layoutStyles.container}>
                    <Section style={layoutStyles.header}>
                        <Img src="https://www.pawnecta.com/pawnecta_logo_final-white-trans.png" width="180" alt="Pawnecta" style={layoutStyles.logo} />
                    </Section>

                    <Section style={layoutStyles.content}>
                        <Text style={layoutStyles.h1}>Hola {nombreTutor},</Text>

                        {isConfirmada ? (
                            <Text style={layoutStyles.text}>
                                <strong>{nombreProveedor}</strong> confirmó tu solicitud para <strong>{servicioTitulo}</strong>.
                            </Text>
                        ) : isCanceladaProveedor ? (
                            <Text style={layoutStyles.text}>
                                <strong>{nombreProveedor}</strong> canceló tu reserva de <strong>{servicioTitulo}</strong>. El horario quedó liberado.
                            </Text>
                        ) : (
                            <Text style={layoutStyles.text}>
                                <strong>{nombreProveedor}</strong> no pudo confirmar tu solicitud para <strong>{servicioTitulo}</strong>.
                            </Text>
                        )}

                        <Section style={banda.card}>
                            <Section style={banda.banda}>
                                <Text style={banda.bandaFecha}>{fechaFormateada}</Text>
                                {fechaSub && <Text style={banda.bandaSub}>{fechaSub}</Text>}
                            </Section>

                            <Section style={listadoStyles.contenedor}>
                                <Row label="Proveedor" value={nombreProveedor} />
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

                                {/*
                                    Bloque "Dónde": prop `donde` (R7 cascada) reemplaza el
                                    par modalidad+dirección viejo si viene. Sino, mantiene
                                    la retrocompat con modalidadLabel + direccionServicio.
                                */}
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
                                    label={isCanceladaProveedor ? 'Motivo de la cancelación' : 'Nota del proveedor'}
                                    value={notaProveedor ? `"${notaProveedor}"` : 'Sin nota adicional.'}
                                    italic
                                    ultima
                                />
                            </Section>
                        </Section>

                        {isConfirmada && (telefonoVisible || whatsappLink) && (
                            <Text style={layoutStyles.text}>
                                Puedes contactarlo directamente:
                                {telefonoVisible && <><br />Teléfono: <strong>{telefonoVisible}</strong></>}
                                {whatsappLink && <><br /><a href={whatsappLink} style={layoutStyles.inlineLink}>Abrir WhatsApp</a></>}
                            </Text>
                        )}

                        <Section style={layoutStyles.buttonContainer}>
                            {isConfirmada ? (
                                <Button style={layoutStyles.button} href={`https://www.pawnecta.com/servicio/${servicioId}`}>
                                    Ver detalle
                                </Button>
                            ) : (
                                <Button style={layoutStyles.button} href="https://www.pawnecta.com/explorar">
                                    Buscar otros proveedores
                                </Button>
                            )}
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

export default AgendamientoTutorEmail;

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
