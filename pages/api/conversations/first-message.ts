// Sprint CHAT-LAZY-CREATE (2026-11-23) — endpoint atómico INSERT conversation
// + INSERT first message en una sola transacción server-side.
//
// Motivación: hoy `ServiceDetailView.handleChatClick` hacía INSERT conv al
// click de "Contactar" + redirect a /mensajes?id=<nuevaConv>. Si el user
// cerraba la tab sin enviar nada, la fila quedaba huérfana (0 mensajes).
// Verificación empírica prod 2026-11-19: 4 huérfanas del PO en conv table.
//
// Diseño:
//   - verifySession (Bearer token del cliente) → caller userId.
//   - Validar: proveedorAuthId distinto de caller + content 1-1000 chars +
//     content después de trim no vacío.
//   - Lookup conv existente (constraint UNIQUE (client_id, sitter_id) ya
//     enforce 1 conv por par). Si existe → reusa, INSERT message, return.
//   - Si no existe: rate limit 10 convs/24h → lookup agendamiento vínculo
//     (si tutor-proveedor-servicio match, se copia para chip mascota) →
//     INSERT conv + INSERT message en secuencia rápida (no es transacción
//     SQL real pero el gap es mínimo; en caso de crash entre ambos, el
//     próximo retry reusa la conv existente).
//   - Rate limit queries 10 convs/24h vive acá, no en el cliente — mover
//     a server defensa contra bypass por DevTools.
//
// Response:
//   - 200 { conversationId, messageId, reused: boolean }
//   - 400 payload inválido
//   - 401 sin sesión
//   - 403 trying to chat con mismo user
//   - 429 rate limit excedido
//   - 500 error server
//
// Patrón id-only: payload es { proveedorAuthId, content, servicioId? }.
// Server resuelve nombres/emails/etc. desde BD.

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';
import { verifySession, maskUid } from '../../../lib/apiAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CONV_LIMIT = Number(process.env.NEXT_PUBLIC_CONV_DAILY_LIMIT ?? 10);
const MAX_CONTENT_LEN = 1000;

type OkResponse = {
    conversationId: string;
    messageId: string;
    reused: boolean;
};

