// lib/sentryServer.ts
// ----------------------------------------------------------------------------
// Sprint sentry-flush (2026-08-11) — helper compartido para envío serverless.
//
// PROBLEMA que resuelve: `Sentry.captureException()` v10 es SÍNCRONA y devuelve
// un eventId sintético inmediato. El envío HTTP al ingest es async y buffered
// (tramitado por el transport del SDK con batching). Sin drenar la cola antes
// de que la Vercel Function termine su ejecución, el process muere y el
// envelope se pierde SIN error visible. El caller ve `sent: true` y el
// dashboard Sentry no recibe nada.
//
// Ver `CLAUDE.md > Workflow > REGLA PERMANENTE (P8)`: el smoke original de
// R3 SENTRY-1 exhibió exactamente este patrón (post CSP hotfix el gate
// reportaba `sent: true` con eventId sintético pero el evento no aparecía en
// dashboard). Este helper es la barrera para que el próximo endpoint que
// haga captureException server-side NO nazca con el mismo bug latente.
//
// El SDK v10 exporta `flushSafelyWithTimeout()` con timeout de 2s, pero solo
// desde `@sentry/nextjs/build/types/common/utils/responseEnd` — no es API
// pública estable. Usamos `Sentry.flush(timeoutMs)` de `@sentry/core` que sí
// es API pública oficial (docs: https://docs.sentry.io/platforms/javascript/
// guides/nextjs/configuration/draining-the-queue/).
//
// Retorna Promise<boolean>: true = cola drenó, false = timeout. NUNCA rechaza
// (no crea unhandledRejection). Diseñado para llamarse con `await` justo
// antes de `res.json(...)` / `res.end(...)`.
// ----------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';

/**
 * Drena la cola de envelopes pendientes de Sentry antes de que la Vercel
 * Function termine. Debe llamarse ANTES del `res.json()` en cualquier
 * endpoint API que ejecute `Sentry.captureException` o `Sentry.captureMessage`.
 *
 * @param timeoutMs Máximo tiempo en ms a esperar el drenaje. Default 2000ms
 *                  (mismo que el helper interno de @sentry/nextjs).
 * @returns Promise<boolean> - true si la cola drenó completa, false si hubo
 *                             timeout. Nunca rechaza — swallow interno.
 */
export async function flushSentryEvents(timeoutMs = 2000): Promise<boolean> {
    try {
        return await Sentry.flush(timeoutMs);
    } catch {
        // Sentry.flush() puede rechazar en teoría (transport error interno).
        // Swallow: el flush no debe romper el response al usuario.
        return false;
    }
}
