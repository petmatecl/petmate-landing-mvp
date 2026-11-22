// playwright.config.prod.ts
// ---------------------------------------------------------------------------
// Sprint SMOKE-PROD-DIARIO (2026-11-23) — Config DEDICADO para el smoke
// diario contra producción (https://www.pawnecta.com).
//
// ¿Por qué un config separado del playwright.config.ts canónico?
//
// El config canónico tiene 3 guardas duras que throwean al arranque:
//   - assertBaseUrlIsNotProd() → bloquea cualquier URL de prod.
//   - assertBypass() → exige PLAYWRIGHT_BYPASS (Vercel protection token).
//   - assertCredencialesReales() → exige E2E_STAGING_EMAIL/PASSWORD.
//
// Esas guardas existen para que la suite e2e NUNCA toque prod por accidente
// y SIEMPRE corra contra staging. Correcto para la suite completa.
//
// El smoke-prod-diario es EXCEPCIÓN deliberada:
//   - Navegación ANÓNIMA contra prod (cero login, cero mutation).
//   - Workflow dedicado (.github/workflows/smoke-prod-diario.yml) con cron
//     diario — alerta al PO vía Telegram + email si algún spec falla.
//   - Scope: verificar que los 5 flujos críticos públicos cargan sin error.
//   - Zero overlap con la suite e2e normal: testDir distinto, config distinto,
//     specs distintos (e2e/specs/smoke-prod/*.spec.ts).
//
// La regla operativa de CLAUDE.md § "PROHIBIDO navegar producción con cuentas
// reales" se respeta porque la navegación es 100% anónima (cero storageState,
// cero signIn, cero API calls autenticadas). "Prod se navega solo con browsing
// anónimo (sin login) para smokes públicos" — cita textual de la misma regla.
// Este config es la materialización de ese uso permitido.
// ---------------------------------------------------------------------------
import { defineConfig, devices } from '@playwright/test';

const PROD_URL = 'https://www.pawnecta.com';
const baseURL = process.env.PLAYWRIGHT_BASE_URL_PROD || PROD_URL;

export default defineConfig({
    testDir: './e2e/specs/smoke-prod',
    testMatch: /.*\.spec\.ts$/,
    // Timeout tight: prod debería responder rápido. Si algún spec tarda
    // más de 30s hay señal real (cold start severo, 5xx, red caída).
    timeout: 30_000,
    expect: {
        timeout: 10_000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // 1 retry antes de alertar — prescribe PO 2026-11-23 § criterios de
    // resiliencia. Si falla el retry, el workflow alerta.
    retries: 1,
    workers: process.env.CI ? 2 : undefined,
    // Reporter: list (human readable) + json (parseable para el workflow
    // que detecta specs fallidos + construye mensaje de alerta).
    reporter: [
        ['list'],
        ['json', { outputFile: 'smoke-prod-results.json' }],
    ],
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        timezoneId: 'America/Santiago',
        locale: 'es-CL',
        // Zero storageState → navegación anónima. Cero cookies de sesión.
        // Cero contacto con datos de users reales de prod.
        storageState: { cookies: [], origins: [] },
    },
    projects: [
        {
            name: 'smoke-prod-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
