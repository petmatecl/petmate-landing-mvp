import type { NextApiRequest, NextApiResponse } from 'next'
import { authLimiter } from '../../../lib/rateLimit'
import { loginSchema } from '../../../lib/validations'

// Endpoint legacy: las cookies pm_role / pm_email se removieron (eran
// dead weight, nadie las leia). Hoy queda como un no-op que valida
// schema + rate limit + responde {ok:true}. La sesion real la maneja
// Supabase client-side. Candidato a borrar entero — flageado para
// decision aparte.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' })
  if (!authLimiter(req, res)) return

  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ ok:false, error:'Invalid input' })

  res.status(200).json({ ok:true })
}
