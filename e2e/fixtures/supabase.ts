// e2e/fixtures/supabase.ts
// ---------------------------------------------------------------------------
// Cliente Supabase autenticado con el JWT del usuario logueado en storageState.
// Respeta RLS — no usa service role. Todo lo que puede hacer este cliente
// es exactamente lo que puede hacer el usuario logueado desde la app.
//
// Roles soportados (F2-3-E agrega tutor):
//   * proveedor — para F2-2B (editor de servicios).
//   * tutor    — para F2-3-E (reserva + cancelación desde /mis-solicitudes).
//
// Requisitos en e2e/.env.test:
//   E2E_SUPABASE_URL       — URL del proyecto Supabase staging
//   E2E_SUPABASE_ANON_KEY  — anon key (público, ya vive en el bundle de la app)
//
// Sprint estab-e2e-i (2026-09-17) — refresh de token TTL 20 min:
//   El JWT de Supabase Auth dura 1h por default. Runs largos (>1h de
//   suite F2 completa con setup + fixtures + smokes) veían el token
//   expirar mid-run → cascade de "Auth session missing" en
//   `supabase.auth.getUser()`. Fix: (a) extraer también refresh_token del
//   storageState; (b) `getSupabaseByRole` async, TTL 20 min sobre cliente
//   cacheado, refresh via POST /auth/v1/token?grant_type=refresh_token
//   cuando TTL vence; (c) getUser recibe el access_token explícito para no
//   depender del session-mode del SDK (que cambió entre supabase-js 2.84
//   y 2.109 rompiendo el global.headers.Authorization fallback).
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const AUTH_FILE_PROVEEDOR = path.resolve(__dirname, '../.auth/proveedor.json');
const AUTH_FILE_TUTOR = path.resolve(__dirname, '../.auth/tutor.json');

/**
 * Tokens de sesión Supabase persistidos por Playwright en storageState.
 * Ambos son necesarios: access_token para authorizar requests, refresh_token
 * para renovar cuando el access expira mid-run.
 */
type SessionTokens = { accessToken: string; refreshToken: string };

function extractSessionTokens(authFile: string): SessionTokens {
    if (!fs.existsSync(authFile)) {
        throw new Error(
            `[e2e/supabase] storageState no existe en ${authFile}. ` +
            `¿Corriste el setup project correspondiente?`
        );
    }
    const raw = fs.readFileSync(authFile, 'utf-8');
    const state = JSON.parse(raw);
    const origins = state.origins as Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
    for (const origin of origins ?? []) {
        for (const item of origin.localStorage ?? []) {
            if (item.name.startsWith('sb-') && item.name.endsWith('-auth-token')) {
                try {
                    const parsed = JSON.parse(item.value);
                    if (parsed?.access_token && parsed?.refresh_token) {
                        return {
                            accessToken: parsed.access_token as string,
                            refreshToken: parsed.refresh_token as string,
                        };
                    }
                } catch {
                    // Ignore malformed items, keep looking.
                }
            }
        }
    }
    throw new Error(
        `[e2e/supabase] No se encontró {access_token, refresh_token} en storageState ${authFile}. ` +
        `Es posible que el login haya fallado silenciosamente o que Supabase ` +
        `haya cambiado el formato del token en localStorage.`
    );
}

/**
 * POST /auth/v1/token?grant_type=refresh_token — pide un access_token nuevo
 * usando el refresh_token. Retorna los dos tokens actualizados (Supabase
 * también rota el refresh_token en cada refresh, así que lo capturamos).
 * Sin este refresh, el JWT expira a la hora y todas las auth queries fallan.
 */
