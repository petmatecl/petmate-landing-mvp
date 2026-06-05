import type { NextApiRequest, NextApiResponse } from "next";
import { resend } from '../../../lib/resend';
import { createClient } from "@supabase/supabase-js";
import { emailLimiter } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/sanitize';
import { newMessageSchema } from '../../../lib/validations';
import { verifySession } from '../../../lib/apiAuth';
import { getParticipantProfile } from '../../../lib/profileUtils';

/**
 * Notifica por email al recipient de un nuevo mensaje de chat. Disparado
 * desde components/Chat/MessageThread tras el INSERT en `messages`.
 *
 * Sweep 1bc1897: migrado de verifyInternalSecret (403 silenciado en
 * browser) a verifySession + ownership check (caller === message.sender).
 * Patron id-only — server resuelve sender_name, recipient_email,
 * message_content y chat_url desde `messages` + `conversations` por
 * messageId. Defensa contra payload manipulado: contenido del email no
 * es el que el cliente declare, sino el que esta efectivamente en BD.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();
    if (!emailLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsed = newMessageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
    const { messageId } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Resolver mensaje + conversacion.
        const { data: msg, error: msgErr } = await supabaseAdmin
            .from('messages')
            .select(`
                id, content, sender_id, conversation_id,
                conversations:conversation_id (id, client_id, sitter_id)
            `)
            .eq('id', messageId)
            .maybeSingle();

        if (msgErr || !msg) {
            console.error('[new-message] mensaje no encontrado:', msgErr);
            return res.status(404).json({ error: 'Mensaje no encontrado' });
        }

        // 2. Authz: caller debe ser el sender del mensaje.
        if (msg.sender_id !== userId) {
            console.warn('[new-message] caller no es el sender', {
                callerUserId: userId,
                senderUserId: msg.sender_id,
            });
            return res.status(403).json({ error: 'Forbidden' });
        }

        const conv = Array.isArray(msg.conversations) ? msg.conversations[0] : msg.conversations;
        if (!conv) {
            return res.status(404).json({ error: 'Conversación no encontrada' });
        }

        // 3. Determinar el recipient (el otro participante de la conv).
        const recipientAuthId = conv.client_id === userId ? conv.sitter_id : conv.client_id;
        if (!recipientAuthId) {
            return res.status(200).json({ skipped: true, reason: 'no_recipient' });
        }

        // 4. Email del recipient via auth.users.
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipientAuthId);
        const email = authUser?.user?.email;
        if (!email) return res.status(200).json({ skipped: true, reason: 'no_email' });

        // 5. Nombre del sender desde proveedores OR usuarios_buscadores.
        const senderProfile = await getParticipantProfile(userId);
        const senderName = senderProfile?.nombre || 'Un usuario';

        // 6. Preview del contenido (truncado server-side, no del payload).
        const content = msg.content || '';
        const messagePreview = content.substring(0, 80) + (content.length > 80 ? '...' : '');

        // 7. URL del chat — construida server-side desde el conv_id.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.pawnecta.com';
        const chatUrl = `${baseUrl}/mensajes?id=${conv.id}`;

        await resend.emails.send({
            from: "Pawnecta <notificaciones@pawnecta.com>",
            to: email,
            subject: `${escapeHtml(senderName)} te envió un mensaje`,
            html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                    <h2 style="color:#0f172a;margin-bottom:8px">Nuevo mensaje en Pawnecta</h2>
                    <p style="color:#475569">Tienes un nuevo mensaje de <strong>${escapeHtml(senderName)}</strong>.</p>
                    ${messagePreview ? `<blockquote style="border-left:3px solid #10b981;padding:8px 16px;color:#64748b;font-style:italic;margin:16px 0">${escapeHtml(messagePreview)}</blockquote>` : ''}
                    <a href="${escapeHtml(chatUrl)}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                        Ver mensaje
                    </a>
                    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Pawnecta · Chile</p>
                </div>
            `,
        });

        return res.status(200).json({ sent: true });
    } catch (error) {
        console.error('[new-message] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
