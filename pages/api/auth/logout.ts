import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clear = (name:string) => serialize(name, '', { httpOnly:true, path:'/', maxAge: 0 })
  res.setHeader('Set-Cookie', [clear('pm_role'), clear('pm_email')])
  res.status(200).json({ ok:true })
}
