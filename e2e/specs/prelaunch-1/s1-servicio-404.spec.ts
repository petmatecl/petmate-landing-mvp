// e2e/specs/prelaunch-1/s1-servicio-404.spec.ts
// ---------------------------------------------------------------------------
// PL1 — Sprint PRELAUNCH-1. Bundle SEO 307-fantasmas.
//
// Verifica que GET /servicio/{uuid-inexistente} responde 404 (no 307). El
// bug original: gSSP retornaba redirect { destination: '/explorar',
// permanent: false } → HTTP 307 → Google/bots reindexan el 307 → ciclo
// perpetuo de crawls a URLs de servicios ya retirados.
//
// Fix: notFound: true en el gSSP → HTTP 404 → Google saca de index.
//
// Request-level (sin browser). Corre bajo el project `chromium` default
// (proveedor storageState — irrelevante para esta llamada API-style).
// ---------------------------------------------------------------------------
import { test, expect, request } from '@playwright/test';

// UUID válido en formato pero garantizado inexistente en BD staging.
const UUID_INEXISTENTE = '00000000-0000-0000-0000-000000000000';

/**
 * Construye la URL /servicio/{id} con el bypass query de Vercel Protection.
 * Mismo patrón que endpointUrl() del cron-recordatorio fixture: el bypass
 * va como query param del PRIMER request → Vercel valida, emite Set-Cookie
 * _vercel_jwt, y redirige a la URL limpia. request.newContext() persiste
 * la cookie para el segundo hop.
 */
function servicioUrl(baseURL: string, id: string): string {
    const url = new URL(`/servicio/${id}`, baseURL);
    const bypass = process.env.PLAYWRIGHT_BYPASS;
    if (bypass) {
        url.searchParams.set('x-vercel-protection-bypass', bypass);
        url.searchParams.set('x-vercel-set-bypass-cookie', 'samesitenone');
    }
    return url.toString();
}

test('PL1: GET /servicio/{uuid-inexistente} retorna 404 (no 307 → /explorar)', async ({ baseURL }) => {
    expect(baseURL, 'baseURL debe estar definido por playwright.config.ts').toBeTruthy();
    const context = await request.newContext();
    try {
        // Redirects habilitados por default → Playwright sigue el handshake
        // del bypass Vercel y llega al gSSP real. El status FINAL es el que
        // importa: si el fix PL1-B1 está aplicado → 404; si el bug persiste
        // (redirect 307 → /explorar) → 200 y test falla.
        const response = await context.get(servicioUrl(baseURL!, UUID_INEXISTENTE));
        expect(response.status(), 'Servicio inexistente debe responder 404, no 307/200').toBe(404);
        // Assert extra defensivo: la URL final NO debe contener /explorar
        // (comportamiento del bug). notFound:true mantiene la URL del recurso.
        expect(response.url(), 'notFound:true no redirige — URL final debe seguir siendo /servicio/{id}').not.toContain('/explorar');
    } finally {
        await context.dispose();
    }
});
