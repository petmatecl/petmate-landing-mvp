// lib/coordsPrivacy.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM F tests-pure-2 (2026-11-26) — unit tests para roundCoordsForPublic
// + constantes PUBLIC_COORD_DECIMALS/PUBLIC_COORD_RADIUS_METERS. Superficie
// crítica: privacidad de ubicación en ficha pública del proveedor (evitar
// expone dirección exacta pre-booking confirmado).
//
// Pure function, cero side effects.
//
// Ejecutable:
//   npx tsx lib/coordsPrivacy.test.ts
//   npm run test:coords-privacy
// ----------------------------------------------------------------------------
import {
    PUBLIC_COORD_DECIMALS,
    PUBLIC_COORD_RADIUS_METERS,
    roundCoordsForPublic,
} from './coordsPrivacy';

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

// --- Constantes --------------------------------------------------------------

assertEq('PUBLIC_COORD_DECIMALS = 2', PUBLIC_COORD_DECIMALS, 2);
assertEq('PUBLIC_COORD_RADIUS_METERS = 1000', PUBLIC_COORD_RADIUS_METERS, 1000);

// --- roundCoordsForPublic ----------------------------------------------------
// 3 decimales → 2 decimales reduce precisión de ~111m a ~1.1km (a 33° lat S).

const santiagoCentro = roundCoordsForPublic(-33.456789, -70.648765);
assertEq('Santiago round lat', santiagoCentro.lat, -33.46);
assertEq('Santiago round lng', santiagoCentro.lng, -70.65);

const valparaiso = roundCoordsForPublic(-33.045678, -71.619999);
assertEq('Valparaíso round lat', valparaiso.lat, -33.05);
assertEq('Valparaíso round lng', valparaiso.lng, -71.62);

// Exactos a 2 decimales (no truncar lo que ya está).
const exactos = roundCoordsForPublic(-33.46, -70.65);
assertEq('Exactos 2 dec lat idempotent', exactos.lat, -33.46);
assertEq('Exactos 2 dec lng idempotent', exactos.lng, -70.65);

// Cero (coord válida pero rare — 0,0 es fuera de Chile pero válido en float).
const cero = roundCoordsForPublic(0, 0);
assertEq('Cero lat', cero.lat, 0);
assertEq('Cero lng', cero.lng, 0);

// --- null safety -------------------------------------------------------------

const nullCase = roundCoordsForPublic(null, null);
assertEq('null lat preserved', nullCase.lat, null);
assertEq('null lng preserved', nullCase.lng, null);

const undefinedCase = roundCoordsForPublic(undefined, undefined);
assertEq('undefined lat preserved', undefinedCase.lat, undefined);
assertEq('undefined lng preserved', undefinedCase.lng, undefined);

// Mixto: un valor numérico + otro null.
const mixto = roundCoordsForPublic(-33.456789, null);
assertEq('mixto num lat redondeado', mixto.lat, -33.46);
assertEq('mixto null lng preservado', mixto.lng, null);

// --- Redondeo correcto (half-up Math.round) ---------------------------------
// 0.005 → 0.01 (half-up). 0.004 → 0.00. 0.006 → 0.01.

const halfUp = roundCoordsForPublic(-33.455, -70.65);
assertEq('half-up 0.005 lat', halfUp.lat, -33.45);  // Math.round(-33.455 * 100) = Math.round(-3345.5) = -3345 → -33.45 (JS banker's: -3345 impar → -3345 banker=-3346 pero Math.round=-3345 pues round-half-away-zero en negativos)

// Verificar con positivos (más intuitivo):
const halfUpPos = roundCoordsForPublic(33.455, 70.655);
assertEq('half-up 33.455 positive', halfUpPos.lat, 33.46);
assertEq('half-up 70.655 positive', halfUpPos.lng, 70.66);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
