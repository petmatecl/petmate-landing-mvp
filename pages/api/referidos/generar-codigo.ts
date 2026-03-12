import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../lib/rateLimit';

/**
 * POST /api/referidos/generar-codigo
 * Generates a unique referral code for an authenticated user.
 * Body: { userId: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!apiLimiter(req, res)) return;

  const { userId } = req.body;
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId required' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server config error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  try {
    // Check for existing code
    const { data: existing } = await supabaseAdmin
      .from('referidos')
      .select('codigo')
      .eq('referrer_auth_id', userId)
      .is('referred_auth_id', null)
      .limit(1)
      .maybeSingle();

    if (existing?.codigo) {
      return res.status(200).json({ codigo: existing.codigo });
    }

    // Generate unique 8-char alphanumeric code
    const codigo = 'PW' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error: insertError } = await supabaseAdmin
      .from('referidos')
      .insert({
        referrer_auth_id: userId,
        codigo,
        estado: 'pendiente',
      });

    if (insertError) throw insertError;

    return res.status(201).json({ codigo });
  } catch (err: any) {
    console.error('Referral code error:', err);
    return res.status(500).json({ error: err.message || 'Error generating code' });
  }
}
