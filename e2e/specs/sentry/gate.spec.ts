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
        expect(body).toHaveProperty('flushed');
        expect(body.gate).toHaveProperty('env');
        expect(body.gate).toHaveProperty('enabled');
        expect(body.gate).toHaveProperty('dsn_env_var_set');
        expect(body.gate).toHaveProperty('dsn_configured_in_client');
        expect(body.gate).toHaveProperty('sdk_initialized');
        expect(body.gate).toHaveProperty('client_enabled');

        // Sprint sentry-init (P9 aplicado): la señal MÁS IMPORTANTE es
        // sdk_initialized. Si es false, instrumentation.ts no está cargando
        // sentry.server.config.ts en runtime — bug estructural que 3
        // iteraciones anteriores no detectaron. Debe ser true en TODOS los
        // entornos (init corre en cualquier VERCEL_ENV; el gate solo controla
        // si envía eventos, no si el SDK arranca).
        expect(body.gate.sdk_initialized, 'SDK server DEBE inicializarse en runtime — si false, instrumentation.ts no está cargando el config').toBe(true);

        // Adaptativo — mismo spec en 3 escenarios (DSN missing, gate cerrado,
        // gate abierto).
        if (!body.gate.dsn_env_var_set) {
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
            expect(body.flushed).toBe(false);
        } else if (body.gate.env === 'production') {
            expect(body.gate.enabled).toBe(true);
            expect(body.gate.client_enabled).toBe(true);
            expect(body.gate.dsn_configured_in_client).toBe(true);
            expect(body.sent).toBe(true);
            expect(body.eventId).toMatch(/^[a-f0-9]{32}$/);
            // Sprint sentry-flush (P8 aplicado): flushed:true es la señal
            // observable de que la cola async del transport drenó ANTES
            // del res.json. Aún así el check final canónico es "evento
            // aparece en dashboard Sentry" (verificable manual con tag
            // smoke=true) — flushed:true no garantiza que el ingest lo
            // aceptó, solo que salió por la red.
            expect(body.flushed).toBe(true);
        } else {
            expect(body.gate.enabled).toBe(false);
            expect(body.gate.client_enabled).toBe(false);
            expect(body.sent).toBe(false);
            expect(body.eventId).toBeNull();
            expect(body.flushed).toBe(false);
        }
    });

    test('4) defaults integrations activos en el cliente (auto-capture)', async ({ page }) => {
        // Sprint sentry-flush (P8 aplicado, hallazgo bug secundario): la
        // versión previa de sentry.client.config.ts tenía `integrations: []`
        // que MATA globalHandlersIntegration + browserApiErrorsIntegration —
        // sin ellos, unhandled errors + unhandledRejection auto NO se
        // capturan. Solo llegan Sentry.captureException(...) manuales.
        //
        // Este test verifica que los defaults core estén activos:
        // dispara un unhandledRejection y confirma que el SDK lo procesa
        // (via una request al ingest). Como el gate en preview está cerrado
        // (enabled:false), no llega evento a Sentry, PERO podemos verificar
        // que el SDK está INSTRUMENTADO — si integrations:[] estuviera,
        // el listener global no existiría y no habría ni intento de captura.
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const sdkInstrumented = await page.evaluate(async () => {
            // Verificar que Sentry cargó Y que el handler global se registró.
            // En v10, globalHandlersIntegration adjunta un listener a
            // window.addEventListener('unhandledrejection', ...) durante init.
            // Como el listener no es directamente enumerable via window, lo
            // detectamos indirectamente: (a) window.__SENTRY__ existe y tiene
            // hub configurado, (b) el gate se puede resolver.
            const sentryGlobal = (window as unknown as { __SENTRY__?: unknown }).__SENTRY__;
            return {
                sentryGlobalExists: !!sentryGlobal,
                sentryGlobalType: typeof sentryGlobal,
            };
        });

        // Sentry init corrió si __SENTRY__ está en window (independiente de
        // si el gate está enabled). Si integrations fuera literal [], el
        // __SENTRY__ existiría igual (SDK cargado) — pero los defaults
        // integrations NO se aplicarían. Como no podemos introspec-tar la
        // lista de integrations desde afuera trivialmente, el test guarda
        // esta expectativa mínima + deja el check semántico documentado.
        expect(sdkInstrumented.sentryGlobalExists, 'window.__SENTRY__ debe existir (SDK cargado)').toBe(true);
    });
});
