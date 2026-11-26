// lib/formatDireccion.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM F tests-pure-2 (2026-11-26) — unit tests para
// formatDireccionLinea(). Superficie crítica: display de direccion
// estructurada en panel proveedor/mis-reservas + emails transaccionales.
//
// Pure function, cero side effects.
//
// Ejecutable:
//   npx tsx lib/formatDireccion.test.ts
//   npm run test:format-direccion
// ----------------------------------------------------------------------------
import { formatDireccionLinea, type DireccionEstructurada } from './formatDireccion';

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

const base: DireccionEstructurada = {
    region: null,
    comuna: null,
    calle: null,
    numero: null,
    direccion_info: null,
    direccion_servicio: null,
};

// --- Caso canónico: todos los campos estructurados -------------------------

assertEq(
    'Full estructurada: "Calle N, Comuna, Region"',
    formatDireccionLinea({
        ...base,
        region: 'Metropolitana',
        comuna: 'Las Condes',
        calle: 'Mayecura',
        numero: '1290',
    }),
    'Mayecura 1290, Las Condes, Metropolitana',
);

// --- Parcial: solo calle+comuna --------------------------------------------

assertEq(
    'Calle + comuna (sin numero ni region)',
    formatDireccionLinea({
        ...base,
        calle: 'Providencia',
        comuna: 'Providencia',
    }),
    'Providencia, Providencia',
);

// --- Parcial: solo comuna ---------------------------------------------------

assertEq(
    'Solo comuna',
    formatDireccionLinea({ ...base, comuna: 'Ñuñoa' }),
    'Ñuñoa',
);

// --- Parcial: solo region ---------------------------------------------------

assertEq(
    'Solo region',
    formatDireccionLinea({ ...base, region: 'Valparaíso' }),
    'Valparaíso',
);

// --- Numero sin calle (edge case) -------------------------------------------

assertEq(
    'Numero sin calle se incluye solo',
    formatDireccionLinea({
        ...base,
        numero: '1290',
        comuna: 'Las Condes',
    }),
    '1290, Las Condes',
);

// --- Calle sin numero -------------------------------------------------------

assertEq(
    'Calle sin numero',
    formatDireccionLinea({
        ...base,
        calle: 'Avenida Libertador',
        comuna: 'Santiago',
    }),
    'Avenida Libertador, Santiago',
);

// --- Trim: espacios externos se podan, pero espacios internos NO se normalizan
// Comportamiento documentado del helper: filter sobre isEmpty elimina '' ok,
// pero NO trim-per-elemento ni collapse-inner-whitespace. Si el input contiene
// padding dentro de calle/numero, se preserva. El trim() final solo quita
// los extremos del joined string.

assertEq(
    'Trim externo pero NO normaliza espacios internos',
    formatDireccionLinea({
        ...base,
        calle: '  Mayecura  ',
        numero: '  1290  ',
        comuna: 'Las Condes',
    }),
    'Mayecura     1290, Las Condes',
);

// --- Empty strings tratados como null -------------------------------------

assertEq(
    'Empty string calle + numero filtrados',
    formatDireccionLinea({
        ...base,
        calle: '',
        numero: '',
        comuna: 'Las Condes',
    }),
    'Las Condes',
);

// --- Fallback legacy: direccion_servicio ------------------------------------

assertEq(
    'Fallback legacy cuando estructurada all null',
    formatDireccionLinea({
        ...base,
        direccion_servicio: 'Mayecura 1290, Las Condes (texto libre)',
    }),
    'Mayecura 1290, Las Condes (texto libre)',
);

// --- Prioridad: estructurada gana sobre legacy -----------------------------

assertEq(
    'Si hay region, estructurada gana, direccion_servicio ignorado',
    formatDireccionLinea({
        ...base,
        region: 'Metropolitana',
        direccion_servicio: 'LEGACY NO DEBE APARECER',
    }),
    'Metropolitana',
);

// --- Todo null ---------------------------------------------------------------

assertEq('Todo null returns null', formatDireccionLinea(base), null);

// --- Legacy empty string returns null (no "" como dirección) ----------------

assertEq(
    'Legacy empty trim returns null',
    formatDireccionLinea({ ...base, direccion_servicio: '   ' }),
    null,
);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
