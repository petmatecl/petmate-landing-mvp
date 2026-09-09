// lib/supabaseReadQuery.ts
// ---------------------------------------------------------------------------
// Sprint tipo-b (2026-09-09) — helper compartido para queries de lectura
// Supabase que:
//   1. Ejecuta la query.
//   2. Si error truthy, registra en Sentry con tags subsystem/table/route/
//      errorCode (usa 'unknown' cuando code viene vacío — consistente con
//      Case 4 error-audit-prod-20260908 §7.4).
//   3. Devuelve { data, error } tipado para que el caller distinga error
//      de red vs "sin fila legítima" (data null + error null).
//
// Uso canónico (view en un componente):
//   const { data, error } = await runReadQuery(
//     () => supabase.from('favoritos').select('*').eq('user_id', uid),
//     { subsystem: 'favoritos', table: 'favoritos', route: '/favoritos' },
//   );
//   if (error) return <EstadoError titulo="..." onRetry={refetch} />;
//   if (!data || data.length === 0) return <EstadoVacioLegitimo ... />;
//   return <Lista items={data} />;
//
// Regla de diseño (Fase 0 sprint tipo-b): el estado de error del caller
// reemplaza SOLO al estado vacío de la sección que depende de esa consulta,
// nunca a los children que no dependen (ej. si el header no depende de la
// query, sigue renderando aunque el listado esté en error).
// ---------------------------------------------------------------------------
import * as Sentry from '@sentry/nextjs';
import type { PostgrestError } from '@supabase/supabase-js';

export interface ReadQueryOptions {
    /** Subsistema o feature. Se emite como tag Sentry `subsystem`. */
    subsystem: string;
    /** Tabla consultada. Se emite como tag Sentry `table`. */
    table: string;
    /** Ruta actual del user (opcional pero recomendado). Tag Sentry `route`. */
    route?: string;
}

export interface ReadQueryResult<T> {
    data: T | null;
    error: PostgrestError | null;
}

/**
 * Ejecuta una query de lectura Supabase, registra en Sentry si falla,
 * y devuelve { data, error } tipado. El caller decide el fallback UI
 * (típicamente <EstadoError /> o <EstadoErrorCompacto />).
 */
export async function runReadQuery<T>(
    query: () => PromiseLike<{ data: T | null; error: PostgrestError | null }>,
    opts: ReadQueryOptions,
): Promise<ReadQueryResult<T>> {
    const { data, error } = await query();
    if (error) {
        Sentry.captureMessage('supabase_read_failed', {
            level: 'warning',
            tags: {
                subsystem: opts.subsystem,
                table: opts.table,
                route: opts.route ?? 'unknown',
                errorCode: error.code || 'unknown',
            },
            extra: {
                errorMessage: error.message,
                errorDetails: error.details,
                errorHint: error.hint,
            },
        });
        return { data: null, error };
    }
    return { data, error: null };
}
