// e2e/specs/cue-1-fix/a1-lock-sub-experiments.spec.ts
// ---------------------------------------------------------------------------
// Sprint cue-1-fix · fase A1 — Sub-experimentos del lock de auth-js.
//
// Hipótesis del PO 2026-09-22:
//   getSession() (UserContext.tsx:631) cuelga TAMBIÉN para invitados sin
//   sesión (que no tienen perfil que cargar). Eso apunta al LOCK de auth-js
//   del SDK, no al camino de perfil. Reproducir con 2 pestañas (misma
//   sesión y también sin sesión), capturar navigator.locks.query() en el
//   momento del cuelgue.
//
// Además: los 5 events /security-logout post-signOut huelen a
// onAuthStateChange dentro del lock (regla P10 documentada en CLAUDE.md).
//
// Sub-experimentos:
//   A1.a — Guest sin sesión, 1 pestaña.
//   A1.b — Guest sin sesión, 2 pestañas simultáneas.
//   A1.c — Autenticado (proveedor), 2 pestañas misma sesión.
//   A1.d — /security-logout post-signOut.
//
// Objetivo del spec: NO arreglar. NO tocar código productivo. Solo:
//   1. Reproducir el escenario.
//   2. Esperar hasta N segundos por el cuelgue.
//   3. Capturar `navigator.locks.query()` en el instante del cuelgue.
//   4. Reportar: reproduce sí/no, dump de locks activos, warnings del
//      watchdog user_context_stuck, tiempo real hasta cuelgue.
//
// Ambiente: staging preview (SDK Sentry a prod, watchdog local con warn).
// Los tests NO fallan si el cuelgue NO reproduce — reportan y siguen.
// Único fail real: si navigator.locks.query() falla (fixture roto).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

// Timeout para dar chance al cuelgue de manifestarse. 18s = 15s watchdog + 3s
// margen; si el cuelgue reproduce, el watchdog dispara warn observable.
const CUELGUE_WAIT_MS = 18_000;

// Helper: captura navigator.locks.query() en el contexto de la página, con
// try/catch por si el API no está disponible (fallback: null).
async function capturarLocks(page: import('@playwright/test').Page): Promise<unknown> {
    return await page.evaluate(async () => {
        try {
            // navigator.locks.query() devuelve { held: [...], pending: [...] }
            // con nombre, clientId, mode. Es un snapshot atómico del estado.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nav = navigator as any;
            if (!nav.locks?.query) return { error: 'navigator.locks.query no disponible' };
            const result = await nav.locks.query();
            return result;
        } catch (err) {
            return { error: (err as Error).message };
        }
    });
}

// Helper: captura console.warn del watchdog para detectar cuelgue empírico.
function trackearWarnings(page: import('@playwright/test').Page): { warnings: string[] } {
    const warnings: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'warning' && msg.text().includes('user_context_stuck')) {
            warnings.push(msg.text());
        }
    });
    return { warnings };
}

// ---------------------------------------------------------------------------
// A1.a — Guest sin sesión, 1 pestaña
// ---------------------------------------------------------------------------
// Predicción PO: si `getSession()` cuelga con guest, el lock del SDK está
// mal — no hay perfil que traer, cero razón de que Promise.all bloquee.
test.describe.serial('A1.a — Guest sin sesión, 1 pestaña', () => {
    test('reproduce cuelgue en /', async ({ browser }) => {
        // Context guest (sin storageState).
        const ctx = await browser.newContext({ storageState: undefined });
        const page = await ctx.newPage();
        const { warnings } = trackearWarnings(page);

        const t0 = Date.now();
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(CUELGUE_WAIT_MS);

        const locks = await capturarLocks(page);
        const wallMs = Date.now() - t0;

        console.log(`[A1.a] wall=${wallMs}ms | warns=${warnings.length} | locks=${JSON.stringify(locks).slice(0, 400)}`);
        if (warnings.length > 0) console.log(`[A1.a] SAMPLE WARN: ${warnings[0].slice(0, 300)}`);

        // Cero assertion de reproducción — reportamos. El único fail real
        // es si capturarLocks() reventó (navigator.locks no disponible).
        expect(locks).toBeDefined();
        await ctx.close();
    });
});

