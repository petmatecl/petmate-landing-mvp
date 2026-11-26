// lib/eventosFormat.test.ts
// ----------------------------------------------------------------------------
// Sprint EVENTOS-TESTS (2026-11-24) — tests de los helpers compartidos entre
// widget home + listado + detalle.
//
// Ejecutable:
//   npx tsx lib/eventosFormat.test.ts
//   npm run test:eventos-format
// ----------------------------------------------------------------------------
import {
    TIPO_LABELS,
    tipoLabel,
    formatFechaCortaEvento,
    formatFechaLargaEvento,
    formatFechaCompletaEvento,
    formatHoraEvento,
} from './eventosFormat';

let passed = 0;
let failed = 0;

function assertEq(name: string, actual: unknown, expected: unknown) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL ${name}`);
        console.error(`  expected: ${JSON.stringify(expected)}`);
        console.error(`  actual:   ${JSON.stringify(actual)}`);
    }
}

// --- TIPO_LABELS / tipoLabel -------------------------------------------------

assertEq('TIPO_LABELS tiene 5 tipos canonicos', Object.keys(TIPO_LABELS).length, 5);
assertEq('feria', TIPO_LABELS.feria, 'Feria');
assertEq('jornada', TIPO_LABELS.jornada, 'Jornada');
assertEq('charla', TIPO_LABELS.charla, 'Charla');
assertEq('competencia', TIPO_LABELS.competencia, 'Competencia');
assertEq('meetup', TIPO_LABELS.meetup, 'Meetup');

assertEq('tipoLabel(feria)', tipoLabel('feria'), 'Feria');
assertEq('tipoLabel(jornada)', tipoLabel('jornada'), 'Jornada');
assertEq('tipoLabel(desconocido fallback = slug)', tipoLabel('taller'), 'taller');
assertEq('tipoLabel(null)', tipoLabel(null), '');
assertEq('tipoLabel(undefined)', tipoLabel(undefined), '');
assertEq('tipoLabel(string vacio)', tipoLabel(''), '');

// --- formatFechaCortaEvento --------------------------------------------------
// Nota: el output depende del runtime locale/TZ. En CI Linux UTC + Node 22
// con Intl es-CL, "4 de noviembre" → "4 nov". Chequeamos substring presencia
// para que el test sea tolerante a variaciones menores del formato Intl.

function assertIncludes(name: string, actual: string, needle: string) {
    if (actual.includes(needle)) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL ${name}`);
        console.error(`  expected includes: ${JSON.stringify(needle)}`);
        console.error(`  actual:            ${JSON.stringify(actual)}`);
    }
}

assertIncludes('formatFechaCortaEvento 2026-11-04 incluye dia 4', formatFechaCortaEvento('2026-11-04'), '4');
assertIncludes('formatFechaCortaEvento 2026-11-04 incluye nov', formatFechaCortaEvento('2026-11-04').toLowerCase(), 'nov');
assertIncludes('formatFechaCortaEvento 2026-12-27 incluye 27', formatFechaCortaEvento('2026-12-27'), '27');
assertIncludes('formatFechaCortaEvento 2026-12-27 incluye dic', formatFechaCortaEvento('2026-12-27').toLowerCase(), 'dic');

assertEq('formatFechaCortaEvento(null)', formatFechaCortaEvento(null), '');
assertEq('formatFechaCortaEvento(undefined)', formatFechaCortaEvento(undefined), '');
assertEq('formatFechaCortaEvento(empty)', formatFechaCortaEvento(''), '');
assertEq('formatFechaCortaEvento(invalid date)', formatFechaCortaEvento('no-es-fecha'), '');

// Anti-regresion TZ: anchor T12:00:00 debe preservar el dia del ISO
// independiente del TZ del runtime. Un ISO 'YYYY-MM-DD' interpretado como
// UTC midnight + locale es-CL rinde el dia anterior en runtime UTC. Con
// anchor T12:00:00 local, el dia visible siempre matchea el ISO.
assertIncludes('formatFechaCortaEvento anti-TZ-drift dia 1', formatFechaCortaEvento('2026-01-01'), '1');
assertIncludes('formatFechaCortaEvento anti-TZ-drift dia 31', formatFechaCortaEvento('2026-12-31'), '31');

// --- formatFechaLargaEvento --------------------------------------------------

assertIncludes('formatFechaLargaEvento 2026-11-04 incluye 4', formatFechaLargaEvento('2026-11-04'), '4');
assertIncludes('formatFechaLargaEvento 2026-11-04 incluye noviembre', formatFechaLargaEvento('2026-11-04').toLowerCase(), 'noviembre');
assertIncludes('formatFechaLargaEvento 2026-11-04 incluye 2026', formatFechaLargaEvento('2026-11-04'), '2026');

assertEq('formatFechaLargaEvento(null)', formatFechaLargaEvento(null), '');
assertEq('formatFechaLargaEvento(empty)', formatFechaLargaEvento(''), '');
assertEq('formatFechaLargaEvento(invalid)', formatFechaLargaEvento('xyz'), '');

// --- formatFechaCompletaEvento (con weekday) ---------------------------------

assertIncludes('formatFechaCompletaEvento 2026-11-04 incluye 4', formatFechaCompletaEvento('2026-11-04'), '4');
assertIncludes('formatFechaCompletaEvento 2026-11-04 incluye noviembre', formatFechaCompletaEvento('2026-11-04').toLowerCase(), 'noviembre');
assertIncludes('formatFechaCompletaEvento 2026-11-04 incluye 2026', formatFechaCompletaEvento('2026-11-04'), '2026');
// Weekday: 2026-11-04 cae miércoles. Formato es-CL rinde "miércoles".
assertIncludes('formatFechaCompletaEvento 2026-11-04 incluye weekday', formatFechaCompletaEvento('2026-11-04').toLowerCase(), 'miércoles');

assertEq('formatFechaCompletaEvento(null)', formatFechaCompletaEvento(null), '');
assertEq('formatFechaCompletaEvento(empty)', formatFechaCompletaEvento(''), '');
assertEq('formatFechaCompletaEvento(invalid)', formatFechaCompletaEvento('xyz'), '');

// --- formatHoraEvento --------------------------------------------------------

assertEq('formatHoraEvento HH:MM:SS → HH:MM', formatHoraEvento('14:30:00'), '14:30');
assertEq('formatHoraEvento HH:MM (sin seg) → HH:MM', formatHoraEvento('09:15'), '09:15');
assertEq('formatHoraEvento null', formatHoraEvento(null), null);
assertEq('formatHoraEvento undefined', formatHoraEvento(undefined), null);
assertEq('formatHoraEvento empty', formatHoraEvento(''), null);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
