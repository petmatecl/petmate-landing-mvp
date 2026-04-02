import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../lib/rateLimit';
import { pushSubscribeSchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!apiLimiter(req, res)) return;

    try {
        const sessionUserId = await verifySession(req);
        if (!sessionUserId) return res.status(401).json({ error: 'Unauthorized' });

        const parsed = pushSubscribeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }
        const { subscription } = parsed.data;

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: sessionUserId,
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
