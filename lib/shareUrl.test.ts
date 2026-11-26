// lib/shareUrl.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM C tests-core-area (2026-11-26) — unit tests para helpers de
// OG image y URL absoluta canónica, usados por el meta tag <meta
// property="og:image"> de las fichas públicas (/servicio/[id] y
// /proveedor/[id]). Superficie crítica: share nativo + OG previews
// WhatsApp/Twitter/Facebook.
//
// Pure functions, cero side effects. Patrón canónico del repo
// (assertEq + process.exit). Ver lib/eventosFormat.test.ts para referencia.
//
// Ejecutable:
//   npx tsx lib/shareUrl.test.ts
//   npm run test:share-url
// ----------------------------------------------------------------------------
import { CANONICAL_HOST, getOgImageUrl, getCanonicalUrl } from './shareUrl';

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

// --- CANONICAL_HOST constante ------------------------------------------------

assertEq('CANONICAL_HOST es https://www.pawnecta.com', CANONICAL_HOST, 'https://www.pawnecta.com');

// --- getOgImageUrl -----------------------------------------------------------

assertEq(
    'getOgImageUrl null → fallback /og-image.jpg',
    getOgImageUrl(null),
    'https://www.pawnecta.com/og-image.jpg',
);

assertEq(
    'getOgImageUrl undefined → fallback',
    getOgImageUrl(undefined),
    'https://www.pawnecta.com/og-image.jpg',
);

assertEq(
    'getOgImageUrl empty string → fallback (falsy)',
    getOgImageUrl(''),
    'https://www.pawnecta.com/og-image.jpg',
);

assertEq(
    'getOgImageUrl URL simple → /_next/image encoded w=1200 q=75',
    getOgImageUrl('https://example.com/img.jpg'),
    'https://www.pawnecta.com/_next/image?url=https%3A%2F%2Fexample.com%2Fimg.jpg&w=1200&q=75',
);

assertEq(
    'getOgImageUrl URL con query string encoded correctamente',
    getOgImageUrl('https://cdn.example.com/a/b.jpg?token=abc'),
    'https://www.pawnecta.com/_next/image?url=https%3A%2F%2Fcdn.example.com%2Fa%2Fb.jpg%3Ftoken%3Dabc&w=1200&q=75',
);

assertEq(
    'getOgImageUrl w override custom',
    getOgImageUrl('https://x.com/img.jpg', 800),
    'https://www.pawnecta.com/_next/image?url=https%3A%2F%2Fx.com%2Fimg.jpg&w=800&q=75',
);

// --- getCanonicalUrl ---------------------------------------------------------

assertEq(
    'getCanonicalUrl /servicio/abc → https://www.pawnecta.com/servicio/abc',
    getCanonicalUrl('/servicio/abc'),
    'https://www.pawnecta.com/servicio/abc',
);

assertEq(
    'getCanonicalUrl sin leading slash agrega uno',
    getCanonicalUrl('explorar'),
    'https://www.pawnecta.com/explorar',
);

assertEq(
    'getCanonicalUrl root path',
    getCanonicalUrl('/'),
    'https://www.pawnecta.com/',
);

assertEq(
    'getCanonicalUrl con query params preservados',
    getCanonicalUrl('/servicio/abc?from=widget'),
    'https://www.pawnecta.com/servicio/abc?from=widget',
);

assertEq(
    'getCanonicalUrl con fragment hash preservado',
    getCanonicalUrl('/perfil#bio'),
    'https://www.pawnecta.com/perfil#bio',
);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
