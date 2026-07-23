// e2e/setup/authenticate.ts
// ---------------------------------------------------------------------------
// Helper de autenticación reusable. Cada rol (proveedor, tutor, admin) tiene
// su propio spec setup en e2e/setup/auth-*.setup.ts que llama a este helper
// con sus credenciales y su storageState path. Sumar un rol nuevo NO requiere
// refactor — solo agregar un archivo setup.
// ---------------------------------------------------------------------------
import { Page, expect } from '@playwright/test';

export type AuthOptions = {
    email: string;
    password: string;
    /** Path absoluto donde persistir el storageState (cookies + localStorage). */
    storageStatePath: string;
    /** Nombre del rol para logs / errores (ej. 'proveedor', 'tutor'). */
    roleName: string;
};

export async function authenticate(page: Page, opts: AuthOptions): Promise<void> {
    if (!opts.email || !opts.password) {
        throw new Error(
            `[authenticate:${opts.roleName}] Faltan credenciales. ` +
            `Verifica las env vars correspondientes en e2e/.env.test.`
        );
    }

    // Vercel Deployment Protection: la primera navegación incluye el token
    // como query param + set-bypass-cookie para forzar a Vercel a emitir la
    // cookie _vercel_jwt. Sin esto, el request cae en la pantalla de SSO
    // "Log in to Vercel" y el login de la app no se renderiza.
    // Después de este primer goto, la cookie viaja automáticamente en el
    // browser context — el resto de tests navega sin query params.
    const bypassToken = process.env.PLAYWRIGHT_BYPASS ?? '';
    const bypassQuery = bypassToken
        ? `?x-vercel-protection-bypass=${encodeURIComponent(bypassToken)}&x-vercel-set-bypass-cookie=samesitenone`
        : '';
    await page.goto(`/login${bypassQuery}`);

    await page.locator('#email').fill(opts.email);
    await page.locator('#password').fill(opts.password);
    await page.getByRole('button', { name: /Ingresar/i }).click();

    // El login real es client-side (supabase.auth.signInWithPassword) y luego
    // redirige. Esperamos a estar fuera de /login como señal de éxito.
    await page.waitForURL(url => !url.pathname.endsWith('/login'), { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/login/);

    // Aceptar el banner de cookies UNA VEZ. La preferencia se guarda en
    // storage (cookie + localStorage según CookieBanner.tsx) y el banner
    // no vuelve a aparecer en los tests. Sin esto, el banner intercepta
    // pointer events sobre botones al fondo del modal (Guardar, X) y
    // rompe cualquier test que necesite interactuar con esos elementos.
    // Best-effort: si el banner no está (usuario ya lo aceptó en un
    // storageState previo, por ej.), seguimos sin problema.
    const acceptCookies = page.getByRole('button', { name: /Aceptar todas/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
        await acceptCookies.click();
        // Esperamos a que el banner desaparezca del DOM/viewport antes de
        // persistir el storageState — si no, la cookie puede no estar seteada.
        await expect(page.getByRole('region', { name: /Aviso de cookies/i })).not.toBeVisible({ timeout: 5_000 });
    }

    await page.context().storageState({ path: opts.storageStatePath });
}
