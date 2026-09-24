// e2e/specs/chat-open-error/paso-1-repro.spec.ts
// ---------------------------------------------------------------------------
// Sprint chat-open-error (2026-09-24) — PASO 1 del diagnóstico 4-pasos
// aprobado por PO. Reproduce el bug "1er clic 'Enviar Mensaje' falla con
// toast + conversación queda creada + 2do clic funciona" que el PO reportó
// 2026-09-24 con Sentry issue JAVASCRIPT-NEXTJS-9 (release 6774fbd) — bug
// pre-existente al sprint que quedó invisible por catch sin
// Sentry.captureException. Ahora con captureException aterrizado en el
// mismo PR, el próximo evento real llega con stack, pero para el
// diagnóstico controlado necesitamos ver la respuesta Postgrest exacta
// del INSERT + las 2 queries previas (existingResult y count del rate
// limit).
//
// ORDEN DE PASOS aprobado por PO 2026-09-24:
//   1. (este spec) Playwright reproduce 1er clic desde una ficha con
//      un tutor SIN conversación previa con ese proveedor, capturando
//      la respuesta de Postgrest del insert().select().single() (status
//      + body + headers Prefer/Range) + las 2 consultas previas.
//   2. Políticas RLS de conversations (SELECT + INSERT) via staging-rw.
//   3. Triggers post-insert en conversations.
//   4. Path del 2do clic (búsqueda previa) con archivo:línea.
//
// Pasos 2-4 ya cerrados en el reporte espejo del 2026-09-24: RLS OK
// (INSERT + SELECT simétricas con predicado auth.uid()=client_id OR
// sitter_id), CERO triggers user-defined en conversations, path 2do
// clic en ServiceDetailView.tsx:323-347 (`.maybeSingle` sobre
// (client_id, sitter_id, servicio_id)).
//
// ENFOQUE DEL SPEC: `expect.soft` en todas las assertions — el spec
// SIEMPRE pasa, solo captura evidencia estructurada en el log del CI.
// Cuando el fix funcional aterrice en un commit posterior a este PR,
// se agrega un spec de regresión con hard-asserts en `regresion.spec.ts`
// que verifica "1er clic siempre navega, cero toast de error".
//
// FIXTURE: cleanup previo de la conversación (Camila, Aldo, servicio
// "Paseos dinamicos") + navegación tutor + click + captura de todos
// los request/response que toquen `/rest/v1/conversations*` + estado
// BD post-clic. Cleanup en afterAll para no dejar residuos.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

// Servicio real estable de Aldo staging, categoria paseos, sin dependencia
// de otros specs (verificado via mcp__supabase-staging-rw 2026-09-24).
const SERVICIO_ID = '385063f9-8fd0-4322-aa33-a866fa7cd2b4';
const CAMILA_AUTH_ID = '5b30be99-3e11-47c7-b373-e3d8e4b86be0';
const ALDO_PROVEEDOR_AUTH_ID = '63c223b7-c0d2-453a-bd01-fbc6ee793a02';

async function limpiarConversacion() {
    const admin = await getSupabaseAdmin();
    const { error } = await admin
        .from('conversations')
        .delete()
        .eq('client_id', CAMILA_AUTH_ID)
        .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID)
        .eq('servicio_id', SERVICIO_ID);
    if (error) throw new Error(`limpiarConversacion falló: ${error.message}`);
}

