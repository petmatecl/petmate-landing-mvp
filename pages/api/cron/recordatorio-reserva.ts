// pages/api/cron/recordatorio-reserva.ts
// ----------------------------------------------------------------------------
// TREN RECORDATORIOS DE CITA — R3: cron único diario que envía recordatorio
// del "día anterior" a AMBOS destinatarios (tutor + proveedor) de cada
// reserva confirmada cuyo inicio cae mañana (calendario Chile).
//
// Requiere migration R1 (20260728_recordatorios_marcas.sql) — dos columnas
// marca `recordatorio_tutor_enviado_at` / `recordatorio_proveedor_enviado_at`
// timestamptz NULL en `agendamientos`. Idempotencia independiente por
// destinatario: fallo parcial de un envío no bloquea ni duplica al otro.
//
// SCHEDULE (R5, `vercel.json`): `0 22 * * *` — 22:00 UTC diario, cae 18:00
// CLT invierno / 19:00 CLST verano. Drift DST aceptado y documentado —
// mismo criterio que `invitacion-resenas.ts`.
//
// AUTH: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) o header
// `x-cron-secret` (invocaciones manuales). skipIfNonProd bloquea el
// entorno no-producción; `?bypassEnv=1` lo saltea (autenticado por
// secret, útil para smoke en staging).
//
// DRY-RUN: `?dryRun=1` reporta elegibles sin enviar ni marcar. Requiere
// secret.
//
// 3 FAMILIAS DE RESERVAS CONFIRMADAS (semáforos canónicos de F2-3-B):
//   F2 estadía: capacidad_snapshot_estadia IS NOT NULL — recordatorio SOLO
//     de check-in (D3 del brief).
//   F1 picker:  duracion_min IS NOT NULL AND capacidad_snapshot_estadia IS NULL
//   legacy:     ambos semáforos NULL (V1/V2/V4a/V4b request-based)
//
// PIPELINE:
//   1. SELECT amplio: confirmadas, alguna marca NULL, fecha_preferida en
//      [now+12h, now+36h].
//   2. Refino JS por elegible:
//      - familia por semáforos.
//      - fin efectivo pasado → descarte.
//      - inicio NO cae mañana calendario Chile → descarte.
//      - resolver emails desde auth.users.
//      - copy de fecha según familia (formatBloqueHorario F1/V4b,
//        formatRangoNoches F2/V2/V4a, formatFechaPreferida V1).
//      - copy de cancelación server-side por familia + ventana.
//   3. Envío en sub-batches de 5 con `Promise.allSettled` — DESDE EL DÍA 1
//      (evita heredar la deuda del finding 58 de invitacion-resenas).
//   4. Marca por destinatario UPDATE solo tras éxito de SU envío.
//   5. failures[] en response.
//
// R4 (template `RecordatorioReservaEmail`) todavía no está — el envío usa
// un HTML inline placeholder claramente marcado. Cuando R4 se entregue,
// se reemplaza el `resend.emails.send({ html })` por `{ react: ... }`.
// El resto de la orquestación queda intacta.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { skipIfNonProd } from '../../../lib/cronGuard';
import { formatBloqueHorario, formatRangoNoches, formatFechaPreferida, ymdChile } from '../../../lib/formatFecha';

const BATCH_LIMIT = 30;
const SUB_BATCH = 5;
const VENTANA_MIN_HORAS = 12;
const VENTANA_MAX_HORAS = 36;

type Familia = 'F1' | 'F2' | 'legacy';
type Destinatario = 'tutor' | 'proveedor';

type Persona = { authId: string; nombre: string; email: string };

