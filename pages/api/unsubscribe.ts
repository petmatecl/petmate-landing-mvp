// pages/api/unsubscribe.ts
// ---------------------------------------------------------------------------
// Sprint PROVEEDOR-PERFIL-NUDGE-7D Sprint A PR 4 (nudge-unsub). Endpoint
// público (zero auth) para que el proveedor marque opt-out del flow de
// nudges desde el link en el email.
//
// Seguridad: el link en el email carga `token` = HMAC-SHA256 del
// auth_user_id con secret `UNSUBSCRIBE_SECRET` (env). El endpoint
// verifica el token antes de updater. Previene que attacker enumere
// auth_user_ids para desuscribir en masa.
//
// Flow:
//   1. GET /api/unsubscribe?u=<auth_user_id>&t=<token>
//   2. Valida HMAC(auth_user_id, UNSUBSCRIBE_SECRET) === token.
//   3. UPDATE proveedores SET nudge_opt_out=true WHERE auth_user_id=u.
//   4. Redirige a /unsubscribe-ok (página estática).
//   5. Si token inválido → 403.
//
// Spec: docs/sprints/proveedor-perfil-nudge-plan.md.
// Deuda EMAILS-UNSUBSCRIBE-UNIFIED (BACKLOG) cubre a futuro tabla
// dedicada con compliance LPDP más robusto.
// ---------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { logSupabaseError } from '../../lib/logSupabaseError';
import { verifyUnsubscribeToken } from '../../lib/unsubscribeToken';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { u, t } = req.query;
    if (typeof u !== 'string' || typeof t !== 'string' || !u || !t) {
        return res.status(400).json({ error: 'Missing u or t params' });
    }

    const secret = process.env.UNSUBSCRIBE_SECRET;
    if (!secret) {
        console.error('[unsubscribe] UNSUBSCRIBE_SECRET env missing');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (!verifyUnsubscribeToken(u, t, secret)) {
        return res.status(403).json({ error: 'Invalid token' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Missing supabase config' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabaseAdmin
        .from('proveedores')
        .update({ nudge_opt_out: true })
        .eq('auth_user_id', u)
        .select('id');
    logSupabaseError('api:unsubscribe:update', error, { authUserId: u });

    if (error) {
        return res.status(500).json({ error: 'Update failed' });
    }
    if (!data || data.length === 0) {
        // Idempotency: si no hay provider con ese auth_user_id, igual
        // responder 200 — no revelar existencia o no existencia (previene
        // enumeration ataque adicional).
        return res.redirect(302, '/unsubscribe-ok');
    }

    return res.redirect(302, '/unsubscribe-ok');
}

export default wrapApiHandlerWithSentry(handler, '/api/unsubscribe');
