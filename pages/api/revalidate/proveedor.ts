import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { apiLimiter } from '../../../lib/rateLimit';
import { logSupabaseError } from '../../../lib/logSupabaseError';

// Sprint PERF F5 (2026-11-27) — endpoint on-demand revalidation para el
// perfil público de un proveedor. Casos de uso:
//   - Proveedor edita su propio perfil (foto, bio, redes, etc.) → self.
//   - Admin suspende o reactiva al proveedor → admin invalida la ficha pública
//     del proveedor y, de un barrido, todas las fichas de sus servicios
//     activos.
// Validaciones defensivas idénticas al endpoint de /servicio.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await apiLimiter(req, res))) return;

    const userId = await verifySession(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = (req.body ?? {}) as { proveedorId?: unknown; cascadeServicios?: unknown };
    const proveedorId = typeof body.proveedorId === 'string' ? body.proveedorId : '';
    const cascadeServicios = body.cascadeServicios === true;
    if (!UUID_RE.test(proveedorId)) {
        return res.status(400).json({ error: 'proveedorId inválido' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Missing config' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Lookup del proveedor para ownership check + servicios dependientes.
    const { data: prov, error: provErr } = await supabaseAdmin
        .from('proveedores')
        .select('auth_user_id')
        .eq('id', proveedorId)
        .maybeSingle();
    logSupabaseError('api:revalidate-proveedor:lookup', provErr, { proveedorId });

    const adminFlag = await isAdmin(userId);
    const isOwner = prov?.auth_user_id !== undefined && prov.auth_user_id === userId;
    if (!adminFlag && !isOwner) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Reunir rutas a revalidar: siempre /proveedor/{id}; si cascadeServicios=true
    // (caso admin suspende) también cada /servicio/{sid} del proveedor.
    const paths: string[] = [`/proveedor/${proveedorId}`];
    if (cascadeServicios) {
        const { data: svcs, error: svcErr } = await supabaseAdmin
            .from('servicios_publicados')
            .select('id')
            .eq('proveedor_id', proveedorId);
        logSupabaseError('api:revalidate-proveedor:servicios', svcErr, { proveedorId });
        for (const s of svcs ?? []) {
            paths.push(`/servicio/${s.id}`);
        }
    }

    const results = await Promise.allSettled(paths.map((p) => res.revalidate(p)));
    const errors = results
        .map((r, i) => r.status === 'rejected' ? { path: paths[i], reason: (r as PromiseRejectedResult).reason?.message ?? 'unknown' } : null)
        .filter(Boolean);

    if (errors.length > 0) {
        console.error('[revalidate/proveedor] errores:', errors);
        return res.status(200).json({ revalidated: false, paths, errors });
    }
    return res.status(200).json({ revalidated: true, paths });
}

export default wrapApiHandlerWithSentry(handler, '/api/revalidate/proveedor');
