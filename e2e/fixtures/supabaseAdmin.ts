// e2e/fixtures/supabaseAdmin.ts
// ---------------------------------------------------------------------------
// Sprint J-4 F2-RESERVAS-CLEANUP (2026-09-23) — helper service_role para
// cleanup autoritative en fixtures de la suite e2e.
//
// PROBLEMA QUE RESUELVE: la tabla `public.agendamientos` no tiene policy RLS
// `FOR DELETE` (verificado 2026-09-23 vía MCP staging: solo INSERT, SELECT y
// UPDATE existen). Cuando los afterAll de los specs F2-3 llaman
// `borrarServicioResiliente(supabase=getSupabaseAsProveedor(), servicio.id)`,
// el DELETE agendamientos con JWT del proveedor devuelve `{data:[], error:null}`
// (semántica RLS: 0 filas afectadas, cero error visible) → agendamientos
// residuales sobreviven → FK `agendamientos_servicio_id_fkey` bloquea el DELETE
// del servicio padre → error visible en log F2 → residuos acumulados corrida
// tras corrida (413 reservas en Camila al 2026-09-23, causa raíz del fail S6).
//
// Este helper expone un cliente `service_role` con guards análogos a
// `signupLink.ts` — SOLO staging, SOLO Secret Key nueva `sb_secret_...`, cero
// import desde código productivo. El bypass de RLS es legítimo en runner
// e2e para limpiar residuos de fixture; nunca se usa desde código productivo
// (verificable por grep `getSupabaseAdmin` en `pages/`/`lib/`/`components/`
// que debe devolver 0 matches).
//
// **GARANTÍAS DE AISLAMIENTO STAGING**:
// - Guard 1: `E2E_SUPABASE_URL` DEBE contener el ref del proyecto staging
//   (`jmtadvdkicyylcwjcmcl`). Si no lo hace, abort loud.
// - Guard 2: `E2E_SUPABASE_SERVICE_KEY` DEBE empezar con `sb_secret_` (formato
//   nuevo Supabase Secret Key). Rechaza legacy JWT `eyJ...` y project keys
//   `sbp_...`.
// - Cero log del key completo — solo mask primeros 12 chars.
//
// **USO**: `const admin = await getSupabaseAdmin();` en el afterAll (o
// beforeAll para cleanupHuerfanos) → pasa admin como primer parámetro al
// helper de cleanup. Los INSERT de reservas siguen con JWT tutor/proveedor
// (auth path real, respetando RLS — validación empírica de que un tutor real
// puede insertar su reserva).
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STAGING_PROJECT_REF = 'jmtadvdkicyylcwjcmcl';
const EXPECTED_KEY_PREFIX = 'sb_secret_';

let cachedAdmin: SupabaseClient | null = null;

function maskKey(key: string | undefined): string {
    if (!key) return '<empty>';
    if (key.length < 12) return '<short>';
    return `${key.slice(0, 12)}…`;
}

/**
 * Retorna un cliente Supabase autenticado como service_role — bypass de RLS
 * completo. Cacheado por proceso (idempotente entre calls).
 *
 * @throws Error si (a) `E2E_SUPABASE_URL` no seteado, (b) URL no contiene ref
 * staging, (c) `E2E_SUPABASE_SERVICE_KEY` no seteado, (d) key sin prefix
 * `sb_secret_`.
 */
export async function getSupabaseAdmin(): Promise<SupabaseClient> {
    if (cachedAdmin) return cachedAdmin;

    const url = process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.E2E_SUPABASE_SERVICE_KEY;

    if (!url) {
        throw new Error('[supabaseAdmin] E2E_SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL fallback) no seteado; cero acción.');
    }
    if (!url.includes(STAGING_PROJECT_REF)) {
        throw new Error(
            `[supabaseAdmin] URL "${url}" no contiene el ref staging '${STAGING_PROJECT_REF}'. ` +
            `Este helper es EXCLUSIVAMENTE staging. Abort loud para prevenir uso contra prod.`,
        );
    }
    if (!key) {
        throw new Error('[supabaseAdmin] E2E_SUPABASE_SERVICE_KEY no seteado; cero acción.');
    }
    if (!key.startsWith(EXPECTED_KEY_PREFIX)) {
        throw new Error(
            `[supabaseAdmin] Key ${maskKey(key)} no matchea prefix esperado '${EXPECTED_KEY_PREFIX}'. ` +
            `Este helper exige nueva Supabase Secret Key (sb_secret_...); rechaza legacy JWT (eyJ...) o project keys (sbp_...).`,
        );
    }

    cachedAdmin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedAdmin;
}
