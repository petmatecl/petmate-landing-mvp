// lib/g1-new-message-name-resolve.test.ts
// ---------------------------------------------------------------------------
// Sprint hf-name-resolve (2026-11-10, decisión PO) — test P8 estilo g1-* del
// fix "Un usuario" en el correo de aviso de chat.
//
// Objetivo: cuando el sender tiene nombre en BD (proveedores o
// usuarios_buscadores), el subject NO debe caer al fallback literal
// 'Un usuario'. Ese fallback solo debería activarse cuando ambas tablas
// devuelven null, no por limitaciones de permisos del cliente.
//
// Patrón: mismo que lib/g1-cron-auth.test.ts — require.cache stubs +
// node:assert + ejecutable con `npx tsx`. Cero vitest.
//
// Correr: npx tsx lib/g1-new-message-name-resolve.test.ts
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';

// Estado mutable de cada test — lo resetea `resetState()`.
type MsgRow = { id: string; content: string; sender_id: string; conversation_id: string; conversations: { id: string; client_id: string; sitter_id: string | null } };
type ProvRow = { nombre_publico: string | null; nombre: string | null } | null;
type BusRow = { nombre: string | null } | null;

interface State {
    prov: ProvRow;
    bus: BusRow;
    authEmail: string;
    sentArgs: Array<{ from: string; to: string | string[]; subject: string; html: string }>;
}

const state: State = { prov: null, bus: null, authEmail: 'recipient@example.com', sentArgs: [] };

function resetState() {
    state.prov = null;
    state.bus = null;
    state.authEmail = 'recipient@example.com';
    state.sentArgs.length = 0;
}

// Env obligatoria del endpoint.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test';
process.env.EMAIL_NOTIFICATIONS_FROM = 'Pawnecta <notificaciones@test>';

const MSG: MsgRow = {
    id: 'msg-1',
    content: 'Hola, consulta por el servicio',
    sender_id: 'sender-auth-id',
    conversation_id: 'conv-1',
    conversations: { id: 'conv-1', client_id: 'sender-auth-id', sitter_id: 'recipient-auth-id' },
};

// Stub supabase-js — devuelve mocks que miran al estado del test.
require.cache[require.resolve('@supabase/supabase-js')] = {
    exports: {
        createClient: () => ({
            from: (table: string) => {
                if (table === 'messages') {
                    return {
                        select: () => ({
                            eq: () => ({ maybeSingle: async () => ({ data: MSG, error: null }) }),
                        }),
                    };
                }
                if (table === 'proveedores') {
                    return {
                        select: () => ({
                            eq: () => ({ maybeSingle: async () => ({ data: state.prov, error: null }) }),
                        }),
                    };
                }
                if (table === 'usuarios_buscadores') {
                    return {
                        select: () => ({
                            eq: () => ({ maybeSingle: async () => ({ data: state.bus, error: null }) }),
                        }),
                    };
                }
                return {
                    select: () => ({
                        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
                    }),
                };
            },
            auth: {
                admin: {
                    getUserById: async () => ({ data: { user: { email: state.authEmail } }, error: null }),
                },
            },
        }),
    },
} as any;

// Stubs de las deps del endpoint — mínimos.
require.cache[require.resolve('../lib/resend')] = {
    exports: {
        resend: {
            emails: {
                send: async (args: any) => { state.sentArgs.push(args); return { id: 'resend-mock' }; },
            },
        },
    },
} as any;
require.cache[require.resolve('../lib/rateLimit')] = {
    exports: { emailLimiter: async () => true, apiLimiter: async () => true, authLimiter: async () => true },
} as any;
require.cache[require.resolve('../lib/apiAuth')] = {
    exports: { verifySession: async () => 'sender-auth-id' },
} as any;
require.cache[require.resolve('../lib/validations')] = {
    exports: {
        newMessageSchema: { safeParse: () => ({ success: true, data: { messageId: 'msg-1' } }) },
    },
} as any;
require.cache[require.resolve('../lib/sanitize')] = {
    exports: { escapeHtml: (s: string) => s },
} as any;
require.cache[require.resolve('../lib/logSupabaseError')] = {
    exports: { logSupabaseError: () => {} },
} as any;
require.cache[require.resolve('@sentry/nextjs')] = {
    exports: { wrapApiHandlerWithSentry: (handler: any) => handler },
} as any;

// Import del endpoint recién después de los stubs.
const handler = require('../pages/api/notifications/new-message').default;

function makeReq(): any { return { method: 'POST', headers: {}, body: { messageId: 'msg-1' } }; }
function makeRes(): any {
    const res: any = {
        statusCode: 200,
        jsonBody: null as any,
        status(c: number) { this.statusCode = c; return this; },
        json(b: any) { this.jsonBody = b; return this; },
        end() { return this; },
    };
    return res;
}

async function runOne(label: string, fn: () => Promise<void>) {
    try {
        resetState();
        await fn();
        console.log(`✓ ${label}`);
    } catch (e: any) {
        console.error(`✘ ${label}`);
        console.error(`  ${e?.message || e}`);
        process.exitCode = 1;
    }
}

async function main() {
    await runOne('[P8] proveedor con nombre_publico → subject lo usa, NO "Un usuario"', async () => {
        state.prov = { nombre_publico: 'Constanza B.', nombre: 'Constanza' };
        const res = makeRes();
        await handler(makeReq(), res);
        assert.equal(res.statusCode, 200, 'status debe ser 200');
        assert.equal(state.sentArgs.length, 1, 'debe enviar exactamente 1 email');
        const subject: string = state.sentArgs[0].subject;
        assert.ok(
            !/^Un usuario/.test(subject),
            `Fallback "Un usuario" en subject cuando el remitente SÍ tiene nombre en BD — bug pre-hf-name-resolve. Subject: ${subject}`
        );
        assert.ok(subject.includes('Constanza B.'), `subject debe contener 'Constanza B.' — recibido: ${subject}`);
    });

    await runOne('[P8] proveedor sin nombre_publico (solo nombre de pila) → subject usa "Eduardo", NO incluye apellido', async () => {
        // Simula lo que devolvería la query real: nombre_publico null.
        // La select ya NO pide apellido_p (decisión PO 2026-11-10 — solo
        // nombre de pila, nunca apellido ni correo ni teléfono en el subject).
        state.prov = { nombre_publico: null, nombre: 'Eduardo' };
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(subject.includes('Eduardo'), `subject debe contener 'Eduardo' — recibido: ${subject}`);
        assert.ok(!subject.includes('Cano'), `NO debe incluir apellido. Subject: ${subject}`);
        assert.ok(!/^Un usuario/.test(subject), `NO debe ser fallback. Subject: ${subject}`);
    });

    await runOne('[P8] sin proveedor pero con usuarios_buscadores.nombre → subject usa ese nombre (caso Camila)', async () => {
        state.bus = { nombre: 'Camila' };
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(subject.includes('Camila'), `subject debe contener 'Camila' — recibido: ${subject}`);
        assert.ok(!/^Un usuario/.test(subject), `NO debe ser fallback. Subject: ${subject}`);
    });

    await runOne('[P8 control negativo] sin perfil en ninguna tabla → fallback "Un usuario" sigue válido', async () => {
        // Ambas tablas devuelven null → fallback literal es correcto.
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(/^Un usuario/.test(subject), `fallback esperado. Subject: ${subject}`);
    });

    if (process.exitCode === 1) {
        console.error('\nFAIL: al menos un test falló.');
    } else {
        console.log('\nOK: todos los tests pasaron.');
    }
}

main().catch(e => { console.error('CRASH:', e); process.exit(2); });
