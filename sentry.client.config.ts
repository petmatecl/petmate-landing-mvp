// sentry.client.config.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — inicialización del cliente browser (Sentry v10).
//
// Reglas del alcance (aprobadas por PO 2026-08-11):
//   - Solo error monitoring. Session replay, tracing/performance, logging OFF.
//   - Gate a producción: VERCEL_ENV === 'production'. Cero eventos desde
//     staging, preview o local dev.
//   - sendDefaultPii: false + beforeSend scrub (emails, tokens, cookies) para
//     no exponer datos de usuarios chilenos en un tercero.
//   - DSN vía NEXT_PUBLIC_SENTRY_DSN (Vercel Production scope). Es público
//     porque el bundle del cliente lo necesita — es la convención Sentry.
// ----------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentryScrub';

const IS_PROD = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: IS_PROD,

    // Error monitoring puro — desactivar todas las features de cuota alta.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Integraciones vacías — no cargar BrowserTracing, Replay, ni auto-
    // instrumentations. Solo captura de errores no-manejados + Sentry.captureException.
    integrations: [],

    // PII off. Sentry no adjunta IP, cookies, headers ni request bodies por
    // defecto — reforzado explícito.
    sendDefaultPii: false,

    // Scrub adicional a nivel evento — filtra emails/tokens/cookies que
    // puedan colarse en messages, breadcrumbs, extras. Ver lib/sentryScrub.ts.
    beforeSend: scrubSentryEvent,

    // Environment tag útil para filtrar en el dashboard Sentry (aunque el
    // gate ya asegura que solo se envían eventos prod, dejamos el tag por
    // higiene y para futuras habilitaciones en preview con sample bajo).
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'unknown',
});
