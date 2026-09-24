// e2e/specs/chat-open-error/regresion.spec.ts
// ---------------------------------------------------------------------------
// Sprint chat-open-error (2026-09-24) — regresión hard-assert del fix.
//
// Contexto: la BD tiene `conversations_client_id_sitter_id_key UNIQUE
// (client_id, sitter_id)` (verificado prod + staging via MCP 2026-09-24) —
// sin `servicio_id`. Producto: UNA conversación por par tutor-proveedor,
// no por servicio. El bug pre-fix era que `existingResult` en
// `components/Servicio/ServiceDetailView.tsx:323-347` filtraba también por
// `servicio_id` → si el par ya tenía conversación por OTRO servicio, la
// query devolvía null → INSERT → 409 Conflict del constraint UNIQUE →
// catch → toast, sin conversación reusada. Bug reportado por PO 2026-09-24
// (ficha `b1bdf757` "Acompañandolo en su hogar" con Maria Constanza, par
// ya tenía conversación de otro servicio).
//
// Fix: `existingResult` busca solo por `(client_id, sitter_id)` → la
// conversación existente se reusa cross-servicio. El `servicio_id` de la
// fila se preserva como el primero (no se actualiza).
//
// 2 casos hard-assert:
//   (a) Primer clic SIN conversación previa → crea + navega + cero toast.
//   (b) Primer clic CON conversación previa por OTRO servicio del mismo
//       proveedor → navega a la existente + cero INSERT nuevo + cero toast.
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

// Datos staging estables (verificado via mcp__supabase-staging-rw 2026-09-24).
const CAMILA_AUTH_ID = '5b30be99-3e11-47c7-b373-e3d8e4b86be0';
const ALDO_PROVEEDOR_AUTH_ID = '63c223b7-c0d2-453a-bd01-fbc6ee793a02';
// Dos servicios estables del mismo proveedor (Aldo) para el caso (b):
// - "Paseos dinamicos" (categoría paseos).
// - "prueba f2" (categoría cuidado).
const SERVICIO_A_ID = '385063f9-8fd0-4322-aa33-a866fa7cd2b4';
const SERVICIO_B_ID = '8bfe8675-d3b5-4a47-96b1-83954ca5ece7';

async function limpiarConv() {
    const admin = await getSupabaseAdmin();
    const { error } = await admin
        .from('conversations')
        .delete()
        .eq('client_id', CAMILA_AUTH_ID)
        .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID);
    if (error) throw new Error(`limpiarConv falló: ${error.message}`);
}

