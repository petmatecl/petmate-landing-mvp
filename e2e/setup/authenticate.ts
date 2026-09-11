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

    // Sprint e2e-error-audit (2026-09-08) — esperar hidratación de React
    // antes del click al submit. En previews frescos de Vercel (primera
    // carga tras deploy), el fill+click puede ejecutarse antes de que
    // React vincule el onSubmit del <form>. Sin este handler bound, el
    // click dispara la submisión default como GET → aterriza en
    // /login?email=X&password=Y (credenciales en query string) y el
    // waitForURL abajo timeouta buscando un redirect que nunca sucede.
    // networkidle espera 500ms sin requests → indicador confiable de
    // que los JS chunks + hidratación completaron.
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill(opts.email);
    await page.locator('#password').fill(opts.password);

    // Sprint estab-e2e (2026-09-11) — retry ≤3× del submit + waitForURL.
    // Ante flake intermitente de Supabase Auth staging (endpoint
    // `/auth/v1/token` con latencia >30s ocasional), reintentar sin
    // fallar el setup. Cada intento hace click + waitForURL 30s. Si
    // los 3 intentos fallan, throw con contexto del último error.
    // El fill de email+password se hace UNA vez arriba — no se reintenta
    // porque el form persiste su valor entre clicks (submit fallido no
    // resetea inputs). Log del número de intento en cada iteración +
    // resumen al final para diagnosticar si los verdes vienen tras retry
    // (señal de infra flake que amerita plan Supabase Pro).
    const MAX_ATTEMPTS = 3;
    const PER_ATTEMPT_TIMEOUT_MS = 30_000;
    let lastError: unknown = null;
    let successAttempt = 0;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            console.log(`[AUTH-RETRY] ${opts.roleName} attempt ${attempt}/${MAX_ATTEMPTS} — click submit + waitForURL(${PER_ATTEMPT_TIMEOUT_MS}ms)`);
            const t0 = Date.now();
            await page.getByRole('button', { name: /Ingresar/i }).click();
            // El login real es client-side (supabase.auth.signInWithPassword)
            // y luego redirige. Esperamos a estar fuera de /login como señal
            // de éxito.
            await page.waitForURL(
                url => !url.pathname.endsWith('/login'),
                { timeout: PER_ATTEMPT_TIMEOUT_MS },
            );
            const dt = Date.now() - t0;
            console.log(`[AUTH-RETRY] ${opts.roleName} attempt ${attempt} succeeded in ${dt}ms`);
            successAttempt = attempt;
            break;
        } catch (err) {
            lastError = err;
            const errMsg = err instanceof Error ? err.message : String(err);
            console.log(`[AUTH-RETRY] ${opts.roleName} attempt ${attempt} failed: ${errMsg}`);
            if (attempt < MAX_ATTEMPTS) {
                // Chequear si el redirect ocurrió tarde (posible race donde
                // waitForURL timeouteó pero la URL cambió al instante después).
                // Si sí, exitamos exitoso sin retry innecesario.
                if (!page.url().endsWith('/login')) {
                    console.log(`[AUTH-RETRY] ${opts.roleName} redirect detected post-timeout (URL: ${page.url()}) — accepting`);
                    successAttempt = attempt;
                    lastError = null;
                    break;
                }
                // Espera breve antes del próximo intento para dar oxígeno a
                // Supabase Auth si estaba congestionado.
                await page.waitForTimeout(1000);
            }
        }
    }
    if (successAttempt === 0) {
        throw new Error(
            `[authenticate:${opts.roleName}] Todos los ${MAX_ATTEMPTS} intentos de submit + waitForURL fallaron. ` +
            `Último error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
        );
    }
    console.log(`[AUTH-RETRY] ${opts.roleName} SUCCESS on attempt ${successAttempt}/${MAX_ATTEMPTS}`);
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
