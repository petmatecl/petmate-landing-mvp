import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Skipea la ejecucion del cron si el deploy no es production.
 *
 * Vercel cron schedulea contra todos los deploys que hereden vercel.json
 * (incluido el de la branch `staging`). Sin este guard los crons correrian
 * en staging, contaminando data y consumiendo cuota sin valor.
 *
 * Trigger de ejecucion real: NEXT_PUBLIC_APP_ENV === 'production' OR
 * VERCEL_ENV === 'production'. Doble check porque NEXT_PUBLIC_APP_ENV se
 * setea explicitamente en el dashboard y VERCEL_ENV es nativo de Vercel
 * (production / preview / development) — alcanza con que cualquiera
 * matchee para correr.
 *
 * Retorna `true` si el handler debe abortar (ya respondio 200 skipped),
 * `false` si debe continuar normal.
 */
export function skipIfNonProd(req: NextApiRequest, res: NextApiResponse): boolean {
    const isProd =
        process.env.NEXT_PUBLIC_APP_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production';
    if (isProd) return false;
    res.status(200).json({
        skipped: true,
        env: process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || 'unknown',
    });
    return true;
}

/**
 * Valida un request de Vercel Cron: CRON_SECRET bearer + presence de
 * `x-vercel-id` (defense in depth).
 *
 * `x-vercel-id` lo inyecta Vercel en TODA request que pasa por su edge
 * (cron, usuario, API route invocado por cualquier caller legítimo). No es
 * spoofable desde browser directamente: solo se setea cuando Vercel maneja
 * el request. Un atacante que tuviera el CRON_SECRET filtrado pero golpeara
 * el endpoint desde fuera de Vercel (ej. probando el secret contra
 * www.pawnecta.com directamente desde curl) SÍ podría spoofearlo manualmente
 * en el header — Vercel no rechaza requests con `x-vercel-id` manual. Por
 * eso este check es **defense in depth**, no reemplaza al CRON_SECRET; sirve
 * para distinguir origin cuando ambos coexisten y detectar llamadas raras
 * en logs.
 *
 * Sprint cron-guard-vid (2026-11-27) — AUDIT-SEC-H3 de security-audit-20261126.md.
 *
 * Modo actual: WARN + ALLOW. El log `[cron] missing x-vercel-id` queda
 * visible en Vercel runtime logs sin bloquear el request. Si tras 7-14 días
 * en prod no aparecen falsos positivos, se cambia a REJECT en un PR follow-up.
 *
 * Uso canónico (reemplaza las 15 líneas del CRON_SECRET inline check):
 *
 *   if (!validateCronRequest(req, res)) return;
 *
 * Retorna `false` si el request NO pasó el check (ya respondió 401/405),
 * `true` si pasó (handler debe continuar).
 */
export function validateCronRequest(req: NextApiRequest, res: NextApiResponse): boolean {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return false;
    }
    const authHeader = req.headers.authorization;
    const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    // Defense in depth: x-vercel-id solo es inyectado por Vercel en requests
    // que pasan por su edge. En modo warn-only por ahora — permite detectar
    // en logs si algún trigger legítimo externo (ej. health check propio) no
    // lo trae antes de activar reject estricto en PR follow-up.
    const vercelId = req.headers['x-vercel-id'];
    if (!vercelId) {
        console.warn('[cron] missing x-vercel-id header — Vercel cron should always inject it. Request allowed (warn-only mode).');
    }
    return true;
}
