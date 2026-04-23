import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { escapeHtml } from '../../../lib/sanitize';

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

    return res.status(200).json({ success: true, sent });
  } catch (err) {
    console.error('Error en cron onboarding:', err);
    return res.status(500).json({ error: 'Internal error', details: err instanceof Error ? err.message : err });
  }
}
