// pages/api/admin/sentry-smoke.ts
// ----------------------------------------------------------------------------
// Sprint sentry-init (2026-08-11) — endpoint smoke con introspección REAL
// del SDK. La versión previa reportaba `dsn_configured: true` con solo
// verificar `!!process.env.NEXT_PUBLIC_SENTRY_DSN` — un proxy que en 3
// iteraciones no detectó que `Sentry.init()` server-side NUNCA corría por
// falta de `instrumentation.ts`. Fix: introspectar el estado real del SDK
// via `Sentry.getClient()` (retorna el Client si init corrió, undefined si
// no).
//
// Rechaza si no hay sesión admin (patrón id-only del proyecto). Retorna
// el estado REAL del SDK server-side + gate + flush observable.
//
// Uso operativo:
//   1) Deploy a preview → llamar el endpoint con sesión admin → verificar
//      response {sdk_initialized: true|false, sent: false, ...}. En preview
//      con gate cerrado esperamos sent:false, pero sdk_initialized SÍ debe
//      ser true (el SDK init corre en todos los envs; solo el envío está
//      gated por `enabled`).
//   2) Deploy a prod → llamar el endpoint con sesión admin → verificar
//      response {sdk_initialized: true, sent: true, flushed: true,
//      eventId: "<uuid>"}. En Sentry dashboard: evento aparece <30s.
//   3) Post-verificación end-to-end: dejar el endpoint (útil para
//      re-tests futuros) o remover con un revert.
//
// El error tirado NO contiene PII — solo el mensaje "R3 SENTRY-1 smoke
// test" + timestamp + tag smoke. El scrub de lib/sentryScrub.ts se aplica
// igual por consistencia (ver beforeSend en sentry.server.config.ts).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import * as Sentry from '@sentry/nextjs';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { flushSentryEvents } from '../../../lib/sentryServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const env = process.env.VERCEL_ENV || 'unknown';
    const gateEnabled = env === 'production';
    const dsnEnvVarSet = !!process.env.NEXT_PUBLIC_SENTRY_DSN;
    const timestamp = new Date().toISOString();

    // Sprint sentry-init: introspección REAL del estado del SDK.
    // Sentry.getClient() retorna el BaseClient si init() corrió y el hub
    // tiene un client bindeado. Retorna `undefined` si init NO corrió — que
    // es exactamente el bug estructural detectado post-sentry-flush: sin
    // instrumentation.ts, sentry.server.config.ts no se carga en runtime y
    // getClient() devuelve undefined. dsn_from_client lee el DSN efectivo
    // que el SDK está usando (no solo la env var).
    const client = Sentry.getClient();
    const sdkInitialized = client !== undefined;
    const dsnFromClient = client?.getOptions()?.dsn as string | undefined;
    const clientEnabled = client?.getOptions()?.enabled === true;

    // Capturar exception con tag smoke=true para filtrar en dashboard.
    // Nota: si sdkInitialized es false, captureException devuelve un event
    // id sintético placebo — el SDK degrada silenciosamente. Por eso la
    // fuente de verdad para `sent` NO es el return de captureException, es
    // sdkInitialized && clientEnabled.
    const rawEventId = Sentry.captureException(
        new Error(`R3 SENTRY-1 smoke test @ ${timestamp}`),
        {
            tags: { smoke: 'true', batch: 'R3-SENTRY-1' },
            level: 'error',
        }
    );

    // `sent` verdadero solo si TODAS estas condiciones se cumplen:
    //   1) SDK realmente inicializado (getClient() no undefined) — captura
    //      el bug de instrumentation.ts faltante.
    //   2) Client tiene enabled: true — captura el gate por VERCEL_ENV.
    //   3) DSN efectivamente cargado en el client — captura si el init
    //      recibió el DSN correctamente.
    //   4) Gate abierto (redundante con #2 si init corrió, pero mantiene
    //      la señal separada para diagnóstico).
    const sent = sdkInitialized && clientEnabled && !!dsnFromClient && gateEnabled;

    // Drenar cola ANTES del res.json. Solo si sent — si el SDK está caído,
    // flush() de todas formas devuelve false porque no hay transporte que
    // drenar (el bug que motivó este sprint).
    let flushed = false;
    if (sent) {
        flushed = await flushSentryEvents(2000);
    }

    return res.status(200).json({
        sent,
        flushed,
        eventId: sent ? rawEventId : null,
        gate: {
            env,
            enabled: gateEnabled,
            // dsn_env_var_set: si la env var existe en process.env (proxy débil).
            // dsn_configured_in_client: si el SDK server tiene DSN cargado (fuente
            //   de verdad — false si init nunca corrió).
            dsn_env_var_set: dsnEnvVarSet,
            dsn_configured_in_client: !!dsnFromClient,
            // sdk_initialized: getClient() !== undefined. Es la señal más
            // importante — expone el bug de instrumentation.ts faltante.
            sdk_initialized: sdkInitialized,
            client_enabled: clientEnabled,
        },
        timestamp,
    });
}
