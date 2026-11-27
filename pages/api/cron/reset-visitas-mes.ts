import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { skipIfNonProd, validateCronRequest } from '../../../lib/cronGuard';

/**
 * Cron: resetea visitas_mes a 0 en servicios_publicados y proveedores.
 * Schedule: "0 0 1 * *" (1ro de cada mes a las 00:00 UTC).
 *
 * Pattern de auth idéntico a los otros crons del proyecto:
 *   Authorization: Bearer ${CRON_SECRET}  (Vercel cron)
 *   o x-cron-secret: ${CRON_SECRET}        (manual / external scheduler)
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
        const { data, error } = await supabaseAdmin.rpc('reset_visitas_mes');

        if (error) {
            console.error('[cron/reset-visitas-mes] RPC error:', error);
            return res.status(500).json({ error: 'Internal error' });
        }

        return res.status(200).json({ ok: true, rows_affected: data ?? 0 });
    } catch (err: any) {
        console.error('[cron/reset-visitas-mes] failed:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}

export default wrapApiHandlerWithSentry(handler, '/api/cron/reset-visitas-mes');
