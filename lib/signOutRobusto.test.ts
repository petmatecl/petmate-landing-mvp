// lib/signOutRobusto.test.ts
// ---------------------------------------------------------------------------
// Sprint hf-logout-403 (2026-11-17) — tests unitarios del helper.
// Verifican: (a) localStorage sb-*-auth-token queda limpio SIEMPRE,
// aun si supabase.auth.signOut tira 403 o lanza exception;
// (b) el scope se pasa correctamente al SDK;
// (c) retorno { ok, errorStatus, errorMessage } refleja outcome real.
//
// Ejecutar: npx tsx lib/signOutRobusto.test.ts
// ---------------------------------------------------------------------------
import { strict as assert } from 'node:assert';

// Mock minimalista de localStorage (sin polyfill global; el helper usa
// `window.localStorage` → polyfill via globalThis.window).
class MockLocalStorage {
    private store: Record<string, string> = {};
    get length() { return Object.keys(this.store).length; }
    key(i: number) { return Object.keys(this.store)[i] ?? null; }
    getItem(k: string) { return this.store[k] ?? null; }
    setItem(k: string, v: string) { this.store[k] = v; }
    removeItem(k: string) { delete this.store[k]; }
    clear() { this.store = {}; }
    seedPawnectaKeys() {
        this.store['sb-ouezpeeiwjwawauidrqq-auth-token'] = JSON.stringify({ access_token: 'xxx', refresh_token: 'yyy' });
        this.store['sb-ouezpeeiwjwawauidrqq-auth-token-code-verifier'] = 'zzz';
        this.store['activeRole'] = 'proveedor';  // debe sobrevivir — no matchea el pattern
        this.store['pm_auth_role_pending'] = 'proveedor';  // idem
    }
}

const mockStorage = new MockLocalStorage();
// @ts-expect-error — polyfill mínimo para el helper.
globalThis.window = { localStorage: mockStorage };

// Mock de @sentry/nextjs (noop — los tests no validan telemetría).
const mockSentryCalls: Array<{ fn: string; msg?: string; err?: unknown }> = [];
require.cache[require.resolve('@sentry/nextjs')] = {
    exports: {
        captureMessage: (msg: string) => { mockSentryCalls.push({ fn: 'captureMessage', msg }); },
        captureException: (err: unknown) => { mockSentryCalls.push({ fn: 'captureException', err }); },
    },
} as NodeJS.Module;

// Mock del cliente supabase. Cambia `nextOutcome` para cada test.
let nextOutcome: { error: { status: number; message: string } | null } | 'throw' = { error: null };
require.cache[require.resolve('./supabaseClient')] = {
    exports: {
        supabase: {
            auth: {
                signOut: async (_opts?: { scope?: string }) => {
                    if (nextOutcome === 'throw') throw new Error('Network error');
                    return nextOutcome;
                },
            },
        },
    },
} as NodeJS.Module;

// Cargar el helper DESPUÉS de los mocks.
const { signOutRobusto } = require('./signOutRobusto');

let pass = 0, fail = 0;
async function test(name: string, fn: () => Promise<void>) {
    mockStorage.clear();
    mockSentryCalls.length = 0;
    try {
        await fn();
        pass += 1;
        console.log(`  ✓ ${name}`);
    } catch (e) {
        fail += 1;
        console.error(`  ✗ ${name}`);
        console.error('    ', (e as Error).message);
    }
}

async function main() {
    console.log('\nsignOutRobusto()\n');

    await test('signOut OK — limpia storage + ok:true', async () => {
        nextOutcome = { error: null };
        mockStorage.seedPawnectaKeys();
        const r = await signOutRobusto('global');
        assert.equal(r.ok, true);
        assert.equal(mockStorage.getItem('sb-ouezpeeiwjwawauidrqq-auth-token'), null);
        assert.equal(mockStorage.getItem('sb-ouezpeeiwjwawauidrqq-auth-token-code-verifier'), null);
        // Keys NO Supabase sobreviven (el helper solo toca sb-*-auth-token)
        assert.equal(mockStorage.getItem('activeRole'), 'proveedor');
        assert.equal(mockStorage.getItem('pm_auth_role_pending'), 'proveedor');
    });

    await test('signOut 403 session_not_found — limpia storage igual + ok:false', async () => {
        nextOutcome = { error: { status: 403, message: 'Session not found' } };
        mockStorage.seedPawnectaKeys();
        const r = await signOutRobusto('global');
        assert.equal(r.ok, false);
        assert.equal(r.errorStatus, 403);
        assert.equal(r.errorMessage, 'Session not found');
        // STORAGE LIMPIO SIEMPRE, aun con 403. Guardia P8 del PO.
        assert.equal(mockStorage.getItem('sb-ouezpeeiwjwawauidrqq-auth-token'), null);
        assert.equal(mockStorage.getItem('sb-ouezpeeiwjwawauidrqq-auth-token-code-verifier'), null);
        // Sentry captureMessage con level warning registrado
        assert.equal(mockSentryCalls.length, 1);
        assert.equal(mockSentryCalls[0].fn, 'captureMessage');
    });

    await test('signOut throw (network error) — limpia storage + ok:false', async () => {
        nextOutcome = 'throw';
        mockStorage.seedPawnectaKeys();
        const r = await signOutRobusto('global');
        assert.equal(r.ok, false);
        assert.ok(r.errorMessage?.includes('Network error'));
        // STORAGE LIMPIO SIEMPRE, aun si el SDK tira.
        assert.equal(mockStorage.getItem('sb-ouezpeeiwjwawauidrqq-auth-token'), null);
        // Sentry captureException registrado
        assert.equal(mockSentryCalls.length, 1);
        assert.equal(mockSentryCalls[0].fn, 'captureException');
    });

    await test('scope "local" pasa al SDK', async () => {
        let receivedScope: string | undefined;
        const supaMock = require('./supabaseClient').supabase;
        const original = supaMock.auth.signOut;
        supaMock.auth.signOut = async (opts?: { scope?: string }) => {
            receivedScope = opts?.scope;
            return { error: null };
        };
        try {
            await signOutRobusto('local');
            assert.equal(receivedScope, 'local');
        } finally {
            supaMock.auth.signOut = original;
        }
    });

    await test('scope "global" es el default', async () => {
        let receivedScope: string | undefined;
        const supaMock = require('./supabaseClient').supabase;
        const original = supaMock.auth.signOut;
        supaMock.auth.signOut = async (opts?: { scope?: string }) => {
            receivedScope = opts?.scope;
            return { error: null };
        };
        try {
            await signOutRobusto();
            assert.equal(receivedScope, 'global');
        } finally {
            supaMock.auth.signOut = original;
        }
    });

    console.log(`\n${pass} passed · ${fail} failed`);
    if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