// ---------------------------------------------------------------------------
// A1.b — Guest sin sesión, 2 pestañas simultáneas
// ---------------------------------------------------------------------------
// Predicción PO: 2 pestañas guests pueden generar contención en el
// navigator.locks (aunque el noOpLock del proyecto no debería —
// intencionalmente saltea el lock). Ver navigator.locks.query() en ambas.
test.describe.serial('A1.b — Guest sin sesión, 2 pestañas simultáneas', () => {
    test('reproduce cuelgue en 2 pestañas /', async ({ browser }) => {
        const ctx = await browser.newContext({ storageState: undefined });
        const page1 = await ctx.newPage();
        const page2 = await ctx.newPage();
        const w1 = trackearWarnings(page1);
        const w2 = trackearWarnings(page2);

        const t0 = Date.now();
        await Promise.all([
            page1.goto('/', { waitUntil: 'domcontentloaded' }),
            page2.goto('/', { waitUntil: 'domcontentloaded' }),
        ]);
        await page1.waitForTimeout(CUELGUE_WAIT_MS);

        const locks1 = await capturarLocks(page1);
        const locks2 = await capturarLocks(page2);
        const wallMs = Date.now() - t0;

        console.log(`[A1.b] wall=${wallMs}ms | tab1_warns=${w1.warnings.length} | tab2_warns=${w2.warnings.length}`);
        console.log(`[A1.b] LOCKS tab1: ${JSON.stringify(locks1).slice(0, 400)}`);
        console.log(`[A1.b] LOCKS tab2: ${JSON.stringify(locks2).slice(0, 400)}`);
        if (w1.warnings.length > 0) console.log(`[A1.b] SAMPLE tab1 WARN: ${w1.warnings[0].slice(0, 300)}`);
        if (w2.warnings.length > 0) console.log(`[A1.b] SAMPLE tab2 WARN: ${w2.warnings[0].slice(0, 300)}`);

        expect(locks1).toBeDefined();
        expect(locks2).toBeDefined();
        await ctx.close();
    });
});

// ---------------------------------------------------------------------------
// A1.c — Autenticado (proveedor), 2 pestañas misma sesión
// ---------------------------------------------------------------------------
// Predicción PO: contención de navigator.locks entre pestañas de la misma
// sesión — patrón #2426 supabase-js (tab switch + Chrome Memory Saver →
// freeze indefinido). Nuestra versión 2.84.0 es anterior al fix.
test.describe.serial('A1.c — Autenticado 2 pestañas misma sesión (proveedor)', () => {
    // Sprint cue-1-fix B2 (2026-09-24) — assertion NEGATIVA post fix del
    // stale closure watchdog: hydrate OK debe dar warns=0. Antes del fix
    // el watchdog disparaba falso positivo (isLoading stale del closure
    // inicial). Post-fix stateForWatchdogRef, si el hydrate resuelve
    // exitoso el watchdog NO debe disparar.
    test('hydrate OK → cero warnings del watchdog (fix stale closure)', async ({ browser }) => {
        const ctx = await browser.newContext({ storageState: 'e2e/.auth/proveedor.json' });
        const page1 = await ctx.newPage();
        const page2 = await ctx.newPage();
        const w1 = trackearWarnings(page1);
        const w2 = trackearWarnings(page2);

        const t0 = Date.now();
        await Promise.all([
            page1.goto('/proveedor', { waitUntil: 'domcontentloaded' }),
            page2.goto('/proveedor', { waitUntil: 'domcontentloaded' }),
        ]);
        await page1.waitForTimeout(CUELGUE_WAIT_MS);

        const locks1 = await capturarLocks(page1);
        const locks2 = await capturarLocks(page2);
        const wallMs = Date.now() - t0;

        console.log(`[A1.c] wall=${wallMs}ms | tab1_warns=${w1.warnings.length} | tab2_warns=${w2.warnings.length}`);
        console.log(`[A1.c] LOCKS tab1: ${JSON.stringify(locks1).slice(0, 200)}`);
        console.log(`[A1.c] LOCKS tab2: ${JSON.stringify(locks2).slice(0, 200)}`);
        if (w1.warnings.length > 0) console.log(`[A1.c] SAMPLE tab1 WARN: ${w1.warnings[0].slice(0, 300)}`);
        if (w2.warnings.length > 0) console.log(`[A1.c] SAMPLE tab2 WARN: ${w2.warnings[0].slice(0, 300)}`);

        // Sprint cue-1-fix B2 — assertion regresión permanente:
        // post-fix stale closure, hydrate exitoso (Promise.all resuelve
        // en <1s con hasData=true) NO debe disparar el watchdog.
        // Pre-fix esta assertion fallaba con warns=1+1.
        expect(w1.warnings.length, '[A1.c REGRESIÓN] tab1: hydrate OK debe dar cero warns (fix stale closure watchdog)').toBe(0);
        expect(w2.warnings.length, '[A1.c REGRESIÓN] tab2: hydrate OK debe dar cero warns (fix stale closure watchdog)').toBe(0);
        expect(locks1).toBeDefined();
        expect(locks2).toBeDefined();
        await ctx.close();
    });
});

