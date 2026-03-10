import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../lib/rateLimit';
import { waitlistSchema } from '../../../lib/validations';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize the Supabase client with the service role key to bypass RLS for UPSERT if needed
// However, since we have an INSERT policy, regular anon could insert, but UPSERT might need more permissions.
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    }
    if (!apiLimiter(req, res)) return;

    const parsed = waitlistSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ ok: false, error: 'Invalid input' });
    }
    const { email, comuna, categoria, rol } = parsed.data;

    try {
        const { error } = await supabase
            .from('waitlist')
            .upsert(
                {
                    email,
                    comuna: comuna || null,
                    categoria: categoria || null,
                    rol: rol || 'tutor'
                },
                { onConflict: 'email' }
            );

        if (error) {
            console.error('Error inserting into waitlist:', error);
            return res.status(500).json({ ok: false, error: 'Failed to save email' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Unexpected error in waitlist subscribe API:', err);
        return res.status(500).json({ ok: false, error: 'Internal Server Error' });
    }
}
