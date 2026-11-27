import type { NextApiRequest, NextApiResponse } from 'next';
import { wrapApiHandlerWithSentry } from '@sentry/nextjs';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import { escapeHtml } from '../../../lib/sanitize';
import NudgePerfilEmail from '../../../components/Emails/NudgePerfilEmail';
import { signUnsubscribeToken } from '../../../lib/unsubscribeToken';
import { skipIfNonProd } from '../../../lib/cronGuard';
import { logSupabaseError } from '../../../lib/logSupabaseError';

/**
 * Cron: Onboarding reminders for providers
 * - Sends reminder to approved providers who haven't published any service after 48h
 * - Sends reminder to providers with incomplete profiles (no photo, no bio)
 * Schedule: Run daily via Vercel Cron or external scheduler
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    // Sprint PROVEEDOR-PERFIL-NUDGE-7D (2026-11-26) — ventana accionable
    // del nudge "¿por qué no has publicado?". Hard upper bound 60 días
    // para proteger reputation sender Resend. Users >60d son candidatos a
    // flow reactivación aparte (no re-engagement post-onboarding). Ver
    // docs/sprints/proveedor-perfil-nudge-plan.md § 5.
    const cutoff60d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Approved providers with no published services (registered 48h-7d ago)
    // Sprint tipo-cd v2 — cambio de comportamiento: si la query principal
    // falla, THROW → cae al catch outer 500 → Vercel marca job como failed.
    // Antes: `providersNoService=null` → loop no itera → cron reporta
    // `sent=0` en 200 → Vercel marca success ficticio y perdíamos la señal
    // del batch fallido.
    const { data: providersNoService, error: noServiceErr } = await supabaseAdmin
      .from('proveedores')
      .select('id, auth_user_id, nombre, email_onboarding_at, created_at')
      .eq('estado', 'aprobado')
      .is('email_onboarding_at', null)
      .lt('created_at', cutoff48h)
      .gt('created_at', cutoff7d)
      .limit(30);
    logSupabaseError('api-cron:recordatorio-onboarding:providers_no_service', noServiceErr);
    if (noServiceErr) throw noServiceErr;

    for (const prov of (providersNoService || [])) {
      // Check if they have any ACTIVE services. Fail closed: si la query
      // devuelve error, saltamos al proveedor (no enviamos). Antes el código
      // usaba `proveedor_auth_id` (columna inexistente) → error silente →
      // count=null → nunca se saltaba a nadie → email spam a proveedores
      // que ya publicaban. Sprint PROVEEDOR-NUDGE-PROV-ID-FIX 2026-11-27.
      const { count: serviciosActivosB1, error: countErrB1 } = await supabaseAdmin
        .from('servicios_publicados')
        .select('id', { count: 'exact', head: true })
        .eq('proveedor_id', prov.id)
        .eq('activo', true);
      if (countErrB1) {
        logSupabaseError('api-cron:recordatorio-onboarding:count_servicios_bloque1', countErrB1, { providerId: prov.id });
        continue;
      }
      if ((serviciosActivosB1 || 0) > 0) continue;

      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      logSupabaseError('api-cron:recordatorio-onboarding:auth_lookup_service', authErr, { providerId: prov.auth_user_id });
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
    // Sprint tipo-cd v2 — throw si error. La sección 1 puede haber enviado
    // N emails; el UPDATE de `email_onboarding_at` (L82-85) los marca como
    // enviados → idempotencia protege contra doble-envío en próximo run.
    // Es correcto reportar 500 partial: Vercel marca el job para inspección
    // sin perder los envíos ya hechos.
    const { data: providersNoPhoto, error: noPhotoErr } = await supabaseAdmin
      .from('proveedores')
      .select('auth_user_id, nombre, foto_perfil, email_foto_at, created_at')
      .eq('estado', 'aprobado')
      .is('foto_perfil', null)
      .is('email_foto_at', null)
      .lt('created_at', cutoff48h)
      .gt('created_at', cutoff7d)
      .limit(30);
    logSupabaseError('api-cron:recordatorio-onboarding:providers_no_photo', noPhotoErr);
    if (noPhotoErr) throw noPhotoErr;

    for (const prov of (providersNoPhoto || [])) {
      const { data: authUser, error: authErr2 } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      logSupabaseError('api-cron:recordatorio-onboarding:auth_lookup_photo', authErr2, { providerId: prov.auth_user_id });
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

    // 3. Approved providers 7d-60d ago, bloque "nudge perfil incompleto".
    // Sprint PROVEEDOR-PERFIL-NUDGE-7D (2026-11-26) — max 2 nudges strict
    // enforcement via nudge_count. Idempotency 7-day gap via
    // nudge_perfil_enviado_at (last_nudge_sent_at semantics).
    //
    // Query shape:
    //   WHERE nudge_count < 2
    //     AND (nudge_perfil_enviado_at IS NULL
    //          OR nudge_perfil_enviado_at < NOW() - INTERVAL '7 days')
    //     AND created_at BETWEEN cutoff60d AND cutoff7d
    //     AND email_onboarding_at IS NOT NULL (recibió onboarding 48h-7d)
    //
    // Runtime count check: si publicó servicios entre bloques, saltar
    // (señal buena — no insistir).
    //
    // Exclusión cuentas internas @pawnecta.com (admin + similares).
    //
    // Email template: inline por ahora (PR 2 Sprint A). Extracción a
    // módulo compartido en PR 3 nudge-email (misma sesión dispatch).
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: providersNudge, error: nudgeErr } = await supabaseAdmin
      .from('proveedores')
      .select('id, auth_user_id, nombre, nudge_count, nudge_perfil_enviado_at, created_at')
      .eq('estado', 'aprobado')
      .eq('nudge_opt_out', false)
      .not('email_onboarding_at', 'is', null)
      .lt('nudge_count', 2)
      .or(`nudge_perfil_enviado_at.is.null,nudge_perfil_enviado_at.lt.${sevenDaysAgo}`)
      .lt('created_at', cutoff7d)
      .gt('created_at', cutoff60d)
      .limit(30);
    logSupabaseError('api-cron:recordatorio-onboarding:providers_nudge', nudgeErr);
    if (nudgeErr) throw nudgeErr;

    for (const prov of (providersNudge || [])) {
      // Verificar que SIGUE con 0 servicios ACTIVOS — podría haber
      // publicado entre bloques, es señal buena, saltar. Fail closed: si la
      // query devuelve error, saltamos al proveedor (no enviamos). Sprint
      // PROVEEDOR-NUDGE-PROV-ID-FIX 2026-11-27.
      const { count: countServicios, error: countErrB3 } = await supabaseAdmin
        .from('servicios_publicados')
        .select('id', { count: 'exact', head: true })
        .eq('proveedor_id', prov.id)
        .eq('activo', true);
      if (countErrB3) {
        logSupabaseError('api-cron:recordatorio-onboarding:count_servicios_bloque3', countErrB3, { providerId: prov.id });
        continue;
      }
      if ((countServicios || 0) > 0) continue;

      const { data: authUserNudge, error: authErrNudge } = await supabaseAdmin.auth.admin.getUserById(prov.auth_user_id);
      logSupabaseError('api-cron:recordatorio-onboarding:auth_lookup_nudge', authErrNudge, { providerId: prov.auth_user_id });
      if (!authUserNudge?.user?.email) continue;

      // Exclusión cuentas internas @pawnecta.com.
      const emailNudge = authUserNudge.user.email.toLowerCase();
      if (emailNudge.endsWith('@pawnecta.com')) continue;

      // Subject tone: nudge 1 vs nudge 2 (segundo es más suave).
      const isFirstNudge = (prov.nudge_count || 0) === 0;
      const subject = isFirstNudge
        ? `${prov.nombre}, aún tienes cuenta en Pawnecta — ¿seguimos adelante?`
        : `${prov.nombre}, un último recordatorio desde Pawnecta`;

      // Sprint A PR 4 (nudge-unsub) — unsubscribe link firmado HMAC. El
      // template consume unsubscribeUrl si está presente; el endpoint
      // /api/unsubscribe verifica el token antes de setear nudge_opt_out.
      // Si UNSUBSCRIBE_SECRET no está en env, se envía sin link (fallback
      // seguro, no bloquea el nudge).
      const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET;
      const unsubscribeUrl = unsubscribeSecret
        ? `${siteUrl}/api/unsubscribe?u=${encodeURIComponent(prov.auth_user_id)}&t=${signUnsubscribeToken(prov.auth_user_id, unsubscribeSecret)}`
        : undefined;

      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: authUserNudge.user.email,
        subject,
        react: NudgePerfilEmail({
          nombre: prov.nombre,
          isFirstNudge,
          panelUrl: `${siteUrl}/proveedor`,
          unsubscribeUrl,
        }),
      });

      await supabaseAdmin
        .from('proveedores')
        .update({
          nudge_perfil_enviado_at: new Date().toISOString(),
          nudge_count: (prov.nudge_count || 0) + 1,
        })
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

export default wrapApiHandlerWithSentry(handler, '/api/cron/recordatorio-onboarding');
