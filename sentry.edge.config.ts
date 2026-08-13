// sentry.edge.config.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — inicialización del Edge Runtime (Sentry v10).
// Se aplica a middleware.ts y a cualquier función con `export const runtime
// = 'edge'` en pages/api/**. Hoy usamos Edge SOLO en middleware.ts (Batch
// REMATE-1 R2a — bots wp-*/php → 404).
//
// Reglas idénticas a los otros dos configs.
// ----------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentryScrub';

const IS_PROD = process.env.VERCEL_ENV === 'production';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: IS_PROD,

    tracesSampleRate: 0,
    integrations: [],
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,

    environment: process.env.VERCEL_ENV || 'unknown',
});
