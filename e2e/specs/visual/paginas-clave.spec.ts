// e2e/specs/visual/paginas-clave.spec.ts
// ---------------------------------------------------------------------------
// Bloque G · G-3 seed visual regression (2026-09-15) — spec de baseline
// visual para BUTTON-CANON incremental. Captura pixel-por-pixel de las
// 7 páginas clave del producto en desktop y mobile.
//
// PROPÓSITO:
//   Antes de refactorear los ~25 botones restantes al componente <Button>
//   canónico, generar snapshots baseline y correr este spec en cada PR
//   incremental de BUTTON-CANON. Si un refactor produce cualquier drift
//   visual (píxel distinto por focus ring, letter-spacing, shadow, radius),
//   el spec falla con diff PNG adjunto — evidencia inequívoca de cambio
//   observable por el usuario. Sin diff → cero cambio observable, PR
//   apto para merge.
//
// UMBRAL PIXELES (por definición PO "bajo y explícito"):
//   threshold: 0.02 (2% de píxeles pueden diferir)
//   maxDiffPixels: 100 (máximo 100 píxeles absolutos, además del %)
//   Combinación defensiva: cualquier variación menor (anti-aliasing,
//   sub-pixel rendering) NO rompe; cualquier cambio de layout o color
//   sí. Ajustable si demuestra ser demasiado estricto en el seed run.
//
// BASE IMAGES:
//   Generadas por el runner CI Linux vía workflow_dispatch de
//   .github/workflows/visual-update-snapshots.yml. NO generar en Windows —
//   las fuentes del sistema difieren y todos los tests fallarían por
//   letter-spacing sub-pixel. Los snapshots viven en
//   e2e/specs/visual/paginas-clave.spec.ts-snapshots/ (committeados en repo).
//
// AUTH:
//   4 páginas públicas (home, explorar, ficha, login) sin auth.
//   2 páginas proveedor (/proveedor, /admin) con storageState proveedor
//   (Aldo — tiene rol admin además de proveedor).
//   1 página tutora (/mis-reservas) con storageState tutor (Camila).
//   test.use({ storageState }) por describe.
// ---------------------------------------------------------------------------
import { test, expect, type Page } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Gate del PR seed (2026-09-15): los tests visuales se skipean automáticamente
// mientras no exista el directorio de snapshots baseline. Post-merge, PO/auditor
// dispara el workflow `visual-update-snapshots` desde main → genera los 14
// PNGs baseline → commit al branch main. A partir de ahí este check pasa y
// los tests corren normalmente en cada PR.
//
// Sin este gate, el PR seed no podría mergearse con checks verdes: el spec
// fallaría con "snapshot doesn't exist" en primera corrida CI. Con el gate,
// el spec queda listo para activarse solo cuando la infra completa esté en
// su lugar. Cero acción manual post-baseline — el existsSync flip lo activa.
//
// Sprint bloque-i I-3 bootstrap (2026-09-17): agregar bypass del skip cuando
// `PLAYWRIGHT_VISUAL_BOOTSTRAP=1` está seteado — necesario para que el
// workflow `visual-update-snapshots` pueda ejecutar los 14 tests con
// `--update-snapshots` la PRIMERA vez (antes existe el dir). Sin el bypass,
// chicken-and-egg: los tests skipean → cero snapshots → dir no se crea →
// tests siempre skipean. Post-bootstrap el flag no es necesario (existsSync
// ya retorna true y el skip queda deshabilitado por default).
const SNAPSHOT_DIR = join(__dirname, 'paginas-clave.spec.ts-snapshots');
const BASELINES_EXIST = existsSync(SNAPSHOT_DIR);
const BOOTSTRAP = process.env.PLAYWRIGHT_VISUAL_BOOTSTRAP === '1';
test.skip(!BASELINES_EXIST && !BOOTSTRAP, 'Visual regression baselines pending — correr workflow visual-update-snapshots desde main una vez para generarlos (o setear PLAYWRIGHT_VISUAL_BOOTSTRAP=1 en el bootstrap inicial)');

// Umbral canónico del sprint. Cualquier ajuste requiere GO PO explícito.
const SNAPSHOT_OPTS = {
    threshold: 0.02,
    maxDiffPixels: 100,
    // Máscara de zonas dinámicas comunes (fecha "hace X minutos", counters
    // en tiempo real). Se puede extender por-test si aparece drift en alguna
    // superficie específica.
    maxDiffPixelRatio: 0.02,
    // animations: 'disabled' para que motion no genere flakiness entre
    // capturas — el snapshot es del estado final estático.
    animations: 'disabled' as const,
    // caret: 'hide' — el cursor de input no debe capturarse.
    caret: 'hide' as const,
};

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
] as const;

