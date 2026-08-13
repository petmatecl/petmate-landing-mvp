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

    // Sprint sentry-flush (2026-08-11) — mismo criterio que client.config:
    // omitir `integrations: []` para conservar defaults core (unhandled-
    // Rejection auto-capture, Http/NodeFetch context enrichment, dedupe,
    // linkedErrors, contextLines de source). Node defaults NO incluyen
    // performance integrations (getAutoPerformanceIntegrations) cuando
    // tracesSampleRate: 0 — ver `hasSpansEnabled` gate en
    // node_modules/@sentry/node/build/esm/sdk/index.js.

    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,

    environment: process.env.VERCEL_ENV || 'unknown',
});
