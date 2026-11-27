// lib/g1-cron-onboarding-nudge.test.ts
// ---------------------------------------------------------------------------
// Sprint PROVEEDOR-NUDGE-PROV-ID-FIX (2026-11-27) — cobertura del filtro
// "proveedor ya publica → skip" en el bloque 3 del cron. Verifica el fix
// `proveedor_auth_id` → `proveedor_id` + filtro `activo=true` + fail-closed
// ante error de la query count.
//
// Casos:
//   T1 — proveedor con 1 servicio activo → NO envía.
//   T2 — proveedor con solo servicios inactivos → SÍ envía.
//   T3 — proveedor sin servicios → SÍ envía.
//   T4 — error en query count → NO envía (fail closed).
//
// Mismo patrón de mocks que lib/g1-cron-auth.test.ts.
// Ejecutable con: npx tsx lib/g1-cron-onboarding-nudge.test.ts
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';
import type { NextApiRequest, NextApiResponse } from 'next';

// ────────────────────────── Sentry mock ──────────────────────────
const sentryMock: any = {
    captureMessage: () => {},
    captureException: () => {},
    flush: async () => true,
    wrapApiHandlerWithSentry: (handler: any) => handler,
};
require.cache[require.resolve('@sentry/nextjs')] = { exports: sentryMock } as any;

// ────────────────────────── Supabase mock programable ──────────────────────────
// Estado por test.
type CountReturn = { count: number | null; error: null | { message: string; code?: string } };
let providerFixture: any = null;             // fila proveedor que devuelve el bloque 3 SELECT
let countReturnByProvider: Map<string, CountReturn> = new Map();
let authUserEmailByAuthId: Map<string, string | null> = new Map();
let sentEmails: Array<{ to: string; subject: string }> = [];
let bloque1BlockedCreated: string = '2000-01-01T00:00:00Z'; // older than cutoff → no block 1 candidates
let bloque2NoPhoto: any[] = [];

function resetFixtures() {
    providerFixture = null;
    countReturnByProvider = new Map();
    authUserEmailByAuthId = new Map();
    sentEmails = [];
    bloque1BlockedCreated = '2000-01-01T00:00:00Z';
    bloque2NoPhoto = [];
}

// Factory que replica el chain de supabase-js. Chain methods devuelven `this`
// hasta que el consumer hace `await` o llama al terminal (por ejemplo `.limit`
// resuelve, o `.select(..., {count:'exact', head:true}).eq().eq()` hay que
// resolverlo via thenable).
function makeSupabaseAdmin() {
    return {
        from(table: string) {
            return makeBuilder(table);
        },
        auth: {
            admin: {
                async getUserById(authId: string) {
                    const email = authUserEmailByAuthId.get(authId) ?? null;
                    return email ? { data: { user: { email } }, error: null } : { data: { user: null }, error: null };
                },
            },
        },
        rpc: async () => ({ data: null, error: null }),
    };
}

function makeBuilder(table: string): any {
    const state: any = {
        table,
        filters: [] as Array<{ op: string; col: string; val: any }>,
        isCount: false,
        selectCols: null as string | null,
    };
    const builder: any = {
        select(cols: string, opts?: { count?: string; head?: boolean }) {
            state.selectCols = cols;
            state.isCount = !!(opts && opts.count);
            return builder;
        },
        eq(col: string, val: any) {
            state.filters.push({ op: 'eq', col, val });
            return builder;
        },
        is(col: string, val: any) {
            state.filters.push({ op: 'is', col, val });
            return builder;
        },
        not(col: string, _op: any, val: any) {
            state.filters.push({ op: 'not.is', col, val });
            return builder;
        },
        lt(col: string, val: any) {
            state.filters.push({ op: 'lt', col, val });
            return builder;
        },
        gt(col: string, val: any) {
            state.filters.push({ op: 'gt', col, val });
            return builder;
        },
        or(_expr: string) { return builder; },
        order(_col: string, _o: any) { return builder; },
        limit(_n: number) { return resolveQuery(state); },
        update(_vals: any) {
            return {
                eq: (_c: string, _v: any) => Promise.resolve({ data: null, error: null }),
            };
        },
        // thenable: resolver al await directo (count queries chaining `.eq('activo', true)` sin `.limit`)
        then(resolve: any, reject: any) {
            return Promise.resolve(resolveQuery(state)).then(resolve, reject);
        },
    };
    return builder;
}

function resolveQuery(state: any): any {
    // Count query sobre servicios_publicados → devolvemos count programable por proveedor_id filter.
    if (state.table === 'servicios_publicados' && state.isCount) {
        const provIdFilter = state.filters.find((f: any) => f.op === 'eq' && f.col === 'proveedor_id');
        const activoFilter = state.filters.find((f: any) => f.op === 'eq' && f.col === 'activo');
        // Asegurar que el fix pide activo=true (si faltara, retorna count alto como "regresión").
        if (!activoFilter || activoFilter.val !== true) {
            return { count: 999, error: null };
        }
        if (!provIdFilter) {
            return { count: null, error: { message: 'proveedor_id missing', code: 'TEST' } };
        }
        const programmed = countReturnByProvider.get(provIdFilter.val as string);
        return programmed ?? { count: 0, error: null };
    }
    // SELECT bloque 1 (providersNoService) → cutoff48h/cutoff7d; en estos tests
    // devolvemos vacío para aislar al bloque 3.
    if (state.table === 'proveedores' && state.filters.some((f: any) => f.op === 'is' && f.col === 'email_onboarding_at')) {
        return { data: [], error: null };
    }
    // SELECT bloque 2 (providersNoPhoto)
    if (state.table === 'proveedores' && state.filters.some((f: any) => f.op === 'is' && f.col === 'foto_perfil')) {
        return { data: bloque2NoPhoto, error: null };
    }
    // SELECT bloque 3 (providersNudge) → devuelve el fixture.
    if (state.table === 'proveedores') {
        return { data: providerFixture ? [providerFixture] : [], error: null };
    }
    return { data: null, error: null };
}