async function refreshTokens(refreshToken: string): Promise<SessionTokens> {
    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        throw new Error(
            `[e2e/supabase] Faltan E2E_SUPABASE_URL/E2E_SUPABASE_ANON_KEY para refreshTokens.`,
        );
    }
    const url = new URL('/auth/v1/token', supabaseUrl);
    url.searchParams.set('grant_type', 'refresh_token');
    const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(
            `[e2e/supabase] refreshTokens falló ${resp.status}: ${body.slice(0, 200)}`,
        );
    }
    const data = await resp.json() as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) {
        throw new Error(`[e2e/supabase] refreshTokens response sin tokens: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

/**
 * Sprint estab-e2e-tokens (2026-11-10) — fallback de último recurso:
 * POST /auth/v1/token?grant_type=password con las credenciales del rol
 * (env vars ya presentes en CI). Se usa cuando el refresh_token guardado
 * en el storageState fue revocado externamente (por ejemplo, un signOut
 * global de la misma cuenta desde otro cliente humano).
 *
 * El signOut default de @supabase/supabase-js v2 es `scope: 'global'`, que
 * revoca TODOS los refresh_tokens del user + la sesión server-side en
 * `auth.sessions`. Si eso ocurre durante un CI run, el fallback a
 * `stored.accessToken` tampoco sirve: el JWT local no expiró, pero
 * `/auth/v1/user` devuelve 401 porque la sesión no existe. Re-login con
 * password es la única vía que recupera un par válido sin tocar la UI.
 *
 * Ver ítem BACKLOG `SIGNOUT-SCOPE` (post-lanzamiento): si la app migra a
 * `scope: 'local'` en sus 3 call sites de signOut, este fallback deja de
 * dispararse en práctica — pero el código queda como red para otras
 * fuentes de revocación (expiry server-side, rate-limit del refresh,
 * rotación de secrets Supabase).
 */
async function signInWithPassword(role: 'proveedor' | 'tutor'): Promise<SessionTokens> {
    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    const email = role === 'proveedor'
        ? process.env.E2E_STAGING_EMAIL
        : process.env.E2E_STAGING_TUTOR_EMAIL;
    const password = role === 'proveedor'
        ? process.env.E2E_STAGING_PASSWORD
        : process.env.E2E_STAGING_TUTOR_PASSWORD;
    if (!supabaseUrl || !anonKey || !email || !password) {
        throw new Error(
            `[e2e/supabase] signInWithPassword(${role}): faltan env vars ` +
            `(E2E_SUPABASE_URL / E2E_SUPABASE_ANON_KEY / E2E_STAGING_${role === 'proveedor' ? '' : 'TUTOR_'}EMAIL / _PASSWORD).`,
        );
    }
    const url = new URL('/auth/v1/token', supabaseUrl);
    url.searchParams.set('grant_type', 'password');
    const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        throw new Error(
            `[e2e/supabase] signInWithPassword(${role}) falló ${resp.status}: ${body.slice(0, 200)}`,
        );
    }
    const data = await resp.json() as { access_token?: string; refresh_token?: string };
    if (!data.access_token || !data.refresh_token) {
        throw new Error(`[e2e/supabase] signInWithPassword(${role}) response sin tokens: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

// TTL del cliente cacheado. Menor al TTL default del JWT (1h) para tener
// margen ante latencia del refresh + no llegar al borde de expiración.
const CACHE_TTL_MS = 20 * 60 * 1000;

type CachedEntry = {
    client: SupabaseClient;
    accessToken: string;
    refreshToken: string;
    builtAt: number;
};

// Cachés separados por rol para evitar cross-contamination entre specs
// que corren en proyectos distintos (proveedor vs tutor).
const cachedClients = new Map<string, CachedEntry>();
const cachedProfileIds = new Map<string, string>();
const cachedAuthUserIds = new Map<string, string>();

// Cache de Promises in-flight para deduplicar init concurrentes del mismo rol
// (varios beforeAll que corren en paralelo dentro del mismo worker).
const inflightInit = new Map<string, Promise<CachedEntry>>();

async function buildEntry(role: 'proveedor' | 'tutor', authFile: string): Promise<CachedEntry> {
    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        throw new Error(
            `[e2e/supabase] Faltan E2E_SUPABASE_URL y/o E2E_SUPABASE_ANON_KEY ` +
            `en e2e/.env.test. Se necesitan para operar la BD como el usuario ` +
            `logueado (sin service role, respetando RLS).`
        );
    }
    // Extract → refresh siempre. El token del storageState puede tener 30 min
    // ya cuando el setup terminó y el primer beforeAll de un spec largo corre.
    // Refrescar de entrada garantiza margen full de 1h antes del próximo bump.
    const stored = extractSessionTokens(authFile);
    let fresh: SessionTokens;
    try {
        fresh = await refreshTokens(stored.refreshToken);
    } catch (refreshErr) {
        // Sprint estab-e2e-tokens (2026-11-10) — fallback de 2 niveles:
        // (a) `stored.accessToken` solo sirve si la sesión server-side
        //     sigue viva (JWT local no expiró Y nadie revocó la sesión en
        //     `auth.sessions`). Un `signOut({ scope: 'global' })` humano
        //     sobre la misma cuenta mata la sesión aunque el JWT local
        //     esté dentro de su 1h. Antes del sprint, caíamos a stored y
        //     el beforeAll del primer spec post-fail colapsaba 0ms con
        //     401 silente.
        // (b) Nuevo paso: si el refresh falla, intentamos `signInWithPassword`
        //     con las credenciales del rol (env vars ya presentes en CI).
        //     Recupera un par válido sin tocar la UI ni depender de
        //     tokens previos.
        // Solo si TAMBIÉN falla el password login, recién caemos a stored
        // (último recurso, mejor que throw).
        console.warn(`[e2e/supabase] refresh ${role} falló, intentando re-login con password:`, refreshErr instanceof Error ? refreshErr.message : refreshErr);
        try {
            fresh = await signInWithPassword(role);
            console.warn(`[e2e/supabase] re-login ${role} con password: OK`);
        } catch (loginErr) {
            console.warn(`[e2e/supabase] re-login ${role} con password también falló (usando stored):`, loginErr instanceof Error ? loginErr.message : loginErr);
            fresh = stored;
        }
    }
    const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: { Authorization: `Bearer ${fresh.accessToken}` },
        },
    });
    return {
        client,
        accessToken: fresh.accessToken,
        refreshToken: fresh.refreshToken,
        builtAt: Date.now(),
    };
}

