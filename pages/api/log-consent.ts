import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente con Service Role para poder escribir en la tabla segura
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { userId, documentVersion } = req.body;

    if (!userId || !documentVersion) {
        return res.status(400).json({ message: 'Missing userId or documentVersion' });
    }

    // Obtener IP
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
                    user_agent: userAgent
                }
            ]);

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Error logging consent:', error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}
