import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../lib/rateLimit';
import { logConsentSchema } from '../../lib/validations';
import { verifySession } from '../../lib/apiAuth';

// Sweep #1 finding [78]: reescrito para usar `verifySession` canónico
// (lib/apiAuth) en vez de duplicar el patrón. Antes había dos clientes
// (admin + anon) — el anon solo servía para replicar getUser(token) que
// verifySession ya hace internamente.
//
// consent_logs es admin-write (service_role) por diseño — la fila es la
// prueba legal de consentimiento y no debe poder falsificarse desde el
// cliente. El writer sigue con service_role; la autenticación del caller
// va vía el helper canónico.

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    if (!apiLimiter(req, res)) return;

    const parsed = logConsentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid documentVersion' });
    }
    const { documentVersion } = parsed.data;

    const userId = await verifySession(req);
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    try {
        const { error } = await supabaseAdmin
            .from('consent_logs')
            .insert([
                {
                    user_id: userId,
                    document_version: documentVersion,
                    ip_address: ip,
                    user_agent: userAgent,
                },
            ]);

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error logging consent:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
