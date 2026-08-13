// sentry.server.config.ts
// ----------------------------------------------------------------------------
// Sprint R3 SENTRY-1 — inicialización del runtime Node.js server (Sentry v10).
// Se aplica a API routes (pages/api/**), getServerSideProps, getStaticProps,
// y cualquier código server-side en runtime nodejs.
//
// Mismas reglas que sentry.client.config.ts — ver header allí para detalle.
// ----------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent } from './lib/sentryScrub';

const IS_PROD = process.env.VERCEL_ENV === 'production';

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: IS_PROD,

    tracesSampleRate: 0,

    // Server no tiene replay — omitir sample rates de replay.
    integrations: [],

    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,

    environment: process.env.VERCEL_ENV || 'unknown',
});
