// lib/apiAuth.test.ts
// ---------------------------------------------------------------------------
// L1-2 (2026-09-09) — tests unitarios del helper `verifyInternalSecret`
// tras el refactor a 3 estados tipados (missing-config / missing-header
// /invalid / ok).
//
// Ejecutable con:
//   npx tsx lib/apiAuth.test.ts
//
// Cero deps de framework — `node:assert` + `process.env` mutado por test.
// Restaura env original después de cada test para no contaminar otros
// tests que corran en el mismo proceso.
// ---------------------------------------------------------------------------
import { strict as assert } from 'node:assert';
import type { NextApiRequest } from 'next';

// Mock mínimo de Sentry — el helper llama Sentry.captureMessage cuando
// missing-config. Sin Sentry inicializado el import falla; mockeamos
// require cache antes del import del módulo.
const captureCalls: any[] = [];
const sentryMock = {
    captureMessage: (msg: string, opts?: any) => {
        captureCalls.push({ msg, opts });
    },
};
require.cache[require.resolve('@sentry/nextjs')] = {
    exports: sentryMock,
} as any;

// Import DESPUÉS del mock — el helper resolverá al mock.
// eslint-disable-next-line
const { verifyInternalSecret } = require('./apiAuth');

function fakeReq(header: string | undefined): NextApiRequest {
    return {
        headers: header !== undefined ? { 'x-internal-secret': header } : {},
        url: '/api/test',
    } as unknown as NextApiRequest;
}

const originalEnv = process.env.INTERNAL_API_SECRET;

function withEnv(value: string | undefined, fn: () => void) {
    if (value === undefined) delete process.env.INTERNAL_API_SECRET;
    else process.env.INTERNAL_API_SECRET = value;
    try {
        fn();
    } finally {
        if (originalEnv === undefined) delete process.env.INTERNAL_API_SECRET;
        else process.env.INTERNAL_API_SECRET = originalEnv;
    }
}

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${err}`);
        failed++;
    }
}

console.log('verifyInternalSecret');

test('sin env INTERNAL_API_SECRET → missing-config 500 + Sentry captureMessage', () => {
    captureCalls.length = 0;
    withEnv(undefined, () => {
        const result = verifyInternalSecret(fakeReq('cualquier-valor'));
        assert.deepEqual(result, {
            ok: false,
            status: 500,
            reason: 'missing-config',
        });
        assert.equal(captureCalls.length, 1, 'Sentry.captureMessage debe haberse llamado 1 vez');
        assert.equal(captureCalls[0].msg, 'internal_secret_env_missing');
        assert.equal(captureCalls[0].opts.level, 'error');
        assert.equal(captureCalls[0].opts.tags.subsystem, 'apiAuth');
    });
});

test('env seteada + sin header → missing-header 403 (sin Sentry)', () => {
    captureCalls.length = 0;
    withEnv('secreto-canonico', () => {
        const result = verifyInternalSecret(fakeReq(undefined));
        assert.deepEqual(result, {
            ok: false,
            status: 403,
            reason: 'missing-header',
        });
        assert.equal(captureCalls.length, 0, 'missing-header NO debe capturar Sentry (es auth failure normal, no ambient roto)');
    });
});

test('env seteada + header incorrecto → invalid 403 (sin Sentry)', () => {
    captureCalls.length = 0;
    withEnv('secreto-canonico', () => {
        const result = verifyInternalSecret(fakeReq('valor-random'));
        assert.deepEqual(result, {
            ok: false,
            status: 403,
            reason: 'invalid',
        });
        assert.equal(captureCalls.length, 0, 'invalid NO debe capturar Sentry (potencial abuso, log normal es suficiente)');
    });
});

test('env seteada + header correcto → ok true', () => {
    captureCalls.length = 0;
    withEnv('secreto-canonico', () => {
        const result = verifyInternalSecret(fakeReq('secreto-canonico'));
        assert.deepEqual(result, { ok: true });
        assert.equal(captureCalls.length, 0);
    });
});

test('env vacía (string "") también es missing-config', () => {
    captureCalls.length = 0;
    withEnv('', () => {
        const result = verifyInternalSecret(fakeReq('cualquier'));
        assert.equal(result.ok, false);
        assert.equal((result as any).status, 500);
        assert.equal((result as any).reason, 'missing-config');
    });
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
