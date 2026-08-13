// instrumentation-client.ts
// ----------------------------------------------------------------------------
// Sprint sentry-init (2026-08-11) — renombrado desde sentry.client.config.ts.
// Next 15 + Sentry v10 marcaron sentry.client.config.ts como DEPRECATED (con
// Turbopack deja de funcionar). instrumentation-client.ts es el nombre
// canónico del punto de entrada cliente, cargado automáticamente por Next 15
// al hidratar el navegador. Ver deprecation warning en
// node_modules/@sentry/nextjs/build/cjs/config/webpack.js:213.
//
// Contenido y semántica idénticos al sentry.client.config.ts previo — solo
// cambio de nombre + renavegación de captura. Los Sentry.init() de server
// y edge ahora se cargan vía instrumentation.ts:register() en la raíz.
//
// Reglas del alcance (aprobadas por PO 2026-08-11 en R3):
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
    // Con tracesSampleRate: 0 el default de nextjs NO agrega BrowserTracing
    // (solo se agrega cuando explícitamente lo pedís via Sentry.browserTracing
    // Integration()). Con replaysSessionSampleRate + replaysOnErrorSampleRate
    // en 0 el Replay tampoco graba. Estos 3 flags son suficientes para
    // apagar la cuota alta.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Sprint sentry-flush (2026-08-11) — NO usar `integrations: []`. Ese
    // patrón mata TODOS los defaults core de v10, incluyendo:
    //   - globalHandlersIntegration() — captura window.onerror y
    //     unhandledRejection AUTOMÁTICAMENTE. Sin esto, Sentry SOLO recibe
    //     Sentry.captureException(...) manuales — que en nuestro repo son
    //     cero desde client-side → cero errores prod capturados.
    //   - browserApiErrorsIntegration() — envuelve setTimeout/setInterval/
    //     addEventListener para capturar throws async.
    //   - breadcrumbsIntegration() — trail de console/DOM/xhr/fetch previos
    //     al error, esencial para debugging.
    //   - dedupeIntegration() — colapsa errores duplicados (mismo user
    //     spammeando el mismo bug).
    //   - inboundFiltersIntegration() — filtra ruido conocido (ej. errores
    //     de extensiones del browser).
    //
    // Omitir la propiedad `integrations` deja los defaults activos. Los
    // pesados (BrowserTracing, Replay) NO están en defaults del SDK v10 —
    // se agregan solo cuando los llamas explícito, así que no hay riesgo
    // de cuota alta por dejarlos por default.
    //
    // Ver Sentry v10 source: node_modules/@sentry/browser/build/npm/esm/prod/
    // sdk.js:getDefaultIntegrations().

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

// Sprint sentry-init (2026-08-11) — hook requerido por Sentry v10 para
// instrumentar navegaciones client-side (Next.js App Router transitions).
// Sin este export, el SDK emite:
//   `[@sentry/nextjs] ACTION REQUIRED: To instrument navigations, the Sentry
//    SDK requires you to export an onRouterTransitionStart hook from your
//    instrumentation-client.(js|ts) file.`
// (fuente: build output tras crear instrumentation.ts).
// Con este export, cada Link/router.push que dispare una navegación cliente
// crea un span Sentry — permite trackear latencia y errores por ruta SPA.
// Con tracesSampleRate: 0 los spans no se envían, pero el hook igual debe
// existir para no emitir el warning de config incompleta.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
