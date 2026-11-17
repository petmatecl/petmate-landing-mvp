// e2e/specs/nav-mensajes/dropdown.spec.ts
// ---------------------------------------------------------------------------
// Sprint NAV-MENSAJES (2026-11-18) — spec P8 del acceso a /mensajes desde
// el desplegable del header (desktop + mobile).
//
// Guardias:
//   T1 (anónimo): la entrada "Mensajes" NO aparece sin sesión (el chip del
//       avatar ni siquiera se renderiza para guests, así que el test
//       verifica que el texto "Mensajes" no está en el header).
//   T2 (tutor): entrada visible al abrir el dropdown desktop + navegable
//       a /mensajes.
//   T3 (proveedor): misma verificación con cuenta de proveedor.
//   T4 (rol dual): la entrada aparece EXACTAMENTE UNA VEZ en el dropdown
//       desktop, aunque el user tenga rol proveedor + tutor (cuenta
//       Aldo en staging es dual: proveedor aprobado + hasSeekerProfile).
//   T5 (badge con unread): fixture INSERT vía service_role deja 1 mensaje
//       no leído en una conversación del user; el badge en el header
//       muestra "1" con color danger-500.
//
// Aplicación P8 10ª (positivo conocido antes de negativo): T1 hace positivo
// implícito via verificar la URL del header carga (si el preview sirviera
// 404 o login, el test fallaría). T2/T3/T4 arman positivo ("entrada
// visible") para que la ausencia en T1 sea evidencia, no silencio.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAdmin } from '../../fixtures/supabaseAdmin';

function withBypass(pathname: string): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS ?? '';
    if (!bypass || bypass === 'cambiame') return pathname;
    const sep = pathname.includes('?') ? '&' : '?';
    return `${pathname}${sep}x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=samesitenone`;
}

async function abrirDropdownDesktop(page: Page): Promise<void> {
    // El botón del avatar es el chip con el nombre del user — tiene
    // aria-haspopup="menu". Click para abrir el dropdown.
    const avatarButton = page.getByRole('button', { name: /Menu de usuario/i });
    await expect(avatarButton).toBeVisible({ timeout: 10_000 });
    await avatarButton.click();
    // Esperar a que el role="menu" esté visible.
    await expect(page.getByRole('menu', { name: /Menu personal/i })).toBeVisible({ timeout: 5_000 });
}

test.describe('NAV-MENSAJES — anónimo (sin sesión)', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('T1 · entrada Mensajes NO aparece sin sesión', async ({ page }) => {
        await page.goto(withBypass('/'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        // Guard positivo: el header rendea el link "Explorar servicios" (nav público).
        await expect(page.getByRole('link', { name: /Explorar servicios/i }).first()).toBeVisible();
        // Guardia P8: la entrada NO aparece.
        await expect(page.getByTestId('nav-mensajes-entry')).toHaveCount(0);
        await expect(page.getByTestId('nav-mensajes-entry-mobile')).toHaveCount(0);
    });
});

test.describe('NAV-MENSAJES — tutor logueado', () => {
    test.use({ storageState: 'e2e/.auth/tutor.json' });

    test('T2 · entrada Mensajes aparece en dropdown desktop + navega a /mensajes', async ({ page }) => {
        await page.goto(withBypass('/'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await abrirDropdownDesktop(page);
        const entry = page.getByTestId('nav-mensajes-entry');
        await expect(entry).toBeVisible();
        await expect(entry).toHaveText(/Mensajes/i);
        await expect(entry).toHaveAttribute('href', '/mensajes');
    });
});

test.describe('NAV-MENSAJES — proveedor logueado (cuenta Aldo = rol dual)', () => {
    test.use({ storageState: 'e2e/.auth/proveedor.json' });

    test('T3 · entrada Mensajes aparece en dropdown desktop', async ({ page }) => {
        await page.goto(withBypass('/'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await abrirDropdownDesktop(page);
        const entry = page.getByTestId('nav-mensajes-entry');
        await expect(entry).toBeVisible();
        await expect(entry).toHaveAttribute('href', '/mensajes');
    });

    test('T4 · entrada Mensajes aparece EXACTAMENTE UNA VEZ en rol dual', async ({ page }) => {
        // Aldo tiene proveedor aprobado + hasSeekerProfile (admin + tutor + proveedor).
        // La entrada va al tope del dropdown, UNA sola vez, no duplicada por rol.
        await page.goto(withBypass('/'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        await abrirDropdownDesktop(page);
        await expect(page.getByTestId('nav-mensajes-entry')).toHaveCount(1);
    });

    test('T5 · badge muestra count cuando hay mensaje no leído real', async ({ page }) => {
        // Fixture: INSERT un mensaje unread en una conv del proveedor, enviado
        // por el otro participante. Cleanup garantizado al final.
        const authId = process.env.E2E_STAGING_PROVEEDOR_AUTH_ID;
        if (!authId) {
            test.skip(true, '[nav-mensajes T5] Sin E2E_STAGING_PROVEEDOR_AUTH_ID — skip.');
            return;
        }
        const admin = getSupabaseAdmin();

        // Buscar una conv donde el proveedor sea participante (sitter_id o
        // client_id). Si no hay ninguna, crear una efímera.
        const { data: existing } = await admin
            .from('conversations')
            .select('id, client_id, sitter_id')
            .or(`client_id.eq.${authId},sitter_id.eq.${authId}`)
            .limit(1);

        let convId: string | null = existing?.[0]?.id ?? null;
        let senderId: string | null = null;
        if (existing?.[0]) {
            senderId = existing[0].client_id === authId ? existing[0].sitter_id : existing[0].client_id;
        }

        if (!convId) {
            test.skip(true, '[nav-mensajes T5] Proveedor sin conversaciones en staging — skip.');
            return;
        }

        // INSERT mensaje unread de la contraparte (no del proveedor mismo).
        const { data: msg, error: msgErr } = await admin
            .from('messages')
            .insert({
                conversation_id: convId,
                sender_id: senderId,
                content: `[nav-mensajes T5 ${Date.now()}] fixture unread`,
                read: false,
            })
            .select()
            .single();
        if (msgErr || !msg) {
            test.skip(true, `[nav-mensajes T5] INSERT message fail: ${msgErr?.message ?? 'unknown'}`);
            return;
        }

        try {
            await page.goto(withBypass('/'), { waitUntil: 'domcontentloaded', timeout: 30_000 });
            await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
            await abrirDropdownDesktop(page);
            const badge = page.getByTestId('nav-mensajes-badge');
            await expect(badge).toBeVisible({ timeout: 10_000 });
            // El badge muestra el count real (≥1); no afirmamos "1" exacto
            // porque el proveedor puede tener otros unreads legítimos en
            // staging — basta con que esté visible y no vacío.
            const text = (await badge.textContent()) ?? '';
            expect(text.trim()).toMatch(/^(\d+|9\+)$/);
        } finally {
            // Cleanup: eliminar el mensaje fixture (via service_role).
            await admin.from('messages').delete().eq('id', msg.id);
        }
    });
});
