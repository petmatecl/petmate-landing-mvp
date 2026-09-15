// lib/tipo-cd-handlers.test.ts
// ---------------------------------------------------------------------------
// Bloque C higiene · PR C-2 (tests unitarios) — verificación de
// comportamiento fail-close de los 7 handlers/SSR corregidos en el sprint
// tipo-cd v2 (BACKLOG L744-758, ACTA_SPRINT_TIPO_CD.md Grupo B).
//
// Cada test mockea el cliente Supabase para devolver
// `{data: null, error: {code, message, details, hint}}` en la query crítica
// y afirma que el handler cae en el path fail-close:
//   - Crons: throw en query principal → catch outer → res.status(500).
//   - APIs: return res.status(500) directo.
//   - SSR: catch outer → props con flag errorLoading o globalRatingUnavailable.
// Además afirma "no ejecuta ninguna escritura ni envío posterior" —
// contadores de writes/emails en el mock deben quedar en 0.
//
// Ejecutable con:
//   npx tsx lib/tipo-cd-handlers.test.ts
//
// Mock strategy: `require.cache` de `@sentry/nextjs`, `@supabase/supabase-js`,
// y `../lib/resend`. Patrón heredado de `lib/apiAuth.test.ts` (L1-2 CASE-6).
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';
import type { NextApiRequest, NextApiResponse } from 'next';

// ═══════════════════════════════════════════════════════════════════════
// Mocks globales — DEBEN ir antes de cualquier import de handler.
// ═══════════════════════════════════════════════════════════════════════

// Contadores auditables por cada test (reseteados en resetMocks).
const writeCalls: Array<{ table: string; op: string }> = [];
const emailCalls: Array<{ subject: string }> = [];

const sentryMock = {
    captureMessage: (_msg: string, _opts?: any) => {},
    captureException: (_err: unknown, _opts?: any) => {},
    // Sprint bloque-g G-1 (2026-09-15) — handlers wrappeados con
    // wrapApiHandlerWithSentry al importar el módulo. El mock devuelve
    // el handler tal cual (pass-through) para preservar la semántica
    // del test tipo-cd (fail-close via res.status(500) sin escalar a
    // throw). Sin este mock, `require(handler)` throwea con
    // "wrapApiHandlerWithSentry is not defined".
    wrapApiHandlerWithSentry: (handler: any, _routePattern: string) => handler,
    flush: async () => true,
};

/**
 * Fabrica un mock del builder query de Supabase. Cada método devuelve `this`
 * salvo los terminales (`maybeSingle`, `single`) que devuelven la promesa
 * con el error inyectado. Los terminales que serían writes (`insert`,
 * `update`, `delete`) INCREMENTAN `writeCalls` — si algún handler los
 * ejecuta post-error, el test falla.
 */
function makeQueryBuilder(errorFor: string, injected: any, table: string) {
    const self: any = {
        select() { return self; },
        eq() { return self; },
        neq() { return self; },
        gt() { return self; },
        gte() { return self; },
        lt() { return self; },
        lte() { return self; },
        is() { return self; },
        or() { return self; },
        in() { return self; },
        filter() { return self; },
        limit() { return self; },
        order() { return self; },
        maybeSingle: async () => (errorFor === 'select' ? { data: null, error: injected } : { data: null, error: null }),
        single: async () => (errorFor === 'select' ? { data: null, error: injected } : { data: null, error: null }),
        // Terminales no-await de PostgREST: retornan promesa directamente si se `await`.
        then(resolve: any) { return Promise.resolve({ data: null, error: errorFor === 'select' ? injected : null }).then(resolve); },
    };
    // Wrapper INSERT/UPDATE/DELETE — counts + retornan self chainable.
    const wrapWrite = (op: string) => (..._args: any[]) => {
        writeCalls.push({ table, op });
        return self;
    };
    self.insert = wrapWrite('insert');
    self.update = wrapWrite('update');
    self.delete = wrapWrite('delete');
    return self;
}

