// lib/nochesAgenda.test.ts
// ----------------------------------------------------------------------------
// Tests de la funcion pura derivarDisponibilidadNoches. Ejecutable con:
//   npx tsx lib/nochesAgenda.test.ts
//
// Contra-regresion: cada bug reportado queda como test aca. Ejecutar antes
// de cerrar cambios en nochesAgenda.ts o el endpoint /disponibilidad-noches.
//
// TZ crítica: los timestamptz de confirmadas se generan en UTC pero el
// helper los proyecta a fecha civil Chile. Los tests usan medianoche Chile
// convertida a su equivalente UTC (invierno: 04:00Z, verano: 03:00Z).
// ----------------------------------------------------------------------------
import {
    derivarDisponibilidadNoches,
    shiftDateYmd,
    ymdChile,
} from './nochesAgenda';

let passed = 0;
let failed = 0;

function assertEq<T>(name: string, actual: T, expected: T) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (ok) {
        console.log(`  ok  ${name}`);
        passed++;
    } else {
        console.log(`  FAIL ${name}`);
        console.log(`    expected: ${JSON.stringify(expected)}`);
        console.log(`    actual:   ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── helpers ───');

assertEq('shiftDateYmd +0', shiftDateYmd('2026-07-15', 0), '2026-07-15');
assertEq('shiftDateYmd +1', shiftDateYmd('2026-07-15', 1), '2026-07-16');
assertEq('shiftDateYmd +30', shiftDateYmd('2026-07-15', 30), '2026-08-14');
assertEq('shiftDateYmd -1', shiftDateYmd('2026-07-15', -1), '2026-07-14');
assertEq('shiftDateYmd cruza mes', shiftDateYmd('2026-07-31', 1), '2026-08-01');
assertEq('shiftDateYmd cruza año', shiftDateYmd('2026-12-31', 1), '2027-01-01');
// Fin del año bisiesto — feb 28 → feb 29 → mar 1 en 2028 (bisiesto).
assertEq('shiftDateYmd feb bisiesto 2028', shiftDateYmd('2028-02-28', 1), '2028-02-29');
assertEq('shiftDateYmd feb no bisiesto 2026', shiftDateYmd('2026-02-28', 1), '2026-03-01');

// ymdChile de un timestamp que en UTC cae en dia siguiente pero en Chile
// sigue en el mismo dia — el bug del fix TZ del tren de emails.
// 2026-07-28T02:00:00Z = 2026-07-27 22:00 Chile invierno CLT UTC-4.
assertEq(
    'ymdChile — 02:00Z del 28 en UTC es 27 en Chile invierno',
    ymdChile(new Date('2026-07-28T02:00:00Z')),
    '2026-07-27'
);
// Medianoche Chile invierno = 04:00Z el mismo dia.
assertEq(
    'ymdChile — medianoche Chile invierno (04:00Z) del 15 es 15',
    ymdChile(new Date('2026-07-15T04:00:00Z')),
    '2026-07-15'
);
// Medianoche Chile verano = 03:00Z el mismo dia.
assertEq(
    'ymdChile — medianoche Chile verano (03:00Z) del 15 es 15',
    ymdChile(new Date('2026-12-15T03:00:00Z')),
    '2026-12-15'
);

// ────────────────────────────────────────────────────────────────────────────
// Rango simple sin blackouts ni confirmadas
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── rango base ───');

const NOW_JUL15 = new Date('2026-07-15T12:00:00-04:00');  // 15/jul 12:00 Chile

const baseInput = {
    capacidadEstadia: 1,
    anticipacionMinDias: 3,
    anticipacionMaxDiasEstadia: 180,
    desde: '2026-07-18',
    hasta: '2026-07-20',
    blackouts: [],
    confirmadas: [],
    now: NOW_JUL15,
};

const base = derivarDisponibilidadNoches(baseInput);
assertEq('base — 3 dias generados', base.length, 3);
assertEq(
    'base — todos disponibles ok',
    base.map(d => d.razon),
    ['ok', 'ok', 'ok']
);
assertEq(
    'base — todos restantes=1',
    base.map(d => d.restantes),
    [1, 1, 1]
);

// ────────────────────────────────────────────────────────────────────────────
// Anticipación mínima — fechas dentro de la ventana rebotan
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── anticipacion_min ───');

// hoy = 15, min_dias=3 → primera fecha OK es 18. Fechas 15/16/17 rebotan.
const anticMin = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-15',
    hasta: '2026-07-19',
});
assertEq(
    'anticMin — 5 dias, primeros 3 (15/16/17) razon anticipacion_min, 18/19 ok',
    anticMin.map(d => d.razon),
    ['anticipacion_min', 'anticipacion_min', 'anticipacion_min', 'ok', 'ok']
);

// anticipacionMinDias=0 → el mismo día ya es válido.
const anticMinCero = derivarDisponibilidadNoches({
    ...baseInput,
    anticipacionMinDias: 0,
    desde: '2026-07-15',
    hasta: '2026-07-16',
});
assertEq(
    'anticMin=0 — 15 mismo dia disponible',
    anticMinCero[0].razon,
    'ok'
);

// ────────────────────────────────────────────────────────────────────────────
// Anticipación máxima — más allá de la ventana rebotan
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── anticipacion_max ───');

// hoy=15, max_dias=180 → última fecha OK es 2027-01-11 (15+180). El 12 rebota.
const anticMax = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2027-01-10',
    hasta: '2027-01-14',
});
assertEq(
    'anticMax — 10/11 ok, 12/13/14 razon anticipacion_max',
    anticMax.map(d => d.razon),
    ['ok', 'ok', 'anticipacion_max', 'anticipacion_max', 'anticipacion_max']
);

// ────────────────────────────────────────────────────────────────────────────
// Fecha pasada — antes de hoy nunca es reservable
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── pasado ───');

const pasado = derivarDisponibilidadNoches({
    ...baseInput,
    anticipacionMinDias: 0,
    desde: '2026-07-13',
    hasta: '2026-07-16',
});
assertEq(
    'pasado — 13/14 razon pasado, 15/16 ok',
    pasado.map(d => d.razon),
    ['pasado', 'pasado', 'ok', 'ok']
);

// ────────────────────────────────────────────────────────────────────────────
// BLACKOUT semi-abierto [) — el día de check-out del blackout NO está bloqueado
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── blackout semi-abierto ───');

// Blackout del 20 al 22 → días 20 y 21 bloqueados, día 22 libre (check-out).
const conBlackout = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-19',
    hasta: '2026-07-23',
    blackouts: [{ fecha: '2026-07-20', fecha_fin: '2026-07-22' }],
});
assertEq(
    'blackout [20,22) — 19 ok, 20/21 blackout, 22/23 ok',
    conBlackout.map(d => d.razon),
    ['ok', 'blackout', 'blackout', 'ok', 'ok']
);

// Blackout de 1 noche mínima {fecha: X, fecha_fin: X+1}: bloquea solo X.
const blackout1Noche = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-19',
    hasta: '2026-07-21',
    blackouts: [{ fecha: '2026-07-20', fecha_fin: '2026-07-21' }],
});
assertEq(
    'blackout 1 noche [20,21) — 19 ok, 20 blackout, 21 ok',
    blackout1Noche.map(d => d.razon),
    ['ok', 'blackout', 'ok']
);

// ────────────────────────────────────────────────────────────────────────────
// CONFIRMADA semi-abierto [) — mismo dia puede ser check-out y check-in
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── confirmadas semi-abierto ───');

// Confirmada del 20 al 22 (capacidad=1) → 20/21 llenos, 22 libre.
// Medianoche Chile invierno del 20 = 2026-07-20T04:00:00Z. Del 22 = 22T04:00Z.
const conConfirmada = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-19',
    hasta: '2026-07-23',
    confirmadas: [{
        fecha_preferida: '2026-07-20T04:00:00Z',
        fecha_fin: '2026-07-22T04:00:00Z',
    }],
});
assertEq(
    'confirmada [20,22) cap=1 — 19 ok, 20/21 lleno, 22/23 ok',
    conConfirmada.map(d => d.razon),
    ['ok', 'lleno', 'lleno', 'ok', 'ok']
);

// Dos estadias contiguas: A=[15,20), B=[20,25). Ambas caben con cap=1.
// El día 20 A hace check-out y B hace check-in — ningun conflicto.
const contiguas = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-18',
    hasta: '2026-07-26',
    anticipacionMinDias: 0,
    confirmadas: [
        { fecha_preferida: '2026-07-15T04:00:00Z', fecha_fin: '2026-07-20T04:00:00Z' },
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-25T04:00:00Z' },
    ],
});
assertEq(
    'estadias contiguas — dia 20 comparte check-out+check-in sin conflicto',
    contiguas.map(d => d.razon),
    // 18 (dentro A), 19 (dentro A), 20 (dentro B, A checkout), 21..24 (dentro B),
    // 25 (B checkout, libre), 26 (libre)
    ['lleno', 'lleno', 'lleno', 'lleno', 'lleno', 'lleno', 'lleno', 'ok', 'ok']
);

// ────────────────────────────────────────────────────────────────────────────
// CAPACIDAD > 1 — resta parcial, restantes correcto
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── capacidad grupal ───');

// Servicio con capacidad=3, dos confirmadas simultáneas → restantes=1.
const grupal = derivarDisponibilidadNoches({
    ...baseInput,
    capacidadEstadia: 3,
    desde: '2026-07-19',
    hasta: '2026-07-22',
    confirmadas: [
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-21T04:00:00Z' },
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-21T04:00:00Z' },
    ],
});
assertEq(
    'grupal cap=3 — dia 20 con 2 ocupadas → restantes:1 disponible',
    { r: grupal[1].restantes, d: grupal[1].disponible, razon: grupal[1].razon },
    { r: 1, d: true, razon: 'ok' }
);
assertEq(
    'grupal cap=3 — dia 19 sin ocupadas → restantes:3',
    grupal[0].restantes,
    3
);

// Capacidad=2, tres confirmadas simultáneas → restantes:0 lleno.
const grupalLleno = derivarDisponibilidadNoches({
    ...baseInput,
    capacidadEstadia: 2,
    desde: '2026-07-20',
    hasta: '2026-07-20',
    confirmadas: [
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-21T04:00:00Z' },
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-21T04:00:00Z' },
        { fecha_preferida: '2026-07-20T04:00:00Z', fecha_fin: '2026-07-21T04:00:00Z' },
    ],
});
assertEq(
    'grupal cap=2 con 3 ocupadas — restantes:0 (clamp), razon lleno',
    { r: grupalLleno[0].restantes, razon: grupalLleno[0].razon },
    { r: 0, razon: 'lleno' }
);

// ────────────────────────────────────────────────────────────────────────────
// Combinaciones — orden de precedencia de razones
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── precedencia de razones ───');

// Blackout gana sobre lleno: si hay confirmada Y blackout en el mismo día,
// reportamos 'blackout' (más informativo para el proveedor — el blackout es
// suyo, mientras el "lleno" es state derivado).
const blackoutSobreLleno = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-20',
    hasta: '2026-07-20',
    blackouts: [{ fecha: '2026-07-20', fecha_fin: '2026-07-21' }],
    confirmadas: [{
        fecha_preferida: '2026-07-20T04:00:00Z',
        fecha_fin: '2026-07-21T04:00:00Z',
    }],
});
assertEq(
    'precedencia — blackout gana sobre lleno',
    blackoutSobreLleno[0].razon,
    'blackout'
);

// anticipacion_min gana sobre blackout — corta antes.
const anticSobreBlackout = derivarDisponibilidadNoches({
    ...baseInput,
    anticipacionMinDias: 10,  // hoy=15, min=25
    desde: '2026-07-16',
    hasta: '2026-07-16',
    blackouts: [{ fecha: '2026-07-16', fecha_fin: '2026-07-18' }],
});
assertEq(
    'precedencia — anticipacion_min gana sobre blackout',
    anticSobreBlackout[0].razon,
    'anticipacion_min'
);

// ────────────────────────────────────────────────────────────────────────────
// DST — invierno vs verano, mismo comportamiento civil
// ────────────────────────────────────────────────────────────────────────────
console.log('\n─── DST — invierno vs verano ───');

// Confirmada en enero (verano CLST UTC-3): medianoche Chile 15/ene = 15T03:00Z.
const NOW_DEC15 = new Date('2026-12-15T12:00:00-03:00');  // 15/dic 12:00 Chile verano
const confirmadaVerano = derivarDisponibilidadNoches({
    capacidadEstadia: 1,
    anticipacionMinDias: 3,
    anticipacionMaxDiasEstadia: 180,
    desde: '2027-01-19',
    hasta: '2027-01-23',
    blackouts: [],
    confirmadas: [{
        fecha_preferida: '2027-01-20T03:00:00Z',  // medianoche verano
        fecha_fin: '2027-01-22T03:00:00Z',
    }],
    now: NOW_DEC15,
});
assertEq(
    'DST verano — confirmada 20-22 respeta semi-abierto igual que invierno',
    confirmadaVerano.map(d => d.razon),
    ['ok', 'lleno', 'lleno', 'ok', 'ok']
);

// Bug clásico TZ: si un timestamp UTC del check-out cae en el "día
// siguiente" en UTC pero es el "mismo día" en Chile, el semi-abierto
// se calcula sobre fecha civil chilena. Ej: check-out 21T02:00Z en
// invierno = 20T22:00 Chile. Fecha civil del check-out = 20 → estadía
// [X, 20). Comportamiento simétrico a lo declarado por el proveedor.
const checkoutTardeUtc = derivarDisponibilidadNoches({
    ...baseInput,
    desde: '2026-07-19',
    hasta: '2026-07-22',
    confirmadas: [{
        fecha_preferida: '2026-07-19T04:00:00Z',  // 19 medianoche Chile
        fecha_fin: '2026-07-21T02:00:00Z',        // 20 22:00 Chile → civil 20
    }],
});
assertEq(
    'TZ — check-out 21T02Z (civil Chile 20) → estadia [19,20), 19 lleno, 20/21/22 libres',
    checkoutTardeUtc.map(d => d.razon),
    ['lleno', 'ok', 'ok', 'ok']
);

// ────────────────────────────────────────────────────────────────────────────
// Resumen
// ────────────────────────────────────────────────────────────────────────────
console.log(`\n───\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