/**
 * Espera network idle + fuentes cargadas para estabilizar la captura antes
 * del snapshot. Sin esto, el screenshot puede tomarse antes de que la
 * web-font swap termine y el diff explota por letter-spacing.
 */
async function waitForStablePaint(page: Page) {
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => { /* aceptable si algún poll queda abierto */ });
    // Web fonts — la Promise resuelve cuando todas las @font-face han cargado.
    await page.evaluate(() => (document as any).fonts?.ready ?? Promise.resolve());
    // Buffer chico para animaciones CSS finales (transition-in de banner,
    // fade-in de imágenes lazy).
    await page.waitForTimeout(300);
}

// ═══════════════════════════════════════════════════════════════════════════
// Público (sin auth) — 4 páginas × 2 viewports = 8 snapshots
// ═══════════════════════════════════════════════════════════════════════════

test.describe('visual público', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    for (const vp of VIEWPORTS) {
        test.describe(`viewport ${vp.name} ${vp.width}x${vp.height}`, () => {
            test.use({ viewport: { width: vp.width, height: vp.height } });

            test(`home (/)`, async ({ page }) => {
                await page.goto('/');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`home-${vp.name}.png`, SNAPSHOT_OPTS);
            });

            test(`explorar (/explorar)`, async ({ page }) => {
                await page.goto('/explorar');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`explorar-${vp.name}.png`, SNAPSHOT_OPTS);
            });

            test(`login (/login)`, async ({ page }) => {
                await page.goto('/login');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`login-${vp.name}.png`, SNAPSHOT_OPTS);
            });

            test(`ficha de servicio (/servicio/[id])`, async ({ page }) => {
                // Sprint bloque-j J-1 (2026-09-21) — navegación directa al
                // seed servicio estable, en vez de buscar el primer link en
                // /explorar como anon (fallaba: staging no muestra servicios
                // públicos al visitante sin sesión con la data actual, y el
                // click no encontraba target → cero snapshot).
                //
                // Seed usado: c1000001-0000-4000-8000-000000000006 —
                // "Adiestramiento canino con refuerzo positivo en Vitacura y
                // comunas cercanas" — creado 2026-05-05, 498 chars de
                // descripción, 4 fotos. Verificado activo via
                // supabase-prod-ro 2026-09-21. Mismo seed usa el spec de
                // visits-doble (idempotencia contador) — patrón compartido
                // que evita dependencia de listing anon.
                const SEED_SERVICIO = 'c1000001-0000-4000-8000-000000000006';
                await page.goto(`/servicio/${SEED_SERVICIO}`);
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`ficha-servicio-${vp.name}.png`, SNAPSHOT_OPTS);
            });
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// Proveedor + admin (auth proveedor con rol admin) — 2 páginas × 2 vp = 4
// ═══════════════════════════════════════════════════════════════════════════

test.describe('visual proveedor + admin', () => {
    test.use({ storageState: 'e2e/.auth/proveedor.json' });

    for (const vp of VIEWPORTS) {
        test.describe(`viewport ${vp.name} ${vp.width}x${vp.height}`, () => {
            test.use({ viewport: { width: vp.width, height: vp.height } });

            test(`panel proveedor (/proveedor)`, async ({ page }) => {
                await page.goto('/proveedor');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`proveedor-${vp.name}.png`, SNAPSHOT_OPTS);
            });

            test(`panel admin (/admin)`, async ({ page }) => {
                await page.goto('/admin');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`admin-${vp.name}.png`, SNAPSHOT_OPTS);
            });
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// Tutor (auth tutor) — 1 página × 2 viewports = 2 snapshots
// ═══════════════════════════════════════════════════════════════════════════

test.describe('visual tutor', () => {
    test.use({ storageState: 'e2e/.auth/tutor.json' });

    for (const vp of VIEWPORTS) {
        test.describe(`viewport ${vp.name} ${vp.width}x${vp.height}`, () => {
            test.use({ viewport: { width: vp.width, height: vp.height } });

            test(`mis-reservas (/mis-reservas)`, async ({ page }) => {
                await page.goto('/mis-reservas');
                await waitForStablePaint(page);
                await expect(page).toHaveScreenshot(`mis-reservas-${vp.name}.png`, SNAPSHOT_OPTS);
            });
        });
    }
});

// Total: 8 (público) + 4 (proveedor+admin) + 2 (tutor) = 14 snapshots.
// Base images generadas por CI runner Linux via workflow_dispatch
// visual-update-snapshots.yml.
