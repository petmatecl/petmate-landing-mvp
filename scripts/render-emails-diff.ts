// scripts/render-emails-diff.ts
// ---------------------------------------------------------------------------
// Renderiza los 4 templates de email a HTML para pruebas de no-regresión
// por render-diff determinístico. Los sets de props son idénticos entre
// corridas — la única variable es el estado del árbol de commits. Diff
// byte a byte demuestra si un cambio en templates/endpoints alteró el
// output de casos F1/legacy.
//
// Uso:
//   npx tsx scripts/render-emails-diff.ts <output-dir>
//
// Ejemplo:
//   npx tsx scripts/render-emails-diff.ts /tmp/email-snap/head
//   git checkout <parent>
//   npx tsx scripts/render-emails-diff.ts /tmp/email-snap/parent
//   git checkout <head>
//   diff -r /tmp/email-snap/head /tmp/email-snap/parent
//
// El script NO se commitea con el commit que valida. Vive en scripts/
// como utilidad de dev. Cuando lo commiteemos, debe quedar reproducible
// con las deps del proyecto (react + @react-email/render, ambas en deps).
// ---------------------------------------------------------------------------
import * as React from 'react';
import { render } from '@react-email/render';
import * as fs from 'fs';
import * as path from 'path';

import AgendamientoProveedorEmail from '../components/Emails/AgendamientoProveedorEmail';
import AgendamientoTutorEmail from '../components/Emails/AgendamientoTutorEmail';
import ReservaConfirmadaTutorEmail from '../components/Emails/ReservaConfirmadaTutorEmail';
import AgendamientoCancelacionTutorEmail from '../components/Emails/AgendamientoCancelacionTutorEmail';
import RecordatorioReservaEmail from '../components/Emails/RecordatorioReservaEmail';

const outDir = process.argv[2];
if (!outDir) {
    console.error('Uso: npx tsx scripts/render-emails-diff.ts <output-dir>');
    process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

type Set = {
    name: string;
    element: React.ReactElement;
};

// ────────────────────────────────────────────────────────────────────────────
// AgendamientoProveedorEmail — 4 sets F1/legacy + 2 F2 (F2 solo inspección)
// ────────────────────────────────────────────────────────────────────────────
const setsProveedor: Set[] = [
    {
        name: 'proveedor-A-F1picker-confirmada',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Paseo dinámico 60 min',
            fechaFormateada: 'Sábado 26 de julio, 14:00',
            mensaje: 'Firulais es golden, muy sociable.',
            duracionLabel: '1 hora',
            esConfirmadaAuto: true,
        }),
    },
    {
        name: 'proveedor-B-V1solicitud-pendiente',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Consulta veterinaria a domicilio',
            fechaFormateada: 'Jueves 30 de julio, 10:30',
            mensaje: null,
            esConfirmadaAuto: false,
        }),
    },
    {
        name: 'proveedor-C-V4a-legacy-multidia',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Cuidado a domicilio del tutor',
            fechaFormateada: 'Del lunes 3 al miércoles 5 de agosto (2 noches)',
            mensaje: 'Firulais come Bravery premium, 3 tazas al día.',
            modalidadLabel: 'En la casa del tutor',
            direccionServicio: 'Providencia, Los Leones 123',
            direccionInfo: 'Depto 4B, timbre azul',
            esConfirmadaAuto: false,
        }),
    },
    {
        name: 'proveedor-D-F1picker-slot-corto',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Sesión adiestramiento 30 min',
            fechaFormateada: 'Viernes 1 de agosto, 09:30',
            mensaje: null,
            duracionLabel: '30 minutos',
            esConfirmadaAuto: true,
        }),
    },
    // F2 — solo inspección visual, NO diff
    {
        name: 'proveedor-F2-con-horas',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Cuidado por noches',
            fechaFormateada: 'Del sábado 25 al martes 28 de julio (3 noches)',
            mensaje: 'Firulais es muy tranquilo, duerme la siesta.',
            esConfirmadaAuto: true,
            esRango: true,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        }),
    },
    {
        name: 'proveedor-F2-sin-horas-fallback',
        element: React.createElement(AgendamientoProveedorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila Figueroa',
            servicioTitulo: 'Cuidado por noches',
            fechaFormateada: 'Del sábado 25 al martes 28 de julio (3 noches)',
            mensaje: null,
            esConfirmadaAuto: true,
            esRango: true,
            checkInHora: null,
            checkOutHora: null,
        }),
    },
];

