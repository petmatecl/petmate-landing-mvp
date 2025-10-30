import type { NextApiRequest, NextApiResponse } from 'next'
import mercadopago from 'mercadopago'

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Method not allowed' })
    if (!MP_ACCESS_TOKEN) return res.status(500).json({ ok:false, error:'Missing MP_ACCESS_TOKEN' })
    if (!BASE_URL) return res.status(500).json({ ok:false, error:'Missing NEXT_PUBLIC_BASE_URL' })

    mercadopago.configurations.setAccessToken(MP_ACCESS_TOKEN)

    const { title, description, price, quantity=1, orderId, payerEmail } = req.body || {}
    if (!title || !price || !orderId) return res.status(400).json({ ok:false, error:'Missing required fields' })

    const body = {
      items: [ { title, description, quantity, currency_id: 'CLP', unit_price: Number(price) } ],
      payer: { email: payerEmail || undefined },
      external_reference: String(orderId),
      back_urls: {
        success: `${BASE_URL}/cliente/pago-exitoso`,
        failure: `${BASE_URL}/cliente/pago-fallido`,
        pending: `${BASE_URL}/cliente/pago-pendiente`,
      },
      auto_return: 'approved',
      notification_url: `${BASE_URL}/api/mercadopago/webhook`
    }

    const preference = await mercadopago.preferences.create(body as any)
    return res.status(200).json({ ok:true, init_point: preference.body.init_point })
  } catch (e:any) {
    console.error('MP create-preference error', e)
    return res.status(500).json({ ok:false, error:'Server error' })
  }
}
