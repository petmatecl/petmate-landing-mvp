// e2e/specs/sentry/gate.spec.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — smoke del gate de producción.
//
// Corre POST /api/admin/sentry-smoke con sesión admin y valida:
//   - En preview / staging: gate.enabled === false, sent === false, eventId === null.
//     (El endpoint llama Sentry.captureException pero el SDK devuelve '' porque
//      enabled=false, así que no sale nada a Sentry.)
//   - En prod: gate.enabled === true, sent === true, eventId es un UUID.
//
// El mismo spec corre contra cualquier baseURL — el endpoint devuelve el
// env real (VERCEL_ENV) en gate.env, así el test se adapta.
//
// Reutilizable post-merge para validar el mismo gate en prod (basta con
// PLAYWRIGHT_BASE_URL=https://www.pawnecta.com).
// ----------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

test.describe('R3 SENTRY-1 — gate de producción', () => {
    test('gate rechaza envío en preview/staging, acepta en prod', async ({ page, request }) => {
        // Autenticar navegando a una ruta protegida (fuerza carga del storageState).
        await page.goto('/proveedor');
        await page.waitForLoadState('domcontentloaded');

        // Extraer JWT del localStorage (patrón id-only del proyecto).
        const token = await page.evaluate(() => {
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i)!;
                if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    try {
                        const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
                        return parsed.access_token as string;
                    } catch { /* ignore */ }
                }
            }
            return null;
        });
        expect(token).toBeTruthy();

        const baseURL = new URL(page.url()).origin;
        const resp = await request.post(`${baseURL}/api/admin/sentry-smoke`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        expect(resp.status()).toBe(200);
        const body = await resp.json();

        // Log evidencia para el reporte (aparece en el output de Playwright).
        console.log('[sentry-smoke]', JSON.stringify(body, null, 2));

        // Aserciones estructurales — el shape siempre debe ser consistente.
        expect(body).toHaveProperty('sent');
        expect(body).toHaveProperty('eventId');
        expect(body.gate).toHaveProperty('env');
        expect(body.gate).toHaveProperty('enabled');
        expect(body.gate).toHaveProperty('dsn_configured');
        // Adaptativo al entorno — el mismo spec se comporta correctamente
        // en 3 escenarios: DSN missing (Aldo aún no configuró), gate cerrado
        // (preview/staging), gate abierto (prod).
        if (!body.gate.dsn_configured) {
            // DSN no configurado en el env de Vercel — Sentry init es no-op,
            // no envía nada. El gate ni siquiera importa.
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
        } else if (body.gate.env === 'production') {
            expect(body.gate.enabled).toBe(true);
            expect(body.sent).toBe(true);
            expect(body.eventId).toMatch(/^[a-f0-9]{32}$/); // Sentry event id
        } else {
            expect(body.gate.enabled).toBe(false);
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
        }
    });
});
