// lib/g1-cron-auth.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-1c cron/+auth/ (2026-09-15) — verifica wrap+route tag para:
//   cron/ (5 endpoints, recordatorio-reserva ya wrappeado piloto Tanda 5):
//     - cleanup-visitas-tracking
//     - invitacion-resenas
//     - recordatorio-mensajes
//     - recordatorio-onboarding
//     - reset-visitas-mes
//   auth/ (3 endpoints):
//     - complete-registration
//     - signup
//     - welcome
//
// Total: 8 tests. Mismo patrón de mocks que G-1a/G-1b.
// Ejecutable con: npx tsx lib/g1-cron-auth.test.ts
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

// Forzar throw en createClient — el 100% de los endpoints cron/auth lo llaman.
let supabaseCreateThrows = true;
const supabaseJsMock = {
    createClient: (_url: string, _key: string) => {
        if (supabaseCreateThrows) throw new Error('mocked createClient throw');
        return {
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            auth: {
                admin: {
                    getUserById: async () => ({ data: { user: { email: 'x@x.cl' } }, error: null }),
                    createUser: async () => ({ data: { user: { id: 'u1', email: 'x@x.cl' } }, error: null }),
                    deleteUser: async () => ({ data: null, error: null }),
                },
                getSession: async () => ({ data: { session: null }, error: null }),
            },
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
process.env.CRON_SECRET = 'test-cron-secret';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.NEXT_PUBLIC_APP_ENV = 'production';

// Bypass helpers — endpoints cron pasan por skipIfNonProd + cronGuard, y auth
// por rateLimit / apiAuth. Todos bypasseados a permitir siempre.
require.cache[require.resolve('../lib/cronGuard')] = {
    exports: {
        skipIfNonProd: (_req: any, _res: any) => false,
        verifyCronSecret: (_req: any) => true,
    },
} as any;
require.cache[require.resolve('../lib/apiAuth')] = {
    exports: {
        verifySession: async () => 'test-user-id',
        isAdmin: async () => true,
        verifyInternalSecret: () => ({ ok: true, status: 200 }),
        maskEmail: (e: string) => e,
        maskUid: (u: string) => u,
    },
} as any;
let limiterThrows = false;
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
require.cache[require.resolve('../lib/sentryServer')] = {
    exports: { flushSentryEvents: async () => true },
} as any;
require.cache[require.resolve('../lib/validations')] = {
    exports: {
        signupSchema: { safeParse: (b: any) => ({ success: true, data: b || {} }) },
    },
} as any;
require.cache[require.resolve('../lib/formatFecha')] = {
    exports: {
        formatFechaPreferida: () => 'fecha',
        formatRangoNoches: () => 'rango',
        formatBloqueHorario: () => 'horario',
    },
} as any;
require.cache[require.resolve('../lib/emails/resolvers')] = {
    exports: {
        resolverDonde: () => 'donde',
        resolverFechaSub: () => 'fechasub',
    },
} as any;

// Templates de email — stub.
for (const template of [
    '../components/Emails/WelcomeEmail',
    '../components/Emails/InvitacionResenaEmail',
    '../components/Emails/RecordatorioReservaEmail',
    '../components/Emails/RecordatorioOnboardingEmail',
    '../components/Emails/NewMessageEmail',
]) {
    try {
        require.cache[require.resolve(template)] = { exports: { default: () => null } } as any;
    } catch { /* opcional */ }
}

function resetCaptured() {
    capturedEvents.length = 0;
    currentRoute = null;
    supabaseCreateThrows = true;
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
    console.log('\nBloque G · G-1c cron/+auth/ wrap+route tag tests\n');

    // Crons.
    for (const { path, route } of [
        { path: '../pages/api/cron/cleanup-visitas-tracking', route: '/api/cron/cleanup-visitas-tracking' },
        { path: '../pages/api/cron/invitacion-resenas', route: '/api/cron/invitacion-resenas' },
        { path: '../pages/api/cron/recordatorio-mensajes', route: '/api/cron/recordatorio-mensajes' },
        { path: '../pages/api/cron/recordatorio-onboarding', route: '/api/cron/recordatorio-onboarding' },
        { path: '../pages/api/cron/reset-visitas-mes', route: '/api/cron/reset-visitas-mes' },
    ]) {
        await test(`${route} wrap injects route tag`, async () => {
            supabaseCreateThrows = true;
            const mod = require(path);
            const { res } = fakeRes();
            await assert.rejects(
                () => mod.default(fakeReq({ method: 'GET', headers: { authorization: 'Bearer test-cron-secret' } }), res),
                /mocked createClient throw/
            );
            assertRouteTagCaptured(route);
        });
    }

    // Auth. Los 3 endpoints tienen validaciones tempranas (405/limiter/
    // safeParse local/verifyInternalSecret) que retornan antes de llegar a
    // createClient. Forzamos throw en el authLimiter/emailLimiter que se
    // llama al inicio del handler (después del check de método), así el
    // throw escapa fuera del try/catch y el wrapper lo captura.
    for (const { path, route } of [
        { path: '../pages/api/auth/complete-registration', route: '/api/auth/complete-registration' },
        { path: '../pages/api/auth/signup', route: '/api/auth/signup' },
        { path: '../pages/api/auth/welcome', route: '/api/auth/welcome' },
    ]) {
        await test(`${route} wrap injects route tag`, async () => {
            limiterThrows = true;
            const mod = require(path);
            const { res } = fakeRes();
            await assert.rejects(
                () => mod.default(fakeReq({ method: 'POST', body: { email: 'x@x.cl' } }), res),
                /mocked limiter throw/
            );
            assertRouteTagCaptured(route);
        });
    }

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
