import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Inicializar cliente con Service Role para poder escribir en la tabla segura
// [SECURITY] Esto se mantiene porque 'consent_logs' debe ser write-only/admin
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_DOCUMENTS = ['tos_v1', 'privacy_v1', 'data_processing_v1'];

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { documentVersion } = req.body;

    // 1. Validate Input
    if (!documentVersion || !VALID_DOCUMENTS.includes(documentVersion)) {
        // Fallback for MVP if enum strictness is an issue, but safer to enforce
        // If we don't know the exact versions, let's at least ensure it's a string and reasonably short
        if (typeof documentVersion !== 'string' || documentVersion.length > 50) {
            return res.status(400).json({ message: 'Invalid documentVersion' });
        }
    }

    // 2. Derive User ID from Session (Server-Side)
    // Try getting token from Authorization header (Bearer) or Cookie
    let token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        // Try getting from standard Supabase cookie name pattern
        // Note: Project might use different cookie names based on configuration.
        // Assuming 'sb-access-token' or similar if manually handled, 
        // but 'supabase-js' on client usually sets a specific one if using default helpers?
        // Given no helpers, the client usually sends Bearer token in headers for API calls.
        // We will enforce Authorization header for this critical operation.
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = user.id;

    // 3. Log Consent
    // Obtener IP
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    try {
        const { error } = await supabaseAdmin
            .from('consent_logs')
            .insert([
                {
                    user_id: userId, // [SECURITY] Source of truth
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
