import type { SupabaseClient } from '@supabase/supabase-js';

// Sprint PERF F5 (2026-11-27) — helpers client-side para disparar on-demand
// revalidation de las fichas ISR. Fire-and-forget: si el endpoint falla, la
// caché auto-expira en 60s de todas formas. Los helpers obtienen el access
// token de la sesión Supabase vigente y lo pasan en Authorization: Bearer.

async function postRevalidate(path: string, body: unknown, supabase: SupabaseClient): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return; // sin sesión → no revalidar silente
        await fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });
    } catch {
        // Fire-and-forget: errores de red/timeout no bloquean el flujo del user.
        // La caché expira en 60s de todas formas.
    }
}

export async function revalidateServicio(servicioId: string, supabase: SupabaseClient): Promise<void> {
    if (!servicioId) return;
    return postRevalidate('/api/revalidate/servicio', { servicioId }, supabase);
}

export async function revalidateProveedor(
    proveedorId: string,
    supabase: SupabaseClient,
    opts: { cascadeServicios?: boolean } = {},
): Promise<void> {
    if (!proveedorId) return;
    return postRevalidate('/api/revalidate/proveedor', {
        proveedorId,
        cascadeServicios: !!opts.cascadeServicios,
    }, supabase);
}