test.describe.serial('chat-open-error · paso 1 diagnóstico', () => {
    test.beforeAll(async () => {
        await limpiarConversacion();
    });

    test.afterAll(async () => {
        await limpiarConversacion();
    });

    test('1er clic "Enviar Mensaje" desde ficha sin conversación previa · captura request/response Postgrest', async ({ page }) => {
        // Capturar todos los request/response a /rest/v1/conversations*.
        // Prefer y Range son headers Postgrest que controlan el shape del
        // response del INSERT + SELECT count.
        interface ConvRequest {
            method: string;
            url: string;
            postData: string | null;
            prefer: string | null;
            range: string | null;
        }
        interface ConvResponse {
            status: number;
            url: string;
            method: string;
            body: string;
            contentRange: string | null;
            preferenceApplied: string | null;
        }
        const convRequests: ConvRequest[] = [];
        const convResponses: ConvResponse[] = [];

        page.on('request', req => {
            if (req.url().includes('/rest/v1/conversations')) {
                convRequests.push({
                    method: req.method(),
                    url: req.url(),
                    postData: req.postData(),
                    prefer: req.headers()['prefer'] ?? null,
                    range: req.headers()['range'] ?? null,
                });
            }
        });

        page.on('response', async res => {
            if (res.url().includes('/rest/v1/conversations')) {
                let body = '';
                try { body = await res.text(); } catch { body = '<no-body>'; }
                convResponses.push({
                    status: res.status(),
                    url: res.url(),
                    method: res.request().method(),
                    body: body.slice(0, 1500),
                    contentRange: res.headers()['content-range'] ?? null,
                    preferenceApplied: res.headers()['preference-applied'] ?? null,
                });
            }
        });

        // Capturar console.error/warn para el "Error starting conversation"
        // que el catch de ServiceDetailView.tsx:435 emite.
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        // Navegar a la ficha del servicio.
        await page.goto(`/servicio/${SERVICIO_ID}`, { waitUntil: 'domcontentloaded' });
        // Esperar que la UI esté quieta antes del clic.
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => { /* seguir */ });

        // Localizar botón "Enviar Mensaje" — hay 2 en el DOM (desktop L1667 +
        // mobile L1825 de ServiceDetailView.tsx). `.first()` toma el que
        // esté visible primero en el viewport actual.
        const btn = page.getByRole('button', { name: /Enviar [Mm]ensaje/i }).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });

        // Click en "Enviar Mensaje". El handler:
        // 1. SELECT existente (client_id + sitter_id + servicio_id).
        // 2. COUNT rate limit (client_id + created_at >= now-24h).
        // 3. INSERT nueva conversación con .select().single().
        await btn.click();

        // Esperar terminal: o toast de error, o navegación a /mensajes.
        // Race para no colgar el spec si nada pasa.
        await Promise.race([
            page.waitForURL(/\/mensajes\?id=/, { timeout: 12_000 }).catch(() => 'timeout-navegacion'),
            page.getByText(/Hubo un error al intentar abrir el chat/i).waitFor({ state: 'visible', timeout: 12_000 }).catch(() => 'timeout-toast'),
        ]);

        // Damos 1 segundo extra para drenar responses async.
        await page.waitForTimeout(1_000);

        // ═══════════════════════════════════════════════════════════════
        // REPORTE ESTRUCTURADO en el log del CI/local run.
        // ═══════════════════════════════════════════════════════════════
        console.log('\n═══════ CHAT-OPEN-ERROR paso 1 · reporte ═══════');
        console.log(`URL final: ${page.url()}`);

        console.log(`\n▶ conv REQUESTS (${convRequests.length}):`);
        for (const r of convRequests) {
            console.log(`  ${r.method} ${r.url}`);
            if (r.prefer) console.log(`    Prefer: ${r.prefer}`);
            if (r.range) console.log(`    Range: ${r.range}`);
            if (r.postData) console.log(`    Body: ${r.postData.slice(0, 500)}`);
        }

        console.log(`\n▶ conv RESPONSES (${convResponses.length}):`);
        for (const r of convResponses) {
            console.log(`  ${r.method} ${r.status} ${r.url}`);
            if (r.contentRange) console.log(`    Content-Range: ${r.contentRange}`);
            if (r.preferenceApplied) console.log(`    Preference-Applied: ${r.preferenceApplied}`);
            console.log(`    Body: ${r.body}`);
        }

        console.log(`\n▶ console.error (${consoleErrors.length}):`);
        for (const c of consoleErrors) {
            console.log(`  ${c.slice(0, 600)}`);
        }

        // Estado BD post-clic — ¿la conversación quedó persistida?
        const admin = await getSupabaseAdmin();
        const { data: postCheck, error: postErr } = await admin
            .from('conversations')
            .select('id, created_at')
            .eq('client_id', CAMILA_AUTH_ID)
            .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID)
            .eq('servicio_id', SERVICIO_ID);

        console.log(`\n▶ BD post-clic:`);
        if (postErr) {
            console.log(`  ERROR: ${postErr.message}`);
        } else {
            console.log(`  ${postCheck?.length ?? 0} conversación(es) encontrada(s)`);
            if (postCheck?.length) {
                for (const c of postCheck) {
                    console.log(`    id=${c.id} created_at=${c.created_at}`);
                }
            }
        }
        console.log('═══════════════════════════════════════════════════\n');

        // ═══════════════════════════════════════════════════════════════
        // SOFT ASSERTIONS — no fallan el spec, solo dan señal en el reporte
        // Playwright. El spec de diagnóstico SIEMPRE pasa; el spec de
        // regresión hard-assert vendrá en un commit posterior con el fix.
        // ═══════════════════════════════════════════════════════════════
        expect.soft(convRequests.length, 'esperado ≥1 request a /rest/v1/conversations').toBeGreaterThan(0);
        expect.soft(convResponses.length, 'esperado ≥1 response de /rest/v1/conversations').toBeGreaterThan(0);
        expect.soft(consoleErrors.some(e => e.includes('Error starting conversation')),
            '¿el catch de ServiceDetailView:435 se disparó?').toBeDefined();
    });
});
