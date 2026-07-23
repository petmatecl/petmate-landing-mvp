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
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const AUTH_FILE_PROVEEDOR = path.resolve(__dirname, '../.auth/proveedor.json');
const AUTH_FILE_TUTOR = path.resolve(__dirname, '../.auth/tutor.json');

/**
 * Extrae el access_token del storageState de Playwright. Supabase Auth
 * persiste el token en localStorage bajo la key `sb-{projectRef}-auth-token`.
 */
function extractAccessToken(authFile: string): string {
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
                    if (parsed?.access_token) return parsed.access_token;
                } catch {
                    // Ignore malformed items, keep looking.
                }
            }
        }
    }
    throw new Error(
        `[e2e/supabase] No se encontró access_token en storageState ${authFile}. ` +
        `Es posible que el login haya fallado silenciosamente o que Supabase ` +
        `haya cambiado el formato del token en localStorage.`
    );
}

// Cachés separados por rol para evitar cross-contamination entre specs
// que corren en proyectos distintos (proveedor vs tutor).
const cachedClients = new Map<string, SupabaseClient>();
const cachedProfileIds = new Map<string, string>();
const cachedAuthUserIds = new Map<string, string>();

/**
 * Construye un cliente Supabase autenticado con el JWT del rol dado. Cachea
 * por rol para reuse entre fixtures dentro del mismo worker.
 */
function getSupabaseByRole(role: 'proveedor' | 'tutor', authFile: string): SupabaseClient {
    const cached = cachedClients.get(role);
    if (cached) return cached;

    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        throw new Error(
            `[e2e/supabase] Faltan E2E_SUPABASE_URL y/o E2E_SUPABASE_ANON_KEY ` +
            `en e2e/.env.test. Se necesitan para operar la BD como el usuario ` +
            `logueado (sin service role, respetando RLS).`
        );
    }
    const accessToken = extractAccessToken(authFile);
    const client = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    });
    cachedClients.set(role, client);
    return client;
}

/**
 * Cliente Supabase autenticado como PROVEEDOR (F2-2B).
 */
export function getSupabaseAsProveedor(): SupabaseClient {
    return getSupabaseByRole('proveedor', AUTH_FILE_PROVEEDOR);
}

/**
 * Cliente Supabase autenticado como TUTOR (F2-3-E).
 */
export function getSupabaseAsTutor(): SupabaseClient {
    return getSupabaseByRole('tutor', AUTH_FILE_TUTOR);
}

/**
 * Devuelve el ID del proveedor (fila en `proveedores`) asociado al usuario
 * autenticado como proveedor. Cacheado.
 */
export async function getProveedorId(): Promise<string> {
    const cached = cachedProfileIds.get('proveedor');
    if (cached) return cached;
    const supabase = getSupabaseAsProveedor();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
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
    const supabase = getSupabaseAsTutor();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
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