test.describe.serial('chat-open-error · regresión del fix', () => {
    test.beforeEach(async () => {
        // Cada test parte con el par sin conversación previa.
        await limpiarConv();
    });

    test.afterAll(async () => {
        await limpiarConv();
    });

    test('(a) primer clic SIN conversación previa → crea + navega + cero toast', async ({ page }) => {
        // Diagnóstico ampliado 2026-09-24: primer run del CI (`36040364041`)
        // falló con `expect(page).toHaveURL(/mensajes/)` timeout 12s y snapshot
        // final mostraba el botón `Enviar mensaje a Admin` STILL `[disabled]`
        // (isChatLoading=true persistente → algún await del handler pegado).
        // Ampliamos captura: TODA request a supabase.co (no solo conversations),
        // TODO console.log/warn/error, y screenshot al 5s para snapshot de
        // estado intermedio antes del timeout final.
        interface NetLog { when: number; method: string; url: string; status?: number; postData?: string | null; body?: string }
        const netLog: NetLog[] = [];
        const t0 = Date.now();

        page.on('request', req => {
            if (req.url().includes('supabase.co')) {
                netLog.push({ when: Date.now() - t0, method: req.method(), url: req.url(), postData: req.postData()?.slice(0, 400) });
            }
        });
        page.on('response', async res => {
            if (res.url().includes('supabase.co')) {
                let body = '';
                try { body = (await res.text()).slice(0, 500); } catch { body = '<no-body>'; }
                netLog.push({ when: Date.now() - t0, method: res.request().method(), url: res.url(), status: res.status(), body });
            }
        });

        const consoleLog: string[] = [];
        page.on('console', msg => {
            const t = msg.type();
            if (t === 'error' || t === 'warning') {
                consoleLog.push(`[+${Date.now() - t0}ms] ${t}: ${msg.text().slice(0, 400)}`);
            }
        });

        // Contadores por método sobre /rest/v1/conversations* para las asserts.
        let convInserts = 0;
        page.on('request', req => {
            if (req.url().includes('/rest/v1/conversations') && req.method() === 'POST') {
                convInserts++;
            }
        });

        await page.goto(`/servicio/${SERVICIO_A_ID}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => { /* seguir */ });

        // Selector por aria-label específico + verificar enabled antes del click
        // (el botón tiene `disabled={isChatLoading}` en L1702 de ServiceDetailView;
        // si arranca en true por algún estado stale, click sin efecto).
        const btn = page.getByLabel(/Enviar mensaje a/).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });
        await expect(btn, 'botón "Enviar mensaje" debe estar enabled antes del click').toBeEnabled({ timeout: 5_000 });

        await btn.click();

        // Debe navegar a /mensajes?id=... en <12s.
        try {
            await expect(page).toHaveURL(/\/mensajes\?id=/, { timeout: 12_000 });
        } catch (err) {
            // Diagnóstico ampliado: al fail, capturar network + console + BD.
            console.log('\n═══════ FAIL DIAGNÓSTICO caso (a) ═══════');
            console.log(`URL al fail: ${page.url()}`);
            console.log(`\n▶ NETWORK supabase.co (${netLog.length}):`);
            for (const n of netLog) {
                const st = n.status !== undefined ? ` [${n.status}]` : '';
                console.log(`  +${n.when}ms ${n.method}${st} ${n.url}`);
                if (n.postData) console.log(`    reqBody: ${n.postData}`);
                if (n.body) console.log(`    resBody: ${n.body}`);
            }
            console.log(`\n▶ CONSOLE (${consoleLog.length}):`);
            for (const c of consoleLog) console.log(`  ${c}`);
            const admin = await getSupabaseAdmin();
            const { data: postCheck } = await admin
                .from('conversations')
                .select('id, servicio_id, created_at')
                .eq('client_id', CAMILA_AUTH_ID)
                .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID);
            console.log(`\n▶ BD post-click: ${postCheck?.length ?? 0} conv(s)`);
            for (const r of postCheck ?? []) console.log(`    id=${r.id} servicio_id=${r.servicio_id} created_at=${r.created_at}`);
            console.log('═══════════════════════════════════════════\n');
            throw err;
        }

        // Cero toast de error visible.
        await expect(
            page.getByText(/Hubo un error al intentar abrir el chat/i),
        ).toHaveCount(0);
        const startingErrors = consoleLog.filter(c => c.includes('Error starting conversation'));
        expect(startingErrors.length, `cero "Error starting conversation" esperado. Vistos: ${startingErrors.length}`).toBe(0);

        // Se hizo exactamente 1 INSERT (el que crea la nueva conv).
        expect(convInserts, `esperado 1 INSERT en conversations. Vistos: ${convInserts}`).toBe(1);

        // La fila quedó persistida.
        const admin = await getSupabaseAdmin();
        const { data: post } = await admin
            .from('conversations')
            .select('id, servicio_id')
            .eq('client_id', CAMILA_AUTH_ID)
            .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID);
        expect(post?.length, 'esperado 1 conv creada').toBe(1);
        expect(post![0].servicio_id, 'servicio_id debe ser el del servicio clickeado').toBe(SERVICIO_A_ID);
    });

    test('(b) primer clic CON conversación previa por OTRO servicio del mismo proveedor → navega a la existente + cero INSERT + cero toast', async ({ page }) => {
        // Pre-crear conversación para SERVICIO_A (simula "el par ya se conoce
        // por otro servicio").
        const admin = await getSupabaseAdmin();
        const { data: preConv, error: preErr } = await admin
            .from('conversations')
            .insert({
                client_id: CAMILA_AUTH_ID,
                sitter_id: ALDO_PROVEEDOR_AUTH_ID,
                proveedor_auth_id: ALDO_PROVEEDOR_AUTH_ID,
                servicio_id: SERVICIO_A_ID,
            })
            .select('id')
            .single();
        if (preErr || !preConv) throw new Error(`pre-INSERT conv falló: ${preErr?.message}`);
        const preConvId = preConv.id;

        // Contadores. Espera CERO INSERT nuevo — la existente se reusa.
        let convInserts = 0;
        page.on('request', req => {
            if (req.url().includes('/rest/v1/conversations') && req.method() === 'POST') {
                convInserts++;
            }
        });

        const toastErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('Error starting conversation')) {
                toastErrors.push(msg.text());
            }
        });

        // Navegar a la ficha de SERVICIO_B (OTRO servicio del mismo proveedor).
        await page.goto(`/servicio/${SERVICIO_B_ID}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => { /* seguir */ });

        const btn = page.getByLabel(/Enviar mensaje a/).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });
        await expect(btn, 'botón enabled antes del click').toBeEnabled({ timeout: 5_000 });
        await btn.click();

        // Debe navegar a /mensajes?id=<mismo id que preConvId>.
        await expect(page).toHaveURL(new RegExp(`/mensajes\\?id=${preConvId}`), { timeout: 12_000 });

        // Cero toast de error.
        await expect(
            page.getByText(/Hubo un error al intentar abrir el chat/i),
        ).toHaveCount(0);
        expect(toastErrors.length, `cero console.error esperado. Vistos: ${toastErrors.length}`).toBe(0);

        // CERO INSERT nuevo — el fix reusa la existente sin volver a insertar.
        expect(convInserts, `esperado 0 INSERT nuevo (reusa existente). Vistos: ${convInserts}`).toBe(0);

        // La conversación existente NO se modificó — servicio_id preservado
        // como el primero (SERVICIO_A_ID).
        const { data: post } = await admin
            .from('conversations')
            .select('id, servicio_id')
            .eq('client_id', CAMILA_AUTH_ID)
            .eq('sitter_id', ALDO_PROVEEDOR_AUTH_ID);
        expect(post?.length, 'debe seguir habiendo 1 sola conv (UNIQUE enforced)').toBe(1);
        expect(post![0].id, 'debe ser la MISMA id que preConvId').toBe(preConvId);
        expect(post![0].servicio_id, 'servicio_id debe seguir siendo el primero (SERVICIO_A_ID)').toBe(SERVICIO_A_ID);
    });
});
