import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { escapeHtml } from '../../../lib/sanitize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Secure with a shared secret
    // Vercel Cron sends Authorization: Bearer <secret>
    const authHeader = req.headers.authorization;
    const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Find conversations where the last message is from the client, sent >24h ago
        // and no recordatorio was sent in the last 24h
        const { data: conversations, error } = await supabaseAdmin
            .from('conversations')
            .select(`
                id,
                proveedor_auth_id,
                recordatorio_enviado_at,
                servicio_id,
                servicios_publicados!inner(titulo),
                messages(sender_id, created_at)
            `)
            .order('updated_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        let sent = 0;

        for (const conv of (conversations || [])) {
            const msgs: any[] = conv.messages || [];
            if (msgs.length === 0) continue;

            // Sort messages by created_at desc
            const sorted = [...msgs].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            const lastMsg = sorted[0];

            // Last message must be from client (not provider)
            if (lastMsg.sender_id === conv.proveedor_auth_id) continue;

            // Must be >24h ago
            if (new Date(lastMsg.created_at) > new Date(cutoff)) continue;

            // Don't re-send if we already sent a reminder in last 24h
            if (conv.recordatorio_enviado_at &&
                new Date(conv.recordatorio_enviado_at) > new Date(cutoff)) continue;

            // Get provider email
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(conv.proveedor_auth_id);
            if (!authUser?.user?.email) continue;

            const { data: proveedor } = await supabaseAdmin
                .from('proveedores')
                .select('nombre')
                .eq('auth_user_id', conv.proveedor_auth_id)
                .maybeSingle();

            const servicioTitulo = (conv.servicios_publicados as any)?.titulo || 'tu servicio';
            const chatUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pawnecta.com'}/mensajes?id=${conv.id}`;

            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: authUser.user.email,
                subject: 'Tienes una consulta sin responder en Pawnecta',
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b">
                        <h2 style="color:#1A6B4A">Hola, ${escapeHtml(proveedor?.nombre || 'Proveedor')}</h2>
                        <p>Tienes un mensaje pendiente de respuesta en tu servicio <strong>${escapeHtml(servicioTitulo)}</strong>.</p>
                        <p>Tu cliente lleva más de 24 horas esperando respuesta. Responder rápido aumenta tus probabilidades de conseguir la reserva.</p>
                        <a href="${chatUrl}" style="display:inline-block;background:#1A6B4A;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px">
                            Ver mensaje
                        </a>
                        <p style="margin-top:24px;font-size:12px;color:#94a3b8">Pawnecta · Conectando mascotas con cuidadores de confianza</p>
                    </div>
                `,
            });

            // Mark reminder sent
            await supabaseAdmin
                .from('conversations')
                .update({ recordatorio_enviado_at: new Date().toISOString() })
                .eq('id', conv.id);

            sent++;
        }

        return res.status(200).json({ success: true, sent });

    } catch (err) {
        console.error('Error en cron recordatorio-mensajes:', err);
        return res.status(500).json({ error: 'Internal error', details: err instanceof Error ? err.message : err });
    }
}
