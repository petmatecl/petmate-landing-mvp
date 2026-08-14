// pages/api/admin/notify-nueva-solicitud.ts
// ----------------------------------------------------------------------------
// Sprint Ola-1 A3 (2026-08-14) — endpoint server-to-server que notifica al
// admin (`contacto@pawnecta.com`) cuando un proveedor nuevo se registra.
//
// Motivación: hallazgo del PO 2026-08-11 de 8 solicitudes acumuladas 6
// semanas sin respuesta por ausencia total de mecanismo de notificación.
// Ver BACKLOG.md > PEDIDOS DIRECTOS DEL PO.
//
// Autenticación: verifyInternalSecret (server-to-server, mismo patrón que
// /api/auth/welcome). Llamado fire-and-forget desde signup.ts post-INSERT
// exitoso — si el envío falla NO bloquea el flow del proveedor.
//
// Failure handling: si Resend rechaza (rate limit, dominio caído), retorna
// 200 { skipped: true, reason } — el proveedor ya está creado, el email es
// notificación no transaccional. Mismo patrón que notify-proveedor.ts.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../../lib/resend';
import { createClient } from '@supabase/supabase-js';
import { emailLimiter } from '../../../lib/rateLimit';
import { verifyInternalSecret } from '../../../lib/apiAuth';
import { NuevoProveedorPendienteEmail } from '../../../components/Emails/NuevoProveedorPendienteEmail';

const ADMIN_INBOX = process.env.ADMIN_INBOX || 'contacto@pawnecta.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!verifyInternalSecret(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!(await emailLimiter(req, res))) return;

    const { proveedorId } = req.body as { proveedorId?: string };
    if (!proveedorId || typeof proveedorId !== 'string') {
        return res.status(400).json({ error: 'Invalid proveedorId' });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Patron id-only: cliente manda solo el UUID, server resuelve los datos.
        const { data: prov, error: provErr } = await supabaseAdmin
            .from('proveedores')
            .select('nombre, apellido_p, auth_user_id, rut, comuna, created_at')
            .eq('id', proveedorId)
            .maybeSingle();
        if (provErr || !prov) {
            console.warn('[notify-nueva-solicitud] proveedor no encontrado:', proveedorId);
            return res.status(200).json({ skipped: true, reason: 'proveedor no encontrado' });
        }

        // Email vive en auth.users — resolver via authAdmin.
        const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
        if (userErr || !userData?.user?.email) {
            console.warn('[notify-nueva-solicitud] email de proveedor no encontrado:', proveedorId);
            return res.status(200).json({ skipped: true, reason: 'email no encontrado' });
        }

        const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
        const subjectPrefix = process.env.VERCEL_ENV === 'production' ? '' : '[STAGING] ';
        const { data: sendData, error: sendErr } = await resend.emails.send({
            from,
            to: ADMIN_INBOX,
            subject: `${subjectPrefix}Nueva solicitud de proveedor pendiente: ${prov.nombre} ${prov.apellido_p || ''}`.trim(),
            // Patrón del proyecto: React component directo, no render() a HTML.
            // Ver notify-proveedor.ts para el patrón canónico.
            react: NuevoProveedorPendienteEmail({
                proveedorNombre: `${prov.nombre} ${prov.apellido_p || ''}`.trim(),
                proveedorEmail: userData.user.email,
                proveedorRut: prov.rut,
                comuna: prov.comuna,
                fechaSolicitud: prov.created_at,
            }),
        });
        if (sendErr) {
            console.warn('[notify-nueva-solicitud] Resend error:', sendErr);
            return res.status(200).json({ skipped: true, reason: 'resend error', detail: sendErr.message });
        }

        return res.status(200).json({ ok: true, resendId: sendData?.id });
    } catch (err: any) {
        console.error('[notify-nueva-solicitud] unexpected:', err);
        return res.status(200).json({ skipped: true, reason: 'unexpected error', detail: err?.message });
    }
}
