import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';
import AgendamientoTutorEmail from '../../../components/Emails/AgendamientoTutorEmail';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Sprint 3 agendamiento — notifica al tutor cuando el proveedor responde
 * (confirmar o rechazar). Disparado desde el handler de la tab Solicitudes
 * en pages/proveedor/index.tsx tras el UPDATE.
 *
 * Auth model: idem notify-proveedor pero al reves — verifica que el
 * `proveedor_id` del agendamiento corresponde al user logueado (resuelto
 * via proveedores.auth_user_id = user.id).
 *
 * El estado del agendamiento (`confirmada` o `rechazada`) se lee de la BD,
 * NO se acepta del cliente — asi un payload manipulado no puede mandar el
 * email "incorrecto". Si el estado es todavia `pendiente` o ya `cancelada`,
 * el endpoint skip-ea.
 *
 * Falla silenciosa: igual que notify-proveedor — el UPDATE en BD ya fue
 * exitoso, el email es notificacion, no transaccional.
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
                id, fecha_preferida, estado, nota_proveedor, tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id, nombre, apellido_p),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, auth_user_id, nombre, telefono, whatsapp, mostrar_telefono, mostrar_whatsapp),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo)
            `)
            .eq('id', agendamientoId)
            .maybeSingle();

        if (agendErr || !agend) {
            console.error('[notify-tutor] agendamiento no encontrado:', agendErr);
            return res.status(404).json({ error: 'Agendamiento no encontrado' });
        }

        const tutor = Array.isArray(agend.tutor) ? agend.tutor[0] : agend.tutor;
        const proveedor = Array.isArray(agend.proveedor) ? agend.proveedor[0] : agend.proveedor;
        const servicio = Array.isArray(agend.servicio) ? agend.servicio[0] : agend.servicio;

        // Authz: el caller debe ser el proveedor del agendamiento.
        if (!proveedor || proveedor.auth_user_id !== userId) {
            console.warn('[notify-tutor] caller no es el proveedor del agendamiento', {
                callerUserId: userId,
                proveedorAuthUserId: proveedor?.auth_user_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Solo notificamos en transiciones a estados resueltos. El estado se
        // lee de la BD, no del cliente — payload manipulado no puede mandar
        // el email "wrong".
        if (agend.estado !== 'confirmada' && agend.estado !== 'rechazada') {
            return res.status(200).json({
                skipped: true,
                reason: 'estado_no_terminal',
                estado: agend.estado,
            });
        }

        if (!tutor) {
            return res.status(404).json({ error: 'Tutor no encontrado' });
        }

        // Email del tutor desde auth.users.
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(tutor.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[notify-tutor] email del tutor inaccesible:', authErr);
            return res.status(200).json({ skipped: true, reason: 'no_email' });
        }

        const fechaFormateada = agend.fecha_preferida
            ? formatDate(new Date(agend.fecha_preferida), "EEEE d 'de' MMMM, HH:mm", { locale: es })
            : 'sin fecha';

        // Telefono/WhatsApp del proveedor — solo si esta marcado como publico
        // en su perfil. Si el proveedor no opto por exponerlos, no los
        // incluimos en el email (respeta misma logica que la ficha publica).
        const telefonoVisible = (agend.estado === 'confirmada' && proveedor.mostrar_telefono && proveedor.telefono)
            ? proveedor.telefono as string
            : null;
        const whatsappRaw = (agend.estado === 'confirmada' && proveedor.mostrar_whatsapp && proveedor.whatsapp)
            ? proveedor.whatsapp as string
            : null;
        const whatsappLink = whatsappRaw
            ? `https://wa.me/${whatsappRaw.replace(/[^\d]/g, '')}`
            : null;

        const subject = agend.estado === 'confirmada'
            ? 'Tu solicitud de agendamiento fue confirmada'
            : 'Actualización sobre tu solicitud de agendamiento';

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: authUser.user.email,
            subject,
            react: AgendamientoTutorEmail({
                estado: agend.estado as 'confirmada' | 'rechazada',
                nombreTutor: tutor.nombre || 'Tutor',
                nombreProveedor: proveedor.nombre || 'El proveedor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                servicioId: servicio?.id || '',
                fechaFormateada,
                notaProveedor: agend.nota_proveedor || null,
                telefonoVisible,
                whatsappLink,
            }) as React.ReactElement,
        });

        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[notify-tutor] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
