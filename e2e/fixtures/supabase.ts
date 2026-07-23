// e2e/fixtures/supabase.ts
// ---------------------------------------------------------------------------
// Cliente Supabase autenticado con el JWT del usuario logueado en storageState.
// Respeta RLS — no usa service role. Todo lo que puede hacer este cliente
// es exactamente lo que puede hacer el proveedor logueado desde la app.
//
// Requisitos en e2e/.env.test:
//   E2E_SUPABASE_URL       — URL del proyecto Supabase staging
//   E2E_SUPABASE_ANON_KEY  — anon key (público, ya vive en el bundle de la app)
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.resolve(__dirname, '../.auth/proveedor.json');

/**
 * Extrae el access_token del storageState de Playwright. Supabase Auth
 * persiste el token en localStorage bajo la key `sb-{projectRef}-auth-token`.
 */
function extractAccessToken(): string {
    if (!fs.existsSync(AUTH_FILE)) {
        throw new Error(
            `[e2e/supabase] storageState no existe en ${AUTH_FILE}. ` +
            `¿Corriste el setup project (auth.setup.ts)?`
        );
    }
    const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
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
        `[e2e/supabase] No se encontró access_token en storageState. ` +
        `Es posible que el login haya fallado silenciosamente o que Supabase ` +
        `haya cambiado el formato del token en localStorage.`
    );
}

let cachedClient: SupabaseClient | null = null;
let cachedProveedorId: string | null = null;
let cachedAuthUserId: string | null = null;

/**
 * Devuelve un cliente Supabase autenticado con el JWT del proveedor. Cachea
 * el cliente dentro del proceso — las fixtures lo comparten sin re-crear.
 */
export function getSupabaseAsProveedor(): SupabaseClient {
    if (cachedClient) return cachedClient;

    const supabaseUrl = process.env.E2E_SUPABASE_URL;
    const anonKey = process.env.E2E_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
        throw new Error(
            `[e2e/supabase] Faltan E2E_SUPABASE_URL y/o E2E_SUPABASE_ANON_KEY ` +
            `en e2e/.env.test. Se necesitan para operar la BD como el usuario ` +
            `logueado (sin service role, respetando RLS).`
        );
    }
    const accessToken = extractAccessToken();
    cachedClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
            headers: { Authorization: `Bearer ${accessToken}` },
        },
    });
    return cachedClient;
}

/**
 * Devuelve el ID del proveedor (fila en `proveedores`) asociado al usuario
 * autenticado. Cacheado — cero re-queries entre specs.
 */
export async function getProveedorId(): Promise<string> {
    if (cachedProveedorId) return cachedProveedorId;
    const supabase = getSupabaseAsProveedor();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.id) {
        throw new Error(`[e2e/supabase] No se pudo resolver el usuario autenticado: ${userErr?.message ?? 'no user'}`);
    }
    cachedAuthUserId = userRes.user.id;
    const { data: prov, error: provErr } = await supabase
        .from('proveedores')
        .select('id')
        .eq('auth_user_id', cachedAuthUserId)
        .single();
    if (provErr || !prov) {
        throw new Error(
            `[e2e/supabase] El usuario autenticado no tiene fila en 'proveedores'. ` +
            `Verifica que E2E_STAGING_EMAIL sea un usuario con rol proveedor en staging.`
        );
    }
    cachedProveedorId = prov.id as string;
    return cachedProveedorId;
}
