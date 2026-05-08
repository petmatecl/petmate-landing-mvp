// lib/visitTracking.ts
// Helpers para trackear visitas a servicios y proveedores. La identificación
// del visitante es:
//   - usuario logueado: `user-${userId}`
//   - anónimo: hash sha256(ip|user-agent) calculado server-side via /api/visitor-hash

import { supabase } from './supabaseClient';

const SESSION_CACHE_KEY = 'visitor-hash';

/**
 * Retorna un identificador estable para el visitante actual.
 *  - Si está logueado: `user-${userId}` (estable mientras la cuenta exista).
 *  - Si es anónimo: fetch al endpoint /api/visitor-hash, cacheado en sessionStorage
 *    para evitar refetches dentro de la misma sesión del navegador.
 *
 * Errores se loguean pero no rompen UX: la visita simplemente no se trackea.
 */
export async function getVisitorHash(userId?: string): Promise<string | null> {
    if (userId) return `user-${userId}`;

    // SSR safety: sessionStorage solo existe en el browser
    if (typeof window === 'undefined') return null;

    try {
        const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (cached) return cached;

        const res = await fetch('/api/visitor-hash');
        if (!res.ok) return null;

        const data = await res.json();
        if (!data?.hash) return null;

        sessionStorage.setItem(SESSION_CACHE_KEY, data.hash);
        return data.hash;
    } catch (err) {
        console.warn('[visitTracking] getVisitorHash failed:', err);
        return null;
    }
}

/**
 * Llama al RPC registrar_visita. Atómico server-side: si el visitante ya
 * registró una visita hoy a esta entidad, retorna FALSE y no incrementa
 * contadores.
 *
 * Errores silenciosos: si la BD está caída o el RPC falla, devolvemos false
 * en lugar de propagar — no queremos romper la página por un counter.
 */
export async function trackVisit(
    entidadTipo: 'servicio' | 'proveedor',
    entidadId: string,
    userId?: string
): Promise<boolean> {
    try {
        const visitorHash = await getVisitorHash(userId);
        if (!visitorHash) return false;

        const { data, error } = await supabase.rpc('registrar_visita', {
            p_entidad_tipo: entidadTipo,
            p_entidad_id: entidadId,
            p_visitor_hash: visitorHash,
        });

        if (error) {
            console.warn('[visitTracking] registrar_visita RPC failed:', error.message);
            return false;
        }

        return data === true;
    } catch (err) {
        console.warn('[visitTracking] trackVisit failed:', err);
        return false;
    }
}
