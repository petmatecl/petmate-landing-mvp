// lib/puedeCancelarPorVentana.test.ts
// ---------------------------------------------------------------------------
// Contra-test del guard defensivo restaurado en Sweep #1 (2026-08-07,
// finding B3 auditoría #2). El caso crítico — F2 confirmada con
// `fecha_preferida = null` → debe retornar true (permitir) — es
// exactamente el caso que la implementación previa NUNCA alcanzaba
// (`?? 0` → new Date(0) es finite → guard defensivo no dispara).
//
// Correr con: `npx tsx lib/puedeCancelarPorVentana.test.ts`.
// ---------------------------------------------------------------------------
import { puedeCancelarPorVentana } from './puedeCancelarPorVentana';

let pass = 0;
let fail = 0;

function expect(label: string, actual: boolean, expected: boolean): void {
    if (actual === expected) {
        console.log(`✓ ${label}`);
        pass++;
    } else {
        console.log(`✗ ${label} — esperado ${expected}, got ${actual}`);
        fail++;
    }
}

// Timestamp de referencia: 2026-08-07 12:00 CLT (16:00 UTC).
const NOW_MS = new Date('2026-08-07T16:00:00Z').getTime();

// ── Casos NO-F2 o NO-confirmada: siempre permitir ─────────────────────
expect(
    'F1 confirmada retorna true (sin ventana)',
    puedeCancelarPorVentana({
        esReservaAgendaF2: false,
        isConfirmada: true,
        fecha_preferida: '2026-08-08',
    }, NOW_MS),
    true,
);
expect(
    'F2 pendiente (no confirmada) retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: false,
        fecha_preferida: '2026-08-08',
    }, NOW_MS),
    true,
);
expect(
    'F1 pendiente retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: false,
        isConfirmada: false,
        fecha_preferida: '2026-08-08',
    }, NOW_MS),
    true,
);

// ── CONTRA-TEST canónico del finding B3 ───────────────────────────────
// Antes de Sweep #1 esto retornaba FALSE (botón greyed forever) porque
// `?? 0` → new Date(0).getTime() === 0 (FINITE), horasHastaCheckIn era
// -469 millones, boolean check retornaba false. Fix restaura el guard.
expect(
    'CONTRA-TEST B3: F2 confirmada con fecha_preferida NULL retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: null,
    }, NOW_MS),
    true,
);
expect(
    'CONTRA-TEST B3: F2 confirmada con fecha_preferida undefined retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        // @ts-expect-error runtime undefined en legacy row
        fecha_preferida: undefined,
    }, NOW_MS),
    true,
);
expect(
    'CONTRA-TEST B3: F2 confirmada con fecha_preferida string vacío retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '',
    }, NOW_MS),
    true,
);

// ── Defensivo secundario: fecha inválida en formato ───────────────────
expect(
    'F2 confirmada con fecha_preferida garbage string retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: 'no-es-una-fecha',
    }, NOW_MS),
    true,
);

// ── Casos happy path F2 confirmada con ventana ────────────────────────
// Ventana default = 48h.
expect(
    'F2 confirmada, check-in en 72h (fuera ventana) retorna true — permitir',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-10T16:00:00Z',   // 72h > 48h ventana
    }, NOW_MS),
    true,
);
expect(
    'F2 confirmada, check-in en 24h (dentro ventana) retorna false — greyed',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-08T16:00:00Z',   // 24h < 48h ventana
    }, NOW_MS),
    false,
);
expect(
    'F2 confirmada, check-in en 47h59min (dentro ventana borderline) retorna false',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-09T15:59:00Z',   // 47h59min < 48h
    }, NOW_MS),
    false,
);
expect(
    'F2 confirmada, check-in en 48h exacto (borde) retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-09T16:00:00Z',   // 48h exacto
    }, NOW_MS),
    true,
);
expect(
    'F2 confirmada, check-in ya pasado retorna false — greyed',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-05T16:00:00Z',   // -48h (pasado)
    }, NOW_MS),
    false,
);

// ── Ventana custom del servicio (override del default) ────────────────
expect(
    'F2 confirmada con cancelacion_min_horas_antes=24, check-in en 30h retorna true',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-08T22:00:00Z',   // 30h
        cancelacion_min_horas_antes: 24,
    }, NOW_MS),
    true,
);
expect(
    'F2 confirmada con cancelacion_min_horas_antes=72, check-in en 48h retorna false',
    puedeCancelarPorVentana({
        esReservaAgendaF2: true,
        isConfirmada: true,
        fecha_preferida: '2026-08-09T16:00:00Z',   // 48h < 72h ventana
        cancelacion_min_horas_antes: 72,
    }, NOW_MS),
    false,
);

// ── Resumen ───────────────────────────────────────────────────────────
console.log('');
console.log(`─── ${pass} pass · ${fail} fail ───`);
if (fail > 0) {
    process.exit(1);
}
