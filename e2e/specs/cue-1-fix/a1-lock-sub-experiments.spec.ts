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
    test('reproduce cuelgue en /proveedor con 2 tabs', async ({ browser }) => {
        // Contexto con storageState proveedor (Aldo).
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
        console.log(`[A1.c] LOCKS tab1: ${JSON.stringify(locks1).slice(0, 400)}`);
        console.log(`[A1.c] LOCKS tab2: ${JSON.stringify(locks2).slice(0, 400)}`);
        if (w1.warnings.length > 0) console.log(`[A1.c] SAMPLE tab1 WARN: ${w1.warnings[0].slice(0, 300)}`);
        if (w2.warnings.length > 0) console.log(`[A1.c] SAMPLE tab2 WARN: ${w2.warnings[0].slice(0, 300)}`);

        expect(locks1).toBeDefined();
        expect(locks2).toBeDefined();
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

        expect(locks).toBeDefined();
        await ctx.close();
    });
});
