import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { subscription, userId } = req.body;

        if (!subscription || !subscription.endpoint || !userId) {
            return res.status(400).json({ error: 'Missing subscription or user data' });
        }

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error saving push subscription:', error);
        return res.status(500).json({ error: 'Failed to save subscription' });
    }
}
