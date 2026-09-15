// lib/g1-notifs-push-evals.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-1d (2026-09-15) — verifica wrap+route tag para:
//   notifications/ (2): create, new-message
//   push/          (2): send, subscribe
//   evaluaciones/  (2): auto-moderar, notify
//
// Ejecutable con: npx tsx lib/g1-notifs-push-evals.test.ts
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';
import type { NextApiRequest, NextApiResponse } from 'next';

interface CapturedEvent { err: unknown; tags: Record<string, string> }
const capturedEvents: CapturedEvent[] = [];
let currentRoute: string | null = null;

const sentryMock: any = {
    captureMessage: () => {},
    captureException: (err: unknown, opts?: any) => {
        capturedEvents.push({
            err,
            tags: { ...(opts?.tags ?? {}), ...(currentRoute ? { route: currentRoute } : {}) },
        });
    },
    flush: async () => true,
    wrapApiHandlerWithSentry: (handler: any, routePattern: string) => {
        return async (req: any, res: any) => {
            const prev = currentRoute;
            currentRoute = routePattern;
            try {
                return await handler(req, res);
            } catch (err) {
                sentryMock.captureException(err);
                throw err;
            } finally {
                currentRoute = prev;
            }
        };
    },
};

let limiterThrows = false;
// Módulos como notifications/create.ts, push/send.ts y push/subscribe.ts
// hacen createClient a nivel módulo (top-level). Un throw en createClient
// haría fallar el require() del módulo, no el invoke del handler wrappeado
// — el wrapper nunca correría. Por default el mock retorna cliente stub;
// forzamos limiter throw en el invoke para que el error escape al wrapper.
let supabaseCreateThrows = false;

const supabaseJsMock = {
    createClient: (_url: string, _key: string) => {
        if (supabaseCreateThrows) throw new Error('mocked createClient throw');
        return {
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            auth: { admin: { getUserById: async () => ({ data: { user: { email: 'x@x.cl' } }, error: null }) } },
            rpc: async () => ({ data: null, error: null }),
        };
    },
};

require.cache[require.resolve('@sentry/nextjs')] = { exports: sentryMock } as any;
require.cache[require.resolve('@supabase/supabase-js')] = { exports: supabaseJsMock } as any;
require.cache[require.resolve('../lib/supabaseClient')] = { exports: { supabase: {} } } as any;
require.cache[require.resolve('../lib/resend')] = {
    exports: { resend: { emails: { send: async () => ({ data: { id: 'mock' }, error: null }) } } },
} as any;

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.NEXT_PUBLIC_APP_ENV = 'production';

require.cache[require.resolve('../lib/apiAuth')] = {
    exports: {
        verifySession: async () => 'test-user-id',
        isAdmin: async () => true,
        verifyInternalSecret: () => ({ ok: true, status: 200 }),
        maskEmail: (e: string) => e,
        maskUid: (u: string) => u,
    },
} as any;

require.cache[require.resolve('../lib/rateLimit')] = {
    exports: {
        apiLimiter: async () => {
            if (limiterThrows) throw new Error('mocked limiter throw');
            return true;
        },
        emailLimiter: async () => {
            if (limiterThrows) throw new Error('mocked limiter throw');
            return true;
        },
        authLimiter: async () => {
            if (limiterThrows) throw new Error('mocked limiter throw');
            return true;
        },
    },
} as any;

require.cache[require.resolve('../lib/validations')] = {
    exports: {
        newMessageSchema: { safeParse: (b: any) => ({ success: true, data: { messageId: 'm1', ...(b || {}) } }) },
        autoModerarSchema: { safeParse: (b: any) => ({ success: true, data: { evaluacionId: 'e1', ...(b || {}) } }) },
        pushSendSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
        pushSubscribeSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
    },
} as any;

require.cache[require.resolve('../lib/formatFecha')] = {
    exports: { formatFechaPreferida: () => 'fecha', formatRangoNoches: () => 'rango' },
} as any;
require.cache[require.resolve('../lib/emails/resolvers')] = {
    exports: { resolverDonde: () => 'donde', resolverFechaSub: () => 'fechasub' },
} as any;

// Templates de email — stub.
for (const template of [
    '../components/Emails/NewMessageEmail',
    '../components/Emails/NewEvaluationEmail',
]) {
    try {
        require.cache[require.resolve(template)] = { exports: { default: () => null } } as any;
    } catch { /* opcional */ }
}

function resetCaptured() {
    capturedEvents.length = 0;
    currentRoute = null;
    supabaseCreateThrows = false;
    limiterThrows = false;
}
function fakeReq(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
    return { method: 'POST', headers: {}, query: {}, body: {}, url: '/api/test', ...overrides } as unknown as NextApiRequest;
}
function fakeRes() {
    const res = { status() { return this; }, json() { return this; }, end() { return this; }, setHeader() { return this; } } as unknown as NextApiResponse;
    return { res };
}

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void>) {
    resetCaptured();
    try { await fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (err: any) { console.error(`  ✗ ${name}\n    ${err.message ?? err}`); failed++; }
}
function assertRouteTagCaptured(expectedRoute: string) {
    const matching = capturedEvents.filter((e) => e.tags?.route === expectedRoute);
    assert.ok(
        matching.length >= 1,
        `Se esperaba al menos 1 event con tag route='${expectedRoute}'. Capturados: ${JSON.stringify(capturedEvents.map((e) => ({ err: String((e.err as any)?.message ?? e.err), tags: e.tags })))}`
    );
}

async function main() {
    console.log('\nBloque G · G-1d notifications/+push/+evaluaciones/ wrap+route tag tests\n');

    // Los 6 endpoints usan patterns distintos — forzamos throw en el limiter
    // (que se llama tempranamente antes del try/catch en la mayoría).
    for (const { path, route } of [
        { path: '../pages/api/notifications/create', route: '/api/notifications/create' },
        { path: '../pages/api/notifications/new-message', route: '/api/notifications/new-message' },
        { path: '../pages/api/push/send', route: '/api/push/send' },
        { path: '../pages/api/push/subscribe', route: '/api/push/subscribe' },
        { path: '../pages/api/evaluaciones/auto-moderar', route: '/api/evaluaciones/auto-moderar' },
        { path: '../pages/api/evaluaciones/notify', route: '/api/evaluaciones/notify' },
    ]) {
        await test(`${route} wrap injects route tag`, async () => {
            limiterThrows = true;
            const mod = require(path);
            const { res } = fakeRes();
            await assert.rejects(
                () => mod.default(fakeReq({ method: 'POST' }), res),
                /mocked limiter throw/
            );
            assertRouteTagCaptured(route);
        });
    }

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
