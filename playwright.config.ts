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
    if (bypass === 'cambiame') {
        throw new Error(
            `[playwright.config] PLAYWRIGHT_BYPASS todavía tiene el valor placeholder ("cambiame") ` +
            `del template. Copiá el template a e2e/.env.test y reemplazá los valores por los reales.`
        );
    }
    return bypass;
}

// Guarda 3: credenciales de auth deben estar seteadas y NO ser placeholders.
// El chequeo aquí ahorra un timeout de 60s del setup si Aldo olvidó rellenar.
function assertCredencialesReales(): void {
    const email = process.env.E2E_STAGING_EMAIL;
    const password = process.env.E2E_STAGING_PASSWORD;
    if (!email || !password) {
        throw new Error(
            `[playwright.config] E2E_STAGING_EMAIL o E2E_STAGING_PASSWORD no seteados en e2e/.env.test.`
        );
    }
    if (email === 'usuario@ejemplo.cl' || password === 'cambiame') {
        throw new Error(
            `[playwright.config] E2E_STAGING_EMAIL / E2E_STAGING_PASSWORD tienen los valores placeholder ` +
            `del template. Reemplazalos por las credenciales reales del usuario staging antes de correr la suite.`
        );
    }
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!anonKey || anonKey === 'cambiame') {
        throw new Error(
            `[playwright.config] E2E_SUPABASE_ANON_KEY no está seteado (o sigue con placeholder "cambiame"). ` +
            `Copiá el anon key del proyecto Supabase staging desde Vercel dashboard → project → ` +
            `Settings → Environment Variables → NEXT_PUBLIC_SUPABASE_ANON_KEY (o Supabase dashboard → ` +
            `Project Settings → API → Project API keys → anon public).`
        );
    }
    // Credenciales del tutor (F2-3-E): opcionales — si no están seteadas, la
    // suite del tutor se skipea con mensaje claro. Solo verificamos que no
    // queden en el placeholder cuando la env var existe.
    const tutorEmail = process.env.E2E_STAGING_TUTOR_EMAIL;
    const tutorPassword = process.env.E2E_STAGING_TUTOR_PASSWORD;
    if (tutorEmail && (tutorEmail === 'camila@ejemplo.cl' || tutorPassword === 'cambiame')) {
        throw new Error(
            `[playwright.config] E2E_STAGING_TUTOR_EMAIL / E2E_STAGING_TUTOR_PASSWORD tienen valores ` +
            `placeholder del template. Rellenalos con las credenciales reales de Camila (tutora pura staging) ` +
            `o borralos si no vas a correr los specs de F2-3.`
        );
    }
}

assertBaseUrlIsStaging(baseURL);
// El token se valida acá y se lee en authenticate.ts + endpointUrl() como
// query param en la URL. Ya no se pasa como header persistente (ver comentario
// del bloque `use` abajo).
assertBypass();
assertCredencialesReales();

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
        // Bypass del Vercel Deployment Protection — patrón query en URL.
        //
        // HISTÓRICO (removido 2026-07-30): antes usábamos `extraHTTPHeaders`
        // global con `x-vercel-protection-bypass` + `x-vercel-set-bypass-cookie:
        // 'true'` para que Vercel emitiera la cookie `_vercel_jwt` y la sesión
        // persistiera sin depender del header. Ese patrón dejó de funcionar en
        // las últimas horas del 2026-07-30: Vercel hace ahora un strict
        // handshake — si el header está presente en la request, siempre
        // responde 307 al mismo URL esperando que la próxima venga solo con
        // la cookie. Como Playwright reenvía `extraHTTPHeaders` en cada
        // redirect, entra en loop infinito (ERR_TOO_MANY_REDIRECTS).
        // Verificado empíricamente con curl -L en preview next15 y en staging
        // (mismo síntoma en ambos).
        //
        // ACTUAL: cero header persistente. El bypass se pasa como query param
        // en la URL del PRIMER navigate:
        //   - Setups (`authenticate.ts:33-37`): construye
        //     `/login?x-vercel-protection-bypass=<token>&x-vercel-set-bypass-cookie=samesitenone`
        //     — Vercel valida, emite Set-Cookie: _vercel_jwt=..., y redirige
        //     a la URL limpia. El browser context de Playwright persiste la
        //     cookie; el resto del setup + specs navegan sin query.
        //   - API tests (specs/f2-recordatorios-cron/all.spec.ts): usan el
        //     helper `endpointUrl()` de e2e/fixtures/cron-recordatorio.ts que
        //     agrega el query bypass a cada URL de endpoint. Vercel hace el
        //     handshake once, la cookie se aplica dentro del `request.newContext`,
        //     y el segundo hop llega al endpoint sin header ni query.
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Timezone y locale forzados a Chile — matchea el runtime de la app
        // (formatFecha con Intl TZ Chile). Sin esto, los checks de "hoy" o
        // rangos de fechas podrian drifear por TZ del sistema.
        timezoneId: 'America/Santiago',
        locale: 'es-CL',
    },
    // Setup projects corren primero y generan storageStates. Cada rol
    // (proveedor, tutor) tiene su propio setup + project chromium con su
    // storageState. Los specs que necesitan un rol especifico declaran su
    // project via testMatch en la definicion abajo.
    //
    // Convencion de project name:
    //   * "setup"          → auth como proveedor (E2E_STAGING_EMAIL/PASSWORD).
    //   * "chromium"       → specs por default (F2-2B: editor de servicio).
    //   * "setup-tutor"    → auth como tutor puro (E2E_STAGING_TUTOR_*).
    //   * "chromium-tutor" → specs que corren como tutor (F2-3: reserva +
    //                        cancelacion desde /mis-solicitudes).
    projects: [
        {
            name: 'setup',
            testMatch: /setup[\\/]auth\.setup\.ts$/,
        },
        {
            name: 'setup-tutor',
            testMatch: /setup[\\/]auth-tutor\.setup\.ts$/,
        },
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/proveedor.json',
            },
            dependencies: ['setup'],
            // Specs default corren como proveedor, EXCEPTO los de f2-3 (tutor)
            // y los de f2-recordatorios-cron (API tests, project propio abajo).
            // Nota: zonab-1 corre bajo este project (proveedor con rol admin).
            testIgnore: /specs[\\/](f2-3|f2-recordatorios-cron)[\\/]/,
        },
        {
            name: 'chromium-tutor',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/tutor.json',
            },
            dependencies: ['setup-tutor'],
            // Solo specs del tutor: F2-3 (reserva + cancelacion). El auth-tutor
            // dispara si el spec matchea; sin specs matcheados, el setup-tutor
            // sigue corriendo pero es no-op eficaz.
            testMatch: /specs[\\/]f2-3[\\/].*\.spec\.ts$/,
        },
        {
            // Suite API del tren Recordatorios (R6). No usa browser — todos
            // los tests golpean el endpoint con `request.newContext`. Depende
            // de AMBOS setups porque los helpers necesitan getProveedorId +
            // getTutorId. La storageState del proveedor va acá por default
            // (los tests igual usan `request`, no `page`).
            name: 'chromium-cron',
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/proveedor.json',
            },
            dependencies: ['setup', 'setup-tutor'],
            testMatch: /specs[\\/]f2-recordatorios-cron[\\/].*\.spec\.ts$/,
        },
    ],
});
