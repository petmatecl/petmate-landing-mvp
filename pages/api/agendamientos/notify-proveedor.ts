import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession, maskEmail, maskUid } from '../../../lib/apiAuth';
import AgendamientoProveedorEmail from '../../../components/Emails/AgendamientoProveedorEmail';
import { formatFechaPreferida, formatRangoNoches } from '../../../lib/formatFecha';
import { MODALIDAD_LABELS, esModalidadValida } from '../../../lib/categoriaTemporal';
import { formatDireccionLinea } from '../../../lib/formatDireccion';
import { resolverDonde, resolverFechaSub } from '../../../lib/emails/resolvers';

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
    if (!(await emailLimiter(req, res))) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = agendamientoNotifySchema.safeParse(rawBody);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { agendamientoId } = parsed.data;

    // Diagnostico Bug F1 smoke: log de entrada + salida al servidor. Sin
    // exponer PII (userId truncado). Aldo revisa Vercel logs para trazar
    // por que un fire-and-forget del picker no se completa.
    console.log('[notify-proveedor] recibido', {
        agendamientoId,
        callerId: userId.slice(0, 8) + '…',
    });

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
                id, fecha_preferida, fecha_fin, modalidad_elegida, modo_tarifa,
                duracion_horas, direccion_servicio,
                region, comuna, calle, numero, direccion_info,
                estado, mensaje, capacidad_snapshot_estadia, tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id, nombre),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, auth_user_id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo, check_in_hora, check_out_hora, comunas_cobertura)
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
                callerUserId: maskUid(userId),
                tutorAuthUserId: maskUid(tutor?.auth_user_id),
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

        // Branching V1/V2/V4 — el fechaFormateada solo lleva fecha (sin
        // duracion); la duracion va en bloque separado del template (opcion C).
        //   V2/V4a (fecha_fin presente): formatRangoNoches.
        //   V1/V4b (sin fecha_fin):      formatFechaPreferida (fecha+hora).
        const fechaFormateada = agend.fecha_fin
            ? formatRangoNoches(agend.fecha_preferida, agend.fecha_fin)
            : formatFechaPreferida(agend.fecha_preferida);

        // Fase 2 — campos extra para los bloques condicionales del template.
        // null cuando no aplican (V1 generico, solicitudes legacy Fase 1).
        const modalidadLabel = agend.modalidad_elegida && esModalidadValida(agend.modalidad_elegida)
            ? MODALIDAD_LABELS[agend.modalidad_elegida]
            : null;
        const duracionLabel = agend.duracion_horas
            ? (agend.duracion_horas === 1 ? '1 hora' : `${agend.duracion_horas} horas`)
            : null;
        // Ola 1: direccion compacta — formato estructurado nuevo, fallback
        // a direccion_servicio text legacy si los 5 estructurados son null.
        // direccion_info aparte (italica en el template).
        const direccionServicio = formatDireccionLinea({
            region: agend.region,
            comuna: agend.comuna,
            calle: agend.calle,
            numero: agend.numero,
            direccion_info: agend.direccion_info,
            direccion_servicio: agend.direccion_servicio,
        });
        const direccionInfo = agend.direccion_info || null;

        // F1 agenda: si la agendamiento nacio confirmada (picker rigido del
        // tutor), el copy es de "reserva confirmada" en vez de "solicitud
        // que necesita respuesta". El estado se lee de BD, no del cliente.
        const esConfirmadaAuto = agend.estado === 'confirmada';

        // F2 agenda (2-3-B): la reserva es una estadia por rango de noches
        // SOLO cuando capacidad_snapshot_estadia esta populada. Esta columna
        // fue agregada por el schema F2-1 y arranca NULL en toda fila
        // preexistente (V1/V2/V4a/V4b legacy). Se popula unicamente al
        // INSERT del picker F2 (F2-3-C). Usar `fecha_fin` como semaforo
        // en su lugar seria regresion: V2/V4a legacy tambien tienen
        // fecha_fin, y su render debe mantenerse identico al actual.
        const esRango = agend.capacidad_snapshot_estadia != null;
        const checkInHora = esRango && servicio?.check_in_hora
            ? (servicio.check_in_hora as string).slice(0, 5)
            : null;
        const checkOutHora = esRango && servicio?.check_out_hora
            ? (servicio.check_out_hora as string).slice(0, 5)
            : null;
        const subject = esConfirmadaAuto
            ? 'Nueva reserva confirmada en Pawnecta'
            : 'Nueva solicitud de agendamiento en Pawnecta';

        // ZB3 sprint ZONAB-1: alimentar props `donde` y `fechaSub` desde los
        // helpers puros de lib/emails/resolvers.ts. Fallback donde: chat con
        // el otro (el proveedor recibe el email; el otro es el tutor).
        const fechaSub = resolverFechaSub({
            fecha_preferida: agend.fecha_preferida,
            fecha_fin: agend.fecha_fin,
            duracion_horas: agend.duracion_horas,
            capacidad_snapshot_estadia: agend.capacidad_snapshot_estadia,
        });
        const dondeResuelto = resolverDonde({
            agend,
            servicio: servicio || {},
        });
        const donde = dondeResuelto ?? `Se coordina por chat con ${tutor?.nombre || 'el tutor'}`;

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: authUser.user.email,
            subject,
            react: AgendamientoProveedorEmail({
                nombreProveedor: proveedor.nombre || 'Proveedor',
                nombreTutor: tutor?.nombre || 'Un tutor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                fechaFormateada,
                mensaje: agend.mensaje || null,
                modalidadLabel,
                direccionServicio,
                direccionInfo,
                duracionLabel,
                esConfirmadaAuto,
                esRango,
                checkInHora,
                checkOutHora,
                fechaSub,
                donde,
            }) as React.ReactElement,
        });

        console.log('[notify-proveedor] enviado', {
            messageId: response.data?.id,
            esConfirmadaAuto,
            proveedorTo: maskEmail(authUser.user.email),
        });
        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        // Sweep #1 finding [70]: log server-side, sin `details` en el response
        // (evita leak de column names / RLS hints / constraint names de Supabase
        // al cliente).
        console.error('[notify-proveedor] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
        });
    }
}