// ────────────────────────────────────────────────────────────────────────────
// AgendamientoTutorEmail — 3 sets F1/legacy + 1 F2
// ────────────────────────────────────────────────────────────────────────────
const setsTutor: Set[] = [
    {
        name: 'tutor-A-V1-confirmada',
        element: React.createElement(AgendamientoTutorEmail as any, {
            estado: 'confirmada',
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Paseo dinámico',
            servicioId: '11111111-1111-1111-1111-111111111111',
            fechaFormateada: 'Sábado 26 de julio, 14:00',
            notaProveedor: 'Nos vemos en la puerta del edificio.',
            telefonoVisible: '+56912345678',
            whatsappLink: 'https://wa.me/56912345678',
        }),
    },
    {
        name: 'tutor-B-V1-rechazada',
        element: React.createElement(AgendamientoTutorEmail as any, {
            estado: 'rechazada',
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Consulta veterinaria',
            servicioId: '22222222-2222-2222-2222-222222222222',
            fechaFormateada: 'Jueves 30 de julio, 10:30',
            notaProveedor: 'Esa mañana estoy con emergencia programada.',
            telefonoVisible: null,
            whatsappLink: null,
        }),
    },
    {
        name: 'tutor-C-V4a-cancelada-proveedor',
        element: React.createElement(AgendamientoTutorEmail as any, {
            estado: 'cancelada_proveedor',
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Cuidado a domicilio',
            servicioId: '33333333-3333-3333-3333-333333333333',
            fechaFormateada: 'Del lunes 3 al miércoles 5 de agosto (2 noches)',
            notaProveedor: 'Se me complicó un viaje familiar, mil disculpas.',
            telefonoVisible: null,
            whatsappLink: null,
            modalidadLabel: 'En la casa del tutor',
            direccionServicio: 'Providencia, Los Leones 123',
            direccionInfo: 'Depto 4B',
        }),
    },
    // F2 — inspección
    {
        name: 'tutor-F2-confirmada',
        element: React.createElement(AgendamientoTutorEmail as any, {
            estado: 'confirmada',
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Cuidado por noches',
            servicioId: '44444444-4444-4444-4444-444444444444',
            fechaFormateada: 'Del sábado 25 al martes 28 de julio (3 noches)',
            notaProveedor: null,
            telefonoVisible: '+56912345678',
            whatsappLink: 'https://wa.me/56912345678',
            esRango: true,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        }),
    },
];

// ────────────────────────────────────────────────────────────────────────────
// ReservaConfirmadaTutorEmail — 2 sets F1 + 1 F2
// ────────────────────────────────────────────────────────────────────────────
const setsReserva: Set[] = [
    {
        name: 'reserva-A-F1-60min',
        element: React.createElement(ReservaConfirmadaTutorEmail as any, {
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Paseo dinámico 60 min',
            fechaFormateada: 'Sábado 26 de julio, 14:00',
            mensajeTutor: 'Es la primera vez que Firulais está con alguien nuevo.',
            duracionLabel: '1 hora',
        }),
    },
    {
        name: 'reserva-B-F1-15min-sin-mensaje',
        element: React.createElement(ReservaConfirmadaTutorEmail as any, {
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Aseo rápido',
            fechaFormateada: 'Viernes 1 de agosto, 09:30',
            mensajeTutor: null,
            duracionLabel: '15 minutos',
        }),
    },
    // F2 — inspección
    {
        name: 'reserva-F2-con-horas',
        element: React.createElement(ReservaConfirmadaTutorEmail as any, {
            nombreTutor: 'Camila',
            nombreProveedor: 'Aldo',
            servicioTitulo: 'Cuidado por noches',
            fechaFormateada: 'Del sábado 25 al martes 28 de julio (3 noches)',
            mensajeTutor: 'Firulais tiene su cama favorita, la llevo.',
            duracionLabel: null,
            esRango: true,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        }),
    },
];

