// e2e/specs/pan-1/estado-actual.spec.ts
// ---------------------------------------------------------------------------
// PAN-1 · Diagnóstico "¿qué defectos siguen vivos hoy?".
//
// Contexto: sprint `notifs-panel` (mergeado a main 2026-09-01) resolvió
// partes del PAN-1 (portal + Escape + routeChange + render defensivo +
// helper formatFechaRelativa modo='evento'). El listado original del
// BACKLOG L200-236 pudo quedar obsoleto — este spec corta el ambiguo
// contra el estado ACTUAL del código en main.
//
// PROTOCOLO: 1 test por defecto (1 a 7 — def 8 cerrado como falso
// hallazgo antes de este spec). Cada test AFIRMA el comportamiento
// correcto:
//   * PASS → defecto ya resuelto (por sprint previo). BACKLOG cierra con
//            "ya resuelto en <sprint>" + link al SHA de este run.
//   * FAIL → defecto sigue vivo, define alcance real del sprint pan-1.
//   * SKIP → no hay data suficiente para diagnosticar (documentado).
//
// El spec corre en project `chromium` (Aldo, proveedor+admin en staging).
// Queries a Supabase con JWT del user via `getSupabaseAsProveedor()` —
// respeta RLS, cero service role. Interacción UI vía Playwright sobre
// el preview de la rama (donde vive el panel de la campana).
//
// Los tests que dependen de estado específico de BD (defs 3, 5, 6) hacen
// `test.skip()` si no hay data que permita diagnosticar. Los que no
// dependen (defs 1, 2, 4, 7) siempre corren.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAsProveedor } from '../../fixtures/supabase';

// Helper: abrir el panel de la campana. Usa la ruta admin donde vive
// Header.tsx (persistente entre rutas admin/proveedor). Aldo tiene rol
// admin en staging, así que /admin carga sin redirect.
async function openBell(page: Page): Promise<void> {
    await page.goto('/admin');
    const bell = page.getByRole('button', { name: /Notificaciones/i }).first();
    await bell.click();
    await expect(
        page.getByRole('menu', { name: /Lista de notificaciones/i })
    ).toBeVisible({ timeout: 10_000 });
}

async function getUid(): Promise<string> {
    const supabase = getSupabaseAsProveedor();
    const { data: userRes, error } = await supabase.auth.getUser();
    if (error || !userRes?.user?.id) {
        throw new Error(`[pan-1] No se pudo resolver uid del proveedor: ${error?.message ?? 'no user'}`);
    }
    return userRes.user.id;
}

