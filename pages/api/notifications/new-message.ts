import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { emailLimiter } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/sanitize';
import { newMessageSchema } from '../../../lib/validations';
import { verifyInternalSecret } from '../../../lib/apiAuth';

const resend = new Resend(process.env.RESEND_API_KEY!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();
    if (!verifyInternalSecret(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!emailLimiter(req, res)) return;

    const parsed = newMessageSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input" });
    }
    const { recipientAuthId, senderName, messagePreview, chatUrl } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(recipientAuthId);
    const email = authUser?.user?.email;
    if (!email) return res.status(200).json({ skipped: true });

    await resend.emails.send({
        from: "Pawnecta <notificaciones@pawnecta.com>",
        to: email,
        subject: `${escapeHtml(senderName)} te envió un mensaje`,
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
                <h2 style="color:#0f172a;margin-bottom:8px">Nuevo mensaje en Pawnecta</h2>
                <p style="color:#475569">Tienes un nuevo mensaje de <strong>${escapeHtml(senderName)}</strong>.</p>
                ${messagePreview ? `<blockquote style="border-left:3px solid #10b981;padding:8px 16px;color:#64748b;font-style:italic;margin:16px 0">${escapeHtml(messagePreview)}</blockquote>` : ''}
                <a href="${escapeHtml(chatUrl || '')}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                    Ver mensaje
                </a>
                <p style="color:#94a3b8;font-size:12px;margin-top:24px">Pawnecta · Chile</p>
            </div>
        `,
    });

    return res.status(200).json({ sent: true });
}