// ────────────────────────────────────────────────────────────────────────────
// AgendamientoCancelacionTutorEmail — 2 sets legacy + 1 F2
// ────────────────────────────────────────────────────────────────────────────
const setsCancelacion: Set[] = [
    {
        name: 'cancelacion-A-F1puntual',
        element: React.createElement(AgendamientoCancelacionTutorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila',
            servicioTitulo: 'Paseo dinámico',
            fechaFormateada: 'Sábado 26 de julio, 14:00',
            duracionLabel: '1 hora',
        }),
    },
    {
        name: 'cancelacion-B-V4a-rango-legacy',
        element: React.createElement(AgendamientoCancelacionTutorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila',
            servicioTitulo: 'Cuidado a domicilio',
            fechaFormateada: 'Del lunes 3 al miércoles 5 de agosto (2 noches)',
            modalidadLabel: 'En la casa del tutor',
            direccionServicio: 'Providencia, Los Leones 123',
            direccionInfo: 'Depto 4B',
        }),
    },
    // F2 — inspección
    {
        name: 'cancelacion-F2-con-horas',
        element: React.createElement(AgendamientoCancelacionTutorEmail as any, {
            nombreProveedor: 'Aldo',
            nombreTutor: 'Camila',
            servicioTitulo: 'Cuidado por noches',
            fechaFormateada: 'Del sábado 25 al martes 28 de julio (3 noches)',
            esRango: true,
            checkInHora: '15:00',
            checkOutHora: '11:00',
        }),
    },
];

