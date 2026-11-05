// e2e/specs/cue-1-fix/a3-anonymous-hydrate.spec.ts
// ---------------------------------------------------------------------------
// Sprint cue-1-fix · fase A3 — Camino anónimo del hydrate.
//
// PO 2026-09-22: verificar POR QUÉ loading no resuelve sin sesión en
// UserContext.tsx:631 (`supabase.auth.getSession()`) y reproducirlo en
// staging sin login en /, /explorar, /forgot-password.
//
// Data empírica del script sentry-query-cue1.ts (32 events prod):
// 66% events son guests (`has_storage_session=false`).
// Distribución transaction: `/` 9 (28%), /proveedor 7 (22%),
// /security-logout 5 (16%), /forgot-password 2 (6%), otros.
//
// Sub-experimentos:
//   A3.a — Guest en / (landing).
//   A3.b — Guest en /explorar (catálogo, otro path público).
//   A3.c — Guest en /forgot-password (path público que fue el 6% events).
//
// Cero fix. Solo reportar cuelgue sí/no + evidencia (locks, warns, wall
// time).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

const CUELGUE_WAIT_MS = 18_000;

async function capturarLocks(page: import('@playwright/test').Page): Promise<unknown> {
    return await page.evaluate(async () => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nav = navigator as any;
            if (!nav.locks?.query) return { error: 'navigator.locks.query no disponible' };
            return await nav.locks.query();
        } catch (err) {
            return { error: (err as Error).message };
        }
    });
}

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
// A3.a — Guest en / (landing)
// ---------------------------------------------------------------------------
test('[A3.a] Guest en / (landing) — cuelgue sí/no', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    const { warnings } = trackearWarnings(page);

    const t0 = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(CUELGUE_WAIT_MS);
    const locks = await capturarLocks(page);
    const wallMs = Date.now() - t0;

    console.log(`[A3.a] wall=${wallMs}ms | warns=${warnings.length} | locks=${JSON.stringify(locks).slice(0, 400)}`);
    if (warnings.length > 0) console.log(`[A3.a] SAMPLE WARN: ${warnings[0].slice(0, 300)}`);
    expect(locks).toBeDefined();
    await ctx.close();
});

// ---------------------------------------------------------------------------
// A3.b — Guest en /explorar (catálogo)
// ---------------------------------------------------------------------------
test('[A3.b] Guest en /explorar (catálogo) — cuelgue sí/no', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    const { warnings } = trackearWarnings(page);

    const t0 = Date.now();
    await page.goto('/explorar', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(CUELGUE_WAIT_MS);
    const locks = await capturarLocks(page);
    const wallMs = Date.now() - t0;

    console.log(`[A3.b] wall=${wallMs}ms | warns=${warnings.length} | locks=${JSON.stringify(locks).slice(0, 400)}`);
    if (warnings.length > 0) console.log(`[A3.b] SAMPLE WARN: ${warnings[0].slice(0, 300)}`);
    expect(locks).toBeDefined();
    await ctx.close();
});

// ---------------------------------------------------------------------------
// A3.c — Guest en /forgot-password
// ---------------------------------------------------------------------------
// Este path apareció 2 veces en events prod. El PO smokeó allí — puede ser
// ruido del PO o cuelgue real. Reproducir empíricamente.
test('[A3.c] Guest en /forgot-password — cuelgue sí/no', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    const { warnings } = trackearWarnings(page);

    const t0 = Date.now();
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(CUELGUE_WAIT_MS);
    const locks = await capturarLocks(page);
    const wallMs = Date.now() - t0;

    console.log(`[A3.c] wall=${wallMs}ms | warns=${warnings.length} | locks=${JSON.stringify(locks).slice(0, 400)}`);
    if (warnings.length > 0) console.log(`[A3.c] SAMPLE WARN: ${warnings[0].slice(0, 300)}`);
    expect(locks).toBeDefined();
    await ctx.close();
});
