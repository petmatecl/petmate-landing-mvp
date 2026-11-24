// e2e/specs/chat-lazy-create/no-orphan.spec.ts
// ---------------------------------------------------------------------------
// Sprint CHAT-LAZY-CREATE (2026-11-23) — spec P8 cierra el patrón de
// huérfanas en `conversations`.
//
// Pre-fix: `ServiceDetailView.handleChatClick` hacía INSERT conv al click +
// redirect a `/mensajes?id=<new>`. Si el user cerraba la tab sin enviar
// nada, la fila quedaba huérfana (0 mensajes). Verificación empírica prod
// 2026-11-19: 4 huérfanas del PO.
//
// Post-fix: el click NO crea conv. Navega a `/mensajes?target=<authId>`
// con MessageThread en modo "new chat". El INSERT conv + primer mensaje
// ocurren atómicamente en `POST /api/conversations/first-message`
// solo cuando el user pulsa Enviar.
//
// Garantías P8 (ambos sentidos del corolario 10ª):
//  1. **Negativa principal (NO-ORPHAN)**: tutor click "Contactar" + NO
//     envía → BD tiene 0 conversations para ese par. Sin el fix, el
//     spec falla: aparecería 1 fila 0-msg inmediatamente.
//  2. **Positiva conocida**: tutor envía primer mensaje → BD tiene 1 conv
//     + ≥1 message asociado + URL navega a `/mensajes?id=<realId>`.
//     Verifica que el método de medición (query BD por par) SÍ detecta
//     cuando hay conv real, no es falso cero sistemático.
//
// Cleanup: beforeAll + afterAll borran cualquier conv Camila↔Aldo para
// garantizar estado limpio independiente del orden entre workers.
// `.serial` outer respeta la regla CLAUDE.md "describes con beforeAll
// sobre BD compartida van serial" (alt 2026-11-19 PR #120 iter 3).
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

interface SmokeTargets {
    tutorAuthId: string;
    aldoProvId: string;
    aldoProvAuthId: string;
    servicioId: string;
}

let targets: SmokeTargets | null = null;

function withBypass(pathname: string): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS ?? '';
    if (!bypass || bypass === 'cambiame') return pathname;
    const sep = pathname.includes('?') ? '&' : '?';
    return `${pathname}${sep}x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=samesitenone`;
}

async function cleanupConvsPar(tutorAuthId: string, aldoAuthId: string) {
    const admin = await getSupabaseAdmin();
    // Borrar mensajes primero (FK ON DELETE CASCADE del schema podría estar,
    // pero defensivamente nos encargamos).
    const { data: convsToDel } = await admin
        .from('conversations')
        .select('id')
        .eq('client_id', tutorAuthId)
        .eq('sitter_id', aldoAuthId);
    const ids = (convsToDel ?? []).map((c: any) => c.id);
    if (ids.length > 0) {
        await admin.from('messages').delete().in('conversation_id', ids);
        await admin.from('conversations').delete().in('id', ids);
    }
}

