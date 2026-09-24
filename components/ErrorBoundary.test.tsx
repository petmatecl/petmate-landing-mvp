// components/ErrorBoundary.test.tsx
// ---------------------------------------------------------------------------
// Sprint sentry-boundary (2026-09-25) — test unitario del ErrorBoundary post
// fix `componentDidCatch → Sentry.captureException`.
//
// Diseño (mismo patrón que lib/g1-admin.test.ts): mocks vía `require.cache`
// antes del `require('./ErrorBoundary')`; runner `npx tsx` puro sin jest ni
// vitest ni JSDOM. `assert` de `node:assert` para las verificaciones.
//
// Regla vigente respetada: cero código productivo de prueba en producción,
// cero páginas gated por entorno que devuelvan 404 en prod. La verificación
// del contrato del boundary (llamada a Sentry con los args esperados) se
// hace acá, en test unitario que corre en CI bajo `typecheck-and-build`.
// La verificación end-to-end se hace en producción tras merge — el PO
// repite el flujo real `chat → back → /usuario` que ya revienta, y el event
// del boundary aparece en Sentry con su `user.id` y `subsystem=error-boundary`.
// Escenario real > escenario sintético desplegado.
//
// Assertions:
//   1. `getDerivedStateFromError(err)` devuelve `{ hasError: true, error: err }`
//      (contrato React que el boundary respeta).
//   2. `componentDidCatch(err, errorInfo)` invoca `Sentry.captureException`
//      exactamente 1 vez con:
//        - el mismo `err` como primer argumento;
//        - `opts.contexts.react.componentStack` = el string del errorInfo;
//        - `opts.tags.subsystem` = `'error-boundary'`.
//   3. `componentDidCatch(err, { componentStack: null })` cae al fallback
//      `'(no componentStack)'`, no rompe.
//   4. `render()` con `hasError=true` produce JSX cuya serialización contiene
//      el copy `'Algo salió mal'` (verifica que el fallback UI está intacto).
//   5. `render()` con `hasError=false` devuelve `this.props.children` textual.
//
// Ejecutable:
//   npx tsx components/ErrorBoundary.test.tsx
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';

// ═══════════════════════════════════════════════════════════════════════
// Mocks — DEBEN ir antes del require del componente bajo test.
// ═══════════════════════════════════════════════════════════════════════

interface CapturedException {
    err: unknown;
    opts: { contexts?: { react?: { componentStack?: string } }; tags?: { subsystem?: string } };
}
const capturedExceptions: CapturedException[] = [];

const sentryMock = {
    captureException: (err: unknown, opts: any = {}) => {
        capturedExceptions.push({ err, opts });
    },
};

// El componente hace `import * as Sentry from "@sentry/nextjs"`. `tsx` compila
// a `require('@sentry/nextjs')` sin cambiar la semántica de namespace import
// (los props del module.exports son las exports). El mock cumple el contrato
// que usamos (solo captureException). Cero necesidad de otros exports.
require.cache[require.resolve('@sentry/nextjs')] = { exports: sentryMock } as any;

// `next/link` es dependencia del boundary para el CTA "Volver al inicio".
// No lo llamamos en los tests (no ejercitamos onClick / navegación), pero el
// require del módulo dispara al top-level. Stub como function que devuelve
// null: satisface el contrato de function-component de React (evita el
// warning "React.createElement: type is invalid") sin ejecutar el router.
function LinkStub(_props: any) { return null; }
require.cache[require.resolve('next/link')] = {
    exports: { default: LinkStub, __esModule: true },
} as any;

// ═══════════════════════════════════════════════════════════════════════
// Import del componente bajo test (después de los mocks).
// ═══════════════════════════════════════════════════════════════════════

const ErrorBoundaryModule = require('./ErrorBoundary');
const ErrorBoundary = ErrorBoundaryModule.default;

// ═══════════════════════════════════════════════════════════════════════
// Runner minimalista (mismo patrón que g1-*.test.ts).
// ═══════════════════════════════════════════════════════════════════════

function reset() {
    capturedExceptions.length = 0;
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        reset();
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (e) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${(e as Error).message}`);
        failed++;
    }
}

console.log('\n=== ErrorBoundary — Sentry integration (sprint sentry-boundary) ===\n');

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

test('getDerivedStateFromError(err) returns { hasError: true, error: err }', () => {
    const err = new Error('smoke:derived');
    const state = ErrorBoundary.getDerivedStateFromError(err);
    assert.equal(state.hasError, true, 'state.hasError debería ser true');
    assert.equal(state.error, err, 'state.error debería ser el mismo error pasado');
});

test('componentDidCatch invoca Sentry.captureException(err, { contexts.react.componentStack, tags.subsystem })', () => {
    const boundary = new ErrorBoundary({ children: null });
    const err = new Error('smoke:captureException');
    const errorInfo = { componentStack: '\n    at BuggyChild (fake.tsx:12)\n    at ErrorBoundary' };

    boundary.componentDidCatch(err, errorInfo);

    assert.equal(capturedExceptions.length, 1, 'captureException debería haberse llamado exactamente 1 vez');
    const captured = capturedExceptions[0];
    assert.equal(captured.err, err, 'el primer argumento debería ser el mismo error');
    assert.equal(
        captured.opts.contexts?.react?.componentStack,
        errorInfo.componentStack,
        'contexts.react.componentStack debería propagar el stack del errorInfo',
    );
    assert.equal(
        captured.opts.tags?.subsystem,
        'error-boundary',
        'tags.subsystem debería ser "error-boundary"',
    );
});

test('componentDidCatch con componentStack null cae al fallback "(no componentStack)"', () => {
    const boundary = new ErrorBoundary({ children: null });
    const err = new Error('smoke:no-stack');
    boundary.componentDidCatch(err, { componentStack: null });

    assert.equal(capturedExceptions.length, 1);
    assert.equal(
        capturedExceptions[0].opts.contexts?.react?.componentStack,
        '(no componentStack)',
        'debería usar el string fallback cuando errorInfo.componentStack es null',
    );
});

test('render() con hasError=true produce JSX con el copy "Algo salió mal"', () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.state = { hasError: true, error: new Error('smoke:render') };
    const jsx = boundary.render();
    const serialized = JSON.stringify(jsx);
    assert.match(serialized, /Algo salió mal/, 'el JSX del fallback debería incluir el heading "Algo salió mal"');
    assert.match(serialized, /Recargar página/, 'el fallback debería incluir el CTA "Recargar página"');
});

test('render() con hasError=false devuelve this.props.children', () => {
    const children = { type: 'div', props: { children: 'hijo real' } };
    const boundary = new ErrorBoundary({ children });
    boundary.state = { hasError: false, error: null };
    const rendered = boundary.render();
    assert.equal(rendered, children, 'debería pasar los children sin envoltura cuando no hay error');
});

// ═══════════════════════════════════════════════════════════════════════
// Exit
// ═══════════════════════════════════════════════════════════════════════

console.log(`\n=== ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
    process.exit(1);
}
process.exit(0);
