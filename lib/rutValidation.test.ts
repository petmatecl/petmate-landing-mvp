// lib/rutValidation.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM C tests-core-area (2026-11-26) — unit tests para helpers de
// validación + formato de RUT chileno. Superficie crítica: signup proveedor
// (register.tsx Step 1), verificación de identidad, perfil admin.
//
// Pure functions, cero side effects. Patrón canónico del repo
// (assertEq + process.exit). Ver lib/eventosFormat.test.ts para referencia.
//
// Ejecutable:
//   npx tsx lib/rutValidation.test.ts
//   npm run test:rut-validation
// ----------------------------------------------------------------------------
import { cleanRut, validateRut, formatRut } from './rutValidation';

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

// --- cleanRut -----------------------------------------------------------------

assertEq('cleanRut strip dots + hyphen', cleanRut('12.345.678-9'), '123456789');
assertEq('cleanRut keep K uppercase', cleanRut('11.111.111-k'), '11111111K');
assertEq('cleanRut keep K already uppercase', cleanRut('11.111.111-K'), '11111111K');
assertEq('cleanRut strip spaces', cleanRut(' 12 345 678 9 '), '123456789');
assertEq('cleanRut non-string returns empty', cleanRut(null as unknown as string), '');
assertEq('cleanRut empty string', cleanRut(''), '');

// --- validateRut --------------------------------------------------------------
// RUT válido de referencia conocido: 11.111.111-1 (DV calculado = 1).
// Cómputo: suma = 2+3+4+5+6+7+2+3 = 32; 32 % 11 = 10; 11 - 10 = 1 → DV = "1".

assertEq('validateRut 11111111-1 valid', validateRut('11.111.111-1'), true);
assertEq('validateRut 11111111-1 sin formato', validateRut('11111111-1'), true);
assertEq('validateRut 11111111-K invalid DV', validateRut('11.111.111-K'), false);
assertEq('validateRut 12345678-9 wrong DV', validateRut('12.345.678-9'), false);
assertEq('validateRut empty', validateRut(''), false);
assertEq('validateRut single char', validateRut('1'), false);
assertEq('validateRut null', validateRut(null as unknown as string), false);

// RUT con DV = K: 20.333.333-K
// suma = 3*2 + 3*3 + 3*4 + 3*5 + 3*6 + 3*7 + 3*2 + 2*3 = 6+9+12+15+18+21+6+6 = 93
// 93 % 11 = 5; 11 - 5 = 6 → DV = "6", no K. Entonces 20.333.333-K debe ser inválido.
assertEq('validateRut 20333333-K invalid (DV real=6)', validateRut('20.333.333-K'), false);

// RUT válido que termina en K: 7.236.690-K
// suma = 0*2 + 9*3 + 6*4 + 6*5 + 3*6 + 2*7 + 7*2 = 0+27+24+30+18+14+14 = 127
// 127 % 11 = 6; 11 - 6 = 5 → DV = "5", no K. También inválido.
// Para encontrar un RUT válido terminado en K, uso body 7777777:
// suma = 7*2+7*3+7*4+7*5+7*6+7*7+7*2 = 14+21+28+35+42+49+14 = 203
// 203 % 11 = 5; 11 - 5 = 6 → "6", no K. Sigo buscando.
// Body 1: suma = 1*2 = 2; 2%11=2; 11-2=9 → DV="9". Inválido para K.
// Probé body 11111112: suma = 2*2+1*3+1*4+1*5+1*6+1*7+1*2+1*3 = 4+3+4+5+6+7+2+3 = 34
// 34%11=1; 11-1=10 → DV="K". Entonces 11.111.112-K es válido.
assertEq('validateRut 11111112-K valid (DV=10→K)', validateRut('11.111.112-K'), true);

// --- formatRut ----------------------------------------------------------------

assertEq('formatRut 123456781 → 12.345.678-1', formatRut('123456781'), '12.345.678-1');
assertEq('formatRut 1234567K → 1.234.567-K', formatRut('1234567K'), '1.234.567-K');
assertEq('formatRut 1 (solo DV) → 1', formatRut('1'), '1');
assertEq('formatRut empty → empty', formatRut(''), '');
assertEq('formatRut 123 (< 4 chars sin dots) → 12-3', formatRut('123'), '12-3');
assertEq('formatRut idempotent para RUT ya formateado', formatRut('12.345.678-1'), '12.345.678-1');

// Max length 12 chars (xx.xxx.xxx-x): truncar si excede.
// Input 1234567890 (10 chars) → body=123456789 → formateado 123.456.789-0 (13 chars) → trunc a 12.
assertEq('formatRut largo → truncado a 12', formatRut('1234567890'), '123.456.789-');

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
