import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { auth_user_id, servicio_id, proveedor_id, canal } = req.body;

    if (!auth_user_id || !servicio_id || !proveedor_id || !canal) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const validCanales = ['mensaje', 'whatsapp', 'llamada', 'email_copiado'];
    if (!validCanales.includes(canal)) {
        return res.status(400).json({ error: 'Invalid canal' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { error } = await supabaseAdmin.from('contactos').insert({
            auth_user_id,
            servicio_id,
            proveedor_id,
            canal,
        });

        // Ignore unique constraint violations (duplicate per day)
        if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            throw error;
        }

        return res.status(201).json({ ok: true });
    } catch (err: any) {
        console.error('Track contact error:', err);
        return res.status(500).json({ error: err.message });
    }
}
