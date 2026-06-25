import { supabase } from '../../supabaseClient';
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
 */
export async function fetchProveedoresPublicosByIds(
    ids: Array<string | null | undefined>,
    select: string = '*',
): Promise<Map<string, ProveedorPublico>> {
    // dedup sin spread sobre Set (tsconfig target es5 no soporta el spread)
    const seen: Record<string, true> = {};
    const cleanIds: string[] = [];
    for (const x of ids) {
        if (x && !seen[x]) { seen[x] = true; cleanIds.push(x); }
    }
    if (cleanIds.length === 0) return new Map();

    const { data, error } = await supabase
        .from('proveedores_publicos')
        .select(select)
        .in('id', cleanIds);

    if (error) {
        // eslint-disable-next-line no-console
        console.error('[fetchProveedoresPublicosByIds]', error.message);
        return new Map();
    }

    return new Map((data ?? []).map((p: any) => [p.id, p as ProveedorPublico]));
}
