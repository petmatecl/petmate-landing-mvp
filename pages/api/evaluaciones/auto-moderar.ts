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

    // Sweep #1 finding [76]: sin fallback a anon key. Antes el `??` a
    // NEXT_PUBLIC_SUPABASE_ANON_KEY producía falso-positivo silencioso —
    // el endpoint corría con anon, RLS bloqueaba el UPDATE, y el usuario
    // veía "auto-aprobada" cuando realmente no persistía. Falla-cerrada.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // Resolver evaluacion completa desde BD.
        const { data: ev, error: evErr } = await supabase
            .from('evaluaciones')
            .select('id, usuario_id, servicio_id, proveedor_id, rating, comentario, estado')
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

        // Sweep #2 mini-fix [72]: cross-check servicio.proveedor_id ↔
        // evaluacion.proveedor_id. Si el par es incoherente (evaluación
        // apunta a un proveedor distinto del dueño del servicio), rechazo
        // antes de auto-moderar. Complementa el fix de contactos/track:
        // aunque ahí ya validamos el par al insertar el contacto, este es
        // el gate autoritativo del auto-moderador.
        const { data: servicio } = await supabase
            .from('servicios_publicados')
            .select('proveedor_id')
            .eq('id', ev.servicio_id)
            .maybeSingle();
        if (!servicio || servicio.proveedor_id !== ev.proveedor_id) {
            console.warn('[auto-moderar] par incoherente servicio↔proveedor', {
                evaluacionId,
                servicioId: ev.servicio_id,
            });
            return res.status(200).json({ autoApproved: false, reason: 'par_incoherente' });
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

        // 4. Contacto previo con ese proveedor/servicio: (a) al menos una
        // conversation, o (b) un agendamiento confirmado con fecha ya pasada
        // (para el path del cron post-servicio, que reseña sin necesidad de
        // chat previo). Predicado espejo del gate en ReviewForm.
        //
        // agendamientos.tutor_id → usuarios_buscadores.id (NO auth.users.id).
        // Resolvemos via auth_user_id. En el gate client-side esto se hace
        // implicitamente por RLS `agendamientos_tutor_select`; aca corremos
        // con service_role (RLS bypass), asi que el filtro por tutor_id es
        // explicito. La fecha efectiva de fin del servicio es
        // `fecha_fin ?? fecha_preferida` — servicios rango-noches (V2/V3/V4a)
        // pueblan fecha_fin, el resto queda NULL y usa fecha_preferida.
        const { count: convCount } = await supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clienteId)
            .eq('servicio_id', servicioId);

        let hasAgendamientoPasado = false;
        if ((convCount ?? 0) === 0) {
            const { data: buscador } = await supabase
                .from('usuarios_buscadores')
                .select('id')
                .eq('auth_user_id', clienteId)
                .maybeSingle();

            if (buscador?.id) {
                const nowIso = new Date().toISOString();
                // PostgREST no acepta `coalesce(fecha_fin, fecha_preferida)`
                // como columna en `.lt()`. Reescribimos como `or`:
                //   fecha_fin < now  OR  (fecha_fin IS NULL AND fecha_preferida < now)
                const { data: agend } = await supabase
                    .from('agendamientos')
                    .select('id')
                    .eq('tutor_id', buscador.id)
                    .eq('servicio_id', servicioId)
                    .eq('estado', 'confirmada')
                    .or(`fecha_fin.lt.${nowIso},and(fecha_fin.is.null,fecha_preferida.lt.${nowIso})`)
                    .limit(1)
                    .maybeSingle();
                hasAgendamientoPasado = agend !== null;
            }
        }

        if ((convCount ?? 0) === 0 && !hasAgendamientoPasado) {
            return res.status(200).json({ autoApproved: false, reason: 'sin_contacto_previo' });
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
