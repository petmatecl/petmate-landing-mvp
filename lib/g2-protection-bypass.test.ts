// lib/g2-protection-bypass.test.ts
// ---------------------------------------------------------------------------
// Bloque G · G-2 (2026-09-15) — SELF-CALLS-PREVIEW opción B.
//
// Verifica que buildProtectionBypassHeaders() de lib/withProtectionBypass.ts
// devuelve el header x-vercel-protection-bypass en preview + secret seteado,
// y NO lo devuelve en production ni cuando la env var falta.
//
// Además: verifica que pages/api/auth/signup.ts efectivamente importa y usa
// el helper — hoy en los 4 self-fetch (welcome + 3× notify-nueva-solicitud).
//
// Ejecutable con: npx tsx lib/g2-protection-bypass.test.ts
// ---------------------------------------------------------------------------
/* eslint-disable */
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void> | void) {
    try { await fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (err: any) { console.error(`  ✗ ${name}\n    ${err.message ?? err}`); failed++; }
}

async function main() {
    console.log('\nBloque G · G-2 protection bypass header tests\n');

    // ═══ Helper unit tests — reset del require.cache no aplica al helper puro ═══

    await test('preview + secret seteado → retorna x-vercel-protection-bypass', async () => {
        process.env.VERCEL_ENV = 'preview';
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'test-bypass-token';
        // Fresh require para evitar cache
        delete require.cache[require.resolve('../lib/withProtectionBypass')];
        const { buildProtectionBypassHeaders } = require('../lib/withProtectionBypass');
        const headers = buildProtectionBypassHeaders();
        assert.deepEqual(
            headers,
            { 'x-vercel-protection-bypass': 'test-bypass-token' },
            `esperaba { 'x-vercel-protection-bypass': 'test-bypass-token' }, recibí ${JSON.stringify(headers)}`
        );
    });

    await test('production + secret seteado → objeto vacío (no header)', async () => {
        process.env.VERCEL_ENV = 'production';
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'test-bypass-token';
        delete require.cache[require.resolve('../lib/withProtectionBypass')];
        const { buildProtectionBypassHeaders } = require('../lib/withProtectionBypass');
        const headers = buildProtectionBypassHeaders();
        assert.deepEqual(
            headers,
            {},
            `production NO debe agregar el header. Recibí ${JSON.stringify(headers)}`
        );
    });

    await test('preview + secret AUSENTE → objeto vacío (no header)', async () => {
        process.env.VERCEL_ENV = 'preview';
        delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
        delete require.cache[require.resolve('../lib/withProtectionBypass')];
        const { buildProtectionBypassHeaders } = require('../lib/withProtectionBypass');
        const headers = buildProtectionBypassHeaders();
        assert.deepEqual(
            headers,
            {},
            `preview sin secret NO debe agregar el header. Recibí ${JSON.stringify(headers)}`
        );
    });

    await test('development (undefined VERCEL_ENV) → objeto vacío', async () => {
        delete process.env.VERCEL_ENV;
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'test-bypass-token';
        delete require.cache[require.resolve('../lib/withProtectionBypass')];
        const { buildProtectionBypassHeaders } = require('../lib/withProtectionBypass');
        const headers = buildProtectionBypassHeaders();
        assert.deepEqual(headers, {}, `development NO debe agregar el header. Recibí ${JSON.stringify(headers)}`);
    });

    // ═══ Test estructural: signup.ts importa el helper y lo usa en fetch ═══

    await test('signup.ts importa buildProtectionBypassHeaders desde lib/withProtectionBypass', () => {
        const signupSrc = readFileSync(resolve(__dirname, '../pages/api/auth/signup.ts'), 'utf-8');
        assert.match(
            signupSrc,
            /import\s*\{\s*buildProtectionBypassHeaders\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/lib\/withProtectionBypass['"]/,
            `Esperaba import de buildProtectionBypassHeaders en signup.ts`
        );
    });

    await test('signup.ts hace spread de buildProtectionBypassHeaders() en headers de fetch (2+ lugares)', () => {
        const signupSrc = readFileSync(resolve(__dirname, '../pages/api/auth/signup.ts'), 'utf-8');
        const matches = signupSrc.match(/\.\.\.\s*buildProtectionBypassHeaders\(\)/g) || [];
        assert.ok(
            matches.length >= 2,
            `Esperaba spread de buildProtectionBypassHeaders() en 2+ lugares (welcome + notifyBase). Encontrados: ${matches.length}`
        );
    });

    console.log(`\n${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