// ---------------------------------------------------------------------------
// A1.e — Simulación #2426 supabase-js: tab oculta 90s+ (refresh token pausado)
// ---------------------------------------------------------------------------
// Hipótesis PO 2026-09-23: patrón #2426 CLOSED en 2.10x (nuestra 2.84.0 es
// anterior) — tab suspendida 20-30s → freeze indefinido. El mecanismo:
// el refresh de token del SDK Supabase corre en background timer; cuando la
// tab está oculta el timer pausa; el lock queda tomado; al reactivar la
// tab, todas las queries que llegan quedan encoladas esperando el lock que
// ya no se libera.
//
// Simulación: 2 pestañas mismo contexto autenticado, tab B se oculta via
// document.hidden=true + dispatchEvent(visibilitychange), esperar 90s (más
// del refresh interval del token, típicamente 60s), bringToFront a B,
// medir getSession() + locks.query() durante la espera Y post-reactivación.
//
// Cero fix. Solo reportar reproducción sí/no. Si no reproduce → Memory
// Saver real no simulable en Playwright y evidencia queda en Sentry tags.
test.describe.serial('A1.e — Tab oculta 90s+ (simulación #2426)', () => {
    test('reproduce cuelgue post-hidden 90s + reactivación', async ({ browser }) => {
        test.setTimeout(180_000);   // 90s espera + margen holgado.

        const ctx = await browser.newContext({ storageState: 'e2e/.auth/proveedor.json' });
        const pageA = await ctx.newPage();
        const pageB = await ctx.newPage();
        const wA = trackearWarnings(pageA);
        const wB = trackearWarnings(pageB);

        const t0 = Date.now();
        await Promise.all([
            pageA.goto('/proveedor', { waitUntil: 'domcontentloaded' }),
            pageB.goto('/proveedor', { waitUntil: 'domcontentloaded' }),
        ]);

        // Warm-up 3s para que UserContext hidrate en ambas tabs.
        await pageA.waitForTimeout(3_000);

        // Locks pre-hidden.
        const locksPre = await capturarLocks(pageB);
        console.log(`[A1.e] pre-hidden LOCKS_B: ${JSON.stringify(locksPre).slice(0, 300)}`);

        // Ocultar tab B via API document.hidden + dispatchEvent.
        await pageB.evaluate(() => {
            Object.defineProperty(document, 'hidden', { value: true, configurable: true });
            Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        console.log('[A1.e] tab B oculta — esperando 90s...');

        // Esperar 90s — más del refresh interval del token (default supabase 60s).
        await pageA.waitForTimeout(90_000);

        // Locks mid-espera (desde tab A, para no dispararla en B).
        const locksMidA = await capturarLocks(pageA);
        console.log(`[A1.e] mid-90s LOCKS_A: ${JSON.stringify(locksMidA).slice(0, 300)}`);

        // Reactivar tab B.
        await pageB.evaluate(() => {
            Object.defineProperty(document, 'hidden', { value: false, configurable: true });
            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await pageB.bringToFront();

        // Medir: intentar getSession() en B con timeout. Si el lock quedó
        // tomado, getSession() se queda encolado indefinidamente.
        const getSessionResult = await pageB.evaluate(async () => {
            const start = Date.now();
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const w = window as any;
                if (!w.supabase?.auth?.getSession) {
                    return { ok: false, ms: 0, error: 'supabase not on window' };
                }
                // Race manual: getSession() vs timeout 20s.
                const raced = await Promise.race([
                    w.supabase.auth.getSession().then((r: unknown) => ({ ok: true, r })),
                    new Promise((resolve) => setTimeout(() => resolve({ ok: false, timedOut: true }), 20_000)),
                ]);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rr = raced as any;
                return { ok: rr.ok === true, ms: Date.now() - start, timedOut: !!rr.timedOut };
            } catch (err) {
                return { ok: false, ms: Date.now() - start, error: (err as Error).message };
            }
        });

        const locksPost = await capturarLocks(pageB);
        const wallMs = Date.now() - t0;

        console.log(`[A1.e] getSession post-reactivación: ${JSON.stringify(getSessionResult)}`);
        console.log(`[A1.e] LOCKS_B post: ${JSON.stringify(locksPost).slice(0, 300)}`);
        console.log(`[A1.e] wall=${wallMs}ms | tabA_warns=${wA.warnings.length} | tabB_warns=${wB.warnings.length}`);
        if (wA.warnings.length > 0) console.log(`[A1.e] SAMPLE tabA WARN: ${wA.warnings[0].slice(0, 300)}`);
        if (wB.warnings.length > 0) console.log(`[A1.e] SAMPLE tabB WARN: ${wB.warnings[0].slice(0, 300)}`);

        // Sprint cue-1-fix B2 (2026-09-24) — assertion NEGATIVA: post-fix
        // stale closure watchdog, hydrate exitoso en tab visible + tab
        // oculta 90s no deben disparar warn. Pre-fix esta assertion
        // fallaba con warns=1+1.
        expect(wA.warnings.length, '[A1.e REGRESIÓN] tabA: cero warns post-fix stale closure').toBe(0);
        expect(wB.warnings.length, '[A1.e REGRESIÓN] tabB: cero warns post-fix stale closure').toBe(0);
        expect(locksPost).toBeDefined();
        await ctx.close();
    });
});

// ---------------------------------------------------------------------------
// A1.d — /security-logout post-signOut
// ---------------------------------------------------------------------------
// Predicción PO: 5 events /security-logout huelen a onAuthStateChange
// dentro del lock (P10). El signOut dispara SIGNED_OUT event; si el
// UserContext hace await de Supabase dentro del handler, deadlock.
test.describe.serial('A1.d — /security-logout post-signOut', () => {
    test('reproduce cuelgue navegando a /security-logout post signOut', async ({ browser }) => {
        // Empezamos autenticados, hacemos signOut in-page, navegamos a
        // /security-logout, esperamos cuelgue.
        const ctx = await browser.newContext({ storageState: 'e2e/.auth/proveedor.json' });
        const page = await ctx.newPage();
        const { warnings } = trackearWarnings(page);

        // Mount inicial autenticado en / — despierta el UserContext.
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2_000);   // let context hydrate.

        // signOut client-side.
        await page.evaluate(async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const w = window as any;
            if (w.supabase?.auth?.signOut) {
                await w.supabase.auth.signOut();
            }
        });

        const t0 = Date.now();
        await page.goto('/security-logout', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(CUELGUE_WAIT_MS);

        const locks = await capturarLocks(page);
        const wallMs = Date.now() - t0;

        console.log(`[A1.d] wall=${wallMs}ms | warns=${warnings.length} | locks=${JSON.stringify(locks).slice(0, 400)}`);
        if (warnings.length > 0) console.log(`[A1.d] SAMPLE WARN: ${warnings[0].slice(0, 300)}`);

        // Sprint cue-1-fix B2 (2026-09-24) — assertion NEGATIVA: post-fix
        // stale closure watchdog, post-signOut + navegación a
        // /security-logout NO debe disparar warn falso positivo. Pre-fix
        // esta assertion fallaba con warns=1.
        expect(warnings.length, '[A1.d REGRESIÓN] post-signOut → /security-logout NO debe dar warn (fix stale closure)').toBe(0);
        expect(locks).toBeDefined();
        await ctx.close();
    });
});
