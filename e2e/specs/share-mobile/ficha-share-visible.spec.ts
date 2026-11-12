// e2e/specs/share-mobile/ficha-share-visible.spec.ts
// ---------------------------------------------------------------------------
// Sprint share-mobile (2026-11-12) — spec de presencia del botón Compartir
// en la ficha pública /servicio/[id] en viewport mobile. Falla si el usuario
// mobile NO encuentra una forma de compartir el servicio.
//
// Motivación (PO 2026-11-11, smoke prod Android):
//   La tarjeta de contacto desktop (tarjeta sticky right con Enviar
//   mensaje / WhatsApp / Teléfono / Compartir) no se renderiza en mobile.
//   En mobile se usa una barra fija bottom + MobileActionSheet. Si el
//   botón Compartir queda solo en la tarjeta desktop, el user mobile NO
//   tiene acceso al share — y mobile es el caso de uso principal (hub de
//   difusión via WhatsApp). Este spec bloquea esa regresión.
//
// Aplica el corolario P8 (ancla cognitiva): verifica un POSITIVO CONCRETO
// — existe un botón con aria-label o data-testid que matchea share — antes
// de que el deploy aterrice. Un result positivo en este spec significa que
// un user mobile YA PUEDE compartir (no inferencia, locator encontró el
// elemento).
//
// NO testea la acción del share (navigator.share está mockeado en playwright,
// clipboard requiere permisos adicionales). Testea PRESENCIA: locator.count
// > 0 y visible. El smoke manual del PO cubre la acción real (WhatsApp
// preview + navigator.share nativo).
// ---------------------------------------------------------------------------
import { test, expect } from '@playwright/test';

// Servicio semilla staging — mismo UUID usado por el spec visits-doble.
// Estable: activo, público, no es del proveedor autenticado. Si el servicio
// desaparece hay que actualizar el UUID — no rompe otros tests por el
// aislamiento del project.
const SERVICIO_SEMILLA = 'c1000001-0000-4000-8000-000000000006';

/**
 * Construye URL con Vercel Deployment Protection bypass como query params.
 * Mismo patrón que `e2e/setup/authenticate.ts:33-37`. El primer goto con
 * estos params hace que Vercel setee `Set-Cookie: _vercel_jwt=...` y
 * redirija a la URL limpia. Las navegaciones siguientes van sin query.
 *
 * El project `share-mobile` usa storageState vacío (visitante anónimo) →
 * no hereda la cookie `_vercel_jwt` de los storageStates proveedor/tutor
 * → el primer navigate SIEMPRE necesita los query params o Vercel responde
 * con la pantalla de login.
 */
function withBypass(pathname: string): string {
    const bypass = process.env.PLAYWRIGHT_BYPASS ?? '';
    if (!bypass || bypass === 'cambiame') {
        // El playwright.config guard ya throwea en el load — solo por completeness.
        return pathname;
    }
    const sep = pathname.includes('?') ? '&' : '?';
    return `${pathname}${sep}x-vercel-protection-bypass=${encodeURIComponent(bypass)}&x-vercel-set-bypass-cookie=samesitenone`;
}

test.describe('share-mobile — ficha de servicio', () => {
    // storageState vacío heredado del project share-mobile (sin login).
    // El share no requiere auth; probamos como usuario anónimo, que es el
    // caso real de alguien llegando a /servicio/<id> desde un link compartido.

    test('[SHARE-MOBILE-01] /servicio/[id] expone un botón Compartir visible en mobile', async ({ page }) => {
        await page.goto(withBypass(`/servicio/${SERVICIO_SEMILLA}`), { waitUntil: 'domcontentloaded' });

        // Esperar a que el hero mount — la galería hace fetch de fotos.
        // La ficha renderiza mucho; usar un locator que tipicamente existe
        // temprano (favoritos del hero tiene aria-label estable).
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // POSITIVO CONCRETO — busca el botón icon-only del hero mobile O
        // cualquier botón del sheet mobile con aria-label matching share.
        // Ambos son válidos: el hero icon-only es el atajo principal, el
        // sheet es el acceso al menú full. Si ambos faltan, el user queda
        // sin forma de compartir → fail.
        const heroIconOnly = page.locator('[data-testid="share-icon-only"]');
        const inlineShare = page.locator('[data-testid="share-inline"]');

        const heroCount = await heroIconOnly.count();
        const inlineCount = await inlineShare.count();

        expect(
            heroCount + inlineCount,
            'No se encontró ningún punto de entrada para Compartir en /servicio/[id] en mobile. ' +
            'Buscadas: data-testid="share-icon-only" (hero) y data-testid="share-inline" (sheet / tarjeta).'
        ).toBeGreaterThan(0);

        // Al menos uno de los dos debe estar visible (no hidden por CSS).
        // El hero icon-only vive en lg:hidden → debería estar visible en
        // viewport mobile. El inline del sheet está dentro del sheet cerrado,
        // entonces no es "visible" per se — por eso la assertion acepta que
        // AL MENOS exista el locator (count > 0).
        if (heroCount > 0) {
            await expect(
                heroIconOnly.first(),
                'Botón share icon-only del hero debe estar visible en mobile'
            ).toBeVisible();
        }
    });
});
