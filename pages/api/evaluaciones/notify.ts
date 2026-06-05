import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import NewEvaluationEmail from '../../../components/Emails/NewEvaluationEmail';
import { emailLimiter } from '../../../lib/rateLimit';
import { evaluacionNotifySchema } from '../../../lib/validations';
import { verifySession, isAdmin } from '../../../lib/apiAuth';

/**
 * Notifica al proveedor de una evaluacion recibida. Dos paths semanticos
 * comparten el mismo endpoint (Opcion A del spec):
 *
 *   1. Tutor crea evaluacion (estado='pendiente'):
 *      caller = evaluacion.usuario_id (el tutor que la escribió).
 *      Email: "Recibiste una nueva evaluación" (subject sin isFirst).
 *      No es relevante isFirst porque la review todavia no esta aprobada.
 *
 *   2. Admin aprueba evaluacion (estado='aprobado'):
 *      caller = isAdmin(userId).
 *      isFirst se computa server-side (count de evaluaciones aprobadas
 *      del proveedor — si esta es la unica, es la primera). NO se acepta
 *      del cliente; payload manipulado no puede mandar "primera" cuando
 *      no aplica.
 *
 * Templates compartidos (NewEvaluationEmail) — solo cambia el subject.
 *
 * Sweep 1bc1897: migrado de verifyInternalSecret a verifySession + authz
 * OR (creator || admin). Patron id-only — el cliente solo manda
 * evaluacionId.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!emailLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = evaluacionNotifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { evaluacionId } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Resolver evaluacion + proveedor + servicio.
        const { data: ev, error: evErr } = await supabaseAdmin
            .from('evaluaciones')
            .select(`
                id, usuario_id, proveedor_id, servicio_id, rating, comentario, estado,
                proveedor:proveedor_id (id, auth_user_id, nombre),
                servicio:servicio_id (id, titulo)
            `)
            .eq('id', evaluacionId)
            .maybeSingle();

        if (evErr || !ev) {
            console.error('[evaluaciones/notify] evaluacion no encontrada:', evErr);
            return res.status(404).json({ error: 'Evaluación no encontrada' });
        }

        // 2. Authz OR: caller es el tutor que la creo, o un admin.
        const isCreator = ev.usuario_id === userId;
        const isAdminCaller = isCreator ? false : await isAdmin(userId);
        if (!isCreator && !isAdminCaller) {
            console.warn('[evaluaciones/notify] caller no autorizado', {
                callerUserId: userId,
                evaluacionUsuarioId: ev.usuario_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        const proveedor = Array.isArray(ev.proveedor) ? ev.proveedor[0] : ev.proveedor;
        const servicio = Array.isArray(ev.servicio) ? ev.servicio[0] : ev.servicio;

        if (!proveedor) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // 3. Email del proveedor desde auth.users.
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(proveedor.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[evaluaciones/notify] email inaccesible:', authErr);
            return res.status(200).json({ skipped: true, reason: 'no_email' });
        }

        // 4. isFirst: solo aplica al path admin (la review aprobada). Para
        //    el path creator (review todavia pendiente) no aplica — usamos
        //    el subject "subsequent".
        let isFirst = false;
        if (isAdminCaller) {
            const { count: aprobadasCount } = await supabaseAdmin
                .from('evaluaciones')
                .select('id', { count: 'exact', head: true })
                .eq('proveedor_id', proveedor.id)
                .eq('estado', 'aprobado');
            // "isFirst" = recien acabamos de pasar de 0 a 1 (esta es la
            // unica aprobada). Match con la heuristica original del
            // caller del admin (count <= 1).
            isFirst = (aprobadasCount ?? 0) <= 1;
        }

        const subject = isFirst
            ? 'Recibiste tu primera evaluación en Pawnecta'
            : 'Recibiste una nueva evaluación en Pawnecta';

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: authUser.user.email,
            subject,
            react: NewEvaluationEmail({
                nombre: proveedor.nombre || 'Proveedor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                rating: ev.rating,
                comentario: ev.comentario,
            }) as React.ReactElement,
        });

        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[evaluaciones/notify] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
