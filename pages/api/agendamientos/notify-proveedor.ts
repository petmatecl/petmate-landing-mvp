import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';
import AgendamientoProveedorEmail from '../../../components/Emails/AgendamientoProveedorEmail';
import { formatFechaPreferida, formatRangoNoches } from '../../../lib/formatFecha';

/**
 * Sprint 3 agendamiento — notifica al proveedor cuando un tutor crea una
 * solicitud. Disparado desde SolicitarAgendamientoModal.tsx tras el INSERT.
 *
 * Auth model: el cliente envia `Authorization: Bearer <session.access_token>`.
 * El server resuelve el user con `supabase.auth.getUser(token)` y verifica
 * que el `tutor_id` del agendamiento corresponde a este user — evita que
 * cualquiera dispare emails arbitrarios sin haber creado la solicitud.
 *
 * Falla silenciosamente: si la query, el insert auth check, o el send fallan,
 * loggea pero responde 2xx para no romper el flow del cliente (el modal del
 * tutor ya hizo el INSERT exitoso; el email es notificacion, no transaccional).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!emailLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = agendamientoNotifySchema.safeParse(rawBody);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { agendamientoId } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Resolver agendamiento + tutor + proveedor + servicio en una sola query.
        // Joins por FK declaradas en BD.
        const { data: agend, error: agendErr } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, fecha_preferida, fecha_fin, mensaje, tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id, nombre, apellido_p),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, auth_user_id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo)
            `)
            .eq('id', agendamientoId)
            .maybeSingle();

        if (agendErr || !agend) {
            console.error('[notify-proveedor] agendamiento no encontrado:', agendErr);
            return res.status(404).json({ error: 'Agendamiento no encontrado' });
        }

        const tutor = Array.isArray(agend.tutor) ? agend.tutor[0] : agend.tutor;
        const proveedor = Array.isArray(agend.proveedor) ? agend.proveedor[0] : agend.proveedor;
        const servicio = Array.isArray(agend.servicio) ? agend.servicio[0] : agend.servicio;

        // Authz: el caller debe ser el tutor del agendamiento.
        if (!tutor || tutor.auth_user_id !== userId) {
            console.warn('[notify-proveedor] caller no es el tutor del agendamiento', {
                callerUserId: userId,
                tutorAuthUserId: tutor?.auth_user_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        if (!proveedor) {
            console.error('[notify-proveedor] proveedor no resuelto en el join');
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Email del proveedor desde auth.users (no esta en proveedores.email
        // necesariamente — mismo patron que /api/evaluaciones/notify).
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(proveedor.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[notify-proveedor] email del proveedor inaccesible:', authErr);
            return res.status(200).json({ skipped: true, reason: 'no_email' });
        }

        // Branching V1 vs V2: presencia de fecha_fin encoda la variante.
        // V2 (cuidado rango noches) → "Del miercoles 1 de julio al viernes 3
        // de julio (2 noches)". V1 (puntual) → "Jueves 25 de junio, 18:45".
        // El template no cambia; recibe siempre un string ya formateado.
        const fechaFormateada = agend.fecha_fin
            ? formatRangoNoches(agend.fecha_preferida, agend.fecha_fin)
            : formatFechaPreferida(agend.fecha_preferida);

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: authUser.user.email,
            subject: 'Nueva solicitud de agendamiento en Pawnecta',
            react: AgendamientoProveedorEmail({
                nombreProveedor: proveedor.nombre || 'Proveedor',
                nombreTutor: tutor
                    ? `${tutor.nombre || ''} ${tutor.apellido_p || ''}`.trim() || 'Un tutor'
                    : 'Un tutor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                fechaFormateada,
                mensaje: agend.mensaje || null,
            }) as React.ReactElement,
        });

        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[notify-proveedor] catch error:', error);
        // Spec: no rollback. Loggear y responder 200 con flag — el cliente
        // ya completo el INSERT y no debe ver el error de email como propio.
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
