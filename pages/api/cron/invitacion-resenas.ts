// pages/api/cron/invitacion-resenas.ts
// ----------------------------------------------------------------------------
// Cron: invitacion automatica a dejar reseña post-servicio.
//
// Requiere migration en agendamientos:
//   ALTER TABLE agendamientos ADD COLUMN IF NOT EXISTS invitacion_resena_enviada_at timestamptz;
//
// Criterio de elegibilidad:
//   - estado = 'confirmada'.
//   - (fecha_fin ?? fecha_preferida) + 24h < now()  — el servicio termino
//     hace al menos un dia. Buffer para no invitar el mismo dia que
//     concluye la estadia / la sesion.
//   - invitacion_resena_enviada_at IS NULL  — no re-enviamos.
//   - No existe fila en `evaluaciones` para el par (usuario, servicio) —
//     si el tutor ya reseño desde otro path, no molestamos.
//
// Por cada elegible:
//   1. Email al tutor via Resend (componente InvitacionResenaEmail, con
//      framing de pregunta + salida natural + mencion opcional a mascota).
//   2. Notificacion in-app via INSERT directo a `notifications` (service role).
//   3. UPDATE agendamientos.invitacion_resena_enviada_at = now() — marca
//      anti re-envio.
//
// Testing en staging: skipIfNonProd bloquea la ejecucion normal, pero
// aceptamos:
//   ?dryRun=1        -> reporta elegibles sin enviar. Requiere secret.
//   ?bypassEnv=1     -> ignora skipIfNonProd. Requiere secret. Envia real.
// Ambos gated por x-cron-secret (o Authorization Bearer).
//
// Schedule (vercel.json): "0 11 * * *" — 11:00 UTC diario (8:00 AM Chile
// invierno / 7:00 AM verano). Horario tranquilo, ni muy temprano para
// llegar bien a Chile ni pisando la ventana de responder-al-dia del
// proveedor.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { skipIfNonProd } from '../../../lib/cronGuard';
import { InvitacionResenaEmail } from '../../../components/Emails/InvitacionResenaEmail';
import { formatFechaServicioInline } from '../../../lib/formatFecha';
import type React from 'react';