type Elegible = {
    agendamientoId: string;
    servicioId: string;
    servicioTitulo: string;
    familia: Familia;
    fechaInicioIso: string;
    fechaLegible: string;
    tutor: Persona;
    proveedor: Persona;
    dentroVentana: boolean;
    cancelacionMinHoras: number;
    necesitaTutor: boolean;
    necesitaProveedor: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth por secret (Vercel Cron manda Bearer; header alternativo para
    // smoke manual). Alineado con `invitacion-resenas.ts`.
    const authHeader = req.headers.authorization;
    const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const bypassEnv = req.query.bypassEnv === '1';
    if (!bypassEnv && skipIfNonProd(req, res)) return;

    const dryRun = req.query.dryRun === '1';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Missing config' });
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pawnecta.com';

    try {
        const nowMs = Date.now();
        const ventanaMinIso = new Date(nowMs + VENTANA_MIN_HORAS * 3_600_000).toISOString();
        const ventanaMaxIso = new Date(nowMs + VENTANA_MAX_HORAS * 3_600_000).toISOString();

        // SELECT amplio. Filtros:
        //   - confirmada
        //   - alguna marca NULL (else no hay nada para enviar)
        //   - fecha_preferida en la ventana [now+12h, now+36h]. La ventana
        //     amplia (12→36) da margen para que el filtro grueso capture
        //     todas las reservas de "mañana Chile" independiente del huso
        //     UTC de la reserva; el refino JS confirma con el día calendario.
        const { data: candidatos, error: candError } = await supabaseAdmin
            .from('agendamientos')
            .select(`
                id, servicio_id, fecha_preferida, fecha_fin, duracion_min,
                duracion_horas, capacidad_snapshot_estadia,
                recordatorio_tutor_enviado_at, recordatorio_proveedor_enviado_at,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, nombre, auth_user_id),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, nombre, auth_user_id),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo, cancelacion_min_horas_antes)
            `)
            .eq('estado', 'confirmada')
            .gte('fecha_preferida', ventanaMinIso)
            .lte('fecha_preferida', ventanaMaxIso)
            .or('recordatorio_tutor_enviado_at.is.null,recordatorio_proveedor_enviado_at.is.null')
            .order('fecha_preferida', { ascending: true })
            .limit(BATCH_LIMIT * 2);

        if (candError) throw candError;

        const tomorrowYmdChile = ymdChile(new Date(nowMs + 24 * 3_600_000));
        const elegibles: Elegible[] = [];

        for (const c of (candidatos || []) as any[]) {
            const tutor = Array.isArray(c.tutor) ? c.tutor[0] : c.tutor;
            const proveedor = Array.isArray(c.proveedor) ? c.proveedor[0] : c.proveedor;
            const servicio = Array.isArray(c.servicio) ? c.servicio[0] : c.servicio;

            if (!tutor?.auth_user_id || !proveedor?.auth_user_id || !servicio?.id) continue;
            if (!c.fecha_preferida) continue;

            // Familia por semáforos canónicos (F2-3-B). F2 tiene precedencia.
            const familia: Familia = c.capacidad_snapshot_estadia != null
                ? 'F2'
                : (c.duracion_min != null ? 'F1' : 'legacy');

            // Fin efectivo por familia. Descartar si ya pasó (evitamos
            // recordatorio para servicios en curso o terminados; sale del
            // set del cron).
            let finEfectivoMs: number;
            if (familia === 'F2') {
                if (!c.fecha_fin) continue; // F2 exige fecha_fin — dato malformado si falta
                finEfectivoMs = new Date(c.fecha_fin).getTime();
            } else if (familia === 'F1') {
                finEfectivoMs = new Date(c.fecha_preferida).getTime() + (c.duracion_min || 0) * 60_000;
            } else {
                // Legacy: V2/V4a tiene fecha_fin, V4b tiene duracion_horas, V1
                // es puntual (sin duración). Usa el mejor dato disponible.
                if (c.fecha_fin) {
                    finEfectivoMs = new Date(c.fecha_fin).getTime();
                } else if (c.duracion_horas) {
                    finEfectivoMs = new Date(c.fecha_preferida).getTime() + c.duracion_horas * 3_600_000;
                } else {
                    finEfectivoMs = new Date(c.fecha_preferida).getTime();
                }
            }
            if (finEfectivoMs <= nowMs) continue;

            // Confirmar que el INICIO cae en el día calendario Chile "mañana".
            // Ejemplo (invierno CLT UTC-4): si hoy Chile es 28-07, mañana es
            // 29-07. Una reserva con fecha_preferida 2026-07-30T02:00Z (=
            // 29-07 22:00 Chile) matchea. Sin este check, la ventana
            // [now+12h, now+36h] podría dar recordatorios para reservas de
            // "pasado mañana" cerca del borde superior.
            const inicioYmdChile = ymdChile(new Date(c.fecha_preferida));
            if (inicioYmdChile !== tomorrowYmdChile) continue;

            // Copy de fecha según familia. F2 usa rango de noches; F1/V4b
            // usan bloque horario nuevo (formatBloqueHorario del R2); V2/V4a
            // legacy multi-día usa rango de noches; V1 puntual usa formato
            // largo con hora.
            let fechaLegible: string;
            if (familia === 'F2') {
                fechaLegible = formatRangoNoches(c.fecha_preferida, c.fecha_fin);
            } else if (familia === 'F1') {
                fechaLegible = formatBloqueHorario(c.fecha_preferida, c.duracion_min);
            } else if (c.duracion_horas) {
                fechaLegible = formatBloqueHorario(c.fecha_preferida, c.duracion_horas * 60);
            } else if (c.fecha_fin) {
                fechaLegible = formatRangoNoches(c.fecha_preferida, c.fecha_fin);
            } else {
                fechaLegible = formatFechaPreferida(c.fecha_preferida);
            }

            // Ventana de cancelación server-side. F2 tiene enforcement (RLS
            // + endpoint /api/agendamientos/cancelar). F1/legacy no lo tiene
            // — se trata como "sin ventana" con copy neutro universal.
            const cancelacionMinHoras = servicio.cancelacion_min_horas_antes ?? 48;
            const horasHastaCheckIn = (new Date(c.fecha_preferida).getTime() - nowMs) / 3_600_000;
            const dentroVentana = familia === 'F2'
                ? horasHastaCheckIn >= cancelacionMinHoras
                : true;

            // Emails via auth admin (Promise.all — el par es independiente).
            const [tutorAuth, proveedorAuth] = await Promise.all([
                supabaseAdmin.auth.admin.getUserById(tutor.auth_user_id),
                supabaseAdmin.auth.admin.getUserById(proveedor.auth_user_id),
            ]);

            elegibles.push({
                agendamientoId: c.id,
                servicioId: servicio.id,
                servicioTitulo: servicio.titulo || 'tu servicio',
                familia,
                fechaInicioIso: c.fecha_preferida,
                fechaLegible,
                tutor: {
                    authId: tutor.auth_user_id,
                    nombre: tutor.nombre || 'Hola',
                    email: tutorAuth.data?.user?.email || '',
                },
                proveedor: {
                    authId: proveedor.auth_user_id,
                    nombre: proveedor.nombre || 'el proveedor',
                    email: proveedorAuth.data?.user?.email || '',
                },
                dentroVentana,
                cancelacionMinHoras,
                necesitaTutor: c.recordatorio_tutor_enviado_at == null,
                necesitaProveedor: c.recordatorio_proveedor_enviado_at == null,
            });

            if (elegibles.length >= BATCH_LIMIT) break;
        }

        if (dryRun) {
            return res.status(200).json({
                success: true,
                dryRun: true,
                now: new Date(nowMs).toISOString(),
                tomorrowChile: tomorrowYmdChile,
                candidates: candidatos?.length ?? 0,
                elegibles: elegibles.length,
                sample: elegibles.slice(0, 10).map(e => ({
                    agendamientoId: e.agendamientoId,
                    familia: e.familia,
                    fechaLegible: e.fechaLegible,
                    dentroVentana: e.dentroVentana,
                    envios: {
                        tutor: { necesita: e.necesitaTutor, tieneEmail: !!e.tutor.email },
                        proveedor: { necesita: e.necesitaProveedor, tieneEmail: !!e.proveedor.email },
                    },
                })),
            });
        }

        // Envío en sub-batches de 5 con Promise.allSettled. Cada task es
        // (envío + marca) de UN destinatario de UNA reserva — atomicidad
        // por destinatario, marca solo tras éxito de su envío.
        let sentTutor = 0;
        let sentProveedor = 0;
        const failures: Array<{ agendamientoId: string; destinatario: Destinatario; reason: string }> = [];

        for (let i = 0; i < elegibles.length; i += SUB_BATCH) {
            const slice = elegibles.slice(i, i + SUB_BATCH);
            const tasks: Array<Promise<void>> = [];

            for (const e of slice) {
                if (e.necesitaTutor && e.tutor.email) {
                    tasks.push((async () => {
                        try {
                            await enviarRecordatorio(e, 'tutor', supabaseAdmin);
                            await supabaseAdmin
                                .from('agendamientos')
                                .update({ recordatorio_tutor_enviado_at: new Date().toISOString() })
                                .eq('id', e.agendamientoId);
                            sentTutor++;
                        } catch (err) {
                            failures.push({
                                agendamientoId: e.agendamientoId,
                                destinatario: 'tutor',
                                reason: err instanceof Error ? err.message : String(err),
                            });
                        }
                    })());
                }
                if (e.necesitaProveedor && e.proveedor.email) {
                    tasks.push((async () => {
                        try {
                            await enviarRecordatorio(e, 'proveedor', supabaseAdmin);
                            await supabaseAdmin
                                .from('agendamientos')
                                .update({ recordatorio_proveedor_enviado_at: new Date().toISOString() })
                                .eq('id', e.agendamientoId);
                            sentProveedor++;
                        } catch (err) {
                            failures.push({
                                agendamientoId: e.agendamientoId,
                                destinatario: 'proveedor',
                                reason: err instanceof Error ? err.message : String(err),
                            });
                        }
                    })());
                }
            }

            // allSettled: nunca rechaza el batch; cada task guarda su propio
            // éxito o failure. Bounded parallelism = SUB_BATCH tasks.
            await Promise.allSettled(tasks);
        }

        return res.status(200).json({
            success: true,
            now: new Date(nowMs).toISOString(),
            candidates: candidatos?.length ?? 0,
            eligible: elegibles.length,
            sent: { tutor: sentTutor, proveedor: sentProveedor },
            failures,
        });
    } catch (err) {
        console.error('Error en cron recordatorio-reserva:', err);
        return res.status(500).json({ error: 'Internal error' });
    }
}

// ----------------------------------------------------------------------------
// enviarRecordatorio — envía email (via Resend, redirect a AUDIT_INBOX en
// staging por wrapper de lib/resend.ts) + INSERT notification in-app.
//
// R4 va a reemplazar el `html:` placeholder con `react: RecordatorioReservaEmail(...)`.
// El resto del handler queda intacto.
// ----------------------------------------------------------------------------
async function enviarRecordatorio(
    e: Elegible,
    destinatario: Destinatario,
    supabaseAdmin: SupabaseClient,
): Promise<void> {
    const esTutor = destinatario === 'tutor';
    const to = esTutor ? e.tutor.email : e.proveedor.email;
    const nombre = esTutor ? e.tutor.nombre : e.proveedor.nombre;
    const otro = esTutor ? e.proveedor.nombre : e.tutor.nombre;
    const link = esTutor ? '/mis-solicitudes' : '/proveedor?tab=solicitudes';
    const subject = esTutor
        ? `Mañana: tu reserva con ${otro}`
        : `Mañana: reserva de ${otro}`;

    // Copy de cancelación server-side según familia + ventana.
    //   F2 fuera de ventana: mensaje que dirige al chat.
    //   F2 dentro de ventana + F1/legacy: copy universal a "Mis reservas".
    // Solo aplica al tutor (el proveedor no cancela desde el email — tiene
    // su panel).
    const copyCancelacion = esTutor
        ? (e.familia === 'F2' && !e.dentroVentana
            ? `Contacta a ${e.proveedor.nombre} por chat para coordinar cambios (ya no puedes cancelar desde Mis reservas).`
            : `Si necesitas cancelar, hazlo desde Mis reservas.`)
        : '';

    // R4 hook: reemplazar `html:` por `react: RecordatorioReservaEmail({...})`.
    // Placeholder inline para R3 — cubre el flujo end-to-end (email real
    // sale) mientras el template React está pendiente.
    const htmlPlaceholder = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px;color:#0f172a;">
<p>Hola ${escapeHtml(nombre)},</p>
<p>Te recordamos que <strong>mañana</strong> tienes una reserva:</p>
<p><strong>${escapeHtml(e.servicioTitulo)}</strong></p>
<p>${escapeHtml(e.fechaLegible)}</p>
${copyCancelacion ? `<p style="color:#334155;">${escapeHtml(copyCancelacion)}</p>` : ''}
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
<p style="color:#64748b;font-size:13px;">Pawnecta · El lugar seguro para el cuidado de mascotas.</p>
<p style="color:#94a3b8;font-size:11px;">[R3 placeholder — R4 va a reemplazar este HTML con el template React].</p>
</body></html>`;

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to,
        subject,
        html: htmlPlaceholder,
    });

    // Notificación in-app (INSERT directo con service_role — mismo patrón
    // que invitacion-resenas:210-221). Bypass RLS + bypass del endpoint
    // /api/notifications/create.
    await supabaseAdmin.from('notifications').insert({
        user_id: esTutor ? e.tutor.authId : e.proveedor.authId,
        type: 'info',
        title: subject,
        message: `${e.servicioTitulo} — ${e.fechaLegible}`,
        link,
        metadata: {
            agendamiento_id: e.agendamientoId,
            servicio_id: e.servicioId,
            tipo: 'recordatorio_dia_anterior',
            destinatario,
            familia: e.familia,
        },
        read: false,
        created_at: new Date().toISOString(),
    });
}

// Escape HTML mínimo para interpolación segura en el placeholder. R4 con
// React auto-escapa y esta función queda para uso local en este archivo
// hasta que el placeholder desaparezca.
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
