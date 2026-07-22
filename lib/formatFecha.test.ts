// lib/formatFecha.test.ts
// ----------------------------------------------------------------------------
// Tests de los helpers de formato. Ejecutable con:
//   npx tsx lib/formatFecha.test.ts
// O via:
//   npm run test:formatFecha
//
// Contra-regresion del bug de TZ (2026-07-22): antes de este fix,
// date-fns/format renderizaba en el TZ del runtime (Vercel = UTC), asi
// que emails a Chile pintaban la hora UTC cruda. Los casos borde de
// cruce de dia UTC↔Chile son los que confirman el fix.
// ----------------------------------------------------------------------------
import {
    formatFechaPreferida,
    formatFechaCorta,
    formatRangoNoches,
    formatPuntualConDuracion,
    formatFechaServicioInline,
} from './formatFecha';

let passed = 0;
let failed = 0;

function assertEq(name: string, actual: string, expected: string) {
    if (actual === expected) {
        console.log(`  ok  ${name}`);
        passed++;
    } else {
        console.log(`  FAIL ${name}`);
        console.log(`    expected: "${expected}"`);
        console.log(`    actual:   "${actual}"`);
        failed++;
    }
}

console.log('\n─── formatFechaPreferida (dia + hora en Chile TZ) ───');

// Caso reportado en prod: 2026-07-27 20:48+00 = 16:48 Chile (invierno CLT UTC-4).
// Antes del fix: "Lunes 27 de julio, 20:48" (UTC crudo).
// Post fix: "Lunes 27 de julio, 16:48".
assertEq(
    'bug reportado prod (2026-07-27T20:48Z = lunes 16:48 Chile invierno)',
    formatFechaPreferida('2026-07-27T20:48:00+00:00'),
    'Lunes 27 de julio, 16:48'
);

// Cruce de dia critico: 2026-07-28T02:00Z = lunes 27 22:00 Chile.
// Antes del fix: "Martes 28 de julio, 02:00" (UTC dice martes).
// Post fix: "Lunes 27 de julio, 22:00" (Chile todavia es lunes).
assertEq(
    'cruce de dia UTC→Chile (2026-07-28T02Z = lunes 22:00 Chile)',
    formatFechaPreferida('2026-07-28T02:00:00+00:00'),
    'Lunes 27 de julio, 22:00'
);

// Verano austral (diciembre, Chile CLST UTC-3).
// 2026-12-15T15:00Z = 12:00 Chile.
assertEq(
    'verano CLST UTC-3 (2026-12-15T15Z = martes 12:00 Chile)',
    formatFechaPreferida('2026-12-15T15:00:00+00:00'),
    'Martes 15 de diciembre, 12:00'
);

// Un dia mas en el pasado con hora en punto (invierno).
// 2026-07-01T13:00Z = 09:00 Chile invierno.
assertEq(
    'invierno CLT UTC-4 (2026-07-01T13Z = miercoles 09:00)',
    formatFechaPreferida('2026-07-01T13:00:00+00:00'),
    'Miércoles 1 de julio, 09:00'
);

console.log('\n─── formatFechaCorta (sin dia de la semana) ───');

assertEq(
    'corta bug prod',
    formatFechaCorta('2026-07-27T20:48:00+00:00'),
    '27 de julio, 16:48'
);
assertEq(
    'corta cruce de dia',
    formatFechaCorta('2026-07-28T02:00:00+00:00'),
    '27 de julio, 22:00'
);

console.log('\n─── formatRangoNoches (V2/V4a rango de noches) ───');

// Rango de 3 noches con timestamps a medianoche local Chile (04:00 UTC invierno).
// Check-in: viernes 3 julio 2026 00:00 Chile = 04:00 UTC.
// Check-out: lunes 6 julio 2026 00:00 Chile = 04:00 UTC.
// Diferencia = 3 noches.
assertEq(
    'rango 3 noches (viernes 3 → lunes 6 julio)',
    formatRangoNoches('2026-07-03T04:00:00+00:00', '2026-07-06T04:00:00+00:00'),
    'Del viernes 3 de julio al lunes 6 de julio (3 noches)'
);

// 1 noche (singular).
assertEq(
    'rango 1 noche (sabado → domingo)',
    formatRangoNoches('2026-07-04T04:00:00+00:00', '2026-07-05T04:00:00+00:00'),
    'Del sábado 4 de julio al domingo 5 de julio (1 noche)'
);

// Cruce de mes: 30 julio → 2 agosto = 3 noches.
assertEq(
    'rango cruza mes (jueves 30 julio → domingo 2 agosto)',
    formatRangoNoches('2026-07-30T04:00:00+00:00', '2026-08-02T04:00:00+00:00'),
    'Del jueves 30 de julio al domingo 2 de agosto (3 noches)'
);

console.log('\n─── formatPuntualConDuracion (V4b horas) ───');

// 09:00 Chile invierno = 13:00 UTC. Duracion 3 horas.
assertEq(
    'puntual V4b 3 horas',
    formatPuntualConDuracion('2026-07-04T13:00:00+00:00', 3),
    'Sábado 4 de julio, 09:00 · 3 horas'
);

// 1 hora (singular).
assertEq(
    'puntual V4b 1 hora',
    formatPuntualConDuracion('2026-07-04T13:00:00+00:00', 1),
    'Sábado 4 de julio, 09:00 · 1 hora'
);

console.log('\n─── formatFechaServicioInline (frase compacta para invitacion resenas) ───');

// V1 puntual con hora — bug prod
assertEq(
    'inline V1 puntual (bug prod)',
    formatFechaServicioInline('2026-07-27T20:48:00+00:00'),
    'del lunes 27 de julio a las 16:48'
);

// V2/V4a mismo mes: mes mencionado una sola vez al final
assertEq(
    'inline V2 mismo mes (25 al 28 julio)',
    formatFechaServicioInline('2026-07-25T04:00:00+00:00', '2026-07-28T04:00:00+00:00'),
    'del sábado 25 al martes 28 de julio'
);

// V2/V4a cruza mes: cada extremo con su mes
assertEq(
    'inline V2 cruza mes (30 julio → 2 agosto)',
    formatFechaServicioInline('2026-07-30T04:00:00+00:00', '2026-08-02T04:00:00+00:00'),
    'del jueves 30 de julio al domingo 2 de agosto'
);

// fecha_fin explicitamente null (V1) — mismo comportamiento
assertEq(
    'inline V1 con fin=null explicito',
    formatFechaServicioInline('2026-07-27T20:48:00+00:00', null),
    'del lunes 27 de julio a las 16:48'
);

// input invalido
assertEq('inline null', formatFechaServicioInline(null), '');

console.log('\n─── null / undefined ───');
assertEq('fecha null', formatFechaPreferida(null), 'sin fecha');
assertEq('fecha undefined', formatFechaPreferida(undefined), 'sin fecha');
assertEq('rango con NULL', formatRangoNoches(null, '2026-07-05T04:00:00+00:00'), 'sin fecha');
assertEq('puntual con horas 0', formatPuntualConDuracion('2026-07-04T13:00:00+00:00', 0), 'sin fecha');

console.log(`\n${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
