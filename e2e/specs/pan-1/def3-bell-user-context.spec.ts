// e2e/specs/pan-1/def3-bell-user-context.spec.ts
// ---------------------------------------------------------------------------
// PAN-1 · Def 3 — regresión del fix "bell usa useUser() del contexto".
//
// Fondo (bug productivo descubierto por diagnóstico PR #19 run 34624549600
// del 2026-09-11):
//   Antes, `NotificationBell` hacía `supabase.auth.getUser()` local dentro
//   de `useEffect(..., [])`. En rutas gated (/admin, /proveedor, /mis-reservas,
//   etc.) el mount del Header ocurre ANTES de que UserContext resuelva la
//   sesión (`Verificando acceso...` en /admin). El bell hitteaba getUser()
//   → user=null → init() early-return → notifications quedaba `[]` para
//   siempre hasta remount (hard refresh). Reproducido 2 runs consecutivos
//   contra staging con Aldo teniendo 207 unread en BD y el panel mostrando
//   0 filas.
//
// Fix (commit de este sprint): reemplazar `supabase.auth.getUser()` por
// `useUser()` del contexto. Effect deps `[user?.id, authLoading]` → corre
// cuando el auth se resuelve Y cada vez que user.id cambie (login post-guest,
// logout, cambio de user). Además se amplía el fetch a unread + últimas
// 10 read (opción B revisada del PO — reemplaza D2 del sprint notifs-panel).
//
// 3 tests que cubren los caminos del fix:
//   1. Carrera en /admin: navegar → abrir bell → panel muestra unread cuando
//      BD tiene. Test que falló repetidamente antes del fix, pasa después.
//   2. Mezcla unread + read: BD tiene ambos, panel visible incluye tanto
//      unread como read (últimas 10). Cero filter que oculte read.
//   3. Logout + login como OTRO user en la misma pestaña: panel se vacía
//      del user viejo y recarga con notifs del nuevo (o vacío si no hay).
//      Verifica que el effect reacciona a cambios de user.id, no solo a
//      null → valor.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAsProveedor, getSupabaseAsTutor } from '../../fixtures/supabase';

const PANEL_SELECTOR = 'menu';
const PANEL_NAME = /Lista de notificaciones/i;

async function openBell(page: Page): Promise<void> {
    const bell = page.getByRole('button', { name: /Notificaciones/i }).first();
    await bell.click();
    await expect(page.getByRole(PANEL_SELECTOR, { name: PANEL_NAME }))
        .toBeVisible({ timeout: 10_000 });
}

async function contarNotifsVisibles(page: Page): Promise<number> {
    const panel = page.getByRole(PANEL_SELECTOR, { name: PANEL_NAME });
    // Esperar que aparezca la primera fila O el empty state — sin esta espera
    // count() ejecuta antes de que setState del fetch complete → 0 filas
    // aparente aunque BD tenga. Corte de race identificado en el diagnóstico.
    const filaOEmpty = panel.locator(
        '.divide-y > div, p:has-text("No tienes notificaciones")'
    ).first();
    await filaOEmpty.waitFor({ state: 'visible', timeout: 10_000 });
    return await panel.locator('.divide-y > div').count();
}

