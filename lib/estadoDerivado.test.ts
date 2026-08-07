// lib/estadoDerivado.test.ts
// ---------------------------------------------------------------------------
// Tests unitarios puros del helper de PD1. Ejecutable con:
//   npx tsx lib/estadoDerivado.test.ts
// Cero deps de framework — asserta con Node `assert/strict` y usa
// `nowMs` inyectado para determinismo (nada de Date.now real).
//
// Cubre las 3 reglas del brief + los edge cases del cron canónico:
//   * F2 rango de noches → fin = fecha_fin.
//   * F1 slot horario → fin = fecha_preferida + duracion_min.
//   * legacy V4b horas → fin = fecha_preferida + duracion_horas.
//   * legacy V1 puntual → fin = fecha_preferida.
//   * pendiente + fecha pasada → vencida (independiente de familia).
//   * cancelada/rechazada/cancelada_proveedor → sin cambio (nunca vencen).
//   * F2 sin fecha_fin (dato malformado) → sin cambio (finEfectivoMs=null).
// ---------------------------------------------------------------------------
import { strict as assert } from 'node:assert';
import { estadoDerivado, finEfectivoMs, familia } from './estadoDerivado';

// Reloj de referencia: viernes 1 de agosto 2026, 12:00 CLT (UTC-4) = 16:00 UTC.
const NOW_MS = new Date('2026-08-01T16:00:00Z').getTime();

// Helpers de fixtures. Nombran fechas relativas a NOW en horas.
const iso = (offsetHours: number): string =>
    new Date(NOW_MS + offsetHours * 3_600_000).toISOString();

let pass = 0;
let fail = 0;
function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        pass++;
    } catch (err: any) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        fail++;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// familia() — semáforos canónicos F2/F1/legacy
// ────────────────────────────────────────────────────────────────────────────
console.log('familia()');

test('F2: capacidad_snapshot_estadia populada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-48), fecha_fin: iso(-24), capacidad_snapshot_estadia: 1 };
    assert.equal(familia(r), 'F2');
});

test('F1: duracion_min populada, capacidad_snapshot_estadia null', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-2), duracion_min: 60 };
    assert.equal(familia(r), 'F1');
});

test('legacy: ambos null', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-2) };
    assert.equal(familia(r), 'legacy');
});

test('F2 tiene precedencia sobre F1 si ambos populados', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-2), duracion_min: 60, capacidad_snapshot_estadia: 1, fecha_fin: iso(0) };
    assert.equal(familia(r), 'F2');
});

// ────────────────────────────────────────────────────────────────────────────
// finEfectivoMs() — replica lógica del cron
// ────────────────────────────────────────────────────────────────────────────
console.log('\nfinEfectivoMs()');

test('F2 usa fecha_fin', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-48), fecha_fin: iso(-24), capacidad_snapshot_estadia: 1 };
    assert.equal(finEfectivoMs(r), new Date(iso(-24)).getTime());
});

test('F2 sin fecha_fin → null (dato malformado)', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-48), capacidad_snapshot_estadia: 1 };
    assert.equal(finEfectivoMs(r), null);
});

test('F1: fecha_preferida + duracion_min', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-2), duracion_min: 60 };
    const esperado = new Date(iso(-2)).getTime() + 60 * 60_000;
    assert.equal(finEfectivoMs(r), esperado);
});

test('legacy V4b: fecha_preferida + duracion_horas', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-3), duracion_horas: 2 };
    const esperado = new Date(iso(-3)).getTime() + 2 * 3_600_000;
    assert.equal(finEfectivoMs(r), esperado);
});

test('legacy V2/V4a: prefiere fecha_fin sobre duracion_horas', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-48), fecha_fin: iso(-24), duracion_horas: 5 };
    assert.equal(finEfectivoMs(r), new Date(iso(-24)).getTime());
});

test('legacy V1 puntual: fecha_preferida directo', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-1) };
    assert.equal(finEfectivoMs(r), new Date(iso(-1)).getTime());
});

// ────────────────────────────────────────────────────────────────────────────
// estadoDerivado() — regla 1: confirmada + fin pasado → realizada
// ────────────────────────────────────────────────────────────────────────────
console.log('\nestadoDerivado() — confirmada → realizada');

test('F2 confirmada, fecha_fin pasado 24h → realizada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-72), fecha_fin: iso(-24), capacidad_snapshot_estadia: 1 };
    assert.equal(estadoDerivado(r, NOW_MS), 'realizada');
});

test('F2 confirmada, fecha_fin futuro → confirmada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(24), fecha_fin: iso(72), capacidad_snapshot_estadia: 1 };
    assert.equal(estadoDerivado(r, NOW_MS), 'confirmada');
});

test('F1 confirmada, fecha+duracion pasado → realizada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-2), duracion_min: 60 };
    // fin = -2h + 60min = -1h → pasado
    assert.equal(estadoDerivado(r, NOW_MS), 'realizada');
});

test('F1 confirmada, aún en curso (fecha pasada pero fin futuro) → confirmada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-0.5), duracion_min: 60 };
    // fin = -0.5h + 60min = +0.5h → futuro
    assert.equal(estadoDerivado(r, NOW_MS), 'confirmada');
});

