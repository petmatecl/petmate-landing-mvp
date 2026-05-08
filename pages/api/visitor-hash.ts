import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';

/**
 * Endpoint server-side que hashea (IP + user-agent) para identificar visitantes
 * anónimos sin almacenar IPs en plano. El hash se usa luego en el RPC
 * registrar_visita como visitor_hash.
 *
 * Privacidad:
 *  - La IP NUNCA se persiste, ni se loguea.
 *  - Solo el hash sha256(ip|user-agent) sale del servidor.
 *  - El hash es estable mientras IP y UA no cambien — eso es intencional, es
 *    lo que permite el rate limit "1 visita por día por visitante".
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // x-forwarded-for puede traer múltiples IPs separadas por coma — la primera
        // es la del cliente original (las demás son proxies intermedios).
        const xff = req.headers['x-forwarded-for'];
        const xffFirst = Array.isArray(xff) ? xff[0] : (xff?.split(',')[0]?.trim() ?? '');

        const xRealIp = req.headers['x-real-ip'];
        const xRealIpStr = Array.isArray(xRealIp) ? xRealIp[0] : (xRealIp ?? '');

        const ip = xffFirst || xRealIpStr || req.socket.remoteAddress || '0.0.0.0';
        const userAgent = req.headers['user-agent'] ?? '';

        const hash = createHash('sha256')
            .update(`${ip}|${userAgent}`)
            .digest('hex');

        return res.status(200).json({ hash });
    } catch (err) {
        console.error('[visitor-hash] failed:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}
