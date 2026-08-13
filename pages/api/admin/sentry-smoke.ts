// pages/api/admin/sentry-smoke.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — endpoint temporal de smoke.
//
// Dispara un evento controlado a Sentry con tag `smoke=true` + timestamp
// para poder identificarlo en el dashboard. Rechaza si no hay sesión admin
// (patrón id-only del proyecto). Retorna el estado del gate — útil para
// validar en preview que Sentry.captureException devuelve un event id vacío
// (porque `enabled: false` cuando VERCEL_ENV !== 'production').
//
// Uso operativo:
//   1) Deploy a preview → llamar el endpoint con sesión admin → verificar
//      response {sent: false, ...}. En Sentry dashboard: cero eventos.
//   2) Deploy a prod → llamar el endpoint con sesión admin → verificar
//      response {sent: true, eventId: "<uuid>"}. En Sentry dashboard:
//      aparece el evento en <30s.
//   3) Post-verificación: dejar el endpoint (útil para futuros re-tests)
//      o remover con un revert. Decisión operativa post-launch.
//
// El error tirado NO contiene PII — solo el mensaje "R3 SENTRY-1 smoke
// test" + timestamp + tag smoke. El scrub de lib/sentryScrub.ts se aplica
// igual por consistencia (ver beforeSend en sentry.server.config.ts).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import * as Sentry from '@sentry/nextjs';
import { verifySession, isAdmin } from '../../../lib/apiAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const env = process.env.VERCEL_ENV || 'unknown';
    const gateEnabled = env === 'production';
    const dsnSet = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
    const timestamp = new Date().toISOString();

    // Capturar exception con tag smoke=true para poder filtrar en el dashboard.
    const eventId = Sentry.captureException(
        new Error(`R3 SENTRY-1 smoke test @ ${timestamp}`),
        {
            tags: { smoke: 'true', batch: 'R3-SENTRY-1' },
            level: 'error',
        }
    );

    // Sentry devuelve un event id vacío ('') cuando enabled es false. Cuando
    // enabled es true y el SDK aceptó el evento, devuelve un UUID.
    const accepted = typeof eventId === 'string' && eventId.length > 0;

    return res.status(200).json({
        sent: accepted,
        eventId: accepted ? eventId : null,
        gate: {
            env,
            enabled: gateEnabled,
            dsn_configured: dsnSet,
        },
        timestamp,
    });
}
