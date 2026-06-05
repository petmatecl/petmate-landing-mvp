import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { apiLimiter } from '../../../lib/rateLimit';
import { notificationCreateSchema } from '../../../lib/validations';
import { verifySession, isAdmin } from '../../../lib/apiAuth';

// Use Service Role to insert notifications (bypass RLS which might block users inserting for others)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Crea una notificacion interna para el recipient (userId del payload).
 *
 * Fix de la vulnerabilidad #19 del commit 1bc1897: el commit original
 * solo dejaba un TODO + console.warn, permitiendo que cualquier user
 * autenticado spammeara notificaciones a cualquier otro user. Ahora
 * validamos que existe una relacion legitima caller↔recipient antes
 * del insert.
 *
 * Relaciones aceptadas (cualquiera suficiente):
 *   1. Conversacion comun (conversations.client_id/sitter_id matchea
 *      ambos en cualquier orden).
 *   2. Agendamiento comun (caller es tutor y recipient es proveedor del
 *      mismo agendamiento, o viceversa — resolviendo via FK a
 *      usuarios_buscadores.auth_user_id y proveedores.auth_user_id).
 *   3. Admin caller (puede notificar a cualquiera — flujos como
 *      aprobacion manual, moderacion).
 *
 * Si ninguna matchea → 403.
 *
 * Self-notify (caller === recipient) → 400 explicito (no tiene sentido
 * funcional, reemplaza el console.warn cosmetico del commit anterior).
 */

async function hasLegitimateRelationship(
    db: SupabaseClient,
    callerId: string,
    recipientId: string,
): Promise<boolean> {
    // 1. Conversacion comun. conversations.client_id y .sitter_id son
    //    auth.users.id directos — comparacion sin joins.
    //    Nested .or con .and matchea el par en cualquier orden.
    const { data: conv } = await db
        .from('conversations')
        .select('id')
        .or(`and(client_id.eq.${callerId},sitter_id.eq.${recipientId}),and(client_id.eq.${recipientId},sitter_id.eq.${callerId})`)
        .limit(1)
        .maybeSingle();
    if (conv) return true;

    // 2. Agendamiento comun. agendamientos.tutor_id → usuarios_buscadores.id
    //    y agendamientos.proveedor_id → proveedores.id; ambos resuelven a
    //    auth_user_id via join. Para evitar joins complejos en supabase-js,
    //    resolvemos primero las resource ids de cada user (en paralelo) y
    //    despues filtramos agendamientos por pares concretos.
    const [callerBuscadorRes, callerProveedorRes, recipBuscadorRes, recipProveedorRes] = await Promise.all([
        db.from('usuarios_buscadores').select('id').eq('auth_user_id', callerId).maybeSingle(),
        db.from('proveedores').select('id').eq('auth_user_id', callerId).maybeSingle(),
        db.from('usuarios_buscadores').select('id').eq('auth_user_id', recipientId).maybeSingle(),
        db.from('proveedores').select('id').eq('auth_user_id', recipientId).maybeSingle(),
    ]);
    const callerBuscadorId = callerBuscadorRes.data?.id as string | undefined;
    const callerProveedorId = callerProveedorRes.data?.id as string | undefined;
    const recipBuscadorId = recipBuscadorRes.data?.id as string | undefined;
    const recipProveedorId = recipProveedorRes.data?.id as string | undefined;

    const pairs: string[] = [];
    if (callerBuscadorId && recipProveedorId) {
        pairs.push(`and(tutor_id.eq.${callerBuscadorId},proveedor_id.eq.${recipProveedorId})`);
    }
    if (callerProveedorId && recipBuscadorId) {
        pairs.push(`and(tutor_id.eq.${recipBuscadorId},proveedor_id.eq.${callerProveedorId})`);
    }
    if (pairs.length > 0) {
        const { data: agend } = await db
            .from('agendamientos')
            .select('id')
            .or(pairs.join(','))
            .limit(1)
            .maybeSingle();
        if (agend) return true;
    }

    // 3. Admin — bypass total. Cubre flujos de moderacion / aprobacion
    //    manual donde no hay necesariamente conv o agendamiento previo.
    if (await isAdmin(callerId)) return true;

    return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    if (!apiLimiter(req, res)) return;

    // Auth — usa el helper compartido (mismo patron que el sweep 1bc1897).
    const callerId = await verifySession(req);
    if (!callerId) return res.status(401).json({ message: 'Unauthorized' });

    // Validate payload.
    const parsed = notificationCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input' });
    const { userId, type, title, message, link, metadata } = parsed.data;

    // Self-notify: 400 explicito. Reemplaza el `console.warn` cosmetico
    // del commit 1bc1897 — un usuario no tiene caso de uso legitimo para
    // notificarse a si mismo, y rechazar evita data junk.
    if (callerId === userId) {
        return res.status(400).json({ message: 'No puede crearse una notificación para uno mismo' });
    }

    // Relationship check (fix de la vulnerabilidad #19).
    const allowed = await hasLegitimateRelationship(supabaseAdmin, callerId, userId);
    if (!allowed) {
        console.warn('[notifications/create] caller sin relacion con recipient', {
            callerId,
            recipientId: userId,
        });
        return res.status(403).json({ message: 'No relationship with recipient' });
    }

    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId, // Recipient
                type,
                title,
                message,
                link,
                metadata,
                read: false,
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Notification API Error:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}