/**
 * Cliente Supabase mock. `errorFor` = 'select' → cualquier .from().select().*
 * devuelve error. 'auth' → auth.admin.getUserById devuelve error. 'rpc' →
 * supabase.rpc devuelve error.
 */
function makeSupabaseMock(errorFor: 'select' | 'auth' | 'rpc' | 'none', injected: any) {
    return {
        from(table: string) {
            return makeQueryBuilder(errorFor, injected, table);
        },
        rpc: async () => (errorFor === 'rpc' ? { data: null, error: injected } : { data: null, error: null }),
        auth: {
            admin: {
                getUserById: async () => (errorFor === 'auth' ? { data: null, error: injected } : { data: { user: { email: 'x@x.cl' } }, error: null }),
            },
            getSession: async () => ({ data: { session: null }, error: null }),
        },
    };
}

const resendMock = {
    emails: {
        send: async (opts: any) => {
            emailCalls.push({ subject: opts?.subject ?? '' });
            return { data: { id: 'mock' }, error: null };
        },
    },
};

let currentSupabaseMock: any = makeSupabaseMock('none', null);
const supabaseJsMock = {
    createClient: (_url: string, _key: string) => currentSupabaseMock,
};

// Cache overrides — DEBEN correrse antes de cualquier require del handler.
require.cache[require.resolve('@sentry/nextjs')] = { exports: sentryMock } as any;
require.cache[require.resolve('@supabase/supabase-js')] = { exports: supabaseJsMock } as any;
// Mock del cliente del proyecto (para SSR + auto-moderar que usan `import { supabase }`).
const supabaseClientMock: any = { supabase: makeSupabaseMock('none', null) };
require.cache[require.resolve('../lib/supabaseClient')] = { exports: supabaseClientMock } as any;
// Resend mock — cero llamadas reales al servicio de email.
require.cache[require.resolve('../lib/resend')] = { exports: { resend: resendMock } } as any;

// Env vars mínimas — algunos handlers cargan config al import.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
process.env.CRON_SECRET = 'test-secret';
process.env.NEXT_PUBLIC_APP_ENV = 'production'; // bypass gate de cronGuard para tests

// ═══════════════════════════════════════════════════════════════════════
// Helpers de test
// ═══════════════════════════════════════════════════════════════════════

function resetMocks() {
    writeCalls.length = 0;
    emailCalls.length = 0;
}

function setSupabaseError(errorFor: 'select' | 'auth' | 'rpc' | 'none', injected: any) {
    const mock = makeSupabaseMock(errorFor, injected);
    currentSupabaseMock = mock; // createClient retorna este
    supabaseClientMock.supabase = mock; // import { supabase } también
}

function fakeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
    return {
        method: 'POST',
        headers: {},
        query: {},
        body: {},
        url: '/api/test',
        ...overrides,
    } as unknown as NextApiRequest;
}

function fakeRes(): { res: NextApiResponse; status: () => number | undefined; body: () => any } {
    let statusCode: number | undefined;
    let jsonBody: any;
    const res = {
        status(code: number) { statusCode = code; return this; },
        json(body: any) { jsonBody = body; return this; },
        end() { return this; },
        setHeader() { return this; },
    } as unknown as NextApiResponse;
    return { res, status: () => statusCode, body: () => jsonBody };
}

const injectedError = {
    code: 'PGRST_TEST',
    message: 'simulated database error',
    details: 'test injection',
    hint: null,
};

