import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { authLimiter } from '../../../lib/rateLimit';
import { verifySession, maskUid } from '../../../lib/apiAuth';

/**
 * Sprint orphan-fix (2026-08-18) — endpoint idempotente para completar el
 * registro de una cuenta `auth.users` que quedó huérfana (sin perfil en
 * `proveedores` ni `usuarios_buscadores`). Es el back-end del guard que
 * captura huérfanos y de la página `/completar-registro`.
 *
 * Diseño:
 * - `verifySession(req)` extrae el userId del Bearer JWT — el cliente NO
 *   puede alegar ser otro user, el server siempre confía en el token.
 * - Chequea que NO existe perfil ya (409 si sí — evita duplicados y sirve
 *   como safety net si el usuario abre dos tabs simultáneas).
 * - INSERT en la tabla correspondiente al `rol` elegido. Para proveedor
 *   usa el RPC `registrar_proveedor` — mismo path que `/api/auth/signup`
 *   para preservar defaults e invariantes. Para tutor, INSERT directo.
 * - Cero manipulación de auth.users. Si el INSERT falla, devuelve 500
 *   con mensaje — el usuario puede reintentar. NO borra el auth.users
 *   como sí hace signup.ts (allí el auth y perfil deben crearse juntos;
 *   acá el auth YA existe y es responsable del guard mantenerlo).
 * - Rate-limitado con authLimiter para no dar vector a bots que llenen
 *   auth.users y luego llamen este endpoint en loop.
 */

const completeSchema = z.discriminatedUnion('rol', [
    z.object({
        rol: z.literal('usuario'),
        nombre: z.string().min(1).max(100),
        apellido_p: z.string().max(100).optional(),
        apellido_m: z.string().max(100).optional(),
    }),
    z.object({
        rol: z.literal('proveedor'),
        nombre: z.string().min(1).max(100),
        apellido_p: z.string().min(1).max(100),
        apellido_m: z.string().max(100).optional(),
        rut: z.string().min(3).max(12).optional(),
        comuna: z.string().max(100).optional(),
        tipo_entidad: z.enum(['persona_natural', 'empresa']).optional(),
        razon_social: z.string().max(200).optional(),
        rut_empresa: z.string().max(12).optional(),
        nombre_fantasia: z.string().max(200).optional(),
        giro: z.string().max(200).optional(),
    }),
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit — 5 completions/min por IP (mismo perfil que authLimiter
    // en signup). Sin esto, un bot que ya se autoregistró en la Auth API
    // pública podría iterar sobre este endpoint para crear perfiles a
    // discreción. Con el gate: 5 intentos/min por IP.
    if (!(await authLimiter(req, res))) return;

    // Auth server-side — nunca confiamos en `userId` que venga en el body.
    const userId = await verifySession(req);
    if (!userId) {
        return res.status(401).json({ error: 'Sesión inválida o expirada. Vuelve a iniciar sesión.' });
    }

    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotencia — si ya existe perfil en cualquier tabla, 409.
    // Cubre el caso "abrí dos tabs y ambas hicieron submit" y también
    // el caso "el guard me redirigió mientras el user ya tenía perfil por
    // otro path" (bug del propio guard, mejor detectarlo aquí).
    try {
        const [{ data: existingProv }, { data: existingTutor }] = await Promise.all([
            supabaseAdmin.from('proveedores').select('id').eq('auth_user_id', userId).maybeSingle(),
            supabaseAdmin.from('usuarios_buscadores').select('id').eq('auth_user_id', userId).maybeSingle(),
        ]);
        if (existingProv || existingTutor) {
            return res.status(409).json({ error: 'Ya tienes un perfil creado. Recarga la página.' });
        }
    } catch (checkErr: any) {
        console.error('[complete-registration] existence check failed:', maskUid(userId), checkErr?.message);
        return res.status(500).json({ error: 'Error verificando cuenta. Intenta de nuevo.' });
    }

    const payload = parsed.data;

    try {
        if (payload.rol === 'usuario') {
            const { nombre, apellido_p, apellido_m } = payload;
            const nombreCompleto = apellido_p
                ? `${nombre.trim()} ${apellido_p.trim()}${apellido_m ? ' ' + apellido_m.trim() : ''}`
                : nombre.trim();
            const { error: insertError } = await supabaseAdmin
                .from('usuarios_buscadores')
                .insert([{
                    auth_user_id: userId,
                    nombre: nombreCompleto,
                }]);
            if (insertError) throw new Error(insertError.message);
        } else {
            // Proveedor — mismo RPC que /api/auth/signup para preservar
            // defaults/estados del flujo canónico. Sprint badge-f1 hace
            // UPDATE post-RPC a `estado='aprobado'` (auto-aprobación);
            // aplicamos la misma lógica acá para consistencia — un
            // proveedor que completa registro post-huérfano queda
            // aprobado igual que uno que se registra fresh.
            const { rol: _rol, nombre, apellido_p, apellido_m, rut, comuna,
                tipo_entidad, razon_social, rut_empresa, nombre_fantasia, giro } = payload;
            const { error: rpcError } = await supabaseAdmin.rpc('registrar_proveedor', {
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
            });
            if (rpcError) throw new Error(rpcError.message);

            // Auto-aprobación (mismo shape que sprint badge-f1 en
            // /api/auth/signup). aprobado_por=NULL marca origen: complete-
            // registration, no admin. NO bloquea la respuesta si falla —
            // el perfil ya existe, el proveedor puede reintentar login y
            // sale como 'pendiente' hasta que Aldo lo actúe manualmente.
            const { error: autoAprobarErr } = await supabaseAdmin
                .from('proveedores')
                .update({
                    estado: 'aprobado',
                    aprobado_at: new Date().toISOString(),
                    aprobado_por: null,
                })
                .eq('auth_user_id', userId);
            if (autoAprobarErr) {
                console.warn('[complete-registration] auto-aprobar falló (non-blocking):', maskUid(userId), autoAprobarErr.message);
            }
        }
    } catch (insertErr: any) {
        // NO borramos auth.users aquí. En /api/auth/signup sí porque el
        // user acaba de crearse y el conjunto (auth + perfil) debe ser
        // atómico. Acá el auth YA existe; borrarlo mata la sesión del
        // usuario. Mejor devolver 500 y que reintente. Si el problema
        // persiste el guard sigue capturando en futuros logins.
        console.error('[complete-registration] insert failed:', maskUid(userId), insertErr?.message);
        return res.status(500).json({
            error: 'No pudimos completar tu registro. Intenta de nuevo o contáctanos.',
        });
    }

    return res.status(200).json({ ok: true, rol: payload.rol });
}
