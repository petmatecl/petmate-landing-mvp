import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { resend } from '../../../lib/resend';
import NewEvaluationEmail from '../../../components/Emails/NewEvaluationEmail';
import { emailLimiter } from '../../../lib/rateLimit';
import { evaluacionNotifySchema } from '../../../lib/validations';
import { verifyInternalSecret } from '../../../lib/apiAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!verifyInternalSecret(req)) return res.status(403).json({ error: 'Forbidden' });
    if (!emailLimiter(req, res)) return;

    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const parsed = evaluacionNotifySchema.safeParse(rawBody);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    const { proveedorId, servicioTitulo, rating, comentario, isFirst } = parsed.data;

    // Instancia Supabase con Bypass Rol para acceder a auth.users e informaciones protegidas
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY! // Este env siempre debe existir en backend config (Vercel)
    );

    try {
        // 1. Obtención profunda del Identificador de Usuario (Base de Datos a Auth Schema).
        const { data: proveedor, error: provError } = await supabaseAdmin
            .from('proveedores')
            .select('auth_user_id, nombre')
            .eq('id', proveedorId)
            .single();

        if (provError || !proveedor) {
            console.error('API Error: No se encontró el proveedor:', provError);
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        // 2. Fetch del Email oculto en la bóveda de la Supabase Auth (`auth.users`)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(proveedor.auth_user_id);

        if (authError || !authUser?.user?.email) {
            console.error('API Error: No se pudo resolver el email del proveedor:', authError);
            return res.status(404).json({ error: 'Email del proveedor inaccesible' });
        }

        const emailTarget = authUser.user.email;

        const subject = isFirst
            ? 'Recibiste tu primera evaluación en Pawnecta'
            : 'Recibiste una nueva evaluación en Pawnecta';

        // 3. Render HTML Email e intermediario hacia Resend
        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: emailTarget,
            subject,
            react: NewEvaluationEmail({
                nombre: proveedor.nombre || 'Proveedor',
                servicioTitulo: servicioTitulo,
                rating: rating,
                comentario: comentario,
            }) as React.ReactElement,
        });

        res.status(200).json({ success: true, messageId: response.data?.id });

    } catch (error) {
        console.error('API Catch Error /api/evaluaciones/notify:', error);
        res.status(500).json({
            error: 'Failed to dispatch evaluation notification payload',
            details: error instanceof Error ? error.message : error
        });
    }
}
