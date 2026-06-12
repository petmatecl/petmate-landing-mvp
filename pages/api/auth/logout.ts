import type { NextApiRequest, NextApiResponse } from 'next'

// Endpoint legacy: las cookies pm_role / pm_email se removieron (eran
// dead weight, nadie las leia). Hoy es un no-op que solo valida method
// y responde {ok:true}. La sesion real la cierra el client Supabase via
// supabase.auth.signOut(). Candidato a borrar entero — flageado para
// decision aparte.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.status(200).json({ ok:true })
}
