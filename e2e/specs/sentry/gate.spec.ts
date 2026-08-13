// e2e/specs/sentry/gate.spec.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — smoke del gate + CSP del cliente.
//
// HISTORIA DEL BUG QUE ORIGINÓ ESTE SPEC (hotfix CSP 2026-08-11):
//   La versión previa de este spec solo pegaba /api/admin/sentry-smoke y
//   confiaba en el `sent: true` que reportaba el server. Ese check era
//   ciego al hecho de que Sentry.captureException server-side (Node.js)
//   NO pasa por CSP (CSP es política del navegador). En prod post-merge
//   sentry-1-prod-20260811 el server reportaba `sent: true` mientras el
//   navegador cortaba el envelope con "Refused to connect ... CSP".
//   Cero errores del cliente llegaron a Sentry por 30+ minutos.
//
// Por eso el spec cubre AHORA dos capas independientes:
//
//   Test 1 — CSP header contiene ingest Sentry (rápido, determinístico).
//     Verifica el header 'Content-Security-Policy' de cualquier página
//     de la app. Detecta el bug de CSP block ANTES de que un error real
//     tenga chance de dispararse. Corre en cualquier baseURL.
//
//   Test 2 — el navegador puede alcanzar el ingest sin CSP block.
//     Hace un fetch() real DESDE la página (page.evaluate) hacia el
//     endpoint envelope de Sentry. Si CSP lo bloquea, el fetch rechaza
//     con TypeError "Failed to fetch" y aparece un console error
//     "Refused to connect ...". Si CSP lo permite, el fetch obtiene una
//     respuesta HTTP (probablemente 400 por body vacío, pero el punto es
//     que llega al servidor sin corte de CSP).
//
//   Test 3 — el endpoint server reporta gate correcto (test viejo,
//     complementario). Server-side siempre es opaco al CSP; sirve para
//     validar que la env var NEXT_PUBLIC_SENTRY_DSN está configurada y
//     el gate lee VERCEL_ENV correctamente.
//
// Los tres cubren en conjunto el path completo: bundle→CSP→network→gate.
// ----------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

// URL del ingest de Sentry para la org 'pawnecta' (proyecto javascript-nextjs,
// region US). Formato: https://o<orgId>.ingest.us.sentry.io/api/<projectId>/envelope
// Los IDs vienen del DSN que Aldo entregó (public — aparece en el bundle
// cliente por diseño Sentry).
const SENTRY_INGEST_HOST = 'o4511905223016448.ingest.us.sentry.io';
const SENTRY_ENVELOPE_URL = `https://${SENTRY_INGEST_HOST}/api/4511905344847872/envelope/`;

test.describe('R3 SENTRY-1 — CSP + gate', () => {
    test('1) CSP header contiene el ingest de Sentry', async ({ request, baseURL }) => {
        // Ping cualquier página del app — el CSP viene en el header de todas.
        const resp = await request.get(baseURL || '/', { maxRedirects: 0 });
        const csp = resp.headers()['content-security-policy'];
        expect(csp, 'CSP header debe estar presente').toBeTruthy();

        // El bug del hotfix: connect-src no incluía el ingest.
        // Cualquier variante wildcard *.ingest.us.sentry.io o el host exacto
        // aprueba (el navegador matchea).
        const hasIngest = /\*\.ingest\.us\.sentry\.io|o\d+\.ingest\.us\.sentry\.io/.test(csp);
        expect(hasIngest, `connect-src debe permitir *.ingest.us.sentry.io — CSP actual: ${csp}`).toBe(true);
    });

    test('2) navegador alcanza el ingest sin CSP block', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Suscribirse a console errors ANTES de disparar el fetch para
        // capturar el "Refused to connect ... Content Security Policy"
        // que Chromium emite cuando CSP bloquea la request.
        const consoleErrors: string[] = [];
        page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
        });

        // Fetch REAL desde el contexto del navegador — el que estaría
        // sujeto a CSP. Body vacío: Sentry devolverá 400, no importa —
        // lo que probamos es que el navegador NO cortó la request.
        const result = await page.evaluate(async (url) => {
            try {
                const r = await fetch(url, { method: 'POST', body: '{}' });
                return { ok: true, status: r.status };
            } catch (err) {
                return { ok: false, error: (err as Error).message };
            }
        }, SENTRY_ENVELOPE_URL);

        // Assert 1: fetch NO rechazó (si CSP bloquea, la promise rejects
        // con TypeError "Failed to fetch").
        expect(result.ok, `fetch al ingest rechazado — probable CSP block. Error: ${result.error || 'n/a'}`).toBe(true);

        // Assert 2: ningún console error de tipo CSP "Refused to connect".
        const cspErrors = consoleErrors.filter(m => /refused to connect|content security policy/i.test(m));
        expect(cspErrors, `Console errors CSP encontrados:\n${cspErrors.join('\n')}`).toHaveLength(0);

        // El status HTTP típico es 400 (body inválido) o 403 (rate limit) —
        // ambos válidos. Un 0 o similar indicaría corte de red / CSP.
        if (result.ok) {
            expect(result.status, `status esperado >0 (ingest respondió), got ${result.status}`).toBeGreaterThan(0);
        }
    });

    test('3) endpoint server reporta gate correcto (complementario)', async ({ page }) => {
        await page.goto('/proveedor');
        await page.waitForLoadState('domcontentloaded');

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
        const resp = await page.request.post(`${baseURL}/api/admin/sentry-smoke`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        expect(resp.status()).toBe(200);
        const body = await resp.json();
        console.log('[sentry-smoke server-side]', JSON.stringify(body, null, 2));

        expect(body).toHaveProperty('sent');
        expect(body).toHaveProperty('eventId');
        expect(body.gate).toHaveProperty('env');
        expect(body.gate).toHaveProperty('enabled');
        expect(body.gate).toHaveProperty('dsn_configured');

        // Adaptativo — mismo spec en 3 escenarios (DSN missing, gate cerrado,
        // gate abierto).
        if (!body.gate.dsn_configured) {
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
        } else if (body.gate.env === 'production') {
            expect(body.gate.enabled).toBe(true);
            expect(body.sent).toBe(true);
            expect(body.eventId).toMatch(/^[a-f0-9]{32}$/);
        } else {
            expect(body.gate.enabled).toBe(false);
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
        }
    });
});