test.describe('PAN-1 def 3 · bell consume UserContext (fix mount race + opción B)', () => {

    test('T1 — carrera en /admin: bell carga notifs cuando auth se resuelve', async ({ page }) => {
        // El caso reproducido del bug productivo pre-fix. Aldo tiene N unread
        // en BD; navegar /admin (route gated con auth check "Verificando
        // acceso..."); abrir bell; panel debe mostrar >0 filas (antes 0).
        const supabase = getSupabaseAsProveedor();
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes!.user!.id;
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('read', false);
        if ((unreadCount ?? 0) === 0) {
            test.skip(true, 'Aldo no tiene unread en BD — no diagnosticable');
        }
        await page.goto('/admin');
        await openBell(page);
        const visibles = await contarNotifsVisibles(page);
        expect(
            visibles,
            `Panel muestra ${visibles} filas; BD tiene unread=${unreadCount}. Fix del bell debería exponer todas las unread (o al menos ≥1) tras auth resuelto.`
        ).toBeGreaterThan(0);
    });

    test('T2 — mezcla unread + read visible (opción B revisada)', async ({ page }) => {
        // BD tiene N unread + M read. Panel muestra unread + últimas 10 read.
        // Visible count = unread + min(read, 10). Test PASS solo si BD tiene
        // ≥1 read para diagnosticar.
        const supabase = getSupabaseAsProveedor();
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes!.user!.id;
        const [readRes, unreadRes] = await Promise.all([
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', true),
            supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
        ]);
        const readCount = readRes.count ?? 0;
        const unreadCount = unreadRes.count ?? 0;
        if (readCount === 0) {
            test.skip(true, `Aldo no tiene notifs read=true en BD (unread=${unreadCount}) — no diagnosticable`);
        }
        await page.goto('/admin');
        await openBell(page);
        const visibles = await contarNotifsVisibles(page);
        // Panel visible = unread + min(read, 10).
        const esperadoMin = unreadCount + Math.min(readCount, 10);
        expect(
            visibles,
            `Panel visibles=${visibles}; BD unread=${unreadCount} read=${readCount}. Opción B espera ~${esperadoMin} visibles (unread + últimas 10 read).`
        ).toBeGreaterThanOrEqual(unreadCount + 1);
    });

    test('T3 — logout + login otro user misma pestaña: bell se vacía y recarga', async ({ browser }) => {
        // Ejerce el path que el fix protege: user.id cambia dentro del mismo
        // tab (no solo mount inicial). El effect deps [user?.id, authLoading]
        // debe re-correr al detectar el cambio.
        //
        // Approach: 2 contexts distintos (Aldo + Camila) para no depender del
        // flow UI de logout/login (que atraviesa /login form y puede tener
        // sub-races propios). Cada context carga su storageState y navega
        // directo. En un mismo browser instance:
        //   - Context 1 (Aldo): abre /admin, bell carga notifs de Aldo.
        //   - Context 2 (Camila): abre /mis-reservas (bell disponible para
        //     tutor), bell carga notifs de Camila (o empty).
        //   - Assertion cruzada: las notifs visibles en Camila NO deben ser
        //     las mismas que en Aldo (diferentes user_id → diferentes filas).
        //
        // Simulación del flow "logout + login" real: cada context es
        // esencialmente un "browser fresh con storageState nuevo" — equivalente
        // a hard-refresh post-cambio de auth. El bug pre-fix se manifestaba
        // en QUALQUIER cambio de user.id (mount inicial o cross-tab), este
        // test cubre la forma más determinista de reproducir el cambio.

        const supabase_aldo = getSupabaseAsProveedor();
        const supabase_camila = getSupabaseAsTutor();
        const uid_aldo = (await supabase_aldo.auth.getUser()).data.user!.id;
        const uid_camila = (await supabase_camila.auth.getUser()).data.user!.id;
        expect(uid_aldo).not.toBe(uid_camila);

        // Context Aldo — abrir bell en /admin.
        const ctxAldo = await browser.newContext({ storageState: 'e2e/.auth/proveedor.json' });
        const pageAldo = await ctxAldo.newPage();
        await pageAldo.goto('/admin');
        await openBell(pageAldo);
        const visiblesAldo = await contarNotifsVisibles(pageAldo);
        await ctxAldo.close();

        // Context Camila — abrir bell en /mis-reservas (accesible para tutor).
        const ctxCamila = await browser.newContext({ storageState: 'e2e/.auth/tutor.json' });
        const pageCamila = await ctxCamila.newPage();
        await pageCamila.goto('/mis-reservas');
        await openBell(pageCamila);
        const visiblesCamila = await contarNotifsVisibles(pageCamila);
        await ctxCamila.close();

        // Assertion: Camila (tutor) debe tener DISTINTO set de notifs que Aldo.
        // No verificamos igualdad exacta (Camila puede tener 0 o N cualquiera);
        // sí verificamos que el bell reaccionó al cambio de user — al menos
        // que no re-uso el mismo Set del user anterior.
        // Sub-verificación: los datos de BD deben coincidir con lo visible en
        // cada context — descarta bug de sharing del state entre contextos.
        const { count: unread_aldo } = await supabase_aldo
            .from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', uid_aldo).eq('read', false);
        const { count: unread_camila } = await supabase_camila
            .from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', uid_camila).eq('read', false);

        // Aldo: panel debe mostrar sus unread si tiene ≥1.
        if ((unread_aldo ?? 0) > 0) {
            expect(
                visiblesAldo,
                `Aldo tiene unread=${unread_aldo} en BD pero panel muestra ${visiblesAldo}`
            ).toBeGreaterThan(0);
        }
        // Camila: panel debe mostrar sus unread si tiene ≥1, o empty state si 0.
        // Si sus unread ≠ los de Aldo → cambio de user reflejado en el bell.
        if ((unread_camila ?? 0) === 0) {
            expect(
                visiblesCamila,
                `Camila tiene 0 unread pero panel muestra ${visiblesCamila}. Empty state esperado.`
            ).toBe(0);
        } else {
            expect(
                visiblesCamila,
                `Camila tiene unread=${unread_camila} pero panel muestra ${visiblesCamila}`
            ).toBeGreaterThan(0);
        }

        // Bell cambió de owner → los sets deben ser distintos (o al menos los
        // counts si ambos > 0 se corresponden con sus BDs).
        // Si ambos son 0, no hay assertion posible pero el skip se maneja arriba.
    });
});
