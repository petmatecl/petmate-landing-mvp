// pages/api/mercadopago_disabled/create-preference.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  // MercadoPago deshabilitado temporalmente para este ambiente
  res.status(503).json({ ok: false, message: 'MercadoPago deshabilitado' });
}
