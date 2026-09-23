/**
 * scripts/a2-sw-matrix.ts
 *
 * Sprint cue-1-fix · fase A2 (Ruta 1) — matriz 4 celdas de Service Worker real.
 * Fuera del CI: script Playwright standalone que asume `next start` en :3000
 * levantado localmente con NEXT_PUBLIC_APP_ENV=production apuntando a staging.
 *
 * Precisión PO 2026-09-23: A2 no queda pendiente de pase manual. Se ejecuta
 * con Playwright, capturando en cada celda:
 *   - navigator.serviceWorker.controller (registrado sí/no + scriptURL).
 *   - navigator.locks.query() (dump held+pending).
 *   - Loading resuelve en <15s (mide tiempo hasta que UserContext.isLoading
 *     pasa a false — via `document.querySelector('[data-user-context-loaded]')`
 *     o proxy equivalente, con fallback a "sigue loading" tras 15s).
 *
 * Matriz:
 *   A2.a — SW registrado, guest.
 *   A2.b — SW desregistrado en runtime pre-navegación, guest.
 *   A2.c — SW registrado, autenticado proveedor 1 tab.
 *   A2.d — SW registrado, autenticado proveedor 2 tabs simultáneos.
 *
 * Uso:
 *   1. Terminal 1 (server):
 *      NEXT_PUBLIC_APP_ENV=production \
 *      NEXT_PUBLIC_SUPABASE_URL=<staging_url> \
 *      NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging_anon> \
 *      npm run build && npm run start
 *   2. Terminal 2 (script):
 *      npx tsx scripts/a2-sw-matrix.ts
 *
 * El script asume server ya running en http://localhost:3000. Timeout 5s en
 * conexión inicial para fallar loud si el server no está.
 */
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { config as loadEnv } from 'dotenv';

// Cargar .env.test para tomar E2E_SUPABASE_URL etc. — solo para verificación.
loadEnv({ path: path.resolve(process.cwd(), 'e2e/.env.test') });

const BASE_URL = process.env.A2_BASE_URL || 'http://localhost:3000';
const CUELGUE_WAIT_MS = 15_000;
const STORAGE_STATE_PROVEEDOR = path.resolve(process.cwd(), 'e2e/.auth/proveedor.json');

type CeldaResult = {
    name: string;
    swController: string | null;
    swControllerScript: string | null;
    locksHeld: number;
    locksPending: number;
    locksDump: unknown;
    loadingResolvedMs: number | null;   // null = sigue loading tras timeout.
    wallMs: number;
    error: string | null;
};

async function preflightServer(): Promise<void> {
    try {
        const resp = await fetch(`${BASE_URL}/sw.js`, { signal: AbortSignal.timeout(5_000) });
        if (!resp.ok) {
            throw new Error(`GET /sw.js retornó ${resp.status}`);
        }
        const body = await resp.text();
        const isReal = body.includes('precacheAndRoute') && body.includes('registerRoute');
        const isDemol = body.includes('unregister()') && body.length < 2000;
        console.log(`[preflight] /sw.js served OK — size=${body.length} bytes | workbox_real=${isReal} | demoledor=${isDemol}`);
        if (!isReal) {
            throw new Error('[preflight] /sw.js NO es workbox real. ¿Levantaste next start con NEXT_PUBLIC_APP_ENV=production?');
        }
    } catch (err) {
        console.error(`[preflight] FALLA: ${(err as Error).message}`);
        console.error(`[preflight] Confirma que next start esté en ${BASE_URL} con build IS_PROD.`);
        process.exit(2);
    }
}

async function medirCelda(
    ctx: BrowserContext,
    ruta: string,
    ceceldaName: string,
    desregistrarSw = false,
): Promise<CeldaResult> {
    const page = await ctx.newPage();
    const warnings: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'warning' && msg.text().includes('user_context_stuck')) {
            warnings.push(msg.text());
        }
    });

    const t0 = Date.now();
    const result: CeldaResult = {
        name: ceceldaName,
        swController: null,
        swControllerScript: null,
        locksHeld: 0,
        locksPending: 0,
        locksDump: null,
        loadingResolvedMs: null,
        wallMs: 0,
        error: null,
    };

    try {
        // Si se pidió desregistrar, navegamos primero a un placeholder,
        // desregistramos, luego navegamos a la ruta target.
        if (desregistrarSw) {
            await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
            await page.evaluate(async () => {
                if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const r of regs) await r.unregister();
                }
                // Purga caches para que el próximo request no vuelva del cache.
                if ('caches' in self) {
                    const keys = await caches.keys();
                    for (const k of keys) await caches.delete(k);
                }
            });
        }

        await page.goto(`${BASE_URL}${ruta}`, { waitUntil: 'domcontentloaded' });

        // Poll cada 500ms hasta CUELGUE_WAIT_MS por señal de "loading resolvió".
        // Señal proxy: el <body> deja de estar en el estado "isLoading=true"
        // del UserContext. Sin un data-testid dedicado, usamos heurística:
        // buscar cualquier <main> visible con contenido (que solo aparece
        // post-hidratación en la mayoría de las rutas).
        const pollStart = Date.now();
        while (Date.now() - pollStart < CUELGUE_WAIT_MS) {
            const resolved = await page.evaluate(() => {
                // Heurística: el UserContext expone isLoading via clase o
                // el <main> tiene contenido visible.
                const main = document.querySelector('main');
                if (main && main.textContent && main.textContent.trim().length > 20) return true;
                // Fallback: la landing tiene el hero renderizado con altura.
                const hero = document.querySelector('h1');
                return !!hero;
            });
            if (resolved) {
                result.loadingResolvedMs = Date.now() - pollStart;
                break;
            }
            await new Promise((r) => setTimeout(r, 500));
        }

        // Captura SW controller.
        const swInfo = await page.evaluate(() => {
            const c = navigator.serviceWorker?.controller;
            return {
                exists: !!c,
                scriptURL: c?.scriptURL ?? null,
                state: c?.state ?? null,
            };
        });
        result.swController = swInfo.exists ? 'yes' : 'no';
        result.swControllerScript = swInfo.scriptURL;

        // Captura navigator.locks.query().
        const locks = await page.evaluate(async () => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const nav = navigator as any;
                if (!nav.locks?.query) return { error: 'navigator.locks.query no disponible' };
                return await nav.locks.query();
            } catch (err) {
                return { error: (err as Error).message };
            }
        });
        result.locksDump = locks;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const l = locks as any;
        result.locksHeld = Array.isArray(l?.held) ? l.held.length : 0;
        result.locksPending = Array.isArray(l?.pending) ? l.pending.length : 0;
    } catch (err) {
        result.error = (err as Error).message;
    } finally {
        result.wallMs = Date.now() - t0;
        await page.close();
    }

    // Anexa warns si hubo.
    if (warnings.length > 0) {
        result.error = (result.error ?? '') + ` | warns=${warnings.length} sample=${warnings[0].slice(0, 200)}`;
    }

    return result;
}

