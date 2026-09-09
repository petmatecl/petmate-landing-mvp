import { supabase } from '../../supabaseClient';
import { runReadQuery } from '../../supabaseReadQuery';
import type { ProveedorPublico } from '../../types/proveedorPublico';

/**
 * Fetch de proveedores desde la vista publica por una lista de ids.
 * Dedup interno + skip null/undefined. Si una id no existe en aprobados,
 * no aparece en el Map (callsite maneja como `null`).
 *
 * Reemplaza el patron de embed (proveedor:proveedores!fk(...)) en queries
 * publicas, ya que PostgREST no puede materializar embeds que apunten a la
 * tabla base proveedores (cerrada por el sprint RLS de junio 2026 — anon
 * sin grant, authenticated solo lee su propia fila).
 *
 * Uso tipico (single-level embed):
 *   const provMap = await fetchProveedoresPublicosByIds(
 *       rows.map(r => r.proveedor_id),
 *       'id,nombre,apellido_p,foto_perfil',
 *   );
 *   const hydrated = rows.map(r => ({ ...r, proveedor: provMap.get(r.proveedor_id) ?? null }));
 *
 * Uso para nested (proveedor dentro de servicios_publicados dentro de fila):
 *   const provMap = await fetchProveedoresPublicosByIds(
 *       rows.flatMap(r => r.servicios_publicados?.proveedor_id ?? []),
 *       '...',
 *   );
 *   const hydrated = rows.map(r => ({
 *       ...r,
 *       servicios_publicados: r.servicios_publicados ? {
 *           ...r.servicios_publicados,
 *           proveedor: provMap.get(r.servicios_publicados.proveedor_id) ?? null,
 *       } : r.servicios_publicados,
 *   }));
 *
 * Sprint tipo-b lote 2 (2026-09-09) — el helper ahora usa runReadQuery
 * internamente. Si la query falla, se loguea a Sentry con tags
 * subsystem='proveedores_publicos', table='proveedores_publicos' y devuelve
 * un Map vacío (mismo comportamiento previo). Retrocompat total con los 6
 * callers; el error se surface via Sentry, no via API change.
 */
export async function fetchProveedoresPublicosByIds(
    ids: Array<string | null | undefined>,
    select: string = '*',
    route?: string,
): Promise<Map<string, ProveedorPublico>> {
    // dedup sin spread sobre Set (tsconfig target es5 no soporta el spread)
    const seen: Record<string, true> = {};
    const cleanIds: string[] = [];
    for (const x of ids) {
        if (x && !seen[x]) { seen[x] = true; cleanIds.push(x); }
    }
    if (cleanIds.length === 0) return new Map();

    const { data } = await runReadQuery<any[]>(
        () => supabase
            .from('proveedores_publicos')
            .select(select)
            .in('id', cleanIds),
        { subsystem: 'proveedores_publicos', table: 'proveedores_publicos', route },
    );

    return new Map((data ?? []).map((p: any) => [p.id, p as ProveedorPublico]));
}
