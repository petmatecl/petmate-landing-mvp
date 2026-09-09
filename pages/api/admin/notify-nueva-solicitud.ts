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
//
// Sprint L1-2 CASE-6 (2026-09-09) — dos modos de operación:
//   Modo NORMAL: cliente manda { proveedorId }. Server resuelve todos los
//     datos por FK/join. Subject sin prefijo.
//   Modo DEGRADADO: cliente manda { fallback: { email, nombre, apellido_p,
//     rut?, comuna? } } cuando el lookup del providerId falló client-side.
//     Server usa esos datos directo (sin FK lookup), Subject marcado
//     "[DEGRADADO]" para que el admin vea que la solicitud SÍ entró pero
//     el enriquecimiento de datos fue parcial (puede querer resolver el
//     providerId manual). Sentry captureMessage con tag `mode:degraded`.
// ----------------------------------------------------------------------------
import type { NextApiRequest, NextApiResponse } from 'next';
import * as Sentry from '@sentry/nextjs';
import { resend } from '../../../lib/resend';
import { createClient } from '@supabase/supabase-js';
import { emailLimiter } from '../../../lib/rateLimit';
import { verifyInternalSecret } from '../../../lib/apiAuth';
import { NuevoProveedorPendienteEmail } from '../../../components/Emails/NuevoProveedorPendienteEmail';

const ADMIN_INBOX = process.env.ADMIN_INBOX || 'contacto@pawnecta.com';

interface FallbackPayload {
    email: string;
    nombre: string;
    apellido_p?: string;
    rut?: string;
    comuna?: string;
}

interface RequestBody {
    proveedorId?: string;
    fallback?: FallbackPayload;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Sprint L1-2 (2026-09-09) — verifyInternalSecret ahora retorna 3 estados
    // (missing-config=500 con Sentry, missing-header/invalid=403).
    const auth = verifyInternalSecret(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
    if (!(await emailLimiter(req, res))) return;

    const { proveedorId, fallback } = (req.body || {}) as RequestBody;

    // Modo DEGRADADO: si no viene proveedorId pero SÍ viene fallback con
    // datos mínimos, emitir el email con esos datos y prefijo "[DEGRADADO]".
    if (!proveedorId && fallback && typeof fallback.email === 'string' && typeof fallback.nombre === 'string') {
        return enviarModoDegradado(res, fallback);
    }

    if (!proveedorId || typeof proveedorId !== 'string') {
        return res.status(400).json({ error: 'Invalid proveedorId (o fallback shape)' });
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

/**
 * Sprint L1-2 CASE-6 (2026-09-09) — envía el email al admin usando los
 * datos que el caller ya tiene en memoria, saltando el FK lookup a
 * `proveedores`. Subject prefijado "[DEGRADADO]" para que el admin vea
 * que fue parcial. Sentry breadcrumb para observabilidad. Reusa el
 * template `NuevoProveedorPendienteEmail` con los mismos campos que
 * mostraría el modo normal (nombre, email, rut, comuna, fecha=now).
 */
async function enviarModoDegradado(res: NextApiResponse, fallback: FallbackPayload) {
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const subjectPrefix = process.env.VERCEL_ENV === 'production' ? '' : '[STAGING] ';
    const nombreCompleto = `${fallback.nombre} ${fallback.apellido_p || ''}`.trim();

    Sentry.captureMessage('admin_notify_degraded', {
        level: 'warning',
        tags: {
            subsystem: 'admin_notify',
            mode: 'degraded',
            reason: 'signup_provider_lookup_failed',
        },
        extra: {
            proveedorNombre: nombreCompleto,
            // Cero email en extra — PII sensitive.
        },
    });

    try {
        const { data: sendData, error: sendErr } = await resend.emails.send({
            from,
            to: ADMIN_INBOX,
            subject: `${subjectPrefix}[DEGRADADO] Nueva solicitud de proveedor: ${nombreCompleto}`.trim(),
            react: NuevoProveedorPendienteEmail({
                proveedorNombre: nombreCompleto,
                proveedorEmail: fallback.email,
                proveedorRut: fallback.rut,
                comuna: fallback.comuna,
                fechaSolicitud: new Date().toISOString(),
            }),
        });
        if (sendErr) {
            console.warn('[notify-nueva-solicitud DEGRADADO] Resend error:', sendErr);
            return res.status(200).json({ skipped: true, reason: 'resend error', detail: sendErr.message, mode: 'degraded' });
        }
        return res.status(200).json({ ok: true, resendId: sendData?.id, mode: 'degraded' });
    } catch (err: any) {
        console.error('[notify-nueva-solicitud DEGRADADO] unexpected:', err);
        return res.status(200).json({ skipped: true, reason: 'unexpected error', detail: err?.message, mode: 'degraded' });
    }
}
