import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Use Service Role to insert notifications (bypass RLS which might block users inserting for others)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // 1. Authenticate Caller
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ message: 'Invalid token' });

    // 2. Validate Payload
    const { userId, type, title, message, link, metadata } = req.body;

    if (!userId || !type || !title || !message) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // [Security] Prevent spam? 
    // We implicitly trust authenticated users to send notifications regarding their interactions.
    // Ideally we'd validate that 'user' has a relationship with 'userId' (recipient),
    // e.g., an existing conversation or booking.
    // For MVP, knowing the sender is authenticated is a good step up from public RPC.

    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId, // Recipient
                type,
                title,
                message,
                link,
                metadata,
                read: false,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Notification API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
