import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { apiLimiter } from '../../../lib/rateLimit';
import { pushSendSchema } from '../../../lib/validations';
import { verifyInternalSecret } from '../../../lib/apiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// VAPID keys setup
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        'mailto:soporte@pawnecta.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!verifyInternalSecret(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!apiLimiter(req, res)) return;

    try {
        const parsed = pushSendSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input' });
        }
        const { userId, title, message, url } = parsed.data;

        // Fetch user subscriptions
        const { data: subs, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        if (!subs || subs.length === 0) return res.status(200).json({ success: true, sent: 0 });

        const payload = JSON.stringify({
            title,
            message: message || '',
            url: url || '/'
        });

        const sendPromises = subs.map(async (row) => {
            const subscription = {
                endpoint: row.endpoint,
                keys: {
                    p256dh: row.p256dh,
                    auth: row.auth
                }
            };

            try {
                await webpush.sendNotification(subscription, payload);
                return true;
            } catch (err: any) {
                // If the subscription is invalid or expired, delete it from the DB
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', row.id);
                } else {
                    console.error('Error sending push notification', err);
                }
                return false;
            }
        });

        const results = await Promise.all(sendPromises);
        const sentCount = results.filter(Boolean).length;

        return res.status(200).json({ success: true, sent: sentCount });

    } catch (err) {
        console.error('Handler error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