async function main() {
    await preflightServer();

    const browser: Browser = await chromium.launch({ headless: true });
    const results: CeldaResult[] = [];

    try {
        // ---- A2.a — SW registrado, guest, /.
        {
            const ctx = await browser.newContext({ storageState: undefined });
            results.push(await medirCelda(ctx, '/', 'A2.a — SW registrado, guest, /'));
            await ctx.close();
        }

        // ---- A2.b — SW desregistrado runtime, guest, /.
        {
            const ctx = await browser.newContext({ storageState: undefined });
            results.push(await medirCelda(ctx, '/', 'A2.b — SW desregistrado, guest, /', /*desregistrar*/ true));
            await ctx.close();
        }

        // ---- A2.c — SW registrado, autenticado proveedor 1 tab, /proveedor.
        {
            if (!fs.existsSync(STORAGE_STATE_PROVEEDOR)) {
                console.warn(`[A2.c] storageState proveedor no existe (${STORAGE_STATE_PROVEEDOR}) — skip`);
                results.push({
                    name: 'A2.c — SW registrado, auth 1 tab, /proveedor',
                    swController: null, swControllerScript: null, locksHeld: 0, locksPending: 0, locksDump: null,
                    loadingResolvedMs: null, wallMs: 0, error: 'storageState proveedor no existe',
                });
            } else {
                const ctx = await browser.newContext({ storageState: STORAGE_STATE_PROVEEDOR });
                results.push(await medirCelda(ctx, '/proveedor', 'A2.c — SW registrado, auth 1 tab, /proveedor'));
                await ctx.close();
            }
        }

        // ---- A2.d — SW registrado, autenticado proveedor 2 tabs, /proveedor.
        {
            if (!fs.existsSync(STORAGE_STATE_PROVEEDOR)) {
                results.push({
                    name: 'A2.d — SW registrado, auth 2 tabs, /proveedor',
                    swController: null, swControllerScript: null, locksHeld: 0, locksPending: 0, locksDump: null,
                    loadingResolvedMs: null, wallMs: 0, error: 'storageState proveedor no existe',
                });
            } else {
                const ctx = await browser.newContext({ storageState: STORAGE_STATE_PROVEEDOR });
                // 2 tabs simultáneas — Promise.all para asignar carga en el
                // mismo instante (contención cross-tab máxima).
                const t0 = Date.now();
                const [r1, r2] = await Promise.all([
                    medirCelda(ctx, '/proveedor', 'A2.d1 — SW reg, auth tab1, /proveedor'),
                    medirCelda(ctx, '/proveedor', 'A2.d2 — SW reg, auth tab2, /proveedor'),
                ]);
                results.push(r1, r2);
                console.log(`[A2.d] cross-tab wall total=${Date.now() - t0}ms`);
                await ctx.close();
            }
        }
    } finally {
        await browser.close();
    }

    // Reporte.
    console.log('\n=== A2 · Matriz Ruta 1 · Resultados ===\n');
    for (const r of results) {
        console.log(`\n${r.name}`);
        console.log(`  SW controller: ${r.swController} (${r.swControllerScript ?? '—'})`);
        console.log(`  Locks: held=${r.locksHeld} pending=${r.locksPending}`);
        console.log(`  Locks dump: ${JSON.stringify(r.locksDump).slice(0, 300)}`);
        console.log(`  Loading resolvió: ${r.loadingResolvedMs !== null ? r.loadingResolvedMs + 'ms' : 'NO (>15s)'}`);
        console.log(`  Wall total: ${r.wallMs}ms`);
        if (r.error) console.log(`  Error/warns: ${r.error}`);
    }

    // Guardar JSON para referencia.
    const outPath = path.resolve(process.cwd(), 'docs/sprints/cue-1-fix-a2-resultados.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\n[write] Resultados JSON: ${outPath}`);
}

main().catch((err) => {
    console.error('[fatal]', err);
    process.exit(1);
});
