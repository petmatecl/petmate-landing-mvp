// instrumentation.ts
// ----------------------------------------------------------------------------
// Sprint sentry-init (2026-08-11) — punto de entrada requerido por Next 15
// para que los configs Sentry server/edge se ejecuten en runtime.
//
// HISTORIA DEL BUG QUE ORIGINÓ ESTE ARCHIVO:
//   R3 SENTRY-1 se promovió a prod en 3 iteraciones (sentry-1-prod-20260811,
//   sentry-csp-prod-20260811, sentry-flush-prod-20260811) sin este archivo.
//   Consecuencia: `sentry.server.config.ts` NUNCA se cargó en runtime — el
//   SDK server nunca se inicializó. `Sentry.captureException()` server-side
//   devolvía event IDs sintéticos placebo, `Sentry.flush()` timeout tras 2s
//   porque no había transporte que drenar, y cero eventos llegaron al
//   dashboard Sentry.
//
//   El warning venía en stderr del build desde el primer merge:
//     `[@sentry/nextjs] Could not find a Next.js instrumentation file. This
//      indicates an incomplete configuration of the Sentry SDK. An
//      instrumentation file is required for the Sentry SDK to be initialized
//      on the server`
//   (fuente: node_modules/@sentry/nextjs/build/cjs/config/webpack.js:311).
//   Se perdió por leer solo `tail -3` del output del build. Ver enmienda
//   propuesta a P1 en CLAUDE.md > Workflow.
//
// El `register()` de Next 15 se llama una sola vez por runtime (nodejs / edge)
// al inicializar el server. `process.env.NEXT_RUNTIME` distingue cuál runtime
// está arrancando y carga el config correspondiente. El client config vive
// en `instrumentation-client.ts` (patrón separado — se carga por Next 15 al
// hidratar el navegador).
// ----------------------------------------------------------------------------
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

// Sprint sentry-init: exportar onRequestError permite que Next 15 pase los
// errores de gSSP/gSSp/API routes al SDK server sin necesidad de wrappers
// adicionales. Es el patrón canónico oficial del SDK v10 con instrumentation.
export const onRequestError = (
    ...args: Parameters<typeof import('@sentry/nextjs').captureRequestError>
): ReturnType<typeof import('@sentry/nextjs').captureRequestError> => {
    // Import dinámico para no cargar el SDK en runtimes donde no está init.
    return (require('@sentry/nextjs') as typeof import('@sentry/nextjs')).captureRequestError(...args);
};
