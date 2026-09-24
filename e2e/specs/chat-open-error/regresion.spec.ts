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
        // Contadores por método sobre /rest/v1/conversations*.
        let convInserts = 0;
        page.on('request', req => {
            if (req.url().includes('/rest/v1/conversations') && req.method() === 'POST') {
                convInserts++;
            }
        });

        // Cero toast de error durante todo el flow.
        const toastErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error' && msg.text().includes('Error starting conversation')) {
                toastErrors.push(msg.text());
            }
        });

        await page.goto(`/servicio/${SERVICIO_A_ID}`, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => { /* seguir */ });

        const btn = page.getByRole('button', { name: /Enviar [Mm]ensaje/i }).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });
        await btn.click();

        // Debe navegar a /mensajes?id=... en <12s.
        await expect(page).toHaveURL(/\/mensajes\?id=/, { timeout: 12_000 });

        // Cero toast de error visible.
        await expect(
            page.getByText(/Hubo un error al intentar abrir el chat/i),
        ).toHaveCount(0);
        expect(toastErrors.length, `cero console.error "Error starting conversation" esperado. Vistos: ${toastErrors.length}`).toBe(0);

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

        const btn = page.getByRole('button', { name: /Enviar [Mm]ensaje/i }).first();
        await expect(btn).toBeVisible({ timeout: 15_000 });
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