type ErrorResponse = { error: string; reason?: string };

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<OkResponse | ErrorResponse>,
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const callerId = await verifySession(req);
    if (!callerId) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    const { proveedorAuthId, content, servicioId } = req.body ?? {};

    // Validaciones de payload
    if (typeof proveedorAuthId !== 'string' || proveedorAuthId.length < 10) {
        return res.status(400).json({ error: 'proveedorAuthId requerido' });
    }
    if (typeof content !== 'string') {
        return res.status(400).json({ error: 'content requerido' });
    }
    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CONTENT_LEN) {
        return res.status(400).json({ error: `content debe tener entre 1 y ${MAX_CONTENT_LEN} chars` });
    }
    if (proveedorAuthId === callerId) {
        return res.status(403).json({ error: 'No podés iniciar una conversación contigo mismo' });
    }
    if (servicioId != null && typeof servicioId !== 'string') {
        return res.status(400).json({ error: 'servicioId inválido' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Lookup conv existente por el constraint UNIQUE (client_id, sitter_id).
        const { data: existing, error: lookupErr } = await supabase
            .from('conversations')
            .select('id')
            .eq('client_id', callerId)
            .eq('sitter_id', proveedorAuthId)
            .maybeSingle();

        if (lookupErr) {
            Sentry.captureException(lookupErr, {
                tags: { subsystem: 'chat_first_message_lookup' },
                contexts: { payload: { caller: maskUid(callerId), target: maskUid(proveedorAuthId) } },
            });
            return res.status(500).json({ error: 'Error de servidor al buscar conversación' });
        }

        let conversationId: string;
        let reused = false;

        if (existing?.id) {
            conversationId = existing.id;
            reused = true;
        } else {
            // 2. Rate limit 10 convs/24h antes de crear nueva.
            const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count, error: countErr } = await supabase
                .from('conversations')
                .select('id', { count: 'exact', head: true })
                .eq('client_id', callerId)
                .gte('created_at', since24h);

            if (countErr) {
                Sentry.captureException(countErr, {
                    tags: { subsystem: 'chat_first_message_rate_limit' },
                });
                return res.status(500).json({ error: 'Error de servidor al validar rate limit' });
            }

            if ((count ?? 0) >= CONV_LIMIT) {
                return res.status(429).json({
                    error: 'Has iniciado muchas conversaciones hoy. Intenta de nuevo mañana.',
                    reason: 'conv_daily_limit',
                });
            }

            // 3. Lookup agendamiento vínculo (si tutor-proveedor-servicio match).
            //    Fire-and-forget conceptual: si falla, agendamiento_id queda null
            //    y el flow sigue. Cubre el caso "tutor solicitó primero, abre
            //    chat después" → el chip de mascota aparece desde el primer
            //    mensaje sin esperar más interacción.
            let vinculoAgendamientoId: string | null = null;
            if (servicioId) {
                // agendamientos.tutor_id referencia usuarios_buscadores.id, no auth.users.id.
                const { data: buscador } = await supabase
                    .from('usuarios_buscadores')
                    .select('id')
                    .eq('auth_user_id', callerId)
                    .maybeSingle();

                if (buscador?.id) {
                    // Resolver proveedor.id desde auth_user_id para el join.
                    const { data: prov } = await supabase
                        .from('proveedores')
                        .select('id')
                        .eq('auth_user_id', proveedorAuthId)
                        .maybeSingle();

                    if (prov?.id) {
                        const { data: recent } = await supabase
                            .from('agendamientos')
                            .select('id')
                            .eq('tutor_id', buscador.id)
                            .eq('proveedor_id', prov.id)
                            .eq('servicio_id', servicioId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        vinculoAgendamientoId = recent?.id ?? null;
                    }
                }
            }

            // 4. INSERT conversation.
            const { data: newConv, error: insertErr } = await supabase
                .from('conversations')
                .insert({
                    client_id: callerId,
                    sitter_id: proveedorAuthId,
                    servicio_id: servicioId ?? null,
                    proveedor_auth_id: proveedorAuthId,
                    agendamiento_id: vinculoAgendamientoId,
                })
                .select('id')
                .single();

            if (insertErr || !newConv?.id) {
                // Caso UNIQUE violation (race: otro tab del mismo user creó la
                // conv entre el lookup y el insert): retry el lookup.
                if (insertErr?.code === '23505') {
                    const { data: retry } = await supabase
                        .from('conversations')
                        .select('id')
                        .eq('client_id', callerId)
                        .eq('sitter_id', proveedorAuthId)
                        .maybeSingle();
                    if (retry?.id) {
                        conversationId = retry.id;
                        reused = true;
                    } else {
                        Sentry.captureException(insertErr, {
                            tags: { subsystem: 'chat_first_message_insert_conv_race' },
                        });
                        return res.status(500).json({ error: 'Error de servidor al crear conversación' });
                    }
                } else {
                    Sentry.captureException(insertErr, {
                        tags: { subsystem: 'chat_first_message_insert_conv' },
                    });
                    return res.status(500).json({ error: 'Error de servidor al crear conversación' });
                }
            } else {
                conversationId = newConv.id;
            }
        }

        // 5. INSERT first message.
        const { data: newMsg, error: msgErr } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: callerId,
                content: trimmed,
            })
            .select('id')
            .single();

        if (msgErr || !newMsg?.id) {
            Sentry.captureException(msgErr, {
                tags: { subsystem: 'chat_first_message_insert_msg' },
                contexts: { payload: { conversationId, caller: maskUid(callerId) } },
            });
            return res.status(500).json({ error: 'Error de servidor al enviar mensaje' });
        }

        return res.status(200).json({
            conversationId,
            messageId: newMsg.id,
            reused,
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { subsystem: 'chat_first_message_unhandled' },
        });
        return res.status(500).json({ error: 'Error inesperado' });
    }
}
