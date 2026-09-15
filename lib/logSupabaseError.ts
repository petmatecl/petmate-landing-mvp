// lib/logSupabaseError.ts
// ---------------------------------------------------------------------------
// Sprint tipo-cd (2026-09-15) — helper para el patrón que aparece 23 veces
// en el proyecto de "destructurar `.error` del resultado de una query
// Supabase + reportar a Sentry si es no-null, sin cambiar el comportamiento
// del caller". Diseñado para cerrar los 5 Tipo C SSR + 9 Tipo D crons+auth
// del inventario error-audit (BACKLOG L744-758) con un solo patrón consistente.
//
// Política por familia (BACKLOG > sprint chore-tipo-b-ssr-audit):
//   - Tipo C (SSR/SEO getServerSideProps + getStaticProps): fallback empty
//     state ya funciona sin data; agregar log a Sentry sin cambiar el
//     comportamiento del render.
//   - Tipo D (server crons + auth.getSession + notify server-to-server):
//     ya están dentro de try/catch en el mayoría; agregar log a Sentry con
//     tag por subsystem para diagnóstico sin cambiar el flow.
//
// Cero throw. Cero cambio del comportamiento del caller. Sentry gate a
// production sigue vigente (`sentry.*.config.ts` toma `VERCEL_ENV`) — en
// preview/staging no envía. Uso:
//
//   const { data, error } = await supabase.from('proveedores').select(...);
//   logSupabaseError('ssr:proveedor:reviews_globales', error, { proveedorId });
//   // resto del caller intacto, usa `data` como antes.
//
// Convención del `context` slug: `<familia>:<superficie>:<accion>` en
// snake_case (con `:` como separador). Familia = ssr | api-cron | api-notify |
// api-admin | api-eval | api-refer | auth-session. Superficie = archivo o
// endpoint. Acción = query/RPC específica.
// ---------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';

/**
 * Estructura del error que emite Supabase JS SDK (`PostgrestError` o
 * `AuthError` — ambos comparten los campos que consumimos).
 */
type SupabaseErrorLike = {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
} | null | undefined;

/**
 * Log a Sentry si el error es truthy. No-op cuando `error` es null/undefined
 * (que es el caso feliz de la query). El `context` slug se convierte en
 * el `message` del Sentry event + `tags.subsystem` (primer segmento del slug
 * separado por `:`).
 *
 * `extra` opcional agrega contexto específico del caller (ids, params, etc.)
 * para diagnóstico. No incluir PII sin scrubbing.
 */
export function logSupabaseError(
    context: string,
    error: SupabaseErrorLike,
    extra?: Record<string, unknown>,
): void {
    if (!error) return;
    const subsystem = context.split(':')[0] || 'unknown';
    Sentry.captureMessage(context, {
        level: 'warning',
        tags: {
            subsystem,
            errorCode: error.code || 'unknown',
        },
        extra: {
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            ...extra,
        },
    });
}
