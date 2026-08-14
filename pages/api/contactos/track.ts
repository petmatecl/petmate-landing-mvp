import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { verifySession } from '../../../lib/apiAuth';
import { apiLimiter } from '../../../lib/rateLimit';
import { trackContactoSchema } from '../../../lib/validations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Sweep #2 mini-fix [72]: apiLimiter estandar. Antes el endpoint no
    // tenia rate-limit — vector de spam + inflacion de vercel invocations.
    if (!(await apiLimiter(req, res))) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = trackContactoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { servicio_id, proveedor_id, canal } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Sweep #2 mini-fix [72]: cross-check servicio_id ↔ proveedor_id.
        // Antes el INSERT bypasaba RLS con service_role sin validar que el
        // par fuera coherente — un caller autenticado podia inflar contactos
        // fabricados y (via el gate del ReviewModal) llegar a moderacion
        // manual con reviews sobre servicios que nunca contacto.
        //
        // NOTA: el gate elegibilidad (contacto real vs fila insertable) queda
        // abierto como deuda — ver CLAUDE.md > deuda > "gate de review-spam
        // bypasseable via chat trivial". Este fix cierra el vector de par
        // incoherente; el vector chat-fabricado requiere rediseno de la regla.
        const { data: servicio, error: servErr } = await supabaseAdmin
            .from('servicios_publicados')
            .select('id, proveedor_id')
            .eq('id', servicio_id)
            .maybeSingle();
        if (servErr || !servicio) {
            return res.status(400).json({ error: 'Invalid pair' });
        }
        if (servicio.proveedor_id !== proveedor_id) {
            return res.status(400).json({ error: 'Invalid pair' });
        }

        const { error } = await supabaseAdmin.from('contactos').insert({
            auth_user_id: userId,
            servicio_id,
            proveedor_id,
            canal,
        });

        // Ignore unique constraint violations (duplicate per day)
        if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            throw error;
        }

        return res.status(201).json({ ok: true });
    } catch (err: any) {
        console.error('Track contact error:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
