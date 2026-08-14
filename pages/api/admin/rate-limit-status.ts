// pages/api/admin/rate-limit-status.ts
// ----------------------------------------------------------------------------
// Sprint A4 fase 2 (2026-08-14) — endpoint admin para el badge del panel
// que reporta qué backend está atendiendo el rate limiter en el contenedor
// que responde a esta request.
//
// MOTIVACIÓN OPERATIVA (PO al cerrar smoke A4):
//   El fallback in-memory silencioso sigue siendo el riesgo de fondo. El
//   header `X-RateLimit-Backend` permite detectarlo por request, pero solo
//   si alguien mira. En producción, si el limiter cae a 'memory' o
//   'memory-fallback' por config error o Upstash caído, nadie revisa
//   proactivamente. Runtime Logs de Vercel tampoco los mira nadie de
//   rutina. Este endpoint alimenta un pill en /admin que Aldo ve entrando,
//   sin buscar.
//
// GATE:
//   Requiere sesión + rol admin. Patrón id-only del proyecto (verifySession
//   + isAdmin). No es información sensible per se, pero no queremos
//   exponer state del backend a scrapers.
//
// COSTO:
//   El endpoint ejecuta 1 PING contra Upstash Redis (~1 comando del free
//   tier). Se llama solo cuando Aldo abre /admin. Cero riesgo de agotar
//   quota (Aldo entra ~10 veces al día = 10 pings/día vs 500k comandos/mes
//   del free tier).
//
// CAVEAT — la respuesta refleja el contenedor QUE RESPONDIÓ ESTA request,
// no el estado global del sistema. En Fluid Compute con múltiples
// contenedores activos, un badge 'upstash' en el /admin no garantiza que
// TODOS los contenedores estén sanos — solo el que respondió esta vez. Si
// aparece degraded, es prueba de que HAY problema; si aparece OK, es
// evidencia probabilística (más fuerte con más pings a lo largo del tiempo).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { getBackendStatus, pingRedis } from '../../../lib/rateLimit';

interface RateLimitStatusResponse {
    backend: 'upstash' | 'memory' | 'memory-fallback';
    degraded: boolean;
    vercelEnv: string | null;
    lastRuntimeErrorAt: string | null;
    lastRuntimeErrorMessage: string | null;
    ping: {
        ok: boolean;
        latencyMs: number | null;
        error: string | null;
    };
    checkedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const status = getBackendStatus();
    // Ping activo solo si el estado dice 'upstash' o 'memory-fallback' (ambos
    // implican que hay cliente construido con credenciales). Si es 'memory'
    // puro, no hay nada que pingear — reportamos ping.ok=false con error
    // descriptivo.
    const ping = status.backend === 'memory'
        ? { ok: false, latencyMs: null, error: 'no-upstash-client' }
        : await pingRedis();

    const response: RateLimitStatusResponse = {
        ...status,
        ping,
        checkedAt: new Date().toISOString(),
    };

    // Cache-Control: 30s. El badge se refresca sin costo excesivo si Aldo
    // recarga /admin varias veces seguidas (evita ping por cada F5).
    res.setHeader('Cache-Control', 'private, max-age=30');
    return res.status(200).json(response);
}