const supabaseJsMock = { createClient: () => makeSupabaseAdmin() };
require.cache[require.resolve('@supabase/supabase-js')] = { exports: supabaseJsMock } as any;

// Resend mock — cuenta envíos.
require.cache[require.resolve('../lib/resend')] = {
    exports: {
        resend: {
            emails: {
                async send(args: { to: string; subject: string }) {
                    sentEmails.push({ to: args.to, subject: args.subject });
                    return { data: { id: 'mock' }, error: null };
                },
            },
        },
    },
} as any;

// Otros stubs.
require.cache[require.resolve('../lib/supabaseClient')] = { exports: { supabase: {} } } as any;
require.cache[require.resolve('../lib/cronGuard')] = {
    exports: { skipIfNonProd: () => false, verifyCronSecret: () => true },
} as any;
require.cache[require.resolve('../lib/logSupabaseError')] = {
    exports: { logSupabaseError: () => {} },
} as any;
require.cache[require.resolve('../lib/sanitize')] = {
    exports: { escapeHtml: (s: string) => s },
} as any;
require.cache[require.resolve('../components/Emails/NudgePerfilEmail')] = {
    exports: { __esModule: true, default: () => null, NudgePerfilEmail: () => null },
} as any;
require.cache[require.resolve('../lib/unsubscribeToken')] = {
    exports: { signUnsubscribeToken: () => 'mocktoken' },
} as any;

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_APP_ENV = 'production';

function fakeReq(): NextApiRequest {
    return {
        method: 'GET',
        headers: { authorization: 'Bearer test-cron-secret' },
        query: {}, body: {}, url: '/api/cron/recordatorio-onboarding',
    } as unknown as NextApiRequest;
}
function fakeRes() {
    let statusCode = 0;
    let jsonBody: any = null;
    const res = {
        status(c: number) { statusCode = c; return this; },
        json(b: any) { jsonBody = b; return this; },
        end() { return this; },
        setHeader() { return this; },
    } as unknown as NextApiResponse;
    return { res, getStatus: () => statusCode, getJson: () => jsonBody };
}

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void>) {
    resetFixtures();
    try { await fn(); console.log(`  OK ${name}`); passed++; }
    catch (err: any) { console.error(`  FAIL ${name}\n    ${err?.message ?? err}`); failed++; }
}

function fixtureNudgeCandidato(prov_id: string, authId: string) {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    providerFixture = {
        id: prov_id,
        auth_user_id: authId,
        nombre: 'Test',
        nudge_count: 0,
        nudge_perfil_enviado_at: null,
        created_at: eightDaysAgo,
    };
    authUserEmailByAuthId.set(authId, 'nuevo@example.com');
}

async function main() {
    console.log('\nSprint PROVEEDOR-NUDGE-PROV-ID-FIX · tests count filter bloque 3\n');

    // Importar el handler DESPUÉS de los mocks.
    const mod = require('../pages/api/cron/recordatorio-onboarding');
    const handler = mod.default;

    await test('T1 proveedor con 1 servicio activo → NO envía', async () => {
        fixtureNudgeCandidato('prov-1', 'auth-1');
        countReturnByProvider.set('prov-1', { count: 1, error: null });
        const { res } = fakeRes();
        await handler(fakeReq(), res);
        assert.equal(sentEmails.length, 0, `Esperaba 0 envíos, obtuve ${sentEmails.length}`);
    });

    await test('T2 proveedor con solo servicios inactivos → SÍ envía (el mock cuenta activos solamente)', async () => {
        fixtureNudgeCandidato('prov-2', 'auth-2');
        // Cuando el fix pide `.eq('activo', true)` y el proveedor solo tiene
        // inactivos, el mock responde count=0 (no hay filas activas).
        countReturnByProvider.set('prov-2', { count: 0, error: null });
        const { res } = fakeRes();
        await handler(fakeReq(), res);
        assert.equal(sentEmails.length, 1, `Esperaba 1 envío, obtuve ${sentEmails.length}`);
        assert.equal(sentEmails[0].to, 'nuevo@example.com');
    });

    await test('T3 proveedor sin servicios → SÍ envía', async () => {
        fixtureNudgeCandidato('prov-3', 'auth-3');
        countReturnByProvider.set('prov-3', { count: 0, error: null });
        const { res } = fakeRes();
        await handler(fakeReq(), res);
        assert.equal(sentEmails.length, 1, `Esperaba 1 envío, obtuve ${sentEmails.length}`);
    });

    await test('T4 error en query count → NO envía (fail closed)', async () => {
        fixtureNudgeCandidato('prov-4', 'auth-4');
        countReturnByProvider.set('prov-4', { count: null, error: { message: 'simulated', code: '42501' } });
        const { res } = fakeRes();
        await handler(fakeReq(), res);
        assert.equal(sentEmails.length, 0, `Esperaba 0 envíos, obtuve ${sentEmails.length}`);
    });

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