test('F1 confirmada, futura → confirmada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(24), duracion_min: 60 };
    assert.equal(estadoDerivado(r, NOW_MS), 'confirmada');
});

test('legacy V1 confirmada, fecha pasada → realizada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-1) };
    assert.equal(estadoDerivado(r, NOW_MS), 'realizada');
});

test('legacy V4b confirmada, fecha+horas pasado → realizada', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-5), duracion_horas: 2 };
    // fin = -5h + 2h = -3h → pasado
    assert.equal(estadoDerivado(r, NOW_MS), 'realizada');
});

test('F2 malformado (sin fecha_fin) confirmada → confirmada (fin=null, no realizada)', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-100), capacidad_snapshot_estadia: 1 };
    assert.equal(estadoDerivado(r, NOW_MS), 'confirmada');
});

// ────────────────────────────────────────────────────────────────────────────
// estadoDerivado() — regla 2: pendiente + fecha pasada → vencida
// ────────────────────────────────────────────────────────────────────────────
console.log('\nestadoDerivado() — pendiente → vencida');

test('Pendiente con fecha_preferida pasada → vencida', () => {
    const r = { estado: 'pendiente', fecha_preferida: iso(-1) };
    assert.equal(estadoDerivado(r, NOW_MS), 'vencida');
});

test('Pendiente F1 con fecha pasada → vencida (independiente de duracion)', () => {
    const r = { estado: 'pendiente', fecha_preferida: iso(-1), duracion_min: 60 };
    assert.equal(estadoDerivado(r, NOW_MS), 'vencida');
});

test('Pendiente F2 con fecha_preferida pasada → vencida (aunque fecha_fin futura)', () => {
    // Rango 2 días atrás → hoy: fecha_preferida pasada aunque fecha_fin sea hoy.
    // Semántica del brief: vencida usa fecha_preferida (inicio), no fin efectivo.
    const r = { estado: 'pendiente', fecha_preferida: iso(-24), fecha_fin: iso(24), capacidad_snapshot_estadia: 1 };
    assert.equal(estadoDerivado(r, NOW_MS), 'vencida');
});

test('Pendiente futura → pendiente (sin cambio)', () => {
    const r = { estado: 'pendiente', fecha_preferida: iso(24) };
    assert.equal(estadoDerivado(r, NOW_MS), 'pendiente');
});

test('Pendiente exactamente ahora → vencida (borde inclusive)', () => {
    // El brief dice "fecha pasada"; para el borde exacto tratamos como "ya llegó"
    // = vencida. Corresponde con `<= nowMs` en la implementación.
    const r = { estado: 'pendiente', fecha_preferida: new Date(NOW_MS).toISOString() };
    assert.equal(estadoDerivado(r, NOW_MS), 'vencida');
});

// ────────────────────────────────────────────────────────────────────────────
// estadoDerivado() — terminales no cambian aunque estén pasadas
// ────────────────────────────────────────────────────────────────────────────
console.log('\nestadoDerivado() — terminales no vencen');

test('Cancelada con fecha pasada → cancelada (sin cambio)', () => {
    const r = { estado: 'cancelada', fecha_preferida: iso(-100), duracion_min: 60 };
    assert.equal(estadoDerivado(r, NOW_MS), 'cancelada');
});

test('Rechazada con fecha pasada → rechazada (sin cambio)', () => {
    const r = { estado: 'rechazada', fecha_preferida: iso(-100) };
    assert.equal(estadoDerivado(r, NOW_MS), 'rechazada');
});

test('cancelada_proveedor con fecha pasada → cancelada_proveedor (sin cambio)', () => {
    const r = { estado: 'cancelada_proveedor', fecha_preferida: iso(-100), duracion_min: 60 };
    assert.equal(estadoDerivado(r, NOW_MS), 'cancelada_proveedor');
});

// ────────────────────────────────────────────────────────────────────────────
// Contra-tests — invariancia contra el reloj para terminales
// ────────────────────────────────────────────────────────────────────────────
console.log('\nestadoDerivado() — determinismo del reloj inyectado');

test('Sin nowMs explícito usa Date.now (smoke, no compara valor)', () => {
    const r = { estado: 'confirmada', fecha_preferida: iso(-100), duracion_min: 60 };
    // No comparamos valor; solo que no throwea con default arg.
    const out = estadoDerivado(r);
    assert.ok(['realizada', 'confirmada'].includes(out as string));
});

// ────────────────────────────────────────────────────────────────────────────
// fecha_preferida null — no puede derivar, retorna estado base
// ────────────────────────────────────────────────────────────────────────────
console.log('\nestadoDerivado() — fecha_preferida null (tipo DB permite null)');

test('Confirmada con fecha_preferida null → confirmada (no realizada)', () => {
    const r = { estado: 'confirmada', fecha_preferida: null, duracion_min: 60 };
    assert.equal(estadoDerivado(r, NOW_MS), 'confirmada');
});

test('Pendiente con fecha_preferida null → pendiente (no vencida)', () => {
    const r = { estado: 'pendiente', fecha_preferida: null };
    assert.equal(estadoDerivado(r, NOW_MS), 'pendiente');
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
