// lib/g1-agendamientos.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-1b agendamientos/ (2026-09-15) — verifica que los 5 endpoints
// `pages/api/agendamientos/*.ts` están envueltos con
// `wrapApiHandlerWithSentry(handler, '/api/agendamientos/<name>')` y que el
// tag `route` se propaga al event capturado en un throw no manejado.
//
// Mismo patrón que lib/g1-admin.test.ts. Ejecutable con:
//   npx tsx lib/g1-agendamientos.test.ts
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

let verifySessionThrows = true;
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
        verifySession: async () => {
            if (verifySessionThrows) throw new Error('mocked verifySession throw');
            return 'test-user-id';
        },
        isAdmin: async () => true,
        verifyInternalSecret: () => ({ ok: true, status: 200 }),
        maskEmail: (e: string) => e,
        maskUid: (u: string) => u,
    },
} as any;

require.cache[require.resolve('../lib/rateLimit')] = {
    exports: {
        apiLimiter: async () => true,
        emailLimiter: async () => true,
        authLimiter: async () => true,
    },
} as any;

require.cache[require.resolve('../lib/validations')] = {
    exports: {
        agendamientoNotifySchema: { safeParse: (b: any) => ({ success: true, data: { agendamientoId: 'a1', ...(b || {}) } }) },
    },
} as any;

// Mock helpers y templates de email — evitan carga de react-email + resolvers.
require.cache[require.resolve('../lib/formatFecha')] = {
    exports: {
        formatFechaPreferida: () => 'fecha-mock',
        formatRangoNoches: () => 'rango-mock',
        formatBloqueHorario: () => 'horario-mock',
    },
} as any;
require.cache[require.resolve('../lib/formatDireccion')] = {
    exports: { formatDireccionLinea: () => 'dir-mock' },
} as any;
require.cache[require.resolve('../lib/categoriaTemporal')] = {
    exports: {
        MODALIDAD_LABELS: { casa_cuidador: 'Casa cuidador' },
        esModalidadValida: () => true,
    },
} as any;
require.cache[require.resolve('../lib/emails/resolvers')] = {
    exports: {
        resolverDonde: () => 'donde-mock',
        resolverFechaSub: () => 'fechasub-mock',
    },
} as any;

// Templates de email — stub.
for (const template of [
    '../components/Emails/AgendamientoTutorEmail',
    '../components/Emails/AgendamientoProveedorEmail',
    '../components/Emails/ReservaConfirmadaTutorEmail',
    '../components/Emails/AgendamientoCancelacionTutorEmail',
]) {
    try {
        require.cache[require.resolve(template)] = { exports: { default: () => null } } as any;
    } catch { /* template no existe en cache aún, mock cuando require lo cargue */ }
}

function resetCaptured() {
    capturedEvents.length = 0;
    currentRoute = null;
    verifySessionThrows = true;
    supabaseCreateThrows = false;
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
    console.log('\nBloque G · G-1b agendamientos/ wrap+route tag tests\n');

    await test('cancelar wrap injects route tag', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/agendamientos/cancelar');
        const { res } = fakeRes();
        await assert.rejects(() => mod.default(fakeReq({ body: { agendamientoId: 'a1' } }), res), /mocked verifySession throw/);
        assertRouteTagCaptured('/api/agendamientos/cancelar');
    });

    await test('notify-proveedor wrap injects route tag', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/agendamientos/notify-proveedor');
        const { res } = fakeRes();
        await assert.rejects(() => mod.default(fakeReq({ body: { agendamientoId: 'a1' } }), res), /mocked verifySession throw/);
        assertRouteTagCaptured('/api/agendamientos/notify-proveedor');
    });

    await test('notify-proveedor-cancel wrap injects route tag', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/agendamientos/notify-proveedor-cancel');
        const { res } = fakeRes();
        await assert.rejects(() => mod.default(fakeReq({ body: { agendamientoId: 'a1' } }), res), /mocked verifySession throw/);
        assertRouteTagCaptured('/api/agendamientos/notify-proveedor-cancel');
    });

    await test('notify-tutor wrap injects route tag', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/agendamientos/notify-tutor');
        const { res } = fakeRes();
        await assert.rejects(() => mod.default(fakeReq({ body: { agendamientoId: 'a1' } }), res), /mocked verifySession throw/);
        assertRouteTagCaptured('/api/agendamientos/notify-tutor');
    });

    await test('notify-tutor-reserva-confirmada wrap injects route tag', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/agendamientos/notify-tutor-reserva-confirmada');
        const { res } = fakeRes();
        await assert.rejects(() => mod.default(fakeReq({ body: { agendamientoId: 'a1' } }), res), /mocked verifySession throw/);
        assertRouteTagCaptured('/api/agendamientos/notify-tutor-reserva-confirmada');
    });

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
