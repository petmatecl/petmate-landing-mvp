// e2e/setup/authenticate.ts
// ---------------------------------------------------------------------------
// Helper de autenticación reusable. Cada rol (proveedor, tutor, admin) tiene
// su propio spec setup en e2e/setup/auth-*.setup.ts que llama a este helper
// con sus credenciales y su storageState path. Sumar un rol nuevo NO requiere
// refactor — solo agregar un archivo setup.
// ---------------------------------------------------------------------------
import fs from 'fs';
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

    // Sprint hf-usuario-fix (2026-09-24) — guard contra race del token
    // Supabase vs storageState capture. Sin esto, si Supabase no persiste los
    // tokens en localStorage antes del capture, todos los specs downstream
    // (potencialmente 17+ como en el run 36045131206 del PR #91) fallan con
    // "No se encontró {access_token, refresh_token}" — 17 fails en cascada
    // por 1 sola causa raíz oculta. El guard hace explícito el fallo: si el
    // token no está en localStorage al momento del capture, el setup falla
    // aquí (1 error claro) en vez de cascadear a la suite.
    //
    // Paso 1 · esperar activamente a que Supabase persista el token en
    // localStorage. Elimina la race timing entre waitForURL (que resuelve
    // apenas la URL cambia) y persistSession() del SDK (que corre después
    // del onAuthStateChange SIGNED_IN handler). Timeout 10s: si en ese
    // margen no aparece el token, es fallo real del login (no timing).
    try {
        await page.waitForFunction(
            () => {
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
                            const v = localStorage.getItem(k);
                            if (v && v.includes('"access_token"')) return true;
                        }
                    }
                    return false;
                } catch { return false; }
            },
            { timeout: 10_000 },
        );
    } catch {
        throw new Error(
            `[authenticate:${opts.roleName}] Login pareció exitoso (waitForURL fuera de /login OK) ` +
            `pero Supabase NO persistió el token en localStorage tras 10s (buscando key sb-*-auth-token ` +
            `con access_token). Race del token vs storageState capture, o el signIn cliente-side no ` +
            `completó realmente. URL actual: ${page.url()}. Detiene el setup acá para evitar cascada ` +
            `de fails "No se encontró {access_token, refresh_token}" en todos los specs downstream.`
        );
    }

    // Sprint hf-usuario-fix iteración 2 (2026-09-24) — captura ampliada para
    // diagnosticar por qué el paso 2 falla pese a que el paso 1 confirma el
    // token en localStorage. Run 36051500666 mostró que:
    //   - waitForFunction PASA (token en localStorage al momento del check).
    //   - storageState() escribe archivo con solo cookies (_vercel_jwt del
    //     Vercel bypass), SIN origins/localStorage con sb-*-auth-token.
    //   - snapshot post-timeout muestra al user logueado normalmente en la
    //     UI, sesión viva en el browser.
    //
    // Hipótesis: Playwright storageState() captura origins que la página
    // "conoce" (navegó). El bypass query + redirect subsecuente puede dejar
    // el localStorage bajo un origin ligeramente distinto del que Playwright
    // serializa. Para confirmar: capturar diagnóstico completo — page.url(),
    // page.evaluate del origin + localStorage completo, y el JSON guardado
    // (primeros 3000 chars, no 300, para ver el bloque `origins`).
    const preCaptureDiag = await page.evaluate(() => {
        const items: Array<{ key: string; valueLen: number; valuePreview: string }> = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                const v = localStorage.getItem(k) ?? '';
                items.push({ key: k, valueLen: v.length, valuePreview: v.slice(0, 80) });
            }
        } catch { /* ignore */ }
        return { url: location.href, origin: location.origin, ls: items };
    });

    await page.context().storageState({ path: opts.storageStatePath });

    // Paso 2 · guard final: verificar el archivo escrito contiene un token
    // Supabase válido con MISMA lógica que el helper downstream
    // `extractSessionTokens` de e2e/fixtures/supabase.ts:40-72 (JSON.parse +
    // iterate origins > localStorage > name sb-*-auth-token, luego
    // JSON.parse del value, luego check access_token + refresh_token).
    //
    // Sprint hf-usuario-fix iteración 3 (2026-09-24) — el check ingenuo
    // `savedRaw.includes('"access_token"')` de la iter 2 era false positive:
    // Playwright serializa el `value` del localStorage como string dentro
    // del JSON, con escape `\"access_token\"` en el archivo — el `includes`
    // buscando `"access_token"` (con comillas literales, sin backslash) NO
    // matcheaba pese a que el token estaba presente. Run 36055308817 lo
    // confirmó: DIAG mostró que el archivo contenía `\"access_token\":\"...\"`
    // dentro del `value` del sb-*-auth-token; guard tiraba false positive.
    //
    // Fix definitivo: parse el JSON del archivo tal como el helper downstream
    // lo hace, y verificar que exista al menos un origin con un item
    // sb-*-auth-token cuyo value JSON tenga access_token + refresh_token.
    // Cero string matching frágil; cero false positive.
    const savedRaw = fs.readFileSync(opts.storageStatePath, 'utf-8');
    let hasValidToken = false;
    try {
        const state = JSON.parse(savedRaw);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const origins = (state.origins ?? []) as Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
        for (const o of origins) {
            for (const item of o.localStorage ?? []) {
                if (item.name.startsWith('sb-') && item.name.endsWith('-auth-token')) {
                    try {
                        const parsed = JSON.parse(item.value);
                        if (parsed?.access_token && parsed?.refresh_token) {
                            hasValidToken = true;
                            break;
                        }
                    } catch { /* item malformado, seguir */ }
                }
            }
            if (hasValidToken) break;
        }
    } catch { /* archivo malformado — hasValidToken queda false */ }

    if (!hasValidToken) {
        throw new Error(
            `[authenticate:${opts.roleName}] storageState guardado en ${opts.storageStatePath} SIN ` +
            `sb-*-auth-token con {access_token, refresh_token} válidos, pese a que localStorage lo ` +
            `tenía pre-capture.\n\n` +
            `DIAG · page.url: ${preCaptureDiag.url}\n` +
            `DIAG · origin: ${preCaptureDiag.origin}\n` +
            `DIAG · localStorage items (${preCaptureDiag.ls.length}):\n` +
            preCaptureDiag.ls.map(i => `  - ${i.key} (len=${i.valueLen}): ${i.valuePreview}`).join('\n') +
            `\n\nCONTENIDO GUARDADO (primeros 3000 chars):\n${savedRaw.slice(0, 3000)}`
        );
    }
}
