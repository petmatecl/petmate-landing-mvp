// playwright.config.ts
// ---------------------------------------------------------------------------
// Configuracion de e2e para Pawnecta — apunta EXCLUSIVAMENTE a staging.
//
// Guardas anti-prod: los helpers assertBaseUrlIsStaging() y assertBypass()
// throwean al arranque si algo huele mal (baseURL con "pawnecta.com" sin
// prefijo staging, PLAYWRIGHT_BYPASS vacio, etc). Ejecucion contra prod
// requeriria comentar/borrar estas guardas explicitamente — imposible por
// accidente.
//
// Auth: setup project autentica una vez, guarda storageState en
// e2e/.auth/admin.json, y el resto de tests lo reusan. .auth/ y .env.test
// estan gitignoreados.
//
// Correr: `npm run test:e2e` (headless). `npm run test:e2e:ui` (interactivo).
// ---------------------------------------------------------------------------
import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Carga .env.test desde e2e/. NO usa .env de la app — separacion explicita.
loadEnv({ path: path.resolve(__dirname, 'e2e/.env.test') });

// URL de staging por default. Sobreescribible por PLAYWRIGHT_BASE_URL, pero
// las guardas debajo bloquean cualquier apunte a prod.
const STAGING_URL = 'https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || STAGING_URL;

// Guarda 1: baseURL NUNCA puede apuntar a prod. Chequea host explicito por
// substring "pawnecta.com" sin el prefijo git-staging.
function assertBaseUrlIsStaging(url: string): void {
    let host: string;
    try {
        host = new URL(url).hostname;
    } catch {
        throw new Error(`[playwright.config] baseURL invalida: "${url}"`);
    }
    if (host === 'pawnecta.com' || host === 'www.pawnecta.com') {
        throw new Error(
            `[playwright.config] baseURL apunta a producción (${host}). ` +
            `Los tests e2e SOLO corren contra staging. ` +
            `Ajusta PLAYWRIGHT_BASE_URL a la URL del branch staging de Vercel.`
        );
    }
    if (!host.includes('git-staging') && !host.includes('staging')) {
        throw new Error(
            `[playwright.config] baseURL "${host}" no parece ser staging. ` +
            `Los tests deben apuntar a una URL con "git-staging" o "staging" en el host. ` +
            `Ajusta PLAYWRIGHT_BASE_URL para confirmar el destino.`
        );
    }
}

// Guarda 2: PLAYWRIGHT_BYPASS (bypass de Vercel protection) requerido.
// Sin esto, Vercel bloquea el request con auth prompt y los tests fallan
// con un mensaje confuso — mejor throwear en la config.
function assertBypass(): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS;
    if (!bypass || bypass.trim().length === 0) {
        throw new Error(
            `[playwright.config] PLAYWRIGHT_BYPASS no seteado. ` +
            `Necesitas el x-vercel-protection-bypass token para acceder a staging. ` +
            `Copialo desde el dashboard de Vercel (project → Settings → Deployment Protection) ` +
            `y agregalo a e2e/.env.test como PLAYWRIGHT_BYPASS=<token>.`
        );
    }
    return bypass;
}

assertBaseUrlIsStaging(baseURL);
const vercelBypass = assertBypass();

export default defineConfig({
    testDir: './e2e',
    // Skip archivos que no son specs (setup, fixtures, README, .env, etc).
    testMatch: /.*\.spec\.ts$/,
    // Timeout generoso: staging Vercel puede ser mas lento que prod (cold
    // starts frecuentes, deploys en paralelo). 60s por test antes de fail.
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    // fullyParallel true = tests dentro de un file corren en paralelo. Los
    // tests que muten estado del mismo servicio deben usar test.describe.serial().
    fullyParallel: true,
    // Fail rapido en CI si tests estan flakeando por bugs de codigo (evita
    // que un test se pase por retry). En local, 1 retry por tolerancia a
    // hiccups de red hacia staging.
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 0 : 1,
    workers: process.env.CI ? 2 : undefined,
    // Reporter: HTML + list. HTML se guarda en e2e/.report (gitignored) y se
    // sirve con `npm run test:e2e:report`.
    reporter: [
        ['list'],
        ['html', { outputFolder: 'e2e/.report', open: 'never' }],
    ],
    use: {
        baseURL,
        // Bypass del protection de Vercel. Todos los requests HTTP/nav
        // llevan este header automaticamente.
        extraHTTPHeaders: {
            'x-vercel-protection-bypass': vercelBypass,
        },
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Timezone y locale forzados a Chile — matchea el runtime de la app
        // (formatFecha con Intl TZ Chile). Sin esto, los checks de "hoy" o
        // rangos de fechas podrian drifear por TZ del sistema.
        timezoneId: 'America/Santiago',
        locale: 'es-CL',
    },
    // Setup project corre primero y genera storageState. El resto de projects
    // dependen de setup — si login falla, la suite entera aborta con un solo
    // error claro en vez de cascadas de "unauthorized".
    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.ts$/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/admin.json',
            },
            dependencies: ['setup'],
        },
    ],
});
