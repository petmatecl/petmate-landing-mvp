// lib/errorMapper.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM F tests-pure-2 (2026-11-26) — unit tests para mapError().
// Superficie crítica: mapea errores Supabase/backend a mensajes amigables
// en toasts + páginas de error. Usado en signup, login, perfil, agendamiento.
//
// Pure function, cero side effects.
//
// Ejecutable:
//   npx tsx lib/errorMapper.test.ts
//   npm run test:error-mapper
// ----------------------------------------------------------------------------
import { mapError } from './errorMapper';

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

// --- null / undefined -------------------------------------------------------

assertEq('null error', mapError(null), 'Ocurrió un error desconocido.');
assertEq('undefined error', mapError(undefined), 'Ocurrió un error desconocido.');

// --- Auth errors ------------------------------------------------------------

assertEq(
    'Invalid login credentials',
    mapError({ message: 'Invalid login credentials' }),
    'Correo o contraseña incorrectos.',
);

assertEq(
    'Invalid login credentials (mixed case)',
    mapError({ message: 'INVALID LOGIN CREDENTIALS' }),
    'Correo o contraseña incorrectos.',
);

assertEq(
    'Email not confirmed',
    mapError({ message: 'Email not confirmed' }),
    'Debes confirmar tu correo electrónico antes de iniciar sesión.',
);

assertEq(
    'User not found',
    mapError({ message: 'User not found in database' }),
    'Usuario no encontrado.',
);

assertEq(
    'Password too short',
    mapError({ message: 'Password should be at least 6 characters' }),
    'La contraseña debe tener al menos 6 caracteres.',
);

// --- DB constraint errors (SQLSTATE codes) ----------------------------------

assertEq(
    '23505 unique constraint',
    mapError({ code: '23505', message: 'duplicate key value' }),
    'Ya existe un registro con estos datos (ej. correo o RUT duplicado).',
);

assertEq(
    '23503 foreign key violation',
    mapError({ code: '23503', message: 'foreign key violation' }),
    'Operación inválida: referencia a dato inexistente.',
);

assertEq(
    '42501 permission denied',
    mapError({ code: '42501', message: 'permission denied' }),
    'No tienes permisos para realizar esta acción.',
);

// --- Custom app errors ------------------------------------------------------

assertEq(
    'profile incomplete',
    mapError({ message: 'profile incomplete, user must complete signup' }),
    'Debes completar tu perfil para continuar.',
);

assertEq(
    'role mismatch',
    mapError({ message: 'role mismatch for this action' }),
    'No tienes el perfil necesario para esta acción.',
);

// --- Fallback: unknown error ------------------------------------------------

assertEq(
    'Fallback usa error.message si no matchea ningún caso',
    mapError({ message: 'random supabase error 500' }),
    'random supabase error 500',
);

assertEq(
    'Fallback usa texto genérico si message vacío',
    mapError({}),
    'Error inesperado. Intenta nuevamente.',
);

// --- Priority: code constraint gana sobre message genérico ------------------
// Si el error tiene code 23505 PERO el message contiene "invalid login",
// el matcher de auth corre primero (message.includes("invalid login") true),
// así que gana el mensaje de auth. Este test documenta comportamiento actual.

assertEq(
    'Priority: message auth gana sobre code constraint',
    mapError({ code: '23505', message: 'Invalid login credentials' }),
    'Correo o contraseña incorrectos.',
);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
