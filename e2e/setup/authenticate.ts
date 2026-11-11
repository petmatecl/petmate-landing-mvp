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
    // Helper local: polling de localStorage por el token Supabase.
    // Devuelve true si aparece dentro del timeout, false si se vence.
    const waitForTokenInStorage = async (timeoutMs: number): Promise<boolean> => {
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
                { timeout: timeoutMs },
            );
            return true;
        } catch {
            return false;
        }
    };

    // Primer intento: esperar a que el flow UI del signIn persista el token.
    let tokenPresente = await waitForTokenInStorage(10_000);

    if (!tokenPresente) {
        // Sprint setup-hardening (2026-11-12) — re-login server-side si el
        // flow UI dejó el token en estado inconsistente (race timing,
        // cross-fire cross-tab Supabase, signOut global previo de otro
        // navegador, etc). Patrón espejo del fallback en fixture runtime
        // e2e/fixtures/supabase.ts > buildEntry (pieza B sprint
        // estab-e2e-tokens, merged 2026-11-10): llamar directo a
        // /auth/v1/token?grant_type=password desde el browser + escribir
        // el par de tokens en localStorage bajo la key canónica
        // sb-<projectref>-auth-token. Cubre el setup project que pieza B
        // no cubría — era la mitad faltante.
        //
        // Falla fuerte (P8) si TAMBIÉN el re-login falla: no silente, no
        // verde falso. Un setup fallido debe cascadear visible como lo
        // hace hoy, pero ahora con doble intento previo.
        const supabaseUrl = process.env.E2E_SUPABASE_URL;
        const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) {
            throw new Error(
                `[authenticate:${opts.roleName}] Token no persistió tras 10s del flow UI, ` +
                `y re-login server-side no es posible: faltan E2E_SUPABASE_URL o ` +
                `E2E_SUPABASE_ANON_KEY en el env. Setup detenido.`,
            );
        }

        const reloginResult = await page.evaluate(async (args) => {
            try {
                const resp = await fetch(`${args.supabaseUrl}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': args.anonKey,
                        'Authorization': `Bearer ${args.anonKey}`,
                    },
                    body: JSON.stringify({ email: args.email, password: args.password }),
                });
                if (!resp.ok) {
                    const body = await resp.text().catch(() => '');
                    return { ok: false, reason: `HTTP ${resp.status}: ${body.slice(0, 200)}` };
                }
                const data = await resp.json();
                if (!data.access_token || !data.refresh_token) {
                    return { ok: false, reason: `response sin tokens: ${JSON.stringify(data).slice(0, 200)}` };
                }
                // Escribir con la key canónica Supabase: sb-<projectref>-auth-token.
                // El projectref es el primer segmento del host (ej.
                // "jmtadvdkicyylcwjcmcl" para staging).
                const ref = new URL(args.supabaseUrl).host.split('.')[0];
                const key = `sb-${ref}-auth-token`;
                const now = Math.floor(Date.now() / 1000);
                localStorage.setItem(key, JSON.stringify({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expires_at: now + (data.expires_in ?? 3600),
                    expires_in: data.expires_in ?? 3600,
                    token_type: data.token_type ?? 'bearer',
                    user: data.user ?? null,
                }));
                return { ok: true };
            } catch (err: any) {
                return { ok: false, reason: `fetch threw: ${err?.message ?? String(err)}` };
            }
        }, {
            supabaseUrl,
            anonKey,
            email: opts.email,
            password: opts.password,
        });

        if (!reloginResult.ok) {
            throw new Error(
                `[authenticate:${opts.roleName}] Token no persistió tras flow UI (10s) ` +
                `Y re-login server-side también falló: ${reloginResult.reason}. ` +
                `URL actual: ${page.url()}. Setup detenido para evitar cascada.`,
            );
        }

        // Segunda verificación (más corta: el token ya está escrito, solo
        // confirmamos que el polling lo detecta). Si aún así no aparece,
        // hay algo raro con el origin del localStorage — fallar fuerte.
        tokenPresente = await waitForTokenInStorage(5_000);
        if (!tokenPresente) {
            throw new Error(
                `[authenticate:${opts.roleName}] Re-login server-side reportó OK ` +
                `pero el polling de localStorage no detectó la key sb-*-auth-token ` +
                `tras 5s. Posible mismatch de origin (el localStorage de page.evaluate ` +
                `vs el que Playwright serializa). URL actual: ${page.url()}. Setup detenido.`,
            );
        }

        console.log(`[authenticate:${opts.roleName}] re-login server-side OK tras flow UI fallido`);
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