const BUFFER_HORAS = 24;
const BATCH_LIMIT = 30;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth por secret (Vercel Cron manda `Authorization: Bearer <secret>`;
    // aceptamos tambien x-cron-secret para invocaciones manuales).
    const authHeader = req.headers.authorization;
    const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Gate de entorno. Se saltea con ?bypassEnv=1 (autenticado por secret),
    // util para smoke en staging con datos controlados.
    const bypassEnv = req.query.bypassEnv === '1';
    if (!bypassEnv && skipIfNonProd(req, res)) return;

    const dryRun = req.query.dryRun === '1';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Missing config' });
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pawnecta.com';

    try {
        // Cutoff temporal — el servicio termino hace al menos BUFFER_HORAS.
        // Aplicamos la comparacion en JS (fecha_fin puede ser null) despues
        // de traer un set amplio con estado='confirmada' + no invitados.
        const cutoffIso = new Date(Date.now() - BUFFER_HORAS * 60 * 60 * 1000).toISOString();

        // Traemos servicio (titulo) + mascota (nombre opcional) + tutor
        // (usuarios_buscadores para el nombre + auth_user_id para email).
        // proveedor (nombre) para el email.
        const { data: candidatos, error: candError } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, servicio_id, fecha_preferida, fecha_fin,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, nombre, auth_user_id),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, nombre),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo),
                mascota:mascotas!agendamientos_mascota_id_fkey(id, nombre)
            `)
            .eq('estado', 'confirmada')
            .is('invitacion_resena_enviada_at', null)
            .lt('fecha_preferida', cutoffIso) // filtro grueso; refinamos abajo con fecha_fin
            .order('fecha_preferida', { ascending: true })
            .limit(BATCH_LIMIT * 2); // margen para descartar los que no pasen refino/eval-check

        if (candError) throw candError;

        const now = Date.now();
        const cutoffMs = now - BUFFER_HORAS * 60 * 60 * 1000;

        const elegibles: Array<{
            agendamientoId: string;
            servicioId: string;
            tutorAuthId: string;
            tutorNombre: string;
            proveedorNombre: string;
            servicioTitulo: string;
            mascotaNombre: string | null;
            fechaServicioFormato: string;
        }> = [];

        for (const c of (candidatos || []) as any[]) {
            const tutor = Array.isArray(c.tutor) ? c.tutor[0] : c.tutor;
            const proveedor = Array.isArray(c.proveedor) ? c.proveedor[0] : c.proveedor;
            const servicio = Array.isArray(c.servicio) ? c.servicio[0] : c.servicio;
            const mascota = Array.isArray(c.mascota) ? c.mascota[0] : c.mascota;

            if (!tutor?.auth_user_id || !servicio?.id) continue;

            // Fin efectivo: fecha_fin (cuidado multi-dia) o fecha_preferida.
            const finRef = c.fecha_fin || c.fecha_preferida;
            if (!finRef) continue;
            if (new Date(finRef).getTime() > cutoffMs) continue;

            // Skip si el tutor ya reseño ese servicio. Excluimos rechazadas:
            // si su intento previo fue rechazado por moderacion, sigue
            // habilitado para re-intentar (alineado con el constraint
            // parcial de BD sobre estado != 'rechazado').
            const { data: yaReseno } = await supabaseAdmin
                .from('evaluaciones')
                .select('id')
                .eq('usuario_id', tutor.auth_user_id)
                .eq('servicio_id', servicio.id)
                .neq('estado', 'rechazado')
                .limit(1)
                .maybeSingle();
            if (yaReseno) continue;

            elegibles.push({
                agendamientoId: c.id,
                servicioId: servicio.id,
                tutorAuthId: tutor.auth_user_id,
                tutorNombre: tutor.nombre || 'Hola',
                proveedorNombre: proveedor?.nombre || 'tu proveedor',
                servicioTitulo: servicio.titulo || 'tu servicio',
                mascotaNombre: mascota?.nombre || null,
                // Frase compacta "del ..." pre-armada en TZ Chile. Branch
                // por fecha_fin: V1 puntual (con hora) vs V2/V4a rango
                // (sin hora). Insertada en negrita dentro de la pregunta
                // del template para identificar la reserva.
                fechaServicioFormato: formatFechaServicioInline(c.fecha_preferida, c.fecha_fin),
            });

            if (elegibles.length >= BATCH_LIMIT) break;
        }

        if (dryRun) {
            return res.status(200).json({
                success: true,
                dryRun: true,
                elegibles: elegibles.length,
                sample: elegibles.slice(0, 5).map(e => ({
                    agendamientoId: e.agendamientoId,
                    tutor: e.tutorNombre,
                    proveedor: e.proveedorNombre,
                    servicio: e.servicioTitulo,
                    mascota: e.mascotaNombre,
                })),
            });
        }

        let sent = 0;
        const failures: Array<{ id: string; reason: string }> = [];

        for (const e of elegibles) {
            try {
                // 1) Buscar email del tutor via auth admin.
                const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(e.tutorAuthId);
                if (!authUser?.user?.email) {
                    failures.push({ id: e.agendamientoId, reason: 'no_email' });
                    continue;
                }

                // 2) Deep link a la ficha del servicio con contexto del agendamiento.
                const reviewUrl = `${siteUrl}/servicio/${e.servicioId}?resenar=${e.agendamientoId}`;

                // 3) Envio email (via Resend). El helper `resend.emails.send`
                //    hace redirect automatico a AUDIT_INBOX en staging (ver
                //    lib/resend.ts).
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                    to: authUser.user.email,
                    subject: `¿Cómo te fue con ${e.proveedorNombre}? Cuéntanos tu experiencia`,
                    react: InvitacionResenaEmail({
                        tutorNombre: e.tutorNombre,
                        proveedorNombre: e.proveedorNombre,
                        servicioTitulo: e.servicioTitulo,
                        mascotaNombre: e.mascotaNombre,
                        reviewUrl,
                        fechaServicioFormato: e.fechaServicioFormato,
                    }) as React.ReactElement,
                });

                // 4) Notificacion in-app (INSERT directo con service role —
                //    bypass RLS + bypass el endpoint /api/notifications/create
                //    que exige session del caller).
                //    type 'info' es seguro con el CHECK original de la tabla.
                await supabaseAdmin.from('notifications').insert({
                    user_id: e.tutorAuthId,
                    type: 'info',
                    title: `¿Cómo te fue con ${e.proveedorNombre}?`,
                    message: e.mascotaNombre
                        ? `Cuéntanos tu experiencia con el servicio para ${e.mascotaNombre}.`
                        : `Cuéntanos tu experiencia con "${e.servicioTitulo}".`,
                    link: `/servicio/${e.servicioId}?resenar=${e.agendamientoId}`,
                    metadata: { agendamiento_id: e.agendamientoId, servicio_id: e.servicioId },
                    read: false,
                    created_at: new Date().toISOString(),
                });

                // 5) Marca anti re-envio.
                await supabaseAdmin
                    .from('agendamientos')
                    .update({ invitacion_resena_enviada_at: new Date().toISOString() })
                    .eq('id', e.agendamientoId);

                sent++;
            } catch (err) {
                failures.push({
                    id: e.agendamientoId,
                    reason: err instanceof Error ? err.message : String(err),
                });
            }
        }

        return res.status(200).json({
            success: true,
            candidates: candidatos?.length ?? 0,
            eligible: elegibles.length,
            sent,
            failures,
        });
    } catch (err) {
        console.error('Error en cron invitacion-resenas:', err);
        return res.status(500).json({ error: 'Internal error', details: err instanceof Error ? err.message : err });
    }
}
