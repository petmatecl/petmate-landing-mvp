// lib/enrichProveedorNombre.ts
// ---------------------------------------------------------------------------
// Sprint pii-nombre-publico (2026-11-17) — helper de enriquecimiento para
// ServiceResult[] provenientes del RPC `buscar_servicios`.
//
// El RPC emite `proveedor_nombre` pre-armado via
// `COALESCE(p.nombre_publico, p.nombre || ' ' || p.apellido_p)` — nombre
// legal expuesto para proveedores sin `nombre_publico` (17/22 en prod hoy).
//
// Este helper hace un fetch complementario a la vista `proveedores_publicos`
// con los 3 campos separados (`nombre_publico, nombre, apellido_p`) y
// override `proveedor_nombre` aplicando `displayName()` — la forma pública
// canónica "Eduardo C.".
//
// Uso típico:
//   const rows = (data as any[]);
//   const mapped = rows.map(mapRpcToServiceResult);
//   const enriched = await enrichServiceResultsWithDisplayName(mapped, supabase);
//
// SSR callers (getStaticProps/getServerSideProps): pasar el cliente
// Supabase del contexto SSR (no el singleton de `lib/supabaseClient.ts`
// que depende de env del browser).
//
// Fase 2 post-launch (sprint PII-VIEW-TIGHT): modificar el RPC para
// devolver `proveedor_nombre_publico`, `proveedor_nombre_pila`,
// `proveedor_apellido_p` por separado; entonces este helper queda
// deprecado y el mapper aplica `displayName()` directo.
// ---------------------------------------------------------------------------
import type { SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import type { ServiceResult } from '../components/Explore/ServiceCard';
import { displayName } from './displayName';

/**
 * Fallback de seguridad cuando el enrich no puede obtener los 3 campos
 * separados: devolver solo el primer token del string pre-armado del RPC.
 * Para "Renata Gacitúa" → "Renata" (nunca el apellido). Para un
 * nombre_publico con espacio ("Peluquería Luna") → "Peluquería" (pierde
 * la segunda palabra, trade-off aceptado por safety sobre fidelidad).
 */
function safeFirstToken(raw: string | null | undefined): string {
    const s = (raw ?? '').trim();
    if (!s) return 'Proveedor';
    const tokens = s.split(/\s+/).filter(Boolean);
    return tokens[0] || 'Proveedor';
}

export async function enrichServiceResultsWithDisplayName(
    results: ServiceResult[],
    supabase: SupabaseClient,
): Promise<ServiceResult[]> {
    if (!results.length) return results;

    // IDs únicos (un proveedor puede aparecer con varios servicios en /explorar).
    const ids = Array.from(new Set(
        results.map(r => r.proveedor_id).filter((id): id is string => !!id)
    ));
    if (!ids.length) return results;

    try {
        const { data, error } = await supabase
            .from('proveedores_publicos')
            .select('id, nombre_publico, nombre, apellido_p')
            .in('id', ids);

        if (error || !data) {
            // Sprint pii-nombre-publico iter 2 (2026-11-17): fallo CERRADO.
            // Antes: devolvíamos results sin tocar → `proveedor_nombre` del
            // RPC seguía como "Nombre Apellido_P" para los 17/22 sin
            // nombre_publico. Decisión PO: nunca exponer apellido. Fallback
            // ahora aplica safeFirstToken sobre el string del RPC → solo
            // primer token (pierde fidelidad en nombre_publico multi-palabra
            // pero nunca filtra PII).
            Sentry.captureMessage('[enrichServiceResultsWithDisplayName] query to proveedores_publicos failed, applying safeFirstToken fallback', {
                level: 'warning',
                tags: { subsystem: 'pii-nombre-publico', phase: 'enrich' },
                extra: { error_code: (error as any)?.code, error_message: (error as any)?.message, n_ids: ids.length },
            });
            return results.map(r => ({ ...r, proveedor_nombre: safeFirstToken(r.proveedor_nombre) }));
        }

        const byId = new Map<string, { nombre_publico: string | null; nombre: string | null; apellido_p: string | null }>();
        for (const row of data) {
            byId.set(row.id, {
                nombre_publico: row.nombre_publico,
                nombre: row.nombre,
                apellido_p: row.apellido_p,
            });
        }

        return results.map(r => {
            const prov = byId.get(r.proveedor_id);
            if (!prov) {
                // Sin match (prov borrado, race, etc.). Safe fallback mismo
                // patrón que el query error: primer token del string del RPC.
                return { ...r, proveedor_nombre: safeFirstToken(r.proveedor_nombre) };
            }
            return {
                ...r,
                proveedor_nombre: displayName(prov),
            };
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { subsystem: 'pii-nombre-publico', phase: 'enrich' },
        });
        return results.map(r => ({ ...r, proveedor_nombre: safeFirstToken(r.proveedor_nombre) }));
    }
}
