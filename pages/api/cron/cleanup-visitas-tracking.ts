import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { skipIfNonProd, validateCronRequest } from '../../../lib/cronGuard';

/**
 * Cron: elimina filas de visitas_tracking con created_at > 7 días.
 * Schedule: "0 3 * * *" (3 AM UTC diario).
 *
 * El TTL de 7 días está alineado con la ventana del rate limit
 * (1 visita por visitor por día UTC) — más allá no aporta valor.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!validateCronRequest(req, res)) return;
    if (skipIfNonProd(req, res)) return;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Missing config' });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    try {
        const { data, error } = await supabaseAdmin.rpc('cleanup_visitas_tracking');

        if (error) {
            console.error('[cron/cleanup-visitas-tracking] RPC error:', error);
            return res.status(500).json({ error: 'Internal error' });
        }

        return res.status(200).json({ ok: true, rows_deleted: data ?? 0 });
    } catch (err: any) {
        console.error('[cron/cleanup-visitas-tracking] failed:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}

export default wrapApiHandlerWithSentry(handler, '/api/cron/cleanup-visitas-tracking');
