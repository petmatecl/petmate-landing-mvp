// lib/sanitize.test.ts
// ----------------------------------------------------------------------------
// Sprint ITEM C tests-core-area (2026-11-26) — unit tests para escapeHtml().
// Superficie crítica: prevención XSS en templates de email transaccional
// (WelcomeEmail, AgendamientoProveedorEmail, NewMessageEmail, etc.).
//
// Pure function, cero side effects. Patrón canónico del repo
// (assertEq + process.exit). Ver lib/eventosFormat.test.ts para referencia.
//
// Ejecutable:
//   npx tsx lib/sanitize.test.ts
//   npm run test:sanitize
// ----------------------------------------------------------------------------
import { escapeHtml } from './sanitize';

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

// --- Las 5 entidades HTML cubiertas -----------------------------------------

assertEq('escapeHtml & → &amp;', escapeHtml('&'), '&amp;');
assertEq('escapeHtml < → &lt;', escapeHtml('<'), '&lt;');
assertEq('escapeHtml > → &gt;', escapeHtml('>'), '&gt;');
assertEq('escapeHtml " → &quot;', escapeHtml('"'), '&quot;');
assertEq("escapeHtml ' → &#39;", escapeHtml("'"), '&#39;');

// --- Cases combinados -------------------------------------------------------

assertEq(
    'escapeHtml XSS payload básico',
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
);

assertEq(
    'escapeHtml atributo onerror',
    escapeHtml('<img src="x" onerror="alert(\'x\')">'),
    '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;x&#39;)&quot;&gt;',
);

assertEq(
    'escapeHtml encodes entity-looking input sin decode',
    escapeHtml('&amp; &lt; &gt;'),
    '&amp;amp; &amp;lt; &amp;gt;',
);

// --- No-op / edge cases -----------------------------------------------------

assertEq('escapeHtml string sin entities se devuelve igual', escapeHtml('hola mundo'), 'hola mundo');
assertEq('escapeHtml empty string', escapeHtml(''), '');
assertEq(
    'escapeHtml soporta UTF-8 (acentos, ñ, emojis)',
    escapeHtml('año niño 🐾'),
    'año niño 🐾',
);

// --- Idempotencia parcial: amp primero, luego los otros --------------------
// El orden importa (& debe escaparse ANTES para no doble-escapar los &amp;).
// Verificamos que el output ya escapado no vuelve a escaparse si se le pasa
// crudo (confirma que se escapa literalmente, no decodifica entities).
assertEq(
    'escapeHtml re-entrada: output pre-escapado se escapa otra vez',
    escapeHtml(escapeHtml('<b>')),
    '&amp;lt;b&amp;gt;',
);

// --- Resumen -----------------------------------------------------------------

console.log(`\n${passed} passed · ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
