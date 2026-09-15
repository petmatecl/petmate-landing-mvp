// lib/g1-admin.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-1a admin/ (2026-09-15) — verificación de que los 5 endpoints
// `pages/api/admin/*.ts` están efectivamente envueltos con
// `wrapApiHandlerWithSentry(handler, '/api/admin/<name>')`.
//
// Cada test:
//   1. Fuerza un throw no manejado dentro del handler (mock supabase-js
//      createClient throw, o mock verifySession throw).
//   2. El wrapper mockeado captura el throw + inyecta el `routePattern` como
//      tag `route` en el event.
//   3. Assertion: `capturedEvents` tiene al menos 1 entry con
//      `tags.route === '/api/admin/<name>'`.
//
// Este mismo patrón (mock del wrapper que inyecta el routePattern al tag
// `route`) se replica en G-1b/c/d/e para verificar los otros directorios.
//
// Ejecutable con:
//   npx tsx lib/g1-admin.test.ts
//
// Mock strategy: `require.cache` de `@sentry/nextjs`, `@supabase/supabase-js`,
// y helpers del proyecto. Patrón heredado de `lib/tipo-cd-handlers.test.ts`
// (sprint C-2, 2026-09-15) — mismo runner tsx, mismos contadores auditables.
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';
import type { NextApiRequest, NextApiResponse } from 'next';

// ═══════════════════════════════════════════════════════════════════════
// Mocks globales — DEBEN ir antes de cualquier import de handler.
// ═══════════════════════════════════════════════════════════════════════

interface CapturedEvent {
    err: unknown;
    tags: Record<string, string>;
}
const capturedEvents: CapturedEvent[] = [];
const capturedMessages: Array<{ msg: string; tags: Record<string, string> }> = [];

/**
 * `currentRoute` es seteado por el wrapper mock antes de invocar el handler
 * y limpiado tras. Simula que el wrapper real de Sentry propaga el
 * `routePattern` al scope activo, así todo `captureException` disparado
 * durante la ejecución del handler wrappeado gana el tag `route`
 * automáticamente.
 */
let currentRoute: string | null = null;

const sentryMock: any = {
    captureMessage: (msg: string, opts?: any) => {
        capturedMessages.push({
            msg,
            tags: { ...(opts?.tags ?? {}), ...(currentRoute ? { route: currentRoute } : {}) },
        });
    },
    captureException: (err: unknown, opts?: any) => {
        capturedEvents.push({
            err,
            tags: { ...(opts?.tags ?? {}), ...(currentRoute ? { route: currentRoute } : {}) },
        });
    },
    flush: async (_ms?: number) => true,
    wrapApiHandlerWithSentry: (handler: any, routePattern: string) => {
        return async (req: any, res: any) => {
            const prev = currentRoute;
            currentRoute = routePattern;
            try {
                return await handler(req, res);
            } catch (err) {
                // Wrapper real de Sentry v10: auto-captura throws no
                // manejados con el routePattern como tag.
                sentryMock.captureException(err);
                throw err;
            } finally {
                currentRoute = prev;
            }
        };
    },
};

// Mock del cliente Supabase — createClient THROWEA por default para forzar
// el throw no manejado que el wrapper capturará. Se puede desactivar en
// tests que necesiten path exitoso via `setSupabaseThrows(false)`.
let supabaseCreateThrows = true;
const supabaseJsMock = {
    createClient: (_url: string, _key: string) => {
        if (supabaseCreateThrows) {
            throw new Error('mocked createClient throw for wrap route test');
        }
        return {
            from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
            auth: { admin: { getUserById: async () => ({ data: { user: { email: 'x@x.cl' } }, error: null }) } },
            rpc: async () => ({ data: null, error: null }),
        };
    },
};

// require.cache overrides — antes de cualquier require de handler.
require.cache[require.resolve('@sentry/nextjs')] = { exports: sentryMock } as any;
require.cache[require.resolve('@supabase/supabase-js')] = { exports: supabaseJsMock } as any;
require.cache[require.resolve('../lib/supabaseClient')] = { exports: { supabase: {} } } as any;
require.cache[require.resolve('../lib/resend')] = {
    exports: {
        resend: {
            emails: { send: async () => ({ data: { id: 'mock' }, error: null }) },
        },
    },
} as any;

// Env mínimo — los handlers admin cargan config al import.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'x';
process.env.INTERNAL_API_SECRET = 'test-internal-secret';
process.env.NEXT_PUBLIC_APP_ENV = 'production';

// Bypass verifySession/isAdmin/verifyInternalSecret — throw para forzar
// el throw no manejado del handler que el wrapper debe capturar.
let verifySessionThrows = true;
require.cache[require.resolve('../lib/apiAuth')] = {
    exports: {
        verifySession: async () => {
            if (verifySessionThrows) throw new Error('mocked verifySession throw');
            return 'test-user-id';
        },
        isAdmin: async () => true,
        verifyInternalSecret: (_req: any) => ({ ok: true, status: 200 }),
        maskEmail: (e: string) => e,
        maskUid: (u: string) => u,
    },
} as any;