/**
 * Construye o retorna un cliente Supabase autenticado con el JWT del rol
 * dado. Rebuild si el cache excede CACHE_TTL_MS (20 min) — evita que specs
 * de suite larga usen tokens expirados. Deduplica init concurrente via
 * `inflightInit`.
 */
async function getSupabaseByRole(role: 'proveedor' | 'tutor', authFile: string): Promise<SupabaseClient> {
    const cached = cachedClients.get(role);
    if (cached && (Date.now() - cached.builtAt) < CACHE_TTL_MS) {
        return cached.client;
    }
    // Refresh vencido o primer uso — deduplicar inits concurrentes.
    const inflight = inflightInit.get(role);
    if (inflight) {
        const entry = await inflight;
        return entry.client;
    }
    const p = buildEntry(role, authFile).then((entry) => {
        cachedClients.set(role, entry);
        // Al rebuild, resetear caches derivadas dependientes del token/session.
        cachedProfileIds.delete(role);
        cachedAuthUserIds.delete(role);
        inflightInit.delete(role);
        return entry;
    }).catch((err) => {
        inflightInit.delete(role);
        throw err;
    });
    inflightInit.set(role, p);
    const entry = await p;
    return entry.client;
}

/**
 * Retorna el access_token vigente del rol dado (rebuild-aware). Usado para
 * pasar explícito a `supabase.auth.getUser(token)` — el SDK v2.109+ ya no
 * respeta `global.headers.Authorization` para endpoints /auth/v1/*.
 */
async function getRoleAccessToken(role: 'proveedor' | 'tutor', authFile: string): Promise<string> {
    await getSupabaseByRole(role, authFile);
    const entry = cachedClients.get(role);
    if (!entry) throw new Error(`[e2e/supabase] Cache vacío tras init para rol ${role}`);
    return entry.accessToken;
}

/**
 * Cliente Supabase autenticado como PROVEEDOR (F2-2B).
 */
export async function getSupabaseAsProveedor(): Promise<SupabaseClient> {
    return getSupabaseByRole('proveedor', AUTH_FILE_PROVEEDOR);
}

/**
 * Sprint fix-fix-cuidado (2026-11-23) — invalida el cache del rol para forzar
 * `buildEntry` fresh en el próximo call. Útil cuando una query RLS devuelve
 * silent-null (data=null, error=null) — indicador de que la sesión
 * server-side fue revocada aunque el JWT local no haya expirado. Recupera
 * una sesión viva con el fallback de password dentro de buildEntry.
 *
 * Patrón que lo gatilla:
 * - `supabase.from(X).insert(...).select().single()` retorna `{data: null,
 *   error: null}` → RLS POLICY WITH CHECK pasó pero RETURNING 0 filas, o
 *   session revocada mid-request.
 * - fixtures de INSERT efímeros (servicio-efimero, servicio-cuidado-listo)
 *   envuelven esa condición en `throw new Error("INSERT falló: sin data")`.
 *
 * Correcto uso: desde fixtures que detectan silent-null, llamar antes del
 * retry. Evita bucle infinito: UN solo retry por caller.
 */
export function invalidateRoleCache(role: 'proveedor' | 'tutor'): void {
    cachedClients.delete(role);
    cachedProfileIds.delete(role);
    cachedAuthUserIds.delete(role);
    // inflight queda como está — si hay un init paralelo, lo deja completar.
}

/**
 * Cliente Supabase autenticado como TUTOR (F2-3-E).
 */
export async function getSupabaseAsTutor(): Promise<SupabaseClient> {
    return getSupabaseByRole('tutor', AUTH_FILE_TUTOR);
}

