import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../lib/rateLimit';
import { autoModerarSchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';

/**
 * Auto-moderacion de evaluaciones. Disparado desde ReviewForm tras el
 * INSERT — corre heuristicas (rating, longitud, blacklist, contacto previo,
 * rate limit per-user) y si todas pasan, marca la evaluacion como aprobada.
 *
 * Sweep 1bc1897: migrado de verifyInternalSecret (403 silenciado en
 * browser) a verifySession + ownership check (caller === evaluacion.
 * usuario_id). Patron id-only — server resuelve servicio_id/cliente_id/
 * rating/comentario desde `evaluaciones` por evaluacionId. Defensa
 * contra payload manipulado (nadie puede gatillar auto-aprueba con
 * datos fabricados sobre una evaluacion de otro user).
 */

// Palabras que marcan una evaluacion como sospechosa y requieren revision manual
const BLACKLIST = [
    'spam', 'fraude', 'estafa', 'fake', 'falso', 'mentira',
    'peligro', 'peligroso', 'scam', 'engano', 'robo', 'ladrón', 'ladron',
    'reportar', 'http://', 'https://', 'www.', '.com', '.cl', 'click',
];

function containsBlacklisted(text: string): boolean {
    const lower = text.toLowerCase();
    return BLACKLIST.some(w => lower.includes(w));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();
    if (!apiLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = autoModerarSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { evaluacionId } = parsed.data;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
        // Resolver evaluacion completa desde BD.
        const { data: ev, error: evErr } = await supabase
            .from('evaluaciones')
            .select('id, usuario_id, servicio_id, rating, comentario, estado')
            .eq('id', evaluacionId)
            .maybeSingle();

        if (evErr || !ev) {
            console.error('[auto-moderar] evaluacion no encontrada:', evErr);
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }

        // Authz: caller debe ser el cliente que la submiteo.
        if (ev.usuario_id !== userId) {
            console.warn('[auto-moderar] caller no es el creador de la evaluacion', {
                callerUserId: userId,
                evaluacionUsuarioId: ev.usuario_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        // No re-moderar — si ya esta aprobada / rechazada, skip silencioso.
        if (ev.estado !== 'pendiente') {
            return res.status(200).json({ autoApproved: false, reason: 'ya_moderada', estado: ev.estado });
        }

        const rating = ev.rating;
        const comentario = ev.comentario || '';
        const servicioId = ev.servicio_id;
        const clienteId = ev.usuario_id;

        // --- Heuristic checks ---

        // 1. Rating >= 2
        if (rating < 2) {
            return res.status(200).json({ autoApproved: false, reason: 'rating_bajo' });
        }

        // 2. Longitud del comentario: 30–500 chars
        const len = comentario.trim().length;
        if (len < 30 || len > 500) {
            return res.status(200).json({ autoApproved: false, reason: 'longitud_comentario' });
        }

        // 3. Blacklist check
        if (containsBlacklisted(comentario)) {
            return res.status(200).json({ autoApproved: false, reason: 'contenido_sospechoso' });
        }

        // 4. El cliente debe tener al menos 1 conversacion con ese proveedor para este servicio
        const { count: convCount } = await supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clienteId)
            .eq('servicio_id', servicioId);

        if ((convCount ?? 0) === 0) {
            return res.status(200).json({ autoApproved: false, reason: 'sin_conversacion' });
        }

        // 5. No mas de 2 evaluaciones en las ultimas 24h del mismo cliente
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: evalCount } = await supabase
            .from('evaluaciones')
            .select('id', { count: 'exact', head: true })
            .eq('usuario_id', clienteId)
            .gte('created_at', since24h);

        if ((evalCount ?? 0) > 2) {
            return res.status(200).json({ autoApproved: false, reason: 'demasiadas_evaluaciones_24h' });
        }

        // All checks passed → auto-approve
        const { error: updateError } = await supabase
            .from('evaluaciones')
            .update({ estado: 'aprobado', auto_moderado: true })
            .eq('id', evaluacionId);

        if (updateError) throw updateError;

        return res.status(200).json({ autoApproved: true });

    } catch (err: any) {
        console.error('[auto-moderar] Error:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
