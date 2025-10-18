// pages/api/join-waitlist.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
    const data = req.body;

    // Aquí podrías validar campos en servidor y guardar en tu BD (Supabase, etc.)
    // Por ahora devolvemos ok
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error('join-waitlist error', e);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
