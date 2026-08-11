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
// R4 (template `RecordatorioReservaEmail`) integrado — el envío usa
// `resend.emails.send({ react: RecordatorioReservaEmail({...}) })` con
// branching por props (destinatario × familia = 6 combinaciones desde
// UN template).
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import type React from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { skipIfNonProd } from '../../../lib/cronGuard';
import {
    formatRangoNoches, formatRangoNochesPartes, ymdChile,
    formatFechaSinHora, formatHoraCorta, formatBloqueHorarioSinFecha,
} from '../../../lib/formatFecha';
import { formatDireccionLinea } from '../../../lib/formatDireccion';
import { RecordatorioReservaEmail } from '../../../components/Emails/RecordatorioReservaEmail';

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
    // R4.1/R4.2 — layout de listado + banda de fecha protagonista. El
    // endpoint arma los strings finales según familia; el template solo
    // pinta.
    fechaLinea: string;              // "Viernes 31 de julio" (F1/V1/V4b) / "Del ... al ..." (F2/V2/V4a — sin '(N noches)')
    fechaSub: string | null;         // "2 noches" (F2/V2/V4a) / null (F1/V1/V4b)
    horaLinea: string | null;        // "de 14:00 a 15:00 · 1 hora" (F1/V4b) / "15:00" (V1) / null (F2/V2/V4a)
    donde: string;                   // dirección estructurada / "En {comuna}" / fallback chat
    tutor: Persona;
    proveedor: Persona;
    dentroVentana: boolean;
    cancelacionMinHoras: number;
    necesitaTutor: boolean;
    necesitaProveedor: boolean;
    // F2 renderiza check-in/out en el listado; F1/legacy los ignora.
    checkInHora: string | null;
    checkOutHora: string | null;
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
                modalidad_elegida,
                direccion_servicio, region, comuna, calle, numero, direccion_info,
                recordatorio_tutor_enviado_at, recordatorio_proveedor_enviado_at,
                tutor:usuarios_buscadores!agendamientos_tutor_id_fkey(id, nombre, auth_user_id),
                proveedor:proveedores!agendamientos_proveedor_id_fkey(id, nombre, auth_user_id),
                servicio:servicios_publicados!agendamientos_servicio_id_fkey(id, titulo, cancelacion_min_horas_antes, check_in_hora, check_out_hora, comunas_cobertura)
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

            // Layout R4.1/R4.2 — banda de fecha protagonista + listado.
            // Para rango de noches (F2/V2/V4a) partimos fechaLinea en
            // principal + sub para que la banda muestre "Del ... al ..."
            // grande y "(N noches)" chico debajo. Para puntuales
            // (F1/V1/V4b) sub es null.
            let fechaLinea: string;
            let fechaSub: string | null;
            let horaLinea: string | null;
            if (familia === 'F2') {
                const partes = formatRangoNochesPartes(c.fecha_preferida, c.fecha_fin);
                fechaLinea = partes.principal;
                fechaSub = partes.sub || null;
                horaLinea = null;   // F2 usa bloque check-in/out en el template
            } else if (familia === 'F1') {
                fechaLinea = formatFechaSinHora(c.fecha_preferida);
                fechaSub = null;
                horaLinea = formatBloqueHorarioSinFecha(c.fecha_preferida, c.duracion_min);
            } else if (c.duracion_horas) {
                // legacy V4b: por horas puntual
                fechaLinea = formatFechaSinHora(c.fecha_preferida);
                fechaSub = null;
                horaLinea = formatBloqueHorarioSinFecha(c.fecha_preferida, c.duracion_horas * 60);
            } else if (c.fecha_fin) {
                // legacy V2/V4a: rango de noches sin picker F2
                const partes = formatRangoNochesPartes(c.fecha_preferida, c.fecha_fin);
                fechaLinea = partes.principal;
                fechaSub = partes.sub || null;
                horaLinea = null;
            } else {
                // legacy V1: puntual con hora, sin duración
                fechaLinea = formatFechaSinHora(c.fecha_preferida);
                fechaSub = null;
                horaLinea = formatHoraCorta(c.fecha_preferida);
            }

            // Cascada del bloque "Dónde":
            //   1. formatDireccionLinea (estructurada Ola 1 o direccion_servicio
            //      legacy) — solo se puebla cuando modalidad_elegida='casa_tutor',
            //      pero el helper hace fallback graceful. Crítico para
            //      variante proveedor con servicio a domicilio.
            //   2. Primera comuna de servicio.comunas_cobertura → "En {comuna}"
            //      (F1/F2 sin dirección: paseos/hospedaje en recinto del proveedor).
            //   3. Fallback: "Se coordina por chat con {nombre}" (el otro se
            //      resuelve por destinatario — al enviar).
            // El "nombreOtro" del fallback se resuelve en enviarRecordatorio()
            // porque depende del destinatario. Acá emitimos un placeholder
            // `__CHAT_CON_OTRO__` que enviarRecordatorio reemplaza.
            const direccion = formatDireccionLinea({
                region: c.region,
                comuna: c.comuna,
                calle: c.calle,
                numero: c.numero,
                direccion_info: c.direccion_info,
                direccion_servicio: c.direccion_servicio,
            });
            const comunasCobertura: string[] = Array.isArray(servicio.comunas_cobertura)
                ? servicio.comunas_cobertura
                : [];
            let donde: string;
            if (direccion) {
                donde = direccion;
            } else if (comunasCobertura.length > 0) {
                donde = `En ${comunasCobertura[0]}`;
            } else {
                donde = '__CHAT_CON_OTRO__';
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

            // check_in_hora/check_out_hora vienen del servicio como 'HH:MM:SS'
            // (Postgres time). El template los quiere en 'HH:MM' — el .slice(0,5)
            // es el patrón espejo de notify-proveedor.ts:141-145 en F2-3-B.
            const checkInHora = servicio.check_in_hora
                ? String(servicio.check_in_hora).slice(0, 5)
                : null;
            const checkOutHora = servicio.check_out_hora
                ? String(servicio.check_out_hora).slice(0, 5)
                : null;

            elegibles.push({
                agendamientoId: c.id,
                servicioId: servicio.id,
                servicioTitulo: servicio.titulo || 'tu servicio',
                familia,
                fechaInicioIso: c.fecha_preferida,
                fechaLinea,
                fechaSub,
                horaLinea,
                donde,
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
                checkInHora,
                checkOutHora,
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
                    fechaLinea: e.fechaLinea,
                    fechaSub: e.fechaSub,
                    horaLinea: e.horaLinea,
                    donde: e.donde,       // '__CHAT_CON_OTRO__' si fallback (se reemplaza al enviar)
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

        // Sweep #1 fix B5 (2026-08-07) — CLAIM-THEN-SEND (prevención medida, no
        // solo detección). Auditoría #2 finding B5: la instrumentación previa
        // (ZB4-b) hacía UPDATE conditional NULL DESPUÉS de que enviarRecordatorio
        // ya había mandado el email — logeaba el race pero NO prevenía la
        // duplicación en concurrent runs (retry Vercel, manual + scheduled,
        // cold-start). Fix: invertir el orden — CLAIM primero (UPDATE conditional
        // con RETURNING id ANTES del send); solo si claim gana (1 row updated) →
        // enviarRecordatorio. Si claim pierde (0 rows → otro run ya lo hizo) →
        // NO enviar, contar como claim perdido. En caso de fallo del send tras
        // claim ganado, ROLLBACK: setear la marca a NULL para que el próximo
        // run reintente (no perder el intento por fallo transitorio).
        //
        // Rename semántico: `drift*` → `claimsPerdidos*` (métrica clara de
        // duplicates prevenidos por el claim, no de discrepancia post-hoc).
        let claimsPerdidosTutor = 0;
        let claimsPerdidosProveedor = 0;

        // Arrow-function bindings (function declarations dentro de bloques
        // rechazadas por TS en strict mode). reclamarEnvio: intenta ganar
        // el slot de envío para un destinatario específico. Retorna true
        // si el claim ganó (row updated, marca poblada), false si perdió.
        const reclamarEnvio = async (
            agendamientoId: string,
            markColumn: 'recordatorio_tutor_enviado_at' | 'recordatorio_proveedor_enviado_at',
        ): Promise<boolean> => {
            const { data, error } = await supabaseAdmin
                .from('agendamientos')
                .update({ [markColumn]: new Date().toISOString() })
                .eq('id', agendamientoId)
                .is(markColumn, null)
                .select('id');
            if (error) throw error;
            return Array.isArray(data) && data.length > 0;
        };

        // Rollback del claim: setear la marca a NULL para que el próximo run
        // reintente. Usado cuando el send falla POST-claim (Resend down,
        // network error, etc).
        const rollbackClaim = async (
            agendamientoId: string,
            markColumn: 'recordatorio_tutor_enviado_at' | 'recordatorio_proveedor_enviado_at',
        ): Promise<void> => {
            const { error } = await supabaseAdmin
                .from('agendamientos')
                .update({ [markColumn]: null })
                .eq('id', agendamientoId);
            if (error) {
                console.error('[cron] rollback claim falló', {
                    agendamientoId, markColumn, error: error.message,
                });
            }
        };

        for (let i = 0; i < elegibles.length; i += SUB_BATCH) {
            const slice = elegibles.slice(i, i + SUB_BATCH);
            const tasks: Array<Promise<void>> = [];

            for (const e of slice) {
                if (e.necesitaTutor && e.tutor.email) {
                    tasks.push((async () => {
                        // CLAIM primero.
                        let claimGanado = false;
                        try {
                            claimGanado = await reclamarEnvio(e.agendamientoId, 'recordatorio_tutor_enviado_at');
                        } catch (err) {
                            failures.push({
                                agendamientoId: e.agendamientoId,
                                destinatario: 'tutor',
                                reason: `claim tutor falló: ${err instanceof Error ? err.message : String(err)}`,
                            });
                            return;
                        }
                        if (!claimGanado) {
                            claimsPerdidosTutor++;
                            console.warn('[cron-claim-lost] tutor claim ya reclamado por otro run', {
                                agendamientoId: e.agendamientoId,
                                servicioId: e.servicioId,
                            });
                            return; // NO enviar — otro run ya lo hizo.
                        }
                        // Claim ganado → SEND. Si falla, rollback la marca.
                        try {
                            await enviarRecordatorio(e, 'tutor', supabaseAdmin, siteUrl);
                            sentTutor++;
                        } catch (err) {
                            await rollbackClaim(e.agendamientoId, 'recordatorio_tutor_enviado_at');
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
                        let claimGanado = false;
                        try {
                            claimGanado = await reclamarEnvio(e.agendamientoId, 'recordatorio_proveedor_enviado_at');
                        } catch (err) {
                            failures.push({
                                agendamientoId: e.agendamientoId,
                                destinatario: 'proveedor',
                                reason: `claim proveedor falló: ${err instanceof Error ? err.message : String(err)}`,
                            });
                            return;
                        }
                        if (!claimGanado) {
                            claimsPerdidosProveedor++;
                            console.warn('[cron-claim-lost] proveedor claim ya reclamado por otro run', {
                                agendamientoId: e.agendamientoId,
                                servicioId: e.servicioId,
                            });
                            return;
                        }
                        try {
                            await enviarRecordatorio(e, 'proveedor', supabaseAdmin, siteUrl);
                            sentProveedor++;
                        } catch (err) {
                            await rollbackClaim(e.agendamientoId, 'recordatorio_proveedor_enviado_at');
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

        // Summary log al fin del handler. Grepable por `[cron-drift-summary]`
        // en Vercel Logs para monitoreo. `claimsPerdidos*` mide races prevenidos
        // (duplicates que NO ocurrieron gracias al claim). `driftTutor` /
        // `driftProveedor` se mantienen como alias hacia atrás para no romper
        // dashboards existentes que ya lo grepean.
        console.log('[cron-drift-summary]', {
            candidatos: (candidatos || []).length,
            elegibles: elegibles.length,
            sentTutor,
            sentProveedor,
            claimsPerdidosTutor,
            claimsPerdidosProveedor,
            // Alias legacy para dashboards que ya grepean `drift*`. Ahora la
            // semántica es "duplicates prevenidos" (los sent NO ocurrieron para
            // estos), no "discrepancia post-hoc".
            driftTutor: claimsPerdidosTutor,
            driftProveedor: claimsPerdidosProveedor,
            failures: failures.length,
            timestamp: new Date().toISOString(),
        });

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
// enviarRecordatorio — envía email (via Resend con RecordatorioReservaEmail
// R4 — redirect a AUDIT_INBOX en staging por wrapper de lib/resend.ts) +
// INSERT notification in-app.
// ----------------------------------------------------------------------------
async function enviarRecordatorio(
    e: Elegible,
    destinatario: Destinatario,
    supabaseAdmin: SupabaseClient,
    siteUrl: string,
): Promise<void> {
    const esTutor = destinatario === 'tutor';
    const to = esTutor ? e.tutor.email : e.proveedor.email;
    const nombreDestinatario = esTutor ? e.tutor.nombre : e.proveedor.nombre;
    const nombreOtro = esTutor ? e.proveedor.nombre : e.tutor.nombre;
    const panelPath = esTutor ? '/mis-reservas' : '/proveedor?tab=solicitudes';
    const panelUrl = `${siteUrl}${panelPath}`;
    const subject = esTutor
        ? `Mañana: tu reserva con ${nombreOtro}`
        : `Mañana: reserva de ${nombreOtro}`;

    // Copy de cancelación server-side según familia + ventana.
    //   F2 fuera de ventana: mensaje que dirige al chat.
    //   F2 dentro de ventana + F1/legacy: copy universal a "Mis reservas".
    // Solo aplica al tutor (el proveedor no cancela desde el email — tiene
    // su panel). El template solo lo renderea si destinatario==='tutor' Y
    // el string no es vacío/null.
    const copyCancelacion = esTutor
        ? (e.familia === 'F2' && !e.dentroVentana
            ? `Contacta a ${e.proveedor.nombre} por chat para coordinar cambios (ya no puedes cancelar desde Mis reservas).`
            : `Si necesitas cancelar, hazlo desde Mis reservas.`)
        : null;

    // Resolver el placeholder del fallback "Dónde" con el nombre del OTRO
    // (depende del destinatario del email; se resuelve acá, no en el refino).
    const donde = e.donde === '__CHAT_CON_OTRO__'
        ? `Se coordina por chat con ${nombreOtro}`
        : e.donde;

    await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to,
        subject,
        react: RecordatorioReservaEmail({
            destinatario,
            familia: e.familia,
            nombreDestinatario,
            nombreOtro,
            servicioTitulo: e.servicioTitulo,
            fechaLinea: e.fechaLinea,
            fechaSub: e.fechaSub,
            horaLinea: e.horaLinea,
            checkInHora: e.checkInHora,
            checkOutHora: e.checkOutHora,
            donde,
            copyCancelacion,
            panelUrl,
        }) as React.ReactElement,
    });

    // Notificación in-app (INSERT directo con service_role — mismo patrón
    // que invitacion-resenas:210-221). Bypass RLS + bypass del endpoint
    // /api/notifications/create.
    await supabaseAdmin.from('notifications').insert({
        user_id: esTutor ? e.tutor.authId : e.proveedor.authId,
        type: 'info',
        title: subject,
        // Notif in-app compacta: "Servicio — Fecha [· Hora si aplica]".
        message: e.horaLinea
            ? `${e.servicioTitulo} — ${e.fechaLinea} · ${e.horaLinea}`
            : `${e.servicioTitulo} — ${e.fechaLinea}`,
        link: panelPath,
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
