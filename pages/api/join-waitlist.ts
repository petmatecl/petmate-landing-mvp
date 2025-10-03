import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE as string; // keep on server only

const supabase = createClient(supabaseUrl, supabaseServiceRole);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const { name, email, city, role, when_travel } = req.body || {};
  if (!name || !email) return res.status(400).send('Missing fields');

  const { error } = await supabase.from('waitlist').insert({
    name, email, city, role, when_travel
  });

  if (error) return res.status(500).send(error.message);
  return res.status(200).json({ ok: true });
}
