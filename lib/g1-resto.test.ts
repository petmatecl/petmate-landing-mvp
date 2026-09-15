// lib/g1-resto.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-1e resto (2026-09-15) — verifica wrap+route tag para los 8
// endpoints restantes:
//   contactos/     (1): track
//   referidos/     (1): generar-codigo
//   servicios/[id] (2): disponibilidad-noches, slots
//   waitlist/      (1): subscribe
//   root pages/api (3): log-consent, noop, visitor-hash
//
// Ejecutable con: npx tsx lib/g1-resto.test.ts
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
        contactoTrackSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
        waitlistSubscribeSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
        logConsentSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
    },
} as any;

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
    console.log('\nBloque G · G-1e resto (contactos+referidos+servicios+waitlist+root) wrap+route tag tests\n');

    // 8 endpoints. Todos fuerzan limiter throw — es el path más común y no
    // depende de si el endpoint crea o no supabase a nivel módulo.
    // Endpoints que llaman a un limiter en el path early — forzamos throw ahí.
    for (const { path, route, method } of [
        { path: '../pages/api/contactos/track', route: '/api/contactos/track', method: 'POST' },
        { path: '../pages/api/referidos/generar-codigo', route: '/api/referidos/generar-codigo', method: 'POST' },
        { path: '../pages/api/servicios/[id]/disponibilidad-noches', route: '/api/servicios/[id]/disponibilidad-noches', method: 'GET' },
        { path: '../pages/api/servicios/[id]/slots', route: '/api/servicios/[id]/slots', method: 'GET' },
        { path: '../pages/api/waitlist/subscribe', route: '/api/waitlist/subscribe', method: 'POST' },
        { path: '../pages/api/log-consent', route: '/api/log-consent', method: 'POST' },
    ]) {
        await test(`${route} wrap injects route tag`, async () => {
            limiterThrows = true;
            const mod = require(path);
            const { res } = fakeRes();
            await assert.rejects(
                () => mod.default(fakeReq({ method, query: { id: 's1' } }), res),
                /mocked limiter throw/
            );
            assertRouteTagCaptured(route);
        });
    }

    // noop.ts y visitor-hash.ts NO usan rate limiter ni supabase (endpoints
    // triviales stateless). No hay path plausible para forzar throw sin
    // mockear módulos nativos (crypto/net) o modificar el handler. La
    // verificación estructural (require no falla + default es callable +
    // wrapApiHandlerWithSentry fue llamado con el routePattern esperado)
    // es suficiente evidencia de que el wrap aterrizó. Trackeamos con un
    // flag adicional en el mock.
    const wrappedRoutes = new Set<string>();
    const originalWrap = sentryMock.wrapApiHandlerWithSentry;
    sentryMock.wrapApiHandlerWithSentry = (handler: any, routePattern: string) => {
        wrappedRoutes.add(routePattern);
        return originalWrap(handler, routePattern);
    };

    for (const { path, route } of [
        { path: '../pages/api/noop', route: '/api/noop' },
        { path: '../pages/api/visitor-hash', route: '/api/visitor-hash' },
    ]) {
        await test(`${route} module wraps handler with expected route pattern (structural)`, async () => {
            const mod = require(path);
            assert.equal(typeof mod.default, 'function', `mod.default no es función`);
            assert.ok(
                wrappedRoutes.has(route),
                `Se esperaba wrapApiHandlerWithSentry(..., '${route}'). Trackeados: ${JSON.stringify(Array.from(wrappedRoutes))}`
            );
        });
    }

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
