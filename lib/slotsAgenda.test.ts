// lib/slotsAgenda.test.ts
// ----------------------------------------------------------------------------
// Tests de la funcion pura derivarSlots. Ejecutable con:
//   npx tsx lib/slotsAgenda.test.ts
//
// Contra-regresion: cada caso reportado como bug queda como test aca. Ejecutar
// antes de cerrar cambios en slotsAgenda.ts o el endpoint de slots.
// ----------------------------------------------------------------------------
import { derivarSlots, chileWallClockToUtc, getIsoDayOfWeek } from './slotsAgenda';

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

console.log('\n─── helpers ───');
assertEq('ISO dow 2026-07-20 (lunes)', getIsoDayOfWeek('2026-07-20'), 1);
assertEq('ISO dow 2026-07-26 (domingo)', getIsoDayOfWeek('2026-07-26'), 7);

const wallJul20 = chileWallClockToUtc('2026-07-20', '09:00');
assertEq(
    'chileWallClockToUtc 2026-07-20 09:00 (invierno CLT UTC-4) → 13:00 UTC',
    wallJul20.toISOString(),
    '2026-07-20T13:00:00.000Z'
);
const wallDec15 = chileWallClockToUtc('2026-12-15', '09:00');
assertEq(
    'chileWallClockToUtc 2026-12-15 09:00 (verano CLST UTC-3) → 12:00 UTC',
    wallDec15.toISOString(),
    '2026-12-15T12:00:00.000Z'
);

console.log('\n─── bug reportado por Aldo (caso 5 del smoke) ───');
// Fila real en staging (2026-07-11):
//   fecha_preferida = 2026-07-20 13:00:00+00 → lunes 09:00 Chile invierno
//   duracion_min = 60, capacidad_snapshot = 1
// Slot esperado 2026-07-20 09:00-10:00 → restantes:0, disponible:false.
const bugCase = derivarSlots({
    duracionSlotMin: 60,
    capacidadSlot: 1,
    anticipacionMinHoras: 24,
    anticipacionMaxDias: 60,
    desde: '2026-07-20',
    hasta: '2026-07-20',
    franjas: [
        { dia_semana: 1, hora_desde: '09:00', hora_hasta: '13:00' },
    ],
    excepciones: [],
    confirmadas: [
        { fecha_preferida: '2026-07-20T13:00:00+00:00', duracion_min: 60 },
    ],
    // Now lejos en el pasado para que la anticipacion min no interfiera.
    now: new Date('2026-07-10T00:00:00Z'),
});
assertEq(
    'bug caso 5 — 4 slots generados',
    bugCase.length,
    4
);
const slot9 = bugCase.find(s => s.hora_inicio === '09:00');
assertEq(
    'bug caso 5 — slot 09:00 solapa con confirmada → restantes:0',
    slot9?.restantes,
    0
);
assertEq(
    'bug caso 5 — slot 09:00 → disponible:false',
    slot9?.disponible,
    false
);
const slot10 = bugCase.find(s => s.hora_inicio === '10:00');
assertEq(
    'bug caso 5 — slot 10:00 no solapa → restantes:1, disponible:true',
    { restantes: slot10?.restantes, disponible: slot10?.disponible },
    { restantes: 1, disponible: true }
);

console.log('\n─── casos borde documentados ───');
// Franja no divisible.
const noDiv = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 1,
    anticipacionMinHoras: 0, anticipacionMaxDias: 60,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '10:30' }],
    excepciones: [], confirmadas: [],
    now: new Date('2026-07-10T00:00:00Z'),
});
assertEq('franja 09:00-10:30 dur 60 → 1 slot (09-10, remainder descartado)', noDiv.length, 1);
assertEq('slot es 09:00-10:00', noDiv[0]?.hora_inicio, '09:00');

// Excepcion parcial que corta un slot al medio.
const excParcial = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 1,
    anticipacionMinHoras: 0, anticipacionMaxDias: 60,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '11:00' }],
    excepciones: [{ fecha: '2026-07-20', hora_desde: '09:30', hora_hasta: '10:00' }],
    confirmadas: [],
    now: new Date('2026-07-10T00:00:00Z'),
});
const parcial9 = excParcial.find(s => s.hora_inicio === '09:00');
const parcial10 = excParcial.find(s => s.hora_inicio === '10:00');
assertEq('excepcion parcial 09:30-10:00 bloquea 09-10', parcial9?.disponible, false);
assertEq('excepcion parcial 09:30-10:00 NO bloquea 10-11', parcial10?.disponible, true);

// Excepcion dia completo.
const excDia = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 1,
    anticipacionMinHoras: 0, anticipacionMaxDias: 60,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '13:00' }],
    excepciones: [{ fecha: '2026-07-20', hora_desde: null, hora_hasta: null }],
    confirmadas: [],
    now: new Date('2026-07-10T00:00:00Z'),
});
assertEq('excepcion dia completo bloquea todos', excDia.every(s => !s.disponible), true);

// Capacidad grupal.
const grupal = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 3,
    anticipacionMinHoras: 0, anticipacionMaxDias: 60,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '10:00' }],
    excepciones: [],
    confirmadas: [
        { fecha_preferida: '2026-07-20T13:00:00+00:00', duracion_min: 60 },
        { fecha_preferida: '2026-07-20T13:00:00+00:00', duracion_min: 60 },
    ],
    now: new Date('2026-07-10T00:00:00Z'),
});
assertEq('capacidad 3 con 2 confirmadas → restantes:1, disponible:true',
    { restantes: grupal[0]?.restantes, disponible: grupal[0]?.disponible },
    { restantes: 1, disponible: true }
);

// Anticipacion min.
const antic = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 1,
    anticipacionMinHoras: 24, anticipacionMaxDias: 60,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '10:00' }],
    excepciones: [], confirmadas: [],
    // now 6h antes del slot en Chile (slot arranca 13:00 UTC → now 07:00 UTC).
    now: new Date('2026-07-20T07:00:00Z'),
});
assertEq('anticipacion min 24h + slot en 6h → disponible:false',
    antic[0]?.disponible, false);

// Anticipacion max.
const anticMax = derivarSlots({
    duracionSlotMin: 60, capacidadSlot: 1,
    anticipacionMinHoras: 0, anticipacionMaxDias: 7,
    desde: '2026-07-20', hasta: '2026-07-20',
    franjas: [{ dia_semana: 1, hora_desde: '09:00', hora_hasta: '10:00' }],
    excepciones: [], confirmadas: [],
    // now 30 dias antes del slot → excede la ventana max.
    now: new Date('2026-06-20T00:00:00Z'),
});
assertEq('anticipacion max 7d + slot en 30d → disponible:false',
    anticMax[0]?.disponible, false);

console.log(`\n${passed} pass, ${failed} fail`);
process.exit(failed > 0 ? 1 : 0);
