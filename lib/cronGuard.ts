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
