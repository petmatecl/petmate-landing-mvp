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
  rut: z.string().min(3).max(12).optional(),
  // Provider-specific (optional)
  comuna: z.string().max(100).optional(),
  tipo_entidad: z.enum(['persona_natural', 'empresa']).optional(),
  razon_social: z.string().max(200).optional(),
  rut_empresa: z.string().max(12).optional(),
  nombre_fantasia: z.string().max(200).optional(),
  giro: z.string().max(200).optional(),
  // Sprint 4 Fase 1 / Commit 3: datos_especificos deprecado. El cliente ya no
  // lo manda desde register.tsx; el schema deja de aceptarlo (cualquier client
  // viejo que lo envie sera ignorado silenciosamente por Zod en modo strict).
  descripcion: z.string().max(500).optional(),
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
    comuna, tipo_entidad, razon_social, rut_empresa, nombre_fantasia, giro, descripcion } = parsed.data;

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
        }]);
        if (insertError) throw new Error('Error guardando datos de usuario: ' + insertError.message);
      } else {
        const { error: insertError } = await supabaseAdmin.rpc('registrar_proveedor', {
          p_auth_user_id: userId,
          p_nombre: nombre.trim(),
          p_apellido_p: apellido_p.trim(),
          p_apellido_m: apellido_m?.trim() || null,
          p_rut: rut || null,
          p_comuna: comuna?.trim() || null,
          p_tipo_entidad: tipo_entidad || 'persona_natural',
          p_razon_social: tipo_entidad === 'empresa' ? razon_social?.trim() || null : null,
          p_rut_empresa: tipo_entidad === 'empresa' ? rut_empresa || null : null,
          p_nombre_fantasia: tipo_entidad === 'empresa' ? nombre_fantasia?.trim() || null : null,
          p_giro: tipo_entidad === 'empresa' ? giro?.trim() || null : null,
          // datos_especificos deprecado en Sprint 4 Fase 1 — siempre null para
          // proveedores nuevos. La data legacy en BD se preserva intacta.
          p_datos_especificos: null,
        });
        if (insertError) throw new Error('Error guardando datos de proveedor: ' + insertError.message);

        // Persistir descripcion como bio inicial. Se hace via UPDATE
        // post-RPC porque el RPC registrar_proveedor (definido server-side
        // en Supabase, no en migrations/) no acepta p_bio. Workaround
        // pragmatico para no tocar el RPC remoto.
        if (descripcion && descripcion.trim()) {
          const { error: bioErr } = await supabaseAdmin
            .from('proveedores')
            .update({ bio: descripcion.trim() })
            .eq('auth_user_id', userId);
          if (bioErr) {
            // No bloqueante: el proveedor puede editar bio despues desde
            // su dashboard. Solo logueamos para visibilidad.
            console.warn('Failed to set initial bio (non-blocking):', bioErr.message);
          }
        }
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
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
