// e2e/fixtures/signupLink.ts
// ---------------------------------------------------------------------------
// Sprint LINK-CONFIRM-EMAIL (2026-09-21) — helper del RUNNER, no del código
// productivo. Genera el enlace de confirmación de signup vía admin.generateLink
// desde el test-runner con una service key SÓLO de staging, sin tocar signup.ts
// ni welcome.ts en producción.
//
// Motivación: el spec de signup end-to-end necesita obtener el `action_link`
// que aterriza al user en `/email-confirmado?token=...` para completar el flujo
// de "abrir el correo → click botón → sesión confirmada". El correo real
// (welcome via Resend en prod, con `confirmationUrl` embebido) NO se lee en
// tests — se lo genera acá con la misma API que usaría el productivo, pero
// desde runner sin depender de Mailtrap ni ningún proveedor SMTP.
//
// **GARANTÍAS DE AISLAMIENTO STAGING**:
// - Guard 1: `E2E_SUPABASE_URL` DEBE contener el ref del proyecto staging
//   (`jmtadvdkicyylcwjcmcl`). Si no lo hace, abort loud — cero riesgo de tocar
//   prod aunque alguien pase la env var equivocada.
// - Guard 2: `E2E_SUPABASE_SERVICE_KEY` DEBE empezar con `sb_secret_` (formato
//   nuevo Supabase Secret Key). Rechaza el legacy JWT format `eyJ...` o el
//   prefix `sbp_` (project keys) — solo aceptamos la keys nueva emitida
//   específicamente para runner e2e.
// - Cero import desde código productivo (verificable por grep). El helper vive
//   en `e2e/fixtures/` y no está referenciado por nada bajo `pages/`, `lib/`,
//   `components/`.
//
// **NO LOGUEA LA KEY**: cero `console.log(key)` en ningún path. Los logs de
// diagnóstico solo emiten los primeros 8 chars + `…` como identificador
// (`sb_secret_abc…`). GitHub Actions también enmascara el secret automático
// en el output de workflows.
// ---------------------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

const STAGING_PROJECT_REF = 'jmtadvdkicyylcwjcmcl';
const EXPECTED_KEY_PREFIX = 'sb_secret_';

/**
 * Máscara segura del key para logs — primeros 8 chars + `…`. Nunca imprime
 * el key completo, aunque el error de fetch de Supabase lo eche a stderr.
 */
function maskKey(key: string | undefined): string {
    if (!key) return '<empty>';
    if (key.length < 12) return '<short>';
    return `${key.slice(0, 12)}…`;
}

export type SignupLinkOpts = {
    /** Override del URL para tests negativos. Default: process.env.E2E_SUPABASE_URL. */
    urlOverride?: string;
    /** Override del key para tests negativos. Default: process.env.E2E_SUPABASE_SERVICE_KEY. */
    keyOverride?: string;
    /** Redirect final tras confirmar. Default: `${siteUrl}/email-confirmado` con siteUrl derivado del URL. */
    redirectTo?: string;
};

/**
 * Genera un action_link de magic-link para el email dado. El link es
 * equivalente al que un signup real generaría — abrirlo en Playwright
 * confirma la sesión del user existente sin tocar la superficie signup.ts.
 *
 * Se usa `type: 'magiclink'` en vez de `'signup'` porque `signup` requiere
 * password + crea el user; `magiclink` funciona sobre user ya existente
 * (que el POST /api/auth/signup del test acaba de crear) y genera el token
 * de confirmación pass-through.
 *
 * @throws Error con mensaje explícito ante:
 *   - URL sin el ref de staging (guard 1).
 *   - Key con prefix inválido (guard 2).
 *   - Fallo de la API Supabase (401 invalid, 429 rate, network).
 *   - action_link vacío o malformado en el response.
 */
export async function generateSignupLink(
    email: string,
    opts: SignupLinkOpts = {},
): Promise<string> {
    const url = opts.urlOverride ?? process.env.E2E_SUPABASE_URL;
    const key = opts.keyOverride ?? process.env.E2E_SUPABASE_SERVICE_KEY;

    // Guard 1: URL debe ser staging.
    if (!url) {
        throw new Error('[signupLink] E2E_SUPABASE_URL no seteado; cero acción para prevenir uso indebido.');
    }
    if (!url.includes(STAGING_PROJECT_REF)) {
        throw new Error(
            `[signupLink] URL "${url}" no contiene el ref staging '${STAGING_PROJECT_REF}'. ` +
            `Este helper es EXCLUSIVAMENTE staging. Abort loud para prevenir uso contra prod.`,
        );
    }

    // Guard 2: Key debe ser nueva Secret Key (no legacy JWT ni sbp_).
    if (!key) {
        throw new Error('[signupLink] E2E_SUPABASE_SERVICE_KEY no seteado; cero acción.');
    }
    if (!key.startsWith(EXPECTED_KEY_PREFIX)) {
        throw new Error(
            `[signupLink] Key ${maskKey(key)} no matchea prefix esperado '${EXPECTED_KEY_PREFIX}'. ` +
            `Este helper exige nueva Supabase Secret Key (sb_secret_...); rechaza legacy JWT (eyJ...) o project keys (sbp_...).`,
        );
    }

    // Cero log del key completo en cualquier path. Solo mask.
    // (createClient tampoco loguea el key — pasa por header Authorization).
    const admin = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const siteUrl = opts.redirectTo ?? deriveSiteUrl();
    const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${siteUrl}/email-confirmado` },
    });

    if (error) {
        // Error clear + key masked (Supabase SDK a veces incluye el token en
        // el error message; el mask lo previene si aparece).
        throw new Error(
            `[signupLink] admin.generateLink falló: ${error.message} (status: ${error.status ?? 'n/a'}, key: ${maskKey(key)})`,
        );
    }

    const link = data?.properties?.action_link;
    if (!link || typeof link !== 'string' || !link.startsWith('http')) {
        throw new Error(
            `[signupLink] Response sin action_link válido. Recibido: ${JSON.stringify(data?.properties ?? null).slice(0, 200)}`,
        );
    }

    return link;
}

/**
 * Deriva la URL del sitio del PLAYWRIGHT_BASE_URL de la suite. En CI esto
 * es el preview de Vercel del branch actual; en local es la staging URL fija.
 * Fallback a staging URL default si nada seteado (defensivo).
 */
function deriveSiteUrl(): string {
    const base = process.env.PLAYWRIGHT_BASE_URL;
    if (base) {
        try {
            return new URL(base).origin;
        } catch {
            // fallthrough
        }
    }
    return 'https://pawnecta-landing-mvp-git-staging-petmatecls-projects.vercel.app';
}