// Bypass verifySession (patrón heredado de apiAuth.test) para los handlers
// que la requieren. Reemplaza el módulo por un mock que siempre autentica.
require.cache[require.resolve('../lib/apiAuth')] = {
    exports: {
        verifySession: async () => 'test-user-id',
        isAdmin: async () => true,
        verifyInternalSecret: () => ({ status: 'ok' }),
        maskEmail: (e: string) => e,
        maskUid: (u: string) => u,
    },
} as any;
// Bypass rate limiters — siempre devuelven true (permite pasar).
require.cache[require.resolve('../lib/rateLimit')] = {
    exports: {
        apiLimiter: async () => true,
        emailLimiter: async () => true,
        authLimiter: async () => true,
    },
} as any;
// Bypass cronGuard — deja pasar en tests.
require.cache[require.resolve('../lib/cronGuard')] = {
    exports: { skipIfNonProd: (_req: any, _res: any) => false },
} as any;
// Bypass validaciones — schema.safeParse siempre success con body identity.
require.cache[require.resolve('../lib/validations')] = {
    exports: {
        newMessageSchema: { safeParse: (b: any) => ({ success: true, data: { messageId: 'mock-msg-id' } }) },
        agendamientoNotifySchema: { safeParse: (b: any) => ({ success: true, data: b }) },
        autoModerarSchema: { safeParse: (b: any) => ({ success: true, data: { evaluacionId: 'mock-eval-id' } }) },
    },
} as any;

// ═══════════════════════════════════════════════════════════════════════
// Runner
// ═══════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
    resetMocks();
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err: any) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

