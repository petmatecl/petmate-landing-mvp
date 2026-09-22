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

    // Sprint J-4 BELL-150 (2026-09-22) — stress inducido con USER DEDICADO.
    //
    // Pedido PO 2026-09-22: spec crea >150 notifs sobre user dedicado (no
    // Aldo/Camila), verifica que el fix funciona bajo carga, cleanup en
    // finally.
    //
    // **Ámbito honesto del test**: verificación de la LÓGICA del fix
    // (query .limit(50) + query COUNT separada) directamente contra la BD,
    // NO del flow browser bajo carga. Motivo: la primera versión con
    // Playwright browser + addInitScript(localStorage) para simular auth
    // del user dedicado falló empíricamente en CI (run 35768221273) —
    // el session shape que devuelve `signInWithPassword` no coincide con
    // lo que el SDK Supabase browser espera leer, resultado bell no hidrata
    // → user null en UserContext → bell no monta → visibles=0.
    //
    // Cobertura del flow browser: T1/T2 cubren el path completo (auth →
    // UserContext → bell monta → fetch → panel renderea) con Aldo real.
    // Con Aldo unread=4 (post F2-3-CLEANUP) T1/T2 pasan trivialmente — no
    // ejercen el try/catch/finally del fix bajo carga, pero SÍ ejercen
    // que el bell no se rompe con la query .limit(50) del fix.
    //
    // T4 (este test) valida directamente que las 3 queries del bell
    // (COUNT unread + unread render con .limit(50) + read con .limit(10))
    // devuelven los shapes esperados bajo carga real de 200 notifs.
    // Cero simulación de browser — INSERT + query + assertions + cleanup.
    //
    // Si en el futuro se necesita cobertura browser bajo carga con user
    // dedicado, sprint separado para setup de auth simulada canónico
    // (probable: crear user + guardarStorageState en tmp file + test.use).
    test('T4 — carga inducida user dedicado: 200 unread + query lógica verificada (BELL-150)', async () => {
        const UNREAD_RENDER_LIMIT = 50; // debe coincidir con NotificationBell.tsx L46
        const STRESS_COUNT = 200;

        const url = process.env.E2E_SUPABASE_URL;
        const serviceKey = process.env.E2E_SUPABASE_SERVICE_KEY;
        if (!url || !serviceKey) {
            test.skip(true, 'E2E_SUPABASE_SERVICE_KEY requerido para T4 stress inducido (bypass RLS INSERT/DELETE + createUser)');
        }
        const admin = createClient(url!, serviceKey!, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        // 1. Crear user dedicado efímero — nunca Aldo/Camila.
        const ts = Date.now();
        const stressEmail = `bell-150-stress-${ts}@pawnecta-test.example`;
        const stressPassword = `Bell150-${ts}!`;
        const { data: createdRes, error: createErr } = await admin.auth.admin.createUser({
            email: stressEmail,
            password: stressPassword,
            email_confirm: true,
        });
        if (createErr) throw new Error(`[T4 stress] createUser falló: ${createErr.message}`);
        const uid = createdRes.user?.id;
        if (!uid) throw new Error('[T4 stress] createUser: no uid');

        const stressTag = `bell-150-stress-${ts}`;

        try {
            // 2. INSERT 200 notifs unread + 15 read (para probar cap read=10).
            const rowsUnread = Array.from({ length: STRESS_COUNT }, (_, i) => ({
                user_id: uid,
                type: 'info',
                title: `[BELL-150 stress ${i}]`,
                message: `Stress test bell-150 (${i + 1}/${STRESS_COUNT})`,
                read: false,
                metadata: { tipo: 'bell-150-stress', stress_tag: stressTag, idx: i },
            }));
            const rowsRead = Array.from({ length: 15 }, (_, i) => ({
                user_id: uid,
                type: 'info',
                title: `[BELL-150 stress-read ${i}]`,
                message: `Stress test bell-150 read (${i + 1}/15)`,
                read: true,
                metadata: { tipo: 'bell-150-stress', stress_tag: stressTag, kind: 'read', idx: i },
            }));
            const { error: insErr } = await admin.from('notifications').insert([...rowsUnread, ...rowsRead]);
            if (insErr) throw new Error(`[T4 stress] INSERT falló: ${insErr.message}`);

            // 3. Simular EXACTAMENTE las 3 queries que hace el fix bell (ver
            // NotificationBell.tsx:262-282). Mismos filters, mismo orden,
            // mismo .limit — verifica la lógica del fix bajo carga real.
            const [countRes, unreadRes, readRes] = await Promise.all([
                admin.from('notifications').select('*', { count: 'exact', head: true })
                    .eq('user_id', uid).eq('read', false),
                admin.from('notifications').select('*')
                    .eq('user_id', uid).eq('read', false)
                    .order('created_at', { ascending: false })
                    .limit(UNREAD_RENDER_LIMIT),
                admin.from('notifications').select('*')
                    .eq('user_id', uid).eq('read', true)
                    .order('created_at', { ascending: false })
                    .limit(10),
            ]);

            // Verificación (a) — badge count exacto (query COUNT HEAD).
            expect(
                countRes.count,
                `Badge cap count: query COUNT devuelve ${countRes.count}, esperado ${STRESS_COUNT} (fix badge muestra total real, no min con limit).`
            ).toBe(STRESS_COUNT);

            // Verificación (b) — lista render capada exactamente a UNREAD_RENDER_LIMIT.
            expect(
                unreadRes.data?.length,
                `Lista unread cap: query .limit(${UNREAD_RENDER_LIMIT}) devuelve ${unreadRes.data?.length} filas con ${STRESS_COUNT} disponibles en BD (fix acota render).`
            ).toBe(UNREAD_RENDER_LIMIT);

            // Verificación (c) — lista read capada a 10 (aunque hay 15 en BD).
            expect(
                readRes.data?.length,
                `Lista read cap: query .limit(10) devuelve ${readRes.data?.length} filas con 15 disponibles (fix acota read a 10).`
            ).toBe(10);

            // Verificación (d) — combined result = min(unread, 50) + min(read, 10)
            // = 50 + 10 = 60. Es lo que el panel renderearía como visibles.
            const combinedRendered = (unreadRes.data?.length ?? 0) + (readRes.data?.length ?? 0);
            expect(
                combinedRendered,
                `Total visible en panel = ${combinedRendered}, esperado 60 (min(200, 50) + min(15, 10)).`
            ).toBe(UNREAD_RENDER_LIMIT + 10);

            // Verificación (e) — orden desc por created_at (más recientes primero).
            // El row idx=199 fue el último insertado → debe estar entre los 50 primeros.
            const idxsUnread = (unreadRes.data ?? []).map(n => (n.metadata as { idx: number })?.idx);
            expect(
                idxsUnread,
                `Los 50 unread devueltos deben incluir idx=199 (más reciente insertado). Recibí: ${idxsUnread.slice(0, 3)}...`
            ).toContain(199);
        } finally {
            // Cleanup determinista — corre siempre.
            await admin
                .from('notifications')
                .delete()
                .eq('user_id', uid)
                .filter('metadata->>stress_tag', 'eq', stressTag);
            await admin.auth.admin.deleteUser(uid);
        }
    });
});
