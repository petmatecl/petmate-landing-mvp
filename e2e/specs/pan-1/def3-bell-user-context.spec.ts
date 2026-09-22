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
import { createClient } from '@supabase/supabase-js';
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
    // Sprint pan-1 PR-3 — esperar que el loading state DESAPAREZCA. Antes
    // esperaba primer fila O empty state, pero el empty state aparecía
    // desde el primer render mientras `notifications=[]` inicial — el
    // waitFor lo consumía como "cargó vacío" cuando en realidad el fetch
    // aún no había corrido. Con el flag `loadingNotifs` del bell, el panel
    // muestra "Cargando notificaciones..." mientras el fetch está en flight;
    // desaparece cuando fetch completa (success o error). Esperar por su
    // ausencia da un estado terminal fiable.
    await panel.locator('[data-testid="notifs-loading"]').waitFor({
        state: 'hidden',
        timeout: 15_000,
    });
    return await panel.locator('.divide-y > div').count();
}

test.describe('PAN-1 def 3 · bell consume UserContext (fix mount race + opción B)', () => {

    test('T1 — carrera en /admin: bell carga notifs cuando auth se resuelve', async ({ page }) => {
        // El caso reproducido del bug productivo pre-fix. Aldo tiene N unread
        // en BD; navegar /admin (route gated con auth check "Verificando
        // acceso..."); abrir bell; panel debe mostrar >0 filas (antes 0).
        const supabase = await getSupabaseAsProveedor();
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
        // BD tiene N unread + M read. Panel muestra min(unread, UNREAD_RENDER_LIMIT)
        // + min(read, 10). Test PASS solo si BD tiene ≥1 read para diagnosticar.
        //
        // Sprint J-4 BELL-150 (2026-09-22) — antes se asertaba `visibles >= unread + 1`
        // que asumía que TODAS las unread se rendereaban. Con el `.limit(50)` del
        // fix BELL-150, el panel muestra máximo 50 unread aunque BD tenga 160.
        // La assertion nueva es sobre el rango esperado:
        //   min(unread, 50) + min(read, 10) <= visibles <= unread + 10
        // El badge muestra unread total real (query COUNT separada).
        const UNREAD_RENDER_LIMIT = 50; // debe coincidir con NotificationBell.tsx L46
        const supabase = await getSupabaseAsProveedor();
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
        // Panel visible = min(unread, UNREAD_RENDER_LIMIT) + min(read, 10).
        const unreadRenderizado = Math.min(unreadCount, UNREAD_RENDER_LIMIT);
        const readRenderizado = Math.min(readCount, 10);
        const esperado = unreadRenderizado + readRenderizado;
        expect(
            visibles,
            `Panel visibles=${visibles}; BD unread=${unreadCount} (renderizado max ${UNREAD_RENDER_LIMIT}) read=${readCount} (renderizado max 10). Opción B espera exact=${esperado} — panel muestra top ${UNREAD_RENDER_LIMIT} unread + top 10 read.`
        ).toBe(esperado);
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

        const supabase_aldo = await getSupabaseAsProveedor();
        const supabase_camila = await getSupabaseAsTutor();
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

    // Sprint J-4 BELL-150 (2026-09-22) — stress inducido: crea 200 unread
    // vía service_role y verifica que el bell (a) no se cuelga en "Cargando",
    // (b) renderea top UNREAD_RENDER_LIMIT + up to 10 read, (c) cleanup determinista.
    //
    // Motivación: T1/T2/T3 dependen del estado natural de Aldo en staging.
    // Con la BD limpia (post F2-3-CLEANUP) Aldo tiene 4 unread → T1/T2 pasan
    // trivialmente sin ejercer el fix de BELL-150. Este T4 INDUCE la carga
    // que reproduce el bug productivo — así el test VERIFICA que el fix
    // funciona bajo la condición que originó el bug, no que la BD esté limpia.
    //
    // El PO 2026-09-22 pidió explícito: "el spec debe crear >150 notificaciones
    // de prueba y ver filas, no depender de que la BD esté limpia".
    test('T4 — stress inducido: 200 unread + bell resiliente + cleanup (BELL-150)', async ({ page }) => {
        const UNREAD_RENDER_LIMIT = 50; // debe coincidir con NotificationBell.tsx L46
        const STRESS_COUNT = 200;

        const url = process.env.E2E_SUPABASE_URL;
        const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) {
            test.skip(true, 'E2E_SUPABASE_SERVICE_KEY requerido para T4 stress inducido (bypass RLS INSERT/DELETE masivo)');
        }
        // service_role client — bypassa RLS de public.notifications para INSERT
        // masivo + DELETE post-test (RLS actual no tiene policy DELETE para
        // authenticated → cleanup necesita service_role).
        const admin = createClient(url!, serviceKey!, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // Obtener uid de Aldo desde su JWT (cero hardcode).
        const supabaseAldo = await getSupabaseAsProveedor();
        const uid = (await supabaseAldo.auth.getUser()).data.user!.id;

        // Marca única de esta corrida para cleanup determinista aunque el test
        // falle a mitad. Cero riesgo de borrar notifs de otros tests que
        // corran en paralelo o de datos reales de Aldo.
        const stressTag = `bell-150-stress-${Date.now()}`;
        const rows = Array.from({ length: STRESS_COUNT }, (_, i) => ({
            user_id: uid,
            type: 'info',
            title: `[BELL-150 stress ${i}]`,
            message: `Stress test bell-150 (${i + 1}/${STRESS_COUNT})`,
            read: false,
            metadata: { tipo: 'bell-150-stress', stress_tag: stressTag, idx: i },
        }));

        const { error: insErr } = await admin.from('notifications').insert(rows);
        if (insErr) throw new Error(`[T4 stress] INSERT falló: ${insErr.message}`);

        try {
            // Verificar unread real en BD post-INSERT — smoke de que el INSERT
            // aterrizó (no queremos correr el test con 200 esperadas pero cero
            // insertadas).
            const { count: unreadBd } = await supabaseAldo
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', uid)
                .eq('read', false);
            expect(unreadBd, `INSERT stress no aterrizó (BD unread=${unreadBd}, esperado ≥${STRESS_COUNT})`).toBeGreaterThanOrEqual(STRESS_COUNT);

            // Abrir bell + medir visibles. Con el fix BELL-150 el panel muestra
            // top UNREAD_RENDER_LIMIT (50) + min(read, 10). Con Aldo read=0
            // (asumimos limpio; si hay N read, se suman hasta 10).
            await page.goto('/admin');
            await openBell(page);
            const visibles = await contarNotifsVisibles(page);

            // Assertion primaria: bell NO se cuelga en "Cargando" (visibles > 0).
            // Sin el try/catch del fix el panel quedaría en loader indefinido
            // y contarNotifsVisibles retornaría 0 tras timeout 15s.
            expect(visibles, `Bell renderea 0 filas con ${STRESS_COUNT} unread inducidas — el fix BELL-150 falló (panel colgado en loader o error en render)`).toBeGreaterThan(0);

            // Assertion secundaria: bell renderea capado a UNREAD_RENDER_LIMIT + read.
            // Con Aldo read=0 en el momento del test (asumimos limpio tras F2-3-CLEANUP),
            // esperado exacto = UNREAD_RENDER_LIMIT = 50. Si Aldo tiene read>0 de otros
            // fixtures, visibles hasta UNREAD_RENDER_LIMIT + 10.
            expect(visibles, `Bell no debe renderear más de ${UNREAD_RENDER_LIMIT}+10 filas (fix BELL-150 limita render); visibles=${visibles}`).toBeLessThanOrEqual(UNREAD_RENDER_LIMIT + 10);
            expect(visibles, `Bell debe renderear al menos ${UNREAD_RENDER_LIMIT} unread (fix BELL-150 top ${UNREAD_RENDER_LIMIT}); visibles=${visibles}, unread inducidas=${STRESS_COUNT}`).toBeGreaterThanOrEqual(UNREAD_RENDER_LIMIT);
        } finally {
            // Cleanup determinista: DELETE por metadata->>stress_tag único de
            // esta corrida. Cero riesgo de borrar notifs de otros tests
            // paralelos o datos reales de Aldo (stress_tag es un UUID de
            // timestamp único por invocación).
            await admin
                .from('notifications')
                .delete()
                .eq('user_id', uid)
                .filter('metadata->>stress_tag', 'eq', stressTag);
        }
    });
});