test.describe('PAN-1 · Diagnóstico estado actual (7 defectos)', () => {

    test('Def 1 — notifs generadas por generator canónico tienen link poblado', async () => {
        // Verifica el CODE PATH — no la interacción UI. Los 2 generators
        // activos (recordatorio-reserva + invitacion-resenas) SIEMPRE
        // deben setear `link` no-null. Si aparecen filas de tipo canónico
        // con link null, def 1 vivo (código no cumple contrato).
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('link, metadata, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        const canonicas = (notifs ?? []).filter((n) => {
            const tipo = (n.metadata as { tipo?: string } | null)?.tipo;
            return tipo === 'recordatorio_dia_anterior';
        });
        if (canonicas.length === 0) {
            test.skip(true, 'No hay notifs de tipo canónico (recordatorio_dia_anterior) para el user');
        }
        const sinLink = canonicas.filter((n) => !n.link);
        expect(
            sinLink.length,
            `Notifs canónicas sin link (def 1 code path vivo): ${sinLink.length}/${canonicas.length}`
        ).toBe(0);
    });

    test('Def 2 — copy con tildes en las últimas 50 notifs del user', async () => {
        // Blacklist de palabras sin tilde que aparecieron en el screenshot
        // del PO. Grep las últimas notifs; cualquier hit es def 2 vivo.
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('title, message')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        const sinTildes = ['evaluacion', 'moderacion', 'Aparecera', 'publica tras', 'notificacion'];
        const hits: Array<{ campo: string; palabra: string; contenido: string }> = [];
        for (const n of notifs ?? []) {
            for (const palabra of sinTildes) {
                if (n.title?.includes(palabra)) hits.push({ campo: 'title', palabra, contenido: n.title });
                if (n.message?.includes(palabra)) hits.push({ campo: 'message', palabra, contenido: n.message });
            }
        }
        expect(
            hits.length,
            `Hallazgos sin tilde (def 2 vivo): ${JSON.stringify(hits.slice(0, 5), null, 2)}`
        ).toBe(0);
    });

    test('Def 3 — panel trae unread + últimas 10 read (opción B revisada)', async ({ page }) => {
        // Query BD: contar read+unread; abrir panel; comparar.
        // PASS solo si hay al menos 1 read en BD Y el panel la muestra.
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const [readRes, unreadRes] = await Promise.all([
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', true),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
        ]);
        const readCount = readRes.count ?? 0;
        const unreadCount = unreadRes.count ?? 0;
        if (readCount === 0) {
            test.skip(true, `No hay notifs read=true en BD (unread=${unreadCount}) — no diagnosticable`);
        }
        await openBell(page);
        const panel = page.getByRole('menu', { name: /Lista de notificaciones/i });
        const visible = await panel.locator('.divide-y > div').count();
        // Si el panel muestra <= unreadCount, no trae leídas → def 3 vivo.
        expect(
            visible,
            `Panel muestra ${visible} filas; BD tiene unread=${unreadCount} read=${readCount}. Opción B espera al menos unread+1 read visible (def 3 vivo si visible <= unread).`
        ).toBeGreaterThan(unreadCount);
    });

    test('Def 4a — click en backdrop cierra panel', async ({ page }) => {
        await openBell(page);
        // Click en el borde inferior izquierdo del viewport, lejos del panel
        // (el panel se ancla arriba a la derecha). El backdrop es el div
        // z-100 portal — captura clicks del viewport.
        await page.mouse.click(50, 500);
        await expect(
            page.getByRole('menu', { name: /Lista de notificaciones/i })
        ).not.toBeVisible({ timeout: 3_000 });
    });

    test('Def 4b — Escape cierra panel', async ({ page }) => {
        await openBell(page);
        await page.keyboard.press('Escape');
        await expect(
            page.getByRole('menu', { name: /Lista de notificaciones/i })
        ).not.toBeVisible({ timeout: 3_000 });
    });

    test('Def 4c — cambio de ruta cierra panel', async ({ page }) => {
        await openBell(page);
        // Navegar a otra ruta admin
        await page.goto('/proveedor');
        await expect(
            page.getByRole('menu', { name: /Lista de notificaciones/i })
        ).not.toBeVisible({ timeout: 3_000 });
    });

    test('Def 5 — generator canónico NO expone código interno tipo e2e-', async () => {
        // Filtro por tipo canónico (recordatorio) — el único que emite
        // desde el CÓDIGO. Las inserts de fixture directo con "e2e-" NO
        // tienen `metadata.tipo` seteado. Filter por tipo excluye fixtures.
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('title, message, metadata, created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        const canonicas = (notifs ?? []).filter((n) => {
            const tipo = (n.metadata as { tipo?: string } | null)?.tipo;
            return tipo === 'recordatorio_dia_anterior';
        });
        if (canonicas.length === 0) {
            test.skip(true, 'No hay notifs canónicas para diagnosticar def 5');
        }
        const expuestas = canonicas.filter((n) =>
            (n.title?.includes('e2e-') || n.message?.includes('e2e-'))
        );
        expect(
            expuestas.length,
            `Notifs canónicas con "e2e-" en title/message (def 5 vivo): ${expuestas.length}/${canonicas.length}`
        ).toBe(0);
    });

    test('Def 6 — cero duplicados (agendamiento_id, timestamp al segundo) en 90 días', async () => {
        // Duplicación por generación: 2+ filas con mismo agendamiento_id y
        // mismo created_at al segundo. Si el generator es idempotente,
        // este count es 0. Si el cron corre 2x, o si un trigger corre por
        // update de agendamiento, hay dups.
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('metadata, created_at')
            .eq('user_id', uid)
            .gte('created_at', since);
        if (error) throw error;

        const groups = new Map<string, number>();
        for (const n of notifs ?? []) {
            const agend = (n.metadata as { agendamiento_id?: string } | null)?.agendamiento_id;
            if (!agend) continue;
            const sec = String(n.created_at).slice(0, 19); // "2026-08-11T14:30:25"
            const key = `${agend}|${sec}`;
            groups.set(key, (groups.get(key) ?? 0) + 1);
        }
        const dups = Array.from(groups.entries()).filter(([, count]) => count > 1);
        expect(
            dups.length,
            `Duplicados por (agendamiento_id, created_at al segundo) últimos 90 días (def 6 vivo): ${JSON.stringify(dups.slice(0, 5))}`
        ).toBe(0);
    });

    test('Def 7 — generator recordatorio NO congela "Mañana:" en title', async () => {
        // El generator recordatorio-reserva.ts:561-563 emite title=subject
        // con prefijo "Mañana:". Cuando la notif se lee días después, el
        // "Mañana" es falso. Fix aprobado (b): quitar prefijo del title.
        // Este test detecta filas con "Mañana:" congelado creadas hace más
        // de 48h de tipo recordatorio_dia_anterior.
        const supabase = getSupabaseAsProveedor();
        const uid = await getUid();
        const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
        const { data: notifs, error } = await supabase
            .from('notifications')
            .select('title, message, metadata, created_at')
            .eq('user_id', uid)
            .lt('created_at', cutoff);
        if (error) throw error;

        const canonicas = (notifs ?? []).filter((n) => {
            const tipo = (n.metadata as { tipo?: string } | null)?.tipo;
            return tipo === 'recordatorio_dia_anterior';
        });
        if (canonicas.length === 0) {
            test.skip(true, 'No hay notifs canónicas con >48h de antigüedad para diagnosticar def 7');
        }
        const congeladas = canonicas.filter((n) =>
            n.title?.startsWith('Mañana:') || (n.message?.includes('Mañana') ?? false)
        );
        expect(
            congeladas.length,
            `Notifs canónicas >48h con "Mañana:" congelado (def 7 vivo): ${congeladas.length}/${canonicas.length}`
        ).toBe(0);
    });
});
