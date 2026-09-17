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
    } catch (err) {
        // Fallback: si el refresh falla (network, token revocado, etc), usar
        // el access_token stored — todavía puede tener minutos de vida.
        console.warn(`[e2e/supabase] refresh ${role} falló (usando stored):`, err instanceof Error ? err.message : err);
        fresh = stored;
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
 * Cliente Supabase autenticado como TUTOR (F2-3-E).
 */
export async function getSupabaseAsTutor(): Promise<SupabaseClient> {
    return getSupabaseByRole('tutor', AUTH_FILE_TUTOR);
}

/**
 * Devuelve el ID del proveedor (fila en `proveedores`) asociado al usuario
 * autenticado como proveedor. Cacheado.
 */
export async function getProveedorId(): Promise<string> {
    const cached = cachedProfileIds.get('proveedor');
    if (cached) return cached;
    const supabase = await getSupabaseAsProveedor();
    const accessToken = await getRoleAccessToken('proveedor', AUTH_FILE_PROVEEDOR);
    const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userRes?.user?.id) {
        throw new Error(`[e2e/supabase] No se pudo resolver el usuario autenticado (proveedor): ${userErr?.message ?? 'no user'}`);
    }
    cachedAuthUserIds.set('proveedor', userRes.user.id);
    const { data: prov, error: provErr } = await supabase
        .from('proveedores')
        .select('id')
        .eq('auth_user_id', userRes.user.id)
        .single();
    if (provErr || !prov) {
        throw new Error(
            `[e2e/supabase] El usuario autenticado no tiene fila en 'proveedores'. ` +
            `Verifica que E2E_STAGING_EMAIL sea un usuario con rol proveedor en staging.`
        );
    }
    cachedProfileIds.set('proveedor', prov.id as string);
    return prov.id as string;
}

/**
 * Devuelve el ID del tutor (fila en `usuarios_buscadores`) asociado al
 * usuario autenticado como tutor. Cacheado. Usado por specs F2-3-E para
 * armar payloads que referencian a Camila.
 */
export async function getTutorId(): Promise<string> {
    const cached = cachedProfileIds.get('tutor');
    if (cached) return cached;
    const supabase = await getSupabaseAsTutor();
    const accessToken = await getRoleAccessToken('tutor', AUTH_FILE_TUTOR);
    const { data: userRes, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !userRes?.user?.id) {
        throw new Error(`[e2e/supabase] No se pudo resolver el usuario autenticado (tutor): ${userErr?.message ?? 'no user'}`);
    }
    cachedAuthUserIds.set('tutor', userRes.user.id);
    const { data: tut, error: tutErr } = await supabase
        .from('usuarios_buscadores')
        .select('id')
        .eq('auth_user_id', userRes.user.id)
        .single();
    if (tutErr || !tut) {
        throw new Error(
            `[e2e/supabase] El usuario autenticado no tiene fila en 'usuarios_buscadores'. ` +
            `Verifica que E2E_STAGING_TUTOR_EMAIL sea un usuario con rol tutor en staging (Camila).`
        );
    }
    cachedProfileIds.set('tutor', tut.id as string);
    return tut.id as string;
}
