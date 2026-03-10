import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'
import { authLimiter } from '../../../lib/rateLimit'
import { loginSchema } from '../../../lib/validations'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' })
  if (!authLimiter(req, res)) return

  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok:false, error:'Invalid input' })

  const { email, role } = parsed.data
  const roleValue = role
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
