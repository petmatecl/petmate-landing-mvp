import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';
import AgendamientoCancelacionTutorEmail from '../../../components/Emails/AgendamientoCancelacionTutorEmail';
import { formatFechaPreferida, formatRangoNoches } from '../../../lib/formatFecha';

/**
 * Sprint cierre agendamiento — notifica al proveedor cuando un tutor cancela
 * una solicitud CONFIRMADA. NO se invoca cuando el tutor cancela una pendiente
 * (decision UX: ruido). Disparado desde pages/mis-solicitudes.tsx despues del
 * UPDATE estado='cancelada' sobre una fila que era 'confirmada'.
 *
 * Auth: bearer del tutor; verifica que el tutor_id del agendamiento matchea
 * el caller — evita que cualquiera dispare emails arbitrarios.
 *
 * Defensa adicional: re-lee el agendamiento y solo envia si estado es
 * efectivamente 'cancelada' (skip si race condition con otro tab).
 *
 * Falla silenciosamente: si la query, auth, o send fallan, loggea y responde
 * 200 con flag — el cliente ya completo el UPDATE de cancelacion, el email
 * es notificacion no transaccional.
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
        const { data: agend, error: agendErr } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, fecha_preferida, fecha_fin, estado, tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id, nombre, apellido_p),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, auth_user_id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo)
            `)
            .eq('id', agendamientoId)
            .maybeSingle();

        if (agendErr || !agend) {
            console.error('[notify-proveedor-cancel] agendamiento no encontrado:', agendErr);
            return res.status(404).json({ error: 'Agendamiento no encontrado' });
        }

        const tutor = Array.isArray(agend.tutor) ? agend.tutor[0] : agend.tutor;
        const proveedor = Array.isArray(agend.proveedor) ? agend.proveedor[0] : agend.proveedor;
        const servicio = Array.isArray(agend.servicio) ? agend.servicio[0] : agend.servicio;

        // Authz: caller debe ser el tutor del agendamiento.
        if (!tutor || tutor.auth_user_id !== userId) {
            console.warn('[notify-proveedor-cancel] caller no es el tutor del agendamiento', {
                callerUserId: userId,
                tutorAuthUserId: tutor?.auth_user_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Defensa post-update race: solo emitir si efectivamente esta
        // cancelada. Si otro tab cambio el estado entremedio, skip.
        if (agend.estado !== 'cancelada') {
            return res.status(200).json({
                skipped: true,
                reason: 'estado_no_cancelada',
                estado: agend.estado,
            });
        }

        if (!proveedor) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(proveedor.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[notify-proveedor-cancel] email del proveedor inaccesible:', authErr);
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
            subject: 'Una solicitud confirmada fue cancelada',
            react: AgendamientoCancelacionTutorEmail({
                nombreProveedor: proveedor.nombre || 'Proveedor',
                nombreTutor: tutor
                    ? `${tutor.nombre || ''} ${tutor.apellido_p || ''}`.trim() || 'El tutor'
                    : 'El tutor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                fechaFormateada,
            }) as React.ReactElement,
        });

        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[notify-proveedor-cancel] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
