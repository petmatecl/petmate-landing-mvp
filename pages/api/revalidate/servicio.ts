import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { apiLimiter } from '../../../lib/rateLimit';
import { logSupabaseError } from '../../../lib/logSupabaseError';

// Sprint PERF F5 (2026-11-27) — endpoint on-demand revalidation para la ficha
// pública de un servicio. Validaciones defensivas:
//   - POST solo.
//   - Rate limit apiLimiter (30 req/min por IP).
//   - verifySession → debe venir con Authorization: Bearer <access_token>.
//   - servicioId debe ser UUID válido (NO ruta arbitraria del cliente).
//   - Ownership check: el caller es el proveedor del servicio O admin.
// Revalida /servicio/{id} y /proveedor/{proveedor_id} (edit del servicio
// cambia los agregados visitas/favoritos de la ficha del proveedor también).
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

    const body = (req.body ?? {}) as { servicioId?: unknown };
    const servicioId = typeof body.servicioId === 'string' ? body.servicioId : '';
    if (!UUID_RE.test(servicioId)) {
        return res.status(400).json({ error: 'servicioId inválido' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Missing config' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Mapear servicioId → proveedor_id + auth_user_id del dueño.
    const { data: svc, error: svcErr } = await supabaseAdmin
        .from('servicios_publicados')
        .select('proveedor_id, proveedores!inner(auth_user_id)')
        .eq('id', servicioId)
        .maybeSingle();
    logSupabaseError('api:revalidate-servicio:lookup', svcErr, { servicioId });

    // Si el servicio no existe (fue eliminado), igual revalidamos /servicio/{id}
    // para que Next cachee el 404. Sin ownership check en este caso: solo
    // admin puede dispararlo para IDs huérfanos.
    const proveedorAuthId = (svc?.proveedores as any)?.auth_user_id ?? null;
    const proveedorId = svc?.proveedor_id ?? null;

    const adminFlag = await isAdmin(userId);
    const isOwner = proveedorAuthId !== null && proveedorAuthId === userId;
    if (!adminFlag && !isOwner) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const results = await Promise.allSettled([
        res.revalidate(`/servicio/${servicioId}`),
        proveedorId ? res.revalidate(`/proveedor/${proveedorId}`) : Promise.resolve(),
    ]);
    const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r) => (r as PromiseRejectedResult).reason?.message ?? 'unknown');

    if (errors.length > 0) {
        console.error('[revalidate/servicio] errores:', errors);
        return res.status(200).json({ revalidated: false, errors });
    }
    return res.status(200).json({ revalidated: true });
}

export default wrapApiHandlerWithSentry(handler, '/api/revalidate/servicio');
