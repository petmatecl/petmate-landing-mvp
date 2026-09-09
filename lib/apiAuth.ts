import { NextApiRequest } from 'next';
import * as Sentry from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Sprint L1-2 (2026-09-09) — resultado tipado con 3 estados en vez del
 * boolean previo. Motivo: el boolean colapsaba dos casos con severidades
 * distintas (envconfig faltante vs auth inválida) que necesitan
 * respuestas HTTP y observabilidad diferentes.
 *
 * - `missing-config` → **500** + Sentry captureMessage `internal_secret
 *   _env_missing` con severity `error`. Refleja un ambient roto (env var
 *   no seteada en Vercel/CI). Un caller con header correcto no debería
 *   ver esto — pero si ocurre, Sentry lo muestra explícitamente y el
 *   endpoint responde 500 (server error) en vez de 403 (auth failure),
 *   así el operador ve la naturaleza real del problema.
 * - `missing-header` / `invalid` → **403**. Auth failure genuina.
 * - `ok: true` → paso a siguiente handler.
 *
 * Antes: si `INTERNAL_API_SECRET` no estaba, `expected` era undefined y
 * el helper retornaba `false` sin distinguir. En el mismo commit
 * signup.ts usaba fallback `|| 'pawnecta-internal'` como llave por
 * defecto — un secreto conocido en el codebase que un adversario podría
 * usar para llamar endpoints internos si nunca configuramos la env.
 * Ambos vectores cerrados acá: sin env, servidor rechaza 500 loud + sin
 * fallback en el caller.
 */
export type InternalSecretResult =
    | { ok: true }
    | { ok: false; status: 500; reason: 'missing-config' }
    | { ok: false; status: 403; reason: 'missing-header' | 'invalid' };

export function verifyInternalSecret(req: NextApiRequest): InternalSecretResult {
    const secret = req.headers['x-internal-secret'] as string | undefined;
    const expected = process.env.INTERNAL_API_SECRET;

    if (!expected) {
        // Ambient roto — la env var NO está seteada en el runtime.
        // Sentry error para que dispare alerta en el dashboard. Endpoint
        // responde 500 con reason explícita (no 403) para que el operador
        // vea la naturaleza real.
        Sentry.captureMessage('internal_secret_env_missing', {
            level: 'error',
            tags: {
                subsystem: 'apiAuth',
                route: req.url || 'unknown',
                env: process.env.VERCEL_ENV || 'unknown',
            },
        });
        return { ok: false, status: 500, reason: 'missing-config' };
    }
    if (!secret) return { ok: false, status: 403, reason: 'missing-header' };
    if (secret !== expected) return { ok: false, status: 403, reason: 'invalid' };
    return { ok: true };
}

/**
 * Verify Supabase session from Authorization header.
 * Returns user ID or null if invalid/expired.
 */
export async function verifySession(req: NextApiRequest): Promise<string | null> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return user.id;
    } catch {
        return null;
    }
}

/**
 * Enmascara un email para logs: primeros 3 chars del local + '***@' + dominio.
 * Ejemplo: `canocortes@gmail.com` → `can***@gmail.com`. Preserva el dominio
 * para diagnóstico de deliverability (spam por provider, quotas), oculta la
 * identidad. Fallback silencioso si el input no matchea el formato email.
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return '<none>';
    const at = email.indexOf('@');
    if (at < 1) return '<invalid>';
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    const prefix = local.length <= 3 ? local : local.slice(0, 3);
    return `${prefix}***@${domain}`;
}

/**
 * Trunca un auth uid (UUID) a los primeros 8 chars + '…' para logs. Los 8
 * chars alcanzan para correlacionar eventos del mismo user en Vercel logs
 * sin exponer el uid completo (que es reidentificable via BD).
 */
export function maskUid(uid: string | null | undefined): string {
    if (!uid) return '<none>';
    return uid.slice(0, 8) + '…';
}

/**
 * Check if user is admin (has 'admin' role in proveedores table).
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
        .from('proveedores')
        .select('roles, estado')
        .eq('auth_user_id', userId)
        .maybeSingle();

    if (!data) return false;
    const roles = Array.isArray(data.roles) ? data.roles : [];
    return roles.includes('admin') && data.estado === 'aprobado';
}
