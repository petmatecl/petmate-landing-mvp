import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { escapeHtml } from '../../../lib/sanitize';
import { skipIfNonProd } from '../../../lib/cronGuard';

/**
 * Cron: Onboarding reminders for providers
 * - Sends reminder to approved providers who haven't published any service after 48h
 * - Sends reminder to providers with incomplete profiles (no photo, no bio)
 * Schedule: Run daily via Vercel Cron or external scheduler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (skipIfNonProd(req, res)) return;

  // Vercel Cron sends Authorization: Bearer <secret>
  const authHeader = req.headers.authorization;
  const secret = req.headers['x-cron-secret'] || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Missing config' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pawnecta.com';

  try {
    let sent = 0;
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Approved providers with no published services (registered 48h-7d ago)
    const { data: providersNoService } = await supabaseAdmin
      .from('proveedores')
      .select('auth_user_id, nombre, email_onboarding_at, created_at')
      .eq('estado', 'aprobado')
      .is('email_onboarding_at', null)
      .lt('created_at', cutoff48h)
      .gt('created_at', cutoff7d)
      .limit(30);

    for (const prov of (providersNoService || [])) {
      // Check if they have any services
      const { count } = await supabaseAdmin
        .from('servicios_publicados')
        .select('id', { count: 'exact', head: true })
        .eq('proveedor_auth_id', prov.auth_user_id);

      if ((count || 0) > 0) continue;

      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      if (!authUser?.user?.email) continue;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: authUser.user.email,
        subject: `${prov.nombre}, tu perfil está aprobado. ¡Publica tu primer servicio!`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;padding:20px">
            <h1 style="color:#047857;font-size:24px">¡Felicidades, ${escapeHtml(prov.nombre)}!</h1>
            <p style="font-size:16px;line-height:1.5">Tu perfil fue aprobado en Pawnecta. Ahora solo falta un paso para empezar a recibir consultas:</p>
            <h3 style="font-size:18px;margin-top:20px">Publica tu primer servicio</h3>
            <p style="font-size:16px;line-height:1.5">Los proveedores que publican su servicio en las primeras 48 horas reciben <strong>3x más consultas</strong> durante su primer mes.</p>
            <a href="${siteUrl}/proveedor" style="display:inline-block;background:#047857;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px;font-size:16px">
              Publicar mi servicio
            </a>
            <p style="margin-top:24px;font-size:14px;color:#64748b">Si tienes dudas, responde este correo y te ayudamos.</p>
            <p style="margin-top:16px;font-size:12px;color:#94a3b8">Pawnecta — Conectando mascotas con cuidadores de confianza</p>
          </div>
        `,
      });

      await supabaseAdmin
        .from('proveedores')
        .update({ email_onboarding_at: new Date().toISOString() })
        .eq('auth_user_id', prov.auth_user_id);

      sent++;
    }

    // 2. Approved providers with no profile photo (registered >48h ago)
    const { data: providersNoPhoto } = await supabaseAdmin
      .from('proveedores')
      .select('auth_user_id, nombre, foto_perfil, email_foto_at, created_at')
      .eq('estado', 'aprobado')
      .is('foto_perfil', null)
      .is('email_foto_at', null)
      .lt('created_at', cutoff48h)
      .gt('created_at', cutoff7d)
      .limit(30);

    for (const prov of (providersNoPhoto || [])) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      if (!authUser?.user?.email) continue;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: authUser.user.email,
        subject: `${prov.nombre}, agrega una foto a tu perfil`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;padding:20px">
            <h2 style="color:#047857">Hola, ${escapeHtml(prov.nombre)}</h2>
            <p style="font-size:16px;line-height:1.5">Los perfiles con foto reciben un <strong>70% más de contactos</strong> que los que no tienen.</p>
            <p style="font-size:16px;line-height:1.5">Sube una foto profesional o una imagen de tu espacio para generar confianza con los dueños de mascotas.</p>
            <a href="${siteUrl}/proveedor" style="display:inline-block;background:#047857;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:bold;margin-top:16px">
              Completar mi perfil
            </a>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8">Pawnecta — Conectando mascotas con cuidadores de confianza</p>
          </div>
        `,
      });

      await supabaseAdmin
        .from('proveedores')
        .update({ email_foto_at: new Date().toISOString() })
        .eq('auth_user_id', prov.auth_user_id);

      sent++;
    }

    // ─────────────────────────────────────────────────────────────────
    // Sub-flujo (c) 2026-08-19 — recordatorio de subir carnet
    // ─────────────────────────────────────────────────────────────────
    // Proveedores con `verificacion_estado='sin_enviar'` que se
    // registraron entre 48h y 14d atrás y aún no han subido carnet.
    // Este flujo es la señal externa que hoy falta — sin él, los
    // proveedores que cierran el tab post-signup se pierden porque
    // el `VerificationGateModal` (agregado 30-abr) solo dispara si
    // vuelven al panel.
    //
    // Idempotencia: marcador `email_carnet_recordatorio_at`. La
    // migration 20260819 hace backfill retroactivo (NOW() para todos
    // los existentes) → NO dispara sobre los 7 actuales que Aldo va
    // a contactar a mano. Solo aplica a registros POST-migration.
    const { data: providersSinCarnet } = await supabaseAdmin
      .from('proveedores')
      .select('auth_user_id, nombre, email_carnet_recordatorio_at, created_at')
      .eq('verificacion_estado', 'sin_enviar')
      .is('email_carnet_recordatorio_at', null)
      .lt('created_at', cutoff48h)
      .gt('created_at', cutoff7d)
      .or('es_ejemplo.eq.false,es_ejemplo.is.null')
      .limit(30);

    for (const prov of (providersSinCarnet || [])) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      if (!authUser?.user?.email) continue;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: authUser.user.email,
        subject: `${prov.nombre}, sube tu carnet para completar tu registro en Pawnecta`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;padding:20px">
            <h1 style="color:#134E4A;font-size:22px;margin-bottom:8px">Hola ${escapeHtml(prov.nombre)},</h1>
            <p style="font-size:16px;line-height:1.55;color:#334155">Vimos que te registraste en Pawnecta hace unos días pero aún no completaste el paso de verificación de identidad. Es rápido y es lo único que falta antes de que puedas publicar tu servicio.</p>
            <h3 style="font-size:17px;margin-top:24px;color:#0F172A">Necesitas subir dos fotos de tu carnet</h3>
            <p style="font-size:15px;line-height:1.55;color:#475569">Frontal y dorso, desde tu panel de proveedor. Toma menos de dos minutos. Te avisamos por correo apenas esté revisado.</p>
            <a href="${siteUrl}/proveedor?tab=perfil&seccion=identidad" style="display:inline-block;background:#16A34A;color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:20px;font-size:15px">
              Subir mi carnet ahora
            </a>
            <p style="margin-top:28px;font-size:14px;color:#64748B;line-height:1.55">¿Tienes alguna duda o el proceso te resulta confuso? Responde este correo y te acompañamos.</p>
            <p style="margin-top:18px;font-size:12px;color:#94A3B8">Pawnecta — Conectando mascotas con cuidadores de confianza</p>
          </div>
        `,
      });

      await supabaseAdmin
        .from('proveedores')
        .update({ email_carnet_recordatorio_at: new Date().toISOString() })
        .eq('auth_user_id', prov.auth_user_id);

      sent++;
    }

    return res.status(200).json({ success: true, sent });
  } catch (err) {
    // Sweep #1 finding [70]: sin `details` en el response.
    console.error('Error en cron onboarding:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