/**
 * Sprint fix-sel-stale (2026-11-23) — helper interno que resuelve el user
 * profile id (fila de `proveedores` o `usuarios_buscadores`) con retry
 * defensivo ante silent-null. Reemplaza la lógica duplicada entre
 * `getProveedorId` y `getTutorId`, y agrega el patrón de retry con cliente
 * fresh cuando `.single()` devuelve `{data: null, error: null}` — la
 * manifestación 3b del patrón AUTH-TOKEN-PERSIST (SELECT silent-null tras
 * sesión revocada mid-request). Manifestación 3a (INSERT silent-null) ya
 * está cubierta en PR #170.
 *
 * Throw si:
 * - auth.getUser falla (userErr o no user.id) — session inválida.
 * - .single() devuelve error explícito (constraint, policy, schema) — NO retry.
 * - .single() devuelve silent-null → retry UNA vez con cliente fresh;
 *   si el retry también cae silent-null, throw descartando session issue.
 */
async function resolveProfileId(
    role: 'proveedor' | 'tutor',
    table: 'proveedores' | 'usuarios_buscadores',
): Promise<string> {
    const getSupabase = role === 'proveedor' ? getSupabaseAsProveedor : getSupabaseAsTutor;
    const authFile = role === 'proveedor' ? AUTH_FILE_PROVEEDOR : AUTH_FILE_TUTOR;
    const envVarHint = role === 'proveedor' ? 'E2E_STAGING_EMAIL' : 'E2E_STAGING_TUTOR_EMAIL';

    const resolveOnce = async () => {
        const supabase = await getSupabase();
        const accessToken = await getRoleAccessToken(role, authFile);
        const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
        if (userErr || !userRes?.user?.id) {
            throw new Error(`[e2e/supabase] No se pudo resolver el usuario autenticado (${role}): ${userErr?.message ?? 'no user'}`);
        }
        cachedAuthUserIds.set(role, userRes.user.id);
        const { data, error } = await supabase
            .from(table)
            .select('id')
            .eq('auth_user_id', userRes.user.id)
            .single();
        return { data, error, authUserId: userRes.user.id };
    };

    const firstAttempt = await resolveOnce();
    if (firstAttempt.error) {
        throw new Error(
            `[e2e/supabase] El usuario autenticado no tiene fila en '${table}' (error: ${firstAttempt.error.message}). ` +
            `Verifica que ${envVarHint} sea un usuario con rol ${role} en staging.`,
        );
    }
    if (firstAttempt.data) {
        cachedProfileIds.set(role, (firstAttempt.data as any).id as string);
        return (firstAttempt.data as any).id as string;
    }

    // Silent-null → retry fresh (ver servicio-efimero.ts para contexto AUTH-TOKEN-PERSIST).
    console.warn(
        `[e2e/supabase] resolveProfileId(${role},${table}) devolvió silent-null ` +
        `(patrón AUTH-TOKEN-PERSIST manifestación 3b). Reintentando con cliente fresh...`,
    );
    invalidateRoleCache(role);
    const retry = await resolveOnce();
    if (retry.error) {
        throw new Error(
            `[e2e/supabase] El usuario autenticado no tiene fila en '${table}' tras retry (error: ${retry.error.message}). ` +
            `Verifica que ${envVarHint} sea un usuario con rol ${role} en staging.`,
        );
    }
    if (!retry.data) {
        throw new Error(
            `[e2e/supabase] silent-null también en retry fresh resolveProfileId(${role},${table}) — ` +
            `no es session issue. Verificar que ${envVarHint} tiene fila en '${table}' con auth_user_id=${retry.authUserId}.`,
        );
    }
    console.warn(`[e2e/supabase] resolveProfileId(${role},${table}) OK en retry fresh.`);
    cachedProfileIds.set(role, (retry.data as any).id as string);
    return (retry.data as any).id as string;
}

/**
 * Devuelve el ID del proveedor (fila en `proveedores`) asociado al usuario
 * autenticado como proveedor. Cacheado.
 *
 * Sprint fix-sel-stale (2026-11-23) — delegado a `resolveProfileId` para
 * compartir el retry defensivo ante silent-null con `getTutorId`.
 */
export async function getProveedorId(): Promise<string> {
    const cached = cachedProfileIds.get('proveedor');
    if (cached) return cached;
    return resolveProfileId('proveedor', 'proveedores');
}

/**
 * Devuelve el ID del tutor (fila en `usuarios_buscadores`) asociado al
 * usuario autenticado como tutor. Cacheado. Usado por specs F2-3-E para
 * armar payloads que referencian a Camila.
 */
export async function getTutorId(): Promise<string> {
    const cached = cachedProfileIds.get('tutor');
    if (cached) return cached;
    return resolveProfileId('tutor', 'usuarios_buscadores');
}
