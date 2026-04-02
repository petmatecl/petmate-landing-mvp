import { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Verify internal API secret for server-to-server calls.
 * ALWAYS requires the env var to be set — no fallback.
 */
export function verifyInternalSecret(req: NextApiRequest): boolean {
    const secret = req.headers['x-internal-secret'] as string;
    const expected = process.env.INTERNAL_API_SECRET;
    if (!expected || !secret) return false;
    return secret === expected;
}

/**
 * Verify Supabase session from Authorization header.
 * Returns user ID or null if invalid/expired.
 */
export async function verifySession(req: NextApiRequest): Promise<string | null> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;

    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return user.id;
    } catch {
        return null;
    }
}

/**
 * Check if user is admin (has 'admin' role in proveedores table).
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
        .from('proveedores')
        .select('roles, estado')
        .eq('auth_user_id', userId)
        .maybeSingle();

    if (!data) return false;
    const roles = Array.isArray(data.roles) ? data.roles : [];
    return roles.includes('admin') && data.estado === 'aprobado';
}
