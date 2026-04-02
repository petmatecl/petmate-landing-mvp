import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authLimiter } from '../../../lib/rateLimit';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  rol: z.enum(['usuario', 'proveedor']),
  nombre: z.string().min(1).max(100),
  apellido_p: z.string().min(1).max(100),
  apellido_m: z.string().max(100).optional(),
  rut: z.string().min(3).max(12),
  // Provider-specific (optional)
  comuna: z.string().max(100).optional(),
  tipo_entidad: z.enum(['persona_natural', 'empresa']).optional(),
  razon_social: z.string().max(200).optional(),
  rut_empresa: z.string().max(12).optional(),
  nombre_fantasia: z.string().max(200).optional(),
  giro: z.string().max(200).optional(),
  datos_especificos: z.record(z.unknown()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 5 signups per minute per IP
  if (!authLimiter(req, res)) return;

  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }

  const { email, password, rol, nombre, apellido_p, apellido_m, rut,
    comuna, tipo_entidad, razon_social, rut_empresa, nombre_fantasia, giro, datos_especificos } = parsed.data;

  // Use service role key server-side for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Create auth user (email_confirm: false — we'll send confirmation manually)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return res.status(409).json({ error: 'Este correo ya está registrado.' });
      }
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) throw new Error('No user ID returned');

    // 1b. Generate email confirmation link
    let confirmationUrl: string | null = null;
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
      });
      if (linkError) {
        console.warn('Failed to generate confirmation link:', linkError.message);
      } else if (linkData?.properties?.action_link) {
        confirmationUrl = linkData.properties.action_link;
      }
    } catch (linkErr) {
      console.warn('Confirmation link generation failed (non-blocking):', linkErr);
    }

    // 2. Insert profile (rollback auth user if this fails)
    try {
      if (rol === 'usuario') {
        const { error: insertError } = await supabaseAdmin.from('usuarios_buscadores').insert([{
          auth_user_id: userId,
          nombre: `${nombre.trim()} ${apellido_p.trim()}${apellido_m ? ' ' + apellido_m.trim() : ''}`,
          rut,
        }]);
        if (insertError) throw new Error('Error guardando datos de usuario: ' + insertError.message);
      } else {
        const { error: insertError } = await supabaseAdmin.rpc('registrar_proveedor', {
          p_auth_user_id: userId,
          p_nombre: nombre.trim(),
          p_apellido_p: apellido_p.trim(),
          p_apellido_m: apellido_m?.trim() || null,
          p_rut: rut,
          p_comuna: comuna?.trim() || null,
          p_tipo_entidad: tipo_entidad || 'persona_natural',
          p_razon_social: tipo_entidad === 'empresa' ? razon_social?.trim() || null : null,
          p_rut_empresa: tipo_entidad === 'empresa' ? rut_empresa || null : null,
          p_nombre_fantasia: tipo_entidad === 'empresa' ? nombre_fantasia?.trim() || null : null,
          p_giro: tipo_entidad === 'empresa' ? giro?.trim() || null : null,
          p_datos_especificos: datos_especificos && Object.keys(datos_especificos).length > 0 ? datos_especificos : null,
        });
        if (insertError) throw new Error('Error guardando datos de proveedor: ' + insertError.message);
      }
    } catch (profileErr: any) {
      // Rollback: delete the orphaned auth user so the email can be re-registered
      console.error('Profile insert failed, rolling back auth user:', profileErr.message);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileErr;
    }

    // 3. Trigger welcome email server-side (non-blocking)
    try {
      const host = req.headers.host || 'localhost:3000';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      await fetch(`${protocol}://${host}/api/auth/welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_API_SECRET || 'pawnecta-internal',
        },
        body: JSON.stringify({ userId, email, nombre: nombre.trim(), rol, confirmationUrl }),
      });
    } catch (welcomeErr) {
      console.warn('Welcome email failed (non-blocking):', welcomeErr);
    }

    return res.status(201).json({ ok: true, userId });
  } catch (err: any) {
    console.error('Signup API error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
