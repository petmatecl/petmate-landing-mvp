import type { NextApiRequest, NextApiResponse } from 'next'

// Nota: para producción, valida firma y consulta a la API de MP por el pago.
// Este stub solo registra el evento y responde 200.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('MP webhook event:', req.method, req.query, req.body)
    // TODO: guardar actualización de estado de la reserva/pago (orderId = external_reference)
    return res.status(200).json({ received: true })
  } catch (e:any) {
    console.error('MP webhook error', e)
    return res.status(500).json({ ok:false })
  }
}