// ────────────────────────────────────────────────────────────────────────────
// RecordatorioReservaEmail (R4) — 6 combinaciones (2 destinatarios × 3 familias).
// Evidencia visual del render de las 6 variantes para adjuntar al acta R4.
// Fecha "mañana" simulada: viernes 31 de julio de 2026 (F1: 14:00-15:00
// invierno CLT; F2: rango 31/07 → 02/08 = 2 noches; legacy: 15:00 puntual).
// ────────────────────────────────────────────────────────────────────────────
const setsRecordatorio: Set[] = [
    // -- Tutor × 3 familias --
    // tutor F1: paseo, sin dirección estructurada (típico F1) → fallback comuna del servicio.
    {
        name: 'recordatorio-tutor-F1',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'tutor',
            familia: 'F1',
            nombreDestinatario: 'Camila',
            nombreOtro: 'Aldo',
            servicioTitulo: 'Paseo dinámico 60 min',
            fechaLinea: 'Viernes 31 de julio',
            horaLinea: 'de 14:00 a 15:00 · 1 hora',
            checkInHora: null,
            checkOutHora: null,
            donde: 'En Providencia',
            copyCancelacion: 'Si necesitas cancelar, hazlo desde Mis reservas.',
            panelUrl: 'https://www.pawnecta.com/mis-solicitudes',
        }),
    },
    // tutor F2 dentro ventana + casa_tutor (dirección estructurada del tutor).
    {
        name: 'recordatorio-tutor-F2-dentro-ventana',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'tutor',
            familia: 'F2',
            nombreDestinatario: 'Camila',
            nombreOtro: 'Eduardo',
            servicioTitulo: 'Cuidado a domicilio del tutor',
            fechaLinea: 'Del viernes 31 de julio al domingo 2 de agosto (2 noches)',
            horaLinea: null,
            checkInHora: '15:00',
            checkOutHora: '11:00',
            donde: 'Los Leones 123, Providencia, Metropolitana',
            copyCancelacion: 'Si necesitas cancelar, hazlo desde Mis reservas.',
            panelUrl: 'https://www.pawnecta.com/mis-solicitudes',
        }),
    },
    // tutor F2 fuera ventana + casa_cuidador (fallback comuna).
    {
        name: 'recordatorio-tutor-F2-fuera-ventana',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'tutor',
            familia: 'F2',
            nombreDestinatario: 'Camila',
            nombreOtro: 'Eduardo',
            servicioTitulo: 'Cuidado en casa del cuidador',
            fechaLinea: 'Del viernes 31 de julio al domingo 2 de agosto (2 noches)',
            horaLinea: null,
            checkInHora: '15:00',
            checkOutHora: '11:00',
            donde: 'En Ñuñoa',
            copyCancelacion: 'Contacta a Eduardo por chat para coordinar cambios (ya no puedes cancelar desde Mis reservas).',
            panelUrl: 'https://www.pawnecta.com/mis-solicitudes',
        }),
    },
    // tutor legacy V1: puntual con hora, sin dirección ni comuna → fallback chat.
    {
        name: 'recordatorio-tutor-legacy-V1puntual',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'tutor',
            familia: 'legacy',
            nombreDestinatario: 'Camila',
            nombreOtro: 'Aldo',
            servicioTitulo: 'Consulta veterinaria a domicilio',
            fechaLinea: 'Viernes 31 de julio',
            horaLinea: '15:00',
            checkInHora: null,
            checkOutHora: null,
            donde: 'Se coordina por chat con Aldo',
            copyCancelacion: 'Si necesitas cancelar, hazlo desde Mis reservas.',
            panelUrl: 'https://www.pawnecta.com/mis-solicitudes',
        }),
    },
    // -- Proveedor × 3 familias (sin copyCancelacion) --
    // proveedor F1: paseo, comuna del servicio.
    {
        name: 'recordatorio-proveedor-F1',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'proveedor',
            familia: 'F1',
            nombreDestinatario: 'Aldo',
            nombreOtro: 'Camila Figueroa',
            servicioTitulo: 'Paseo dinámico 60 min',
            fechaLinea: 'Viernes 31 de julio',
            horaLinea: 'de 14:00 a 15:00 · 1 hora',
            checkInHora: null,
            checkOutHora: null,
            donde: 'En Providencia',
            copyCancelacion: null,
            panelUrl: 'https://www.pawnecta.com/proveedor?tab=solicitudes',
        }),
    },
    // proveedor F2 casa_tutor: dirección estructurada del tutor — CRÍTICA
    // (el proveedor la necesita para llegar).
    {
        name: 'recordatorio-proveedor-F2',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'proveedor',
            familia: 'F2',
            nombreDestinatario: 'Eduardo',
            nombreOtro: 'Camila Figueroa',
            servicioTitulo: 'Cuidado a domicilio del tutor',
            fechaLinea: 'Del viernes 31 de julio al domingo 2 de agosto (2 noches)',
            horaLinea: null,
            checkInHora: '15:00',
            checkOutHora: '11:00',
            donde: 'Los Leones 123, Providencia, Metropolitana',
            copyCancelacion: null,
            panelUrl: 'https://www.pawnecta.com/proveedor?tab=solicitudes',
        }),
    },
    // proveedor legacy V1: sin dirección → fallback chat.
    {
        name: 'recordatorio-proveedor-legacy-V1puntual',
        element: React.createElement(RecordatorioReservaEmail as any, {
            destinatario: 'proveedor',
            familia: 'legacy',
            nombreDestinatario: 'Aldo',
            nombreOtro: 'Camila Figueroa',
            servicioTitulo: 'Consulta veterinaria a domicilio',
            fechaLinea: 'Viernes 31 de julio',
            horaLinea: '15:00',
            checkInHora: null,
            checkOutHora: null,
            donde: 'Se coordina por chat con Camila Figueroa',
            copyCancelacion: null,
            panelUrl: 'https://www.pawnecta.com/proveedor?tab=solicitudes',
        }),
    },
];

async function renderSets(sets: Set[]): Promise<void> {
    for (const s of sets) {
        const html = await render(s.element, { pretty: true });
        const outFile = path.join(outDir, `${s.name}.html`);
        fs.writeFileSync(outFile, html, 'utf8');
    }
}

async function main() {
    await renderSets(setsProveedor);
    await renderSets(setsTutor);
    await renderSets(setsReserva);
    await renderSets(setsCancelacion);
    await renderSets(setsRecordatorio);
    const files = fs.readdirSync(outDir).sort();
    console.log(`Rendered ${files.length} snapshots to ${outDir}:`);
    for (const f of files) {
        const size = fs.statSync(path.join(outDir, f)).size;
        console.log(`  ${f}  ${size} bytes`);
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
