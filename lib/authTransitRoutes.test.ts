// lib/authTransitRoutes.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM F tests-pure-2 (2026-11-26) — unit tests para
// isAuthTransitRoute() + isOrphanSafeRoute(). Superficie crítica: 2 guards
// paralelos (UserContext + SessionTimeout) consumen estas funciones para
// decidir si redirigir o aplicar timeouts. Un bug acá puede sacar a un user
// legítimo del flow de auth o atrapar a un huérfano en un redirect loop.
//
// Pure functions, cero side effects.
//
// Historia: sprint email-landing session-timeout fix (2026-08-25) — estas
// constantes se agregaron para unificar lo que antes era duplicado entre
// 2 guards. Un bug con 29s de signup aterrizaba al user en /security-logout
// porque SessionTimeout no excluía /email-confirmado.
//
// Ejecutable:
//   npx tsx lib/authTransitRoutes.test.ts
//   npm run test:auth-transit-routes
// ----------------------------------------------------------------------------
import {
    AUTH_TRANSIT_ROUTES,
    INFORMATIONAL_PUBLIC_ROUTES,
    isAuthTransitRoute,
    isOrphanSafeRoute,
} from './authTransitRoutes';

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

// --- AUTH_TRANSIT_ROUTES contiene las 8 rutas canónicas ---------------------

const expectedAuthRoutes = [
    '/login',
    '/register',
    '/logout',
    '/security-logout',
    '/completar-registro',
    '/email-confirmado',
    '/forgot-password',
    '/reset-password',
];

for (const route of expectedAuthRoutes) {
    assertEq(`AUTH_TRANSIT_ROUTES contains ${route}`, AUTH_TRANSIT_ROUTES.has(route), true);
}

assertEq('AUTH_TRANSIT_ROUTES size', AUTH_TRANSIT_ROUTES.size, 8);

// --- INFORMATIONAL_PUBLIC_ROUTES contiene las 3 rutas canónicas ------------

const expectedInfoRoutes = ['/terminos', '/privacidad', '/quienes-somos'];

for (const route of expectedInfoRoutes) {
    assertEq(`INFORMATIONAL_PUBLIC_ROUTES contains ${route}`, INFORMATIONAL_PUBLIC_ROUTES.has(route), true);
}

assertEq('INFORMATIONAL_PUBLIC_ROUTES size', INFORMATIONAL_PUBLIC_ROUTES.size, 3);

// --- isAuthTransitRoute: positivos ------------------------------------------

assertEq('isAuthTransit /login', isAuthTransitRoute('/login'), true);
assertEq('isAuthTransit /email-confirmado', isAuthTransitRoute('/email-confirmado'), true);
assertEq('isAuthTransit /security-logout', isAuthTransitRoute('/security-logout'), true);

// --- isAuthTransitRoute: query string + hash se normalizan ------------------

assertEq(
    'isAuthTransit con query string',
    isAuthTransitRoute('/login?redirect=/explorar'),
    true,
);

assertEq(
    'isAuthTransit con hash fragment',
    isAuthTransitRoute('/email-confirmado#access_token=xyz'),
    true,
);

assertEq(
    'isAuthTransit con query + hash combinados',
    isAuthTransitRoute('/login?from=signup#state=abc'),
    true,
);

// --- isAuthTransitRoute: trailing slash se normaliza (excepto root) --------

assertEq(
    'isAuthTransit con trailing slash removido',
    isAuthTransitRoute('/login/'),
    true,
);

assertEq(
    'isAuthTransit con trailing slash + query',
    isAuthTransitRoute('/register/?rol=proveedor'),
    true,
);

// --- isAuthTransitRoute: negativos ------------------------------------------

assertEq('isAuthTransit / root false', isAuthTransitRoute('/'), false);
assertEq('isAuthTransit /explorar false', isAuthTransitRoute('/explorar'), false);
assertEq('isAuthTransit /proveedor/xyz false', isAuthTransitRoute('/proveedor/xyz'), false);
assertEq('isAuthTransit /terminos false (va a orphan-safe)', isAuthTransitRoute('/terminos'), false);

// --- isOrphanSafeRoute: positivos (incluye auth-transit + públicas) --------

assertEq('isOrphanSafe /login (auth-transit)', isOrphanSafeRoute('/login'), true);
assertEq('isOrphanSafe /terminos (info public)', isOrphanSafeRoute('/terminos'), true);
assertEq('isOrphanSafe /privacidad (info public)', isOrphanSafeRoute('/privacidad'), true);
assertEq('isOrphanSafe /quienes-somos (info public)', isOrphanSafeRoute('/quienes-somos'), true);
assertEq('isOrphanSafe /email-confirmado (auth-transit)', isOrphanSafeRoute('/email-confirmado'), true);

// --- isOrphanSafeRoute: negativos ------------------------------------------

assertEq('isOrphanSafe / root false', isOrphanSafeRoute('/'), false);
assertEq('isOrphanSafe /explorar false', isOrphanSafeRoute('/explorar'), false);
assertEq('isOrphanSafe /proveedor/xyz false', isOrphanSafeRoute('/proveedor/xyz'), false);

// --- isOrphanSafeRoute: query/hash/trailing también normalizados ------------

assertEq(
    'isOrphanSafe /terminos?ref=footer',
    isOrphanSafeRoute('/terminos?ref=footer'),
    true,
);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
