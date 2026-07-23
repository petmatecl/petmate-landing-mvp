// pages/api/agendamientos/cancelar.ts
// ----------------------------------------------------------------------------
// F2-3-D — cancelacion server-side de reservas F2 (estadias por rango de
// noches) con ventana anti-cancelacion `cancelacion_min_horas_antes`
// configurada por el proveedor en el servicio.
//
// POR QUE SERVER-SIDE:
//   * La ventana debe ser AUTORITATIVA — client-side es solo sugerencia,
//     un tutor con devtools podria bypasear la validacion y bajar el UPDATE
//     via anon key con RLS.
//   * El UPDATE se hace con service_role para reemplazar la politica RLS
//     de UPDATE en `agendamientos` (que hoy permite al tutor cancelar
//     libremente). El endpoint es el único punto que puede actualizar
//     reservas F2 confirmadas — el client no debe emitir UPDATE directo
//     sobre esas filas.
//
// SCOPE:
//   * Aplica a reservas F2 confirmadas: estado='confirmada' AND
//     capacidad_snapshot_estadia NOT NULL. Mismo semaforo que
//     notify-tutor-reserva-confirmada / notify-* de F2-3-B — evita
//     regresion sobre V2/V4a legacy (que tienen fecha_fin pero no
//     capacidad_snapshot_estadia).
//   * F1 (picker de bloque horario, duracion_min NOT NULL) sigue
//     cancelable client-side sin ventana — mismo tratamiento que en
//     F2-3-C se difirió al backlog.
//
// AUTH MODEL:
//   * Cliente envia `Authorization: Bearer <session.access_token>`.
//   * Server extrae userId con verifySession.
//   * Ownership check: caller.userId === agend.tutor.auth_user_id.
//     NUNCA confiar solo en el agendamientoId — el caller podria
//     conocer un id ajeno via URL de tabs abiertas o filtrado log.
//
// RECHAZO POR VENTANA:
//   * `horasHastaCheckIn = (fecha_preferida - now) / 3600s`.
//   * Si horasHastaCheckIn < cancelacion_min_horas_antes: 403 con copy
//     amable ("No puedes cancelar... quedan menos de N horas...
//     Contacta a {proveedor} por chat para coordinar.").
//
// ACCION EXITOSA:
//   * UPDATE estado='cancelada' + respondido_at=now via service_role.
//   * Response 200 + client dispara notify-proveedor-cancel
//     (esRango=true por F2-3-B — cadena de emails ya cableada).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { emailLimiter } from '../../../lib/rateLimit';
import { agendamientoNotifySchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';

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
        // Fetch: agendamiento + tutor (para ownership) + proveedor (para el
        // copy del rechazo) + servicio (para leer cancelacion_min_horas_antes).
        const { data: agend, error: agendErr } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, estado, fecha_preferida, fecha_fin,
                capacidad_snapshot_estadia,
                tutor_id, proveedor_id, servicio_id,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, auth_user_id),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, cancelacion_min_horas_antes)
            `)
            .eq('id', agendamientoId)
            .maybeSingle();

        if (agendErr || !agend) {
            console.error('[cancelar] agendamiento no encontrado:', agendErr);
            return res.status(404).json({ error: 'Reserva no encontrada.' });
        }

        const tutor = Array.isArray(agend.tutor) ? agend.tutor[0] : agend.tutor;
        const proveedor = Array.isArray(agend.proveedor) ? agend.proveedor[0] : agend.proveedor;
        const servicio = Array.isArray(agend.servicio) ? agend.servicio[0] : agend.servicio;

        // 1. Ownership: el caller debe ser el tutor de la reserva. Log-warn
        //    los intentos por id ajeno para observabilidad.
        if (!tutor || tutor.auth_user_id !== userId) {
            console.warn('[cancelar] caller no es el tutor', {
                callerUserId: userId,
                tutorAuthUserId: tutor?.auth_user_id,
                agendamientoId,
            });
            return res.status(403).json({ error: 'No autorizado.' });
        }

        // 2. Scope: solo F2 confirmadas (capacidad_snapshot_estadia NOT NULL).
        //    F1/legacy y no-confirmadas no deben pasar por este endpoint —
        //    el client debe seguir con UPDATE directo para esas.
        if (agend.capacidad_snapshot_estadia == null) {
            return res.status(400).json({
                error: 'Esta reserva no se puede cancelar por esta vía. Ábrela desde tu panel para gestionarla.',
            });
        }
        if (agend.estado !== 'confirmada') {
            return res.status(400).json({
                error: `No se puede cancelar una reserva en estado "${agend.estado}".`,
            });
        }

        // 3. Guard defensivo: si `fecha_preferida` no vino populada (schema
        //    lo tolera NULL por diseño legacy), no podemos calcular la
        //    ventana. Rechazamos con 400 para evitar el silent-bypass:
        //    `new Date(null).getTime() === 0` da un `horasHastaCheckIn`
        //    huge-negative que igual rechaza, PERO `new Date(undefined)`
        //    devuelve `NaN` → `NaN < X` es false → pasaría el check.
        //    Nunca debería llegar aca en F2 confirmadas (INSERT del picker
        //    puebla siempre), pero defensa en profundidad.
        if (!agend.fecha_preferida) {
            console.error('[cancelar] fecha_preferida ausente en reserva F2 confirmada', { agendamientoId });
            return res.status(400).json({
                error: 'No pudimos leer la fecha de esta reserva. Contacta a soporte.',
            });
        }

        // 4. Ventana anti-cancelacion. El cancelacion_min_horas_antes viene
        //    del servicio (config del proveedor). Si el check-in esta a
        //    menos de esa ventana, rechazamos con copy amable.
        const cancelacionMinHoras = servicio?.cancelacion_min_horas_antes ?? 48;
        const ahoraMs = Date.now();
        const checkInMs = new Date(agend.fecha_preferida).getTime();
        const horasHastaCheckIn = (checkInMs - ahoraMs) / 3_600_000;

        if (horasHastaCheckIn < cancelacionMinHoras) {
            const proveedorNombre = proveedor?.nombre || 'el proveedor';
            const copyHoras = cancelacionMinHoras === 1
                ? '1 hora'
                : `${cancelacionMinHoras} horas`;
            return res.status(403).json({
                error: `No puedes cancelar esta reserva porque quedan menos de ${copyHoras} para el check-in. Contacta a ${proveedorNombre} por chat para coordinar.`,
                reason: 'ventana_cerrada',
                horasHastaCheckIn: Math.max(0, Math.round(horasHastaCheckIn * 10) / 10),
                cancelacionMinHoras,
            });
        }

        // 4. UPDATE via service_role. Bypasa RLS. Escribe estado + timestamp.
        const { error: updateErr } = await supabaseAdmin
            .from('agendamientos')
            .update({
                estado: 'cancelada',
                respondido_at: new Date().toISOString(),
            })
            .eq('id', agendamientoId);

        if (updateErr) {
            console.error('[cancelar] UPDATE falló:', updateErr);
            return res.status(500).json({ error: 'No pudimos cancelar la reserva. Intenta de nuevo.' });
        }

        console.log('[cancelar] reserva cancelada', {
            agendamientoId,
            callerUserId: userId.slice(0, 8) + '…',
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[cancelar] catch error:', error);
        return res.status(500).json({
            error: 'Error interno al cancelar. Intenta de nuevo.',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