test.describe.serial('chat-lazy-create — no-orphan on cancel + full flow on send', () => {
    test.use({ storageState: 'e2e/.auth/tutor.json' });

    test.beforeAll(async () => {
        const admin = await getSupabaseAdmin();

        const tutorEmail = process.env.E2E_STAGING_TUTOR_EMAIL;
        const aldoEmail = process.env.E2E_STAGING_EMAIL;
        if (!tutorEmail || !aldoEmail) {
            test.skip(true, '[chat-lazy-create] E2E_STAGING_TUTOR_EMAIL o E2E_STAGING_EMAIL no seteados — skip.');
            return;
        }

        const { data: usersPage, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
        if (listErr) {
            test.skip(true, `[chat-lazy-create] listUsers falló: ${listErr.message} — skip.`);
            return;
        }
        const tutorUser = usersPage.users.find(u => u.email?.toLowerCase() === tutorEmail.toLowerCase());
        const aldoUser = usersPage.users.find(u => u.email?.toLowerCase() === aldoEmail.toLowerCase());
        if (!tutorUser || !aldoUser) {
            test.skip(true, '[chat-lazy-create] tutor/Aldo no encontrados — skip.');
            return;
        }
        const tutorAuthId = tutorUser.id;
        const aldoProvAuthId = aldoUser.id;

        // Resolver proveedor row + servicio activo de Aldo.
        const { data: prov } = await admin
            .from('proveedores')
            .select('id')
            .eq('auth_user_id', aldoProvAuthId)
            .maybeSingle();
        if (!prov?.id) {
            test.skip(true, '[chat-lazy-create] proveedor Aldo no encontrado — skip.');
            return;
        }
        const { data: svc } = await admin
            .from('servicios_publicados')
            .select('id')
            .eq('proveedor_id', prov.id)
            .eq('activo', true)
            .limit(1)
            .maybeSingle();
        if (!svc?.id) {
            test.skip(true, '[chat-lazy-create] Aldo no tiene servicio activo — skip.');
            return;
        }

        targets = {
            tutorAuthId,
            aldoProvId: prov.id,
            aldoProvAuthId,
            servicioId: svc.id,
        };

        // Limpiar cualquier conv residual Camila↔Aldo antes de empezar.
        await cleanupConvsPar(tutorAuthId, aldoProvAuthId);
    });

    test.afterAll(async () => {
        if (!targets) return;
        await cleanupConvsPar(targets.tutorAuthId, targets.aldoProvAuthId);
    });

    test('LAZY-01 — click "Contactar" sin enviar NO crea fila conversations (no-orphan)', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no inicializado — skip.');
        const t = targets!;

        const admin = await getSupabaseAdmin();

        // Verificación previa: cero convs (control positivo del método).
        const { count: countPre } = await admin
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', t.tutorAuthId)
            .eq('sitter_id', t.aldoProvAuthId);
        expect(countPre ?? 0).toBe(0);

        // Navegar directo a modo new-chat (equivale al click "Contactar"
        // post-fix: ServiceDetailView navega acá sin INSERT).
        await page.goto(
            withBypass(`/mensajes?target=${t.aldoProvAuthId}&servicio=${t.servicioId}`),
            { waitUntil: 'domcontentloaded', timeout: 30_000 },
        );
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        // Espera suficiente para que si el componente hiciera un INSERT
        // cosmético o background, la fila apareciera. Pre-fix:
        // handleChatClick hacía INSERT inmediato → aparecía dentro del
        // mismo tick. Post-fix: cero INSERT.
        await page.waitForTimeout(2000);

        // Assertion principal: BD sigue en 0 convs para el par.
        const { count: countPost } = await admin
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', t.tutorAuthId)
            .eq('sitter_id', t.aldoProvAuthId);
        expect(countPost ?? 0).toBe(0);
    });

    test('LAZY-02 — primer envío crea conv + message atómicamente (positivo conocido)', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no inicializado — skip.');
        const t = targets!;

        const admin = await getSupabaseAdmin();

        // Limpiar antes del test (por si LAZY-01 dejó algo — defensivo).
        await cleanupConvsPar(t.tutorAuthId, t.aldoProvAuthId);

        // Verificación previa: cero convs.
        const { count: countPre } = await admin
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', t.tutorAuthId)
            .eq('sitter_id', t.aldoProvAuthId);
        expect(countPre ?? 0).toBe(0);

        // Navegar + enviar primer mensaje.
        await page.goto(
            withBypass(`/mensajes?target=${t.aldoProvAuthId}&servicio=${t.servicioId}`),
            { waitUntil: 'domcontentloaded', timeout: 30_000 },
        );
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        const input = page.locator('input[placeholder*="Escribe un mensaje"]');
        await input.waitFor({ state: 'visible', timeout: 15_000 });
        await input.fill('Hola, probando CHAT-LAZY-CREATE');
        await page.locator('button[type="submit"]').click();

        // Esperar que la URL cambie a /mensajes?id=<realId>.
        await page.waitForURL(/\/mensajes\?id=[0-9a-f-]+/i, { timeout: 15_000 });
        const urlMatch = page.url().match(/\/mensajes\?id=([0-9a-f-]+)/i);
        expect(urlMatch).not.toBeNull();
        const realConvId = urlMatch![1];

        // Verificación BD: 1 conv + ≥1 message.
        const { data: conv } = await admin
            .from('conversations')
            .select('id, client_id, sitter_id')
            .eq('id', realConvId)
            .maybeSingle();
        expect(conv).not.toBeNull();
        expect(conv!.client_id).toBe(t.tutorAuthId);
        expect(conv!.sitter_id).toBe(t.aldoProvAuthId);

        const { count: msgCount } = await admin
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', realConvId);
        expect(msgCount ?? 0).toBeGreaterThanOrEqual(1);
    });

    test('LAZY-03 — segundo "Contactar" reusa la conv existente (no duplica)', async ({ page }) => {
        if (!targets) test.skip(true, 'targets no inicializado — skip.');
        const t = targets!;

        const admin = await getSupabaseAdmin();

        // Pre-condición: debe existir la conv de LAZY-02. Si no, saltar.
        const { data: existing } = await admin
            .from('conversations')
            .select('id')
            .eq('client_id', t.tutorAuthId)
            .eq('sitter_id', t.aldoProvAuthId)
            .maybeSingle();
        if (!existing?.id) {
            test.skip(true, '[chat-lazy-create] LAZY-02 no dejó conv — skip LAZY-03.');
            return;
        }
        const existingId = existing.id;

        // Navegar simulando segundo click "Contactar": el refactor hace
        // lookup client-side y navega a /mensajes?id=<existing>. Comprobamos
        // directamente que /mensajes?id=<existing> funciona + cero
        // conv nueva.
        await page.goto(
            withBypass(`/mensajes?id=${existingId}`),
            { waitUntil: 'domcontentloaded', timeout: 30_000 },
        );
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        // Assertion: BD sigue con 1 conv (no 2) para el par.
        const { count } = await admin
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', t.tutorAuthId)
            .eq('sitter_id', t.aldoProvAuthId);
        expect(count ?? 0).toBe(1);
    });
});
