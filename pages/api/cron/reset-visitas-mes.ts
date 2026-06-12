import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { skipIfNonProd } from '../../../lib/cronGuard';

/**
 * Cron: resetea visitas_mes a 0 en servicios_publicados y proveedores.
 * Schedule: "0 0 1 * *" (1ro de cada mes a las 00:00 UTC).
 *
 * Pattern de auth idéntico a los otros crons del proyecto:
 *   Authorization: Bearer ${CRON_SECRET}  (Vercel cron)
 *   o x-cron-secret: ${CRON_SECRET}        (manual / external scheduler)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (skipIfNonProd(req, res)) return;

    const authHeader = req.headers.authorization;
    const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

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