async function main() {
    console.log('\n[tipo-cd-handlers] tests de comportamiento fail-close\n');

    // ─── generar-codigo (API) — 500 en existing_lookup error ───
    await test('generar-codigo: existing_lookup error → res.status(500) + cero writes posteriores', async () => {
        setSupabaseError('select', injectedError);
        const handler = require('../pages/api/referidos/generar-codigo').default;
        const req = fakeReq({ method: 'POST', headers: { authorization: 'Bearer x' } });
        const { res, status, body } = fakeRes();
        await handler(req, res);
        assert.equal(status(), 500, `esperaba 500, recibí ${status()}`);
        assert.match(body()?.error ?? '', /existing_lookup_failed/, `body.error debe indicar existing_lookup_failed`);
        // Cero INSERT posterior (el flujo normal generaría un código nuevo).
        assert.equal(writeCalls.length, 0, `esperaba 0 writes, hubo ${writeCalls.length}: ${JSON.stringify(writeCalls)}`);
    });

    // ─── new-message (API) — 500 en auth_lookup error ───
    await test('new-message: auth_lookup error → res.status(500) + cero email enviado', async () => {
        setSupabaseError('auth', injectedError);
        // El handler primero llama supabase.from('messages').maybeSingle() —
        // necesito que ESO retorne data válida para pasar a la auth query.
        // Ajusto el mock para que .from() retorne data mock exitosa pero
        // .auth.admin.getUserById devuelva error.
        const msgMock = {
            id: 'mock-msg-id',
            sender_id: 'test-user-id',
            conversation_id: 'mock-conv-id',
            content: 'hola',
            conversations: { id: 'mock-conv-id', client_id: 'test-user-id', sitter_id: 'other-user' },
        };
        // Override específico: .from('messages') retorna msgMock con maybeSingle.
        const authErrorMock: any = {
            from: (table: string) => ({
                select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'messages' ? msgMock : null, error: null }) }) }),
            }),
            auth: { admin: { getUserById: async () => ({ data: null, error: injectedError }) } },
        };
        currentSupabaseMock = authErrorMock;
        const handler = require('../pages/api/notifications/new-message').default;
        const req = fakeReq({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { messageId: 'mock-msg-id' } });
        const { res, status, body } = fakeRes();
        await handler(req, res);
        assert.equal(status(), 500, `esperaba 500, recibí ${status()}`);
        assert.match(body()?.error ?? '', /auth_lookup_failed/, `body.error debe indicar auth_lookup_failed`);
        assert.equal(emailCalls.length, 0, `esperaba 0 emails, hubo ${emailCalls.length}`);
    });

    // ─── auto-moderar (API) — throw en servicio_lookup → catch outer 500 ───
    await test('auto-moderar: servicio_lookup error → catch outer 500 + cero UPDATE de evaluación', async () => {
        // El handler primero fetch evaluaciones (necesita data válida) →
        // luego fetch servicio (queremos que ESE falle).
        const evalMock = {
            id: 'mock-eval-id',
            usuario_id: 'test-user-id',
            servicio_id: 'svc-id',
            proveedor_id: 'prov-id',
            rating: 5,
            comentario: 'excelente servicio realmente muy bueno mucho tiempo',
            estado: 'pendiente',
        };
        let callIdx = 0;
        currentSupabaseMock = {
            from: (table: string) => ({
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => {
                            callIdx++;
                            if (callIdx === 1) return { data: evalMock, error: null }; // fetch eval OK
                            if (callIdx === 2) return { data: null, error: injectedError }; // fetch servicio FALLA
                            return { data: null, error: null };
                        },
                    }),
                }),
                update: () => { writeCalls.push({ table, op: 'update' }); return { eq: () => Promise.resolve({ data: null, error: null }) }; },
            }),
        };
        supabaseClientMock.supabase = currentSupabaseMock;
        const handler = require('../pages/api/evaluaciones/auto-moderar').default;
        const req = fakeReq({ method: 'POST', headers: { authorization: 'Bearer x' }, body: { evaluacionId: 'mock-eval-id' } });
        const { res, status } = fakeRes();
        await handler(req, res);
        assert.equal(status(), 500, `esperaba 500 (catch outer), recibí ${status()}`);
        assert.equal(writeCalls.length, 0, `esperaba 0 writes (no auto-approve), hubo ${writeCalls.length}`);
    });

    // ─── recordatorio-onboarding (cron) — throw en providers_no_service ───
    await test('recordatorio-onboarding: providers_no_service error → 500 + cero email enviado', async () => {
        setSupabaseError('select', injectedError);
        const handler = require('../pages/api/cron/recordatorio-onboarding').default;
        const req = fakeReq({ method: 'GET', headers: { authorization: 'Bearer test-secret' } });
        const { res, status } = fakeRes();
        await handler(req, res);
        assert.equal(status(), 500, `esperaba 500, recibí ${status()}`);
        assert.equal(emailCalls.length, 0, `esperaba 0 emails, hubo ${emailCalls.length}`);
    });

    // ─── invitacion-resenas (cron) — dup_check error → continue por-ítem ───
    // El fail-close es continue → el batch sigue. Este test es difícil de
    // aislar sin scaffolding grande. Skip con comentario — cubierto por
    // spec structural [tipo-cd-v2] en e2e/specs/tipo-cd/estado-actual.spec.ts.
    console.log('  ⊘ invitacion-resenas: dup_check continue — cubierto por spec structural [tipo-cd-v2] (setup batch complejo, skip aquí)');

    // ─── SSR [categoria]/[comuna] — getStaticProps error → errorLoading true ───
    await test('SSR [categoria]/[comuna]: catData error → props.errorLoading=true', async () => {
        setSupabaseError('select', injectedError);
        const { getStaticProps } = require('../pages/[categoria]/[comuna]');
        const result = await getStaticProps({ params: { categoria: 'paseos', comuna: 'providencia' } });
        assert.equal(result?.props?.errorLoading, true, `esperaba errorLoading=true, recibí ${JSON.stringify(result?.props)}`);
        assert.equal(result?.props?.services?.length ?? -1, 0, `esperaba services=[]`);
    });

    // ─── SSR servicio/[id] — SKIP (require tsx choca con JSX del page) ───
    // El archivo pages/servicio/[id].tsx exporta también un componente React
    // con JSX + hooks client-side (useEffect, useTrackVisit). El runtime `tsx`
    // no puede parsear la mezcla al require desde este archivo test — devuelve
    // SyntaxError "Unexpected token '.'". Refactor a helper puro exportable
    // (`resolveServicePageProps({ params, supabase }) → Props`) permitiría
    // testear aislado; deuda anotada. Coverage actual: spec structural
    // [tipo-cd-v2] en e2e/specs/tipo-cd/estado-actual.spec.ts verifica la
    // presencia del flag + cómputo desde globalErr en el source.
    console.log('  ⊘ SSR servicio/[id]: skip test unitario — refactor a helper puro pendiente (deuda). Coverage via spec structural.');

    // ─── Sumario ───
    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => {
    console.error('\n[tipo-cd-handlers] error fatal:', err);
    process.exit(2);
});