// Bypass rate limiters — siempre pasan.
require.cache[require.resolve('../lib/rateLimit')] = {
    exports: {
        apiLimiter: async () => true,
        emailLimiter: async () => true,
        authLimiter: async () => true,
        getBackendStatus: () => 'in-memory',
        pingRedis: async () => ({ ok: false, backend: 'in-memory' as const, error: 'mocked' }),
    },
} as any;

// Bypass helper de log Supabase.
require.cache[require.resolve('../lib/logSupabaseError')] = {
    exports: { logSupabaseError: () => {} },
} as any;

// Bypass sentryServer flush helper.
require.cache[require.resolve('../lib/sentryServer')] = {
    exports: { flushSentryEvents: async () => true },
} as any;

// Bypass validaciones — schema.safeParse siempre success.
require.cache[require.resolve('../lib/validations')] = {
    exports: {
        notifyProviderSchema: { safeParse: (b: any) => ({ success: true, data: { proveedorId: 'p1', estado: 'aprobado', motivo: null, ...b } }) },
    },
} as any;

// Bypass sanitize helper.
require.cache[require.resolve('../lib/sanitize')] = {
    exports: { escapeHtml: (s: string) => s },
} as any;

// Mock template de email — devuelve stub simple (evita render de react-email).
require.cache[require.resolve('../components/Emails/NuevoProveedorPendienteEmail')] = {
    exports: { NuevoProveedorPendienteEmail: (_props: any) => null },
} as any;

// ═══════════════════════════════════════════════════════════════════════
// Helpers de test
// ═══════════════════════════════════════════════════════════════════════

function resetCaptured() {
    capturedEvents.length = 0;
    capturedMessages.length = 0;
    currentRoute = null;
    supabaseCreateThrows = true;
    verifySessionThrows = true;
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

// ═══════════════════════════════════════════════════════════════════════
// Runner
// ═══════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
    resetCaptured();
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err: any) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message ?? err}`);
        failed++;
    }
}

/**
 * Assertion canónica del bloque G-1: tras invocar el handler wrappeado con
 * un path que dispara throw, `capturedEvents` debe contener al menos un
 * event con `tags.route === expectedRoute`.
 */
function assertRouteTagCaptured(expectedRoute: string) {
    const matching = capturedEvents.filter((e) => e.tags?.route === expectedRoute);
    assert.ok(
        matching.length >= 1,
        `Se esperaba al menos 1 event con tag route='${expectedRoute}'. ` +
        `Capturados: ${JSON.stringify(capturedEvents.map((e) => ({ err: String((e.err as any)?.message ?? e.err), tags: e.tags })))}`
    );
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════

async function main() {
    console.log('\nBloque G · G-1a admin/ wrap+route tag tests\n');

    await test('notify-nueva-solicitud wrap injects route tag on unhandled throw', async () => {
        // Handler no usa verifySession; usa verifyInternalSecret (mocked ok)
        // y crea supabaseAdmin via createClient — mock throw fuerza escape.
        supabaseCreateThrows = true;
        const mod = require('../pages/api/admin/notify-nueva-solicitud');
        const { res } = fakeRes();
        await assert.rejects(
            () => mod.default(fakeReq({ body: { proveedorId: 'test-id' } }), res),
            /mocked createClient throw/
        );
        assertRouteTagCaptured('/api/admin/notify-nueva-solicitud');
    });

    await test('notify-provider wrap injects route tag on unhandled throw', async () => {
        // Handler usa verifySession — mock throw fuerza escape ANTES de
        // llegar al try/catch de createClient.
        verifySessionThrows = true;
        const mod = require('../pages/api/admin/notify-provider');
        const { res } = fakeRes();
        await assert.rejects(
            () => mod.default(fakeReq({ body: { proveedorId: 'p1', estado: 'aprobado' } }), res),
            /mocked verifySession throw/
        );
        assertRouteTagCaptured('/api/admin/notify-provider');
    });

    await test('proveedores-pendientes wrap injects route tag on unhandled throw', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/admin/proveedores-pendientes');
        const { res } = fakeRes();
        await assert.rejects(
            () => mod.default(fakeReq({ method: 'GET' }), res),
            /mocked verifySession throw/
        );
        assertRouteTagCaptured('/api/admin/proveedores-pendientes');
    });

    await test('rate-limit-status wrap injects route tag on unhandled throw', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/admin/rate-limit-status');
        const { res } = fakeRes();
        await assert.rejects(
            () => mod.default(fakeReq({ method: 'GET' }), res),
            /mocked verifySession throw/
        );
        assertRouteTagCaptured('/api/admin/rate-limit-status');
    });

    await test('sentry-smoke wrap injects route tag on unhandled throw', async () => {
        verifySessionThrows = true;
        const mod = require('../pages/api/admin/sentry-smoke');
        const { res } = fakeRes();
        await assert.rejects(
            () => mod.default(fakeReq({ method: 'POST' }), res),
            /mocked verifySession throw/
        );
        assertRouteTagCaptured('/api/admin/sentry-smoke');
    });

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
