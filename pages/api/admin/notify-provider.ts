import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../../lib/resend';
import { createClient } from '@supabase/supabase-js';
import { emailLimiter } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/sanitize';
import { notifyProviderSchema } from '../../../lib/validations';
import { verifySession, isAdmin } from '../../../lib/apiAuth';

/**
 * Notifica al proveedor del cambio de estado de su solicitud (aprobado /
 * rechazado). Disparado desde el panel de admin (ProveedorApprovalList o
 * pages/admin/proveedores).
 *
 * Sweep 1bc1897: migrado de verifyInternalSecret (que no era llamable
 * desde browser → 403 silenciado) a verifySession + isAdmin. Patron
 * id-only — cliente manda solo `proveedorId` + `estado` + `motivo?`,
 * server resuelve nombre + email desde BD.
 *
 * `motivo` viene del payload (no es inferible de BD — es texto libre que
 * el admin escribe en el momento del rechazo).
 *
 * Failure handling: el UPDATE en BD ya fue hecho por el cliente (estado
 * actualizado), el email es notificacion no transaccional. Errores de
 * envio → 200 con `skipped: true` para no romper el flow del admin.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!emailLimiter(req, res)) return;

    const userId = await verifySession(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Forbidden' });

    const parsed = notifyProviderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    const { proveedorId, estado, motivo } = parsed.data;

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Resolver nombre + auth_user_id del proveedor desde BD.
        const { data: prov, error: provErr } = await supabaseAdmin
            .from('proveedores')
            .select('auth_user_id, nombre')
            .eq('id', proveedorId)
            .maybeSingle();

        if (provErr || !prov) {
            console.error('[notify-provider] proveedor no encontrado:', provErr);
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // Email del proveedor desde auth.users.
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
        if (authErr || !authUser?.user?.email) {
            console.error('[notify-provider] email inaccesible:', authErr);
            return res.status(200).json({ skipped: true, reason: 'no_email' });
        }
        const email = authUser.user.email;
        const nombre = prov.nombre || 'Proveedor';

        let subject = '';
        let htmlBody = '';

        if (estado === 'aprobado') {
            subject = 'Pawnecta: ¡Tu cuenta ha sido aprobada!';
            htmlBody = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #059669; font-size: 24px; margin-bottom: 16px;">
                        ¡Felicitaciones, ${escapeHtml(nombre)}!
                    </h1>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Tu perfil de proveedor en Pawnecta ha sido <strong>aprobado</strong> por nuestro equipo de confianza. Ya estás oficialmente activo en la plataforma y listo para ofrecer tus servicios.
                    </p>
                    <a href="https://pawnecta.com/proveedor" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;">
                        Ir a mi Panel de Proveedor
                    </a>
                    <p style="font-size: 14px; color: #64748b;">
                        Saludos cordiales,<br/>El equipo de Pawnecta
                    </p>
                </div>
            `;
        } else {
            subject = 'Pawnecta: Actualización sobre tu solicitud';
            htmlBody = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #ea580c; font-size: 24px; margin-bottom: 16px;">
                        Hola, ${escapeHtml(nombre)}
                    </h1>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
                        Hemos revisado tu solicitud para ser proveedor en Pawnecta con mucha atención. Lamentablemente, en esta ocasión no podemos aprobar tu perfil.
                    </p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding: 16px; margin-bottom: 24px;">
                        <strong style="color: #475569;">Motivo del rechazo:</strong><br/>
                        <span style="color: #1e293b; font-size: 15px;">${motivo ? escapeHtml(motivo) : 'No cumple con las directrices de calidad y seguridad de la plataforma.'}</span>
                    </div>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Si crees que esto es un error o tienes nueva información para subsanar el motivo, por favor responde a este correo.
                    </p>
                    <p style="font-size: 14px; color: #64748b;">
                        Saludos cordiales,<br/>El equipo de Pawnecta
                    </p>
                </div>
            `;
        }

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject,
            html: htmlBody,
        });

        return res.status(200).json({ success: true, messageId: response.data?.id });
    } catch (error) {
        console.error('[notify-provider] catch error:', error);
        return res.status(200).json({
            skipped: true,
            reason: 'send_failed',
            details: error instanceof Error ? error.message : String(error),
        });
    }
}
