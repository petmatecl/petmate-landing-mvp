// e2e/specs/eventos/basics.spec.ts
// ---------------------------------------------------------------------------
// Sprint EVENTOS-TESTS (2026-11-24) — smokes básicos del feature EVENTOS MVP.
//
// Scope:
//   T1 - /eventos SSR OK — HTTP 200 + <title> presente + h1 "Eventos cercanos".
//   T2 - /eventos/{uuid-inexistente} responde 404 (gSSP notFound).
//   T3 - /eventos/{formato-id-invalido} responde 404.
//
// NO requiere fixtures de BD: las assertions dependen solo de SSR + copy
// estático de la página. Si no hay eventos publicados, la página renderiza
// el empty state ("No hay eventos programados por ahora") — el smoke pasa
// igual porque verifica h1 + title, no filas.
//
// Request-level (sin browser), mismo patrón que prelaunch-1/s1-servicio-404.
// Corre bajo el project chromium default.
// ---------------------------------------------------------------------------
import { test, expect, request } from '@playwright/test';

// UUID válido en formato pero garantizado inexistente.
const UUID_INEXISTENTE = '00000000-0000-0000-0000-000000000001';

/**
 * URL con bypass Vercel Protection. Mismo patrón de los specs prelaunch.
 */
function eventosUrl(baseURL: string, path = ''): string {
    const url = new URL(`/eventos${path}`, baseURL);
    const bypass = process.env.PLAYWRIGHT_BYPASS;
    if (bypass) {
        url.searchParams.set('x-vercel-protection-bypass', bypass);
        url.searchParams.set('x-vercel-set-bypass-cookie', 'samesitenone');
    }
    return url.toString();
}

test.describe('Eventos basics', () => {
    test('T1: GET /eventos responde 200 + h1 + title (SSR)', async ({ baseURL }) => {
        expect(baseURL, 'baseURL debe estar definido por playwright.config.ts').toBeTruthy();
        const context = await request.newContext();
        try {
            const response = await context.get(eventosUrl(baseURL!));
            expect(response.status(), '/eventos debe responder 200').toBe(200);

            const body = await response.text();
            // Title canónico (hardcoded en pages/eventos/index.tsx).
            expect(body, 'Head.title canónico').toContain('Eventos de la comunidad | Pawnecta');
            // H1 canónico.
            expect(body, 'H1 canónico').toContain('Eventos cercanos');
        } finally {
            await context.dispose();
        }
    });

    test('T2: GET /eventos/{uuid-inexistente} responde 404 (gSSP notFound)', async ({ baseURL }) => {
        expect(baseURL).toBeTruthy();
        const context = await request.newContext();
        try {
            const response = await context.get(eventosUrl(baseURL!, `/${UUID_INEXISTENTE}`));
            // gSSP retorna { notFound: true } → Next sirve 404.
            expect(response.status(), 'Evento inexistente debe responder 404').toBe(404);
            // notFound:true preserva la URL, cero redirect a /eventos o similar.
            expect(response.url(), 'notFound:true no redirige').not.toMatch(/\/eventos\/?$/);
        } finally {
            await context.dispose();
        }
    });

    test('T3: GET /eventos/{formato-id-invalido} responde 404 (sin crash SSR)', async ({ baseURL }) => {
        expect(baseURL).toBeTruthy();
        const context = await request.newContext();
        try {
            // Un slug claramente no-UUID. El gSSP debe caerlo a notFound,
            // no propagar error 500 al cliente.
            const response = await context.get(eventosUrl(baseURL!, '/no-un-uuid-valido'));
            // Supabase devuelve error con eq('id', 'no-un-uuid-valido') por tipo
            // incompatible — el catch del gSSP retorna notFound: true → 404.
            expect(response.status(), 'ID inválido debe responder 404, no 500').toBe(404);
        } finally {
            await context.dispose();
        }
    });
});
