import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' })
  const { email, role } = req.body || {}
  if (!email || !role) return res.status(400).json({ ok:false, error:'email and role required' })

  const roleValue = ['client','caretaker','admin'].includes(role) ? role : 'client'
  const cookie = serialize('pm_role', roleValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 días
  })

  const session = serialize('pm_email', String(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  })

  res.setHeader('Set-Cookie', [cookie, session])
  res.status(200).json({ ok:true })
}
