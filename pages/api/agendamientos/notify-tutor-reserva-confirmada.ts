// pages/api/agendamientos/notify-tutor-reserva-confirmada.ts
// ----------------------------------------------------------------------------
// F1 agenda con disponibilidad real (F1.5) — email de comprobante al TUTOR
// cuando toma hora por el picker rigido y la reserva nace 'confirmada'.
//
// Distinto de notify-tutor.ts (que dispara cuando el PROVEEDOR responde una
// solicitud pendiente del flujo viejo). Aca el caller es el TUTOR y el
// email es su comprobante escrito de la reserva que acaba de crear.
//
// Auth model: cliente envia `Authorization: Bearer <session.access_token>`.
// Ownership check: caller.user_id === agend.tutor.auth_user_id. Patron
// id-only — payload trae solo agendamientoId, todo el resto se resuelve
// server-side (sin poder fabricar contenido).
//
// Guard: SOLO dispara si:
//   - estado === 'confirmada' (esta al INSERT del picker)
//   - duracion_min IS NOT NULL (bandera "reserva de agenda", excluye
//     transiciones pendiente→confirmada del flujo viejo — para esas ya
//     hay notify-tutor con el copy propio).
//
// Falla silenciosa: si la query, la auth o el send fallan, log + 200
// skipped. La reserva ya esta creada; el email es notificacion, no
// transaccional.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';
import ReservaConfirmadaTutorEmail from '../../../components/Emails/ReservaConfirmadaTutorEmail';
import { formatFechaPreferida, formatRangoNoches } from '../../../lib/formatFecha';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!emailLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = agendamientoNotifySchema.safeParse(rawBody);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    const { agendamientoId } = parsed.data;

    console.log('[notify-tutor-reserva-confirmada] recibido', {
        agendamientoId,
        callerId: userId.slice(0, 8) + '…',
    });

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const { data: agend, error: agendErr } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, fecha_preferida, fecha_fin, estado, mensaje, duracion_min, capacidad_snapshot_estadia,
                tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id, nombre),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo, check_in_hora, check_out_hora)
            `)
            .eq('id', agendamientoId)
            .maybeSingle();

        if (agendErr || !agend) {
            console.error('[notify-tutor-reserva-confirmada] agendamiento no encontrado:', agendErr);
            return res.status(404).json({ error: 'Agendamiento no encontrado' });
        }

        const tutor = Array.isArray(agend.tutor) ? agend.tutor[0] : agend.tutor;
        const proveedor = Array.isArray(agend.proveedor) ? agend.proveedor[0] : agend.proveedor;
        const servicio = Array.isArray(agend.servicio) ? agend.servicio[0] : agend.servicio;

        // Authz: caller debe ser el tutor de la reserva.
        if (!tutor || tutor.auth_user_id !== userId) {
            console.warn('[notify-tutor-reserva-confirmada] caller no es el tutor', {
                callerUserId: userId,
                tutorAuthUserId: tutor?.auth_user_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Guard: solo reservas de agenda que nacen confirmadas. Dos banderas
        // aceptables:
        //   - F1 picker (bloque horario): duracion_min IS NOT NULL.
        //   - F2 picker (rango de noches): capacidad_snapshot_estadia IS NOT NULL.
        // Si ninguna esta populada, es una solicitud del flujo viejo — ya
        // tiene notify-tutor cuando el proveedor responde; no duplicar.
        const esReservaAgendaF1 = agend.duracion_min != null;
        const esReservaAgendaF2 = agend.capacidad_snapshot_estadia != null;
        if (agend.estado !== 'confirmada' || (!esReservaAgendaF1 && !esReservaAgendaF2)) {
            return res.status(200).json({
                skipped: true,
                reason: agend.estado !== 'confirmada' ? 'no_confirmada' : 'no_es_reserva_agenda',
                estado: agend.estado,
                duracion_min: agend.duracion_min,
                capacidad_snapshot_estadia: agend.capacidad_snapshot_estadia,
            });
        }

        // Email del tutor desde auth.users.
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(tutor.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[notify-tutor-reserva-confirmada] email del tutor inaccesible:', authErr);
            return res.status(200).json({ skipped: true, reason: 'no_email' });
        }

        // F2 (2-3-B) — branching por fecha_fin. F1 puntual: formato con
        // hora ("Sábado 15 de junio, 14:00"). F2 rango: formato de rango
        // ("Del viernes 4 al lunes 7 de julio (3 noches)").
        const esRango = esReservaAgendaF2 && !!agend.fecha_fin;
        const fechaFormateada = esRango
            ? formatRangoNoches(agend.fecha_preferida, agend.fecha_fin)
            : formatFechaPreferida(agend.fecha_preferida);

        // duracionLabel solo aplica a F1 (bloque horario). F2 lo deja null
        // — el bloque de "Duración" del template no se renderiza. La
        // información temporal de F2 vive en fechaFormateada (rango+noches)
        // + check-in/check-out.
        let duracionLabel: string | null = null;
        if (esReservaAgendaF1) {
            const duracionMin = agend.duracion_min as number;
            duracionLabel = duracionMin < 60
                ? `${duracionMin} minutos`
                : duracionMin === 60
                    ? '1 hora'
                    : duracionMin % 60 === 0
                        ? `${duracionMin / 60} horas`
                        : `${Math.floor(duracionMin / 60)}h ${duracionMin % 60}min`;
        }

        // Horas sugeridas de check-in/out del servicio (solo F2). Postgres
        // time viene como 'HH:MM:SS'; el template espera 'HH:MM'.
        const checkInHora = esRango && servicio?.check_in_hora
            ? (servicio.check_in_hora as string).slice(0, 5)
            : null;
        const checkOutHora = esRango && servicio?.check_out_hora
            ? (servicio.check_out_hora as string).slice(0, 5)
            : null;

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: authUser.user.email,
            subject: `Tu reserva está confirmada — ${servicio?.titulo || 'servicio'}`,
            react: ReservaConfirmadaTutorEmail({
                nombreTutor: tutor.nombre || 'Tutor',
                nombreProveedor: proveedor?.nombre || 'El proveedor',
                servicioTitulo: servicio?.titulo || 'tu servicio',
                fechaFormateada,
                mensajeTutor: agend.mensaje || null,
                duracionLabel,
                esRango,
                checkInHora,
                checkOutHora,
            }) as React.ReactElement,
        });

        console.log('[notify-tutor-reserva-confirmada] enviado', {
            messageId: response.data?.id,
            tutorTo: authUser.user.email,
        });
        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[notify-tutor-reserva-confirmada] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
