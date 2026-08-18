// pages/api/admin/proveedores-pendientes.ts
// ----------------------------------------------------------------------------
// Bug producto /admin > Aprobaciones (2026-08-18) — enriquecer la lista de
// proveedores pendientes con el email real de `auth.users` (join que el
// componente cliente NO puede hacer porque `supabase.auth.admin.getUserById`
// requiere service_role_key).
//
// Además: contar servicios (activos + inactivos) por proveedor para que la
// UI muestre "sin servicio" vs "servicio en borrador (activo=false)" vs
// "servicio publicado" — dato hoy invisible al admin que decide aprobar.
//
// GATE: verifySession + isAdmin (patrón id-only del proyecto).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifySession, isAdmin } from '../../../lib/apiAuth';
import { apiLimiter } from '../../../lib/rateLimit';

const TEST_EMAIL_DOMAIN = '@pawnecta-test.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await apiLimiter(req, res))) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Fetch proveedores con estado=pendiente. select * porque el card
        //    muestra bastantes campos y evolucionaremos qué se renderiza —
        //    mejor pagar el ancho aquí que iterar el SELECT cada vez que la
        //    UI necesite un campo más.
        const { data: proveedores, error: provErr } = await supabaseAdmin
            .from('proveedores')
            .select('*')
            .eq('estado', 'pendiente')
            .order('created_at', { ascending: false });
        if (provErr) throw provErr;

        // 2. Enriquecer c/u con email de auth.users (via service_role) + conteo
        //    de servicios. Promise.all — los N proveedores son independientes.
        const enriched = await Promise.all((proveedores || []).map(async (prov) => {
            // Email real: auth.users.email por auth_user_id.
            let emailAuth: string | null = null;
            if (prov.auth_user_id) {
                const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
                emailAuth = authUser?.user?.email || null;
            }

            // Conteo de servicios: `servicios_publicados` no tiene columna
            // `borrador` — el schema usa solo `activo boolean`. Contamos activos
            // e inactivos separados para que la UI pueda mostrar "servicio en
            // preparación" cuando activo=false.
            const { count: activos } = await supabaseAdmin
                .from('servicios_publicados')
                .select('id', { count: 'exact', head: true })
                .eq('proveedor_id', prov.id)
                .eq('activo', true);
            const { count: inactivos } = await supabaseAdmin
                .from('servicios_publicados')
                .select('id', { count: 'exact', head: true })
                .eq('proveedor_id', prov.id)
                .eq('activo', false);

            // Flag de cuenta de prueba por dominio de email.
            // Detección heurística: dominio @pawnecta-test.com o email nulo
            // con nombre incluyendo "test" — usable como visual hint sin
            // modificar la BD.
            const esCuentaPrueba = !!emailAuth && emailAuth.toLowerCase().endsWith(TEST_EMAIL_DOMAIN);

            return {
                ...prov,
                email_auth: emailAuth,
                servicios_activos: activos ?? 0,
                servicios_inactivos: inactivos ?? 0,
                es_cuenta_prueba: esCuentaPrueba,
            };
        }));

        return res.status(200).json({ proveedores: enriched });
    } catch (err) {
        console.error('[admin/proveedores-pendientes] error:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}
