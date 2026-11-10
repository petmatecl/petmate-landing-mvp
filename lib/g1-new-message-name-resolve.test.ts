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
type ProvRow = { nombre_publico: string | null; nombre: string | null; apellido_p: string | null } | null;
type BusRow = { nombre: string | null } | null;

interface State {
    prov: ProvRow;
    provError: any;
    bus: BusRow;
    busError: any;
    authEmail: string;
    sentArgs: Array<{ from: string; to: string | string[]; subject: string; html: string }>;
}

const state: State = { prov: null, provError: null, bus: null, busError: null, authEmail: 'recipient@example.com', sentArgs: [] };

function resetState() {
    state.prov = null;
    state.provError = null;
    state.bus = null;
    state.busError = null;
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
                            eq: () => ({ maybeSingle: async () => ({ data: state.prov, error: state.provError }) }),
                        }),
                    };
                }
                if (table === 'usuarios_buscadores') {
                    return {
                        select: () => ({
                            eq: () => ({ maybeSingle: async () => ({ data: state.bus, error: state.busError }) }),
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
    await runOne('[P8] proveedor con nombre_publico → subject lo usa literal (se respeta tal cual)', async () => {
        state.prov = { nombre_publico: 'Constanza B.', nombre: 'Constanza', apellido_p: 'Beltrán' };
        const res = makeRes();
        await handler(makeReq(), res);
        assert.equal(res.statusCode, 200, 'status debe ser 200');
        assert.equal(state.sentArgs.length, 1, 'debe enviar exactamente 1 email');
        const subject: string = state.sentArgs[0].subject;
        assert.ok(!/^Un usuario/.test(subject), `NO debe ser fallback. Subject: ${subject}`);
        assert.ok(subject.includes('Constanza B.'), `subject debe contener literal 'Constanza B.' — recibido: ${subject}`);
        // nombre_publico NO debe disparar el formateo con apellido_p. Se usa tal cual.
        assert.ok(!subject.includes('Beltrán'), `nombre_publico se usa literal, NO debe sumar apellido_p. Subject: ${subject}`);
    });

    await runOne('[P8] proveedor sin nombre_publico, con nombre="Eduardo" + apellido_p="Cano" → subject "Eduardo C."', async () => {
        state.prov = { nombre_publico: null, nombre: 'Eduardo', apellido_p: 'Cano' };
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(subject.includes('Eduardo C.'), `subject debe contener 'Eduardo C.' — recibido: ${subject}`);
        // Regresión 2026-11-10 noche: NO debe incluir apellido completo.
        assert.ok(!subject.includes('Cano '), `NO debe incluir apellido completo 'Cano' seguido de espacio. Subject: ${subject}`);
        assert.ok(!/^Un usuario/.test(subject), `NO debe ser fallback. Subject: ${subject}`);
    });

    await runOne('[P8 REGRESIÓN SMOKE PO 2026-11-10] usuarios_buscadores.nombre="Camila Figueroa Mendoza" → subject "Camila F." (NO nombre completo)', async () => {
        // Regresión del smoke del PO en commit 63d2cd8: el subject aterrizó
        // literal "Camila Figueroa Mendoza" porque usuarios_buscadores.nombre
        // concatena nombres+apellidos (schema prod verificado: 5 users con 3+
        // tokens en nombre, 1 con 2 tokens, 1 con 1 token). Fix:
        // formatearNombreInicial toma token[0] como nombre pila y token[1][0]
        // como inicial del primer apellido.
        state.bus = { nombre: 'Camila Figueroa Mendoza' };
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(subject.includes('Camila F.'), `subject debe contener 'Camila F.' — recibido: ${subject}`);
        assert.ok(!subject.includes('Figueroa'), `NO debe incluir apellido completo 'Figueroa'. Subject: ${subject}`);
        assert.ok(!subject.includes('Mendoza'), `NO debe incluir segundo apellido 'Mendoza'. Subject: ${subject}`);
    });

    await runOne('[P8] usuarios_buscadores.nombre="Jorge" (1 token) → subject "Jorge" sin inicial', async () => {
        state.bus = { nombre: 'Jorge' };
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(subject.includes('Jorge'), `subject debe contener 'Jorge' — recibido: ${subject}`);
        assert.ok(!subject.includes('Jorge .'), `nombre sin apellido no debe tener "Nombre ." colgado. Subject: ${subject}`);
    });

    await runOne('[P8] error simulado en query proveedores → cae a usuarios_buscadores, NO silencia (console.error para Sentry)', async () => {
        // El error de la primera query no debe hacer que caigamos a fallback
        // directo. El handler debe seguir intentando con usuarios_buscadores
        // y emitir console.error para que el wrap Sentry lo capture.
        state.provError = { message: 'simulated prov query error', code: '42501' };
        state.bus = { nombre: 'Camila Figueroa Mendoza' };
        const originalErr = console.error;
        const capturedErrors: any[] = [];
        console.error = (...args: any[]) => { capturedErrors.push(args); };
        try {
            const res = makeRes();
            await handler(makeReq(), res);
            const subject: string = state.sentArgs[0].subject;
            assert.ok(subject.includes('Camila F.'), `debe caer al segundo nivel y producir 'Camila F.' — subject recibido: ${subject}`);
            const found = capturedErrors.some(args => args.some((a: any) => typeof a === 'string' && a.includes('[new-message:resolveSenderName] proveedores query error')));
            assert.ok(found, 'console.error debe loggear el error de la query de proveedores para que llegue a Sentry');
        } finally {
            console.error = originalErr;
        }
    });

    await runOne('[P8 control negativo] sin perfil en ninguna tabla → fallback "Un usuario" sigue válido', async () => {
        // Ambas tablas devuelven null → fallback literal es correcto.
        const res = makeRes();
        await handler(makeReq(), res);
        const subject: string = state.sentArgs[0].subject;
        assert.ok(/^Un usuario/.test(subject), `fallback esperado. Subject: ${subject}`);
    });

    await runOne('[P8 REGRESIÓN SMOKE PO 2026-11-10 — doble punto] body NO debe contener ".." cuando el nombre termina en punto', async () => {
        // Regresión del smoke del commit 0d1a4c8: el body decía "Tienes un
        // nuevo mensaje de Camila F.." (doble punto) porque la plantilla
        // agregaba un "." fijo después del nombre. Fix: sufijo condicional
        // `senderNameDot = senderName.endsWith('.') ? '' : '.'`. Este test
        // bloquea la regresión para los 2 casos: nombre con inicial formateada
        // (Camila F.) y nombre_publico ya con punto (Constanza B.).
        for (const [label, state_setup, expectedFragment] of [
            ['usuarios_buscadores con nombre completo (produce "Camila F.")',
                () => { state.bus = { nombre: 'Camila Figueroa Mendoza' }; },
                'Camila F.'],
            ['proveedor con nombre_publico literal "Constanza B."',
                () => { state.prov = { nombre_publico: 'Constanza B.', nombre: 'Constanza', apellido_p: 'Beltrán' }; },
                'Constanza B.'],
            ['proveedor sin nombre_publico (produce "Eduardo C.")',
                () => { state.prov = { nombre_publico: null, nombre: 'Eduardo', apellido_p: 'Cano' }; },
                'Eduardo C.'],
        ] as Array<[string, () => void, string]>) {
            resetState();
            state_setup();
            const res = makeRes();
            await handler(makeReq(), res);
            const html: string = state.sentArgs[0].html;
            assert.ok(html.includes(expectedFragment), `body debe contener '${expectedFragment}' — caso: ${label}`);
            // La regresión clave: cero "..", punto seguido de punto.
            assert.ok(!/\.\./.test(html), `body NO debe contener ".." (doble punto) — caso: ${label}. Fragmento HTML: ${html.substring(html.indexOf(expectedFragment) - 30, html.indexOf(expectedFragment) + 60)}`);
        }
    });

    await runOne('[P8] nombre sin punto (ej. "Jorge") → body sí debe tener su punto propio final', async () => {
        // Caso complementario: un nombre que NO termina en punto (1 token) SÍ
        // debe recibir el punto de la plantilla. Sin este test, un fix mal
        // hecho que siempre omita el punto dejaría el body sin puntuación.
        resetState();
        state.bus = { nombre: 'Jorge' };
        const res = makeRes();
        await handler(makeReq(), res);
        const html: string = state.sentArgs[0].html;
        assert.ok(html.includes('Jorge'), `body debe contener 'Jorge'. HTML fragmento: ${html.substring(0, 200)}`);
        // El párrafo cierra con "Jorge</strong>." + cierre </p>.
        assert.ok(html.includes('Jorge</strong>.'), `body debe cerrar con "Jorge</strong>." cuando el nombre no tiene punto propio. HTML: ${html.substring(html.indexOf('Jorge') - 10, html.indexOf('Jorge') + 50)}`);
    });

    if (process.exitCode === 1) {
        console.error('\nFAIL: al menos un test falló.');
    } else {
        console.log('\nOK: todos los tests pasaron.');
    }
}

main().catch(e => { console.error('CRASH:', e); process.exit(2); });
