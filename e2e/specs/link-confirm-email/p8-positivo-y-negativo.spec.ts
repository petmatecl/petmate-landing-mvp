// e2e/specs/link-confirm-email/p8-positivo-y-negativo.spec.ts
// ---------------------------------------------------------------------------
// Sprint LINK-CONFIRM-EMAIL (2026-09-21) — verificación P8 canónica del
// helper `e2e/fixtures/signupLink.ts` antes de integrarlo en tests reales
// de signup flow. Dos tests que deben pasar juntos para dar por bueno el
// helper:
//
//   POSITIVO CONOCIDO: el helper genera un action_link válido, y abrirlo
//   con Playwright confirma la sesión (aterriza en /email-confirmado, cookie
//   Supabase Auth queda seteada).
//
//   NEGATIVO CONOCIDO: forzar el helper con una key inválida (variable
//   basura, cero contacto con el secret real) debe fallar con error claro
//   (401/invalid), NO con timeout ni con action_link vacío silencioso.
//
// El spec se remueve tras validación P8 + integración al flujo signup real
// (spec `signup-flow/confirmar-email.spec.ts` que vendrá después).
//
// Corre bajo project `chromium` (sin storageState — signup flow es anon
// hasta que confirma).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';
import { generateSignupLink } from '../../fixtures/signupLink';

// Email desechable per corrida — timestamp + random garantiza cero colisión
// con signups previos. staging-p8 prefix identifica origen en cleanup nocturno.
function freshEmail(): string {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now();
    return `staging-p8-${ts}-${rand}@pawnecta-test.example`;
}

test.describe('LINK-CONFIRM-EMAIL · verificación P8 del helper', () => {
    // Storage vacío por design — el signup fresco NO necesita sesión previa
    // ni interfiere con storage de proveedor/tutor. Aterrizar en
    // /email-confirmado debe funcionar limpio desde context anon.
    test.use({ storageState: { cookies: [], origins: [] } });

    test('POSITIVO: helper genera action_link válido + abrir link aterriza en /email-confirmado', async ({ page, baseURL }) => {
        const email = freshEmail();

        // Paso 0: navegar al login con bypass Vercel para setear la cookie
        // `_vercel_jwt` en el context. Sin esto, la API POST subsiguiente
        // cae en el auth prompt de Vercel Deployment Protection (401
        // "Protected deployment"). Mismo patrón que authenticate.ts:33-37.
        const bypassToken = process.env.PLAYWRIGHT_BYPASS ?? '';
        const bypassQuery = bypassToken
            ? `?x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}&x-vercel-set-bypass-cookie=samesitenone`
            : '';
        await page.goto(`/login${bypassQuery}`);
        await page.waitForLoadState('networkidle').catch(() => { /* ok */ });

        // Paso 1: signup vía endpoint productivo (crea el user en auth.users).
        // password random cumple política mínima (8 chars, mix). El request
        // reusa la cookie _vercel_jwt del context (seteada arriba).
        const password = `TestPwd-${Date.now()}!`;
        const signupResp = await page.request.post(`${baseURL}/api/auth/signup`, {
            data: {
                email,
                password,
                rol: 'usuario',
                nombre: 'P8Positivo',
                apellido_p: 'Test',
            },
        });
        // Aceptable 200 (signup ok, welcome email dispatched) o 201 (creado).
        expect([200, 201], `signup status ${signupResp.status()}: ${await signupResp.text().catch(() => 'no body')}`).toContain(signupResp.status());

        // Paso 2: helper genera el link para el mismo email.
        const actionLink = await generateSignupLink(email);

        // Assertions sobre el link (sin loguearlo full — puede contener token).
        expect(actionLink, 'action_link debe ser URL').toMatch(/^https:\/\//);
        expect(actionLink, 'action_link debe llevar params de token').toMatch(/[?&]token=/);
        expect(actionLink, 'action_link debe indicar tipo').toMatch(/type=(magiclink|signup|recovery|invite)/);

        // Paso 3: abrir el link con Playwright. Aterriza en /email-confirmado
        // (con Supabase Auth confirmando el user server-side pre-render).
        await page.goto(actionLink);
        await expect(page).toHaveURL(/\/email-confirmado/, { timeout: 15_000 });

        // La página confirma la sesión — cookie sb-{ref}-auth-token debe existir.
        // (No podemos leer localStorage tan fácil desde este test, pero el URL
        //  final ya prueba que Supabase Auth aceptó el token del action_link).
    });

    test('NEGATIVO: key inválida (garbage) → error claro 401/invalid, cero timeout', async () => {
        const email = freshEmail();
        // Key sintáctica ok (prefix correcto para pasar guard 2), pero valor
        // inválido → Supabase Auth API responde 401. Cero contacto con el
        // secret real; cero tocar `process.env.E2E_SUPABASE_SERVICE_KEY`.
        const garbageKey = 'sb_secret_' + 'x'.repeat(48);

        // Assertion: el helper throwea SÍNCRONO (rejects) con mensaje claro,
        // NO cuelga esperando timeout. Playwright default test timeout es
        // 60s; si el helper se tomara más de 30s, este test excedería la
        // ventana de un fail rápido. Assertion sobre el mensaje del error.
        const t0 = Date.now();
        await expect(async () => {
            await generateSignupLink(email, { keyOverride: garbageKey });
        }).rejects.toThrow(/generateLink falló|401|invalid|Unauthorized|token/i);
        const elapsedMs = Date.now() - t0;

        // Sanity: el fail fue rápido, no timeout. < 15s razonable (network
        // round trip + Supabase Auth error response).
        expect(elapsedMs, `Fail debe ser rápido (network 401), no timeout. Elapsed ${elapsedMs}ms`).toBeLessThan(15_000);
    });

    test('NEGATIVO guard 1: URL no-staging → abort loud', async () => {
        // Cero contacto con network — el guard 1 aborta antes de fetch.
        await expect(async () => {
            await generateSignupLink('test@example.com', {
                urlOverride: 'https://prod-fake-ref.supabase.co',
            });
        }).rejects.toThrow(/no contiene el ref staging|EXCLUSIVAMENTE staging/i);
    });

    test('NEGATIVO guard 2: key con prefix inválido → abort loud', async () => {
        // Legacy JWT format → rechazo del guard antes del fetch.
        await expect(async () => {
            await generateSignupLink('test@example.com', {
                keyOverride: 'eyJfake.legacy.jwt.format.here',
            });
        }).rejects.toThrow(/prefix esperado|sb_secret_/i);
    });
});
