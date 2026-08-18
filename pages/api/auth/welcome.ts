import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../../lib/resend';
import { emailLimiter } from '../../../lib/rateLimit';
import { escapeHtml } from '../../../lib/sanitize';
import { welcomeSchema } from '../../../lib/validations';

// Email templates inline as HTML strings
const UserWelcomeEmail = ({ nombre, confirmationUrl }: { nombre: string; confirmationUrl?: string | null }) => `
    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px;">
            ¡Bienvenido a Pawnecta, ${escapeHtml(nombre)}!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Estamos muy felices de que te unas a nuestra comunidad. Ya puedes buscar proveedores verificados en tu comuna para cuidar, pasear, o atender a tu mascota.
        </p>
        ${confirmationUrl ? `
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
            <strong>Primero, confirma tu correo electrónico</strong> haciendo clic en el botón de abajo:
        </p>
        <a
            href="${confirmationUrl}"
            style="display: inline-block; background-color: #047857; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-bottom: 24px; font-size: 16px;"
        >
            Confirmar mi correo
        </a>
        ` : `
        <a
            href="https://www.pawnecta.com/explorar"
            style="display: inline-block; background-color: #047857; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;"
        >
            Explorar servicios
        </a>
        `}
        <p style="font-size: 14px; color: #64748b;">
            Saludos cordiales,<br/>El equipo de Pawnecta
        </p>
    </div>
`;

// Sprint cron-carnet 2026-08-19 — reescrito para hacer explícito el paso
// del carnet como PRIMER acción obligatoria post-registro. La versión
// anterior decía "Revisaremos tu información en 24-48h" sin mencionar
// que el carnet era prerequisito, y listaba "completar perfil / publicar
// servicios" como pasos siguientes — omitía el que realmente bloquea.
// Los 4 casos investigados (Ignacia, Isidora, Verónica, Nicole) confirman
// el gap: siete personas se atascaron en el mismo punto sin señal
// externa que las trajera de vuelta. Deep link a `?tab=perfil&seccion=identidad`
// lleva directo a la sección donde vive el flujo de verificación.
const ProviderWelcomeEmail = ({ nombre, confirmationUrl }: { nombre: string; confirmationUrl?: string | null }) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pawnecta.com';
    return `
    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #134E4A; font-size: 24px; margin-bottom: 12px;">
            Hola ${escapeHtml(nombre)},
        </h1>
        <p style="font-size: 16px; line-height: 1.55; margin-bottom: 16px; color: #334155;">
            Recibimos tu registro como proveedor en Pawnecta. Estamos contentos de tenerte.
        </p>
        ${confirmationUrl ? `
        <p style="font-size: 16px; line-height: 1.55; margin-bottom: 12px; color: #334155;">
            <strong>Antes de continuar, confirma tu correo:</strong>
        </p>
        <a
            href="${confirmationUrl}"
            style="display: inline-block; background-color: #134E4A; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-bottom: 24px; font-size: 15px;"
        >
            Confirmar mi correo
        </a>
        ` : ''}

        <h2 style="color: #0F172A; font-size: 18px; margin-top: 28px; margin-bottom: 10px;">
            El siguiente paso: verificar tu identidad
        </h2>
        <p style="font-size: 15px; line-height: 1.55; margin-bottom: 8px; color: #475569;">
            Para publicar tu servicio y empezar a recibir consultas necesitamos que subas una foto de tu carnet (frontal y dorso) desde tu panel. Es rápido — toma menos de dos minutos.
        </p>
        <p style="font-size: 15px; line-height: 1.55; margin-bottom: 20px; color: #475569;">
            Nuestro equipo revisa las fotos entre 24 y 48 horas y te avisamos por correo cuando esté aprobado.
        </p>
        <a
            href="${siteUrl}/proveedor?tab=perfil&seccion=identidad"
            style="display: inline-block; background-color: #16A34A; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-bottom: 28px; font-size: 15px;"
        >
            Subir mi carnet ahora
        </a>

        <h3 style="font-size: 15px; margin-top: 24px; margin-bottom: 10px; color: #0F172A;">Después de la aprobación vas a poder</h3>
        <ul style="font-size: 15px; line-height: 1.55; padding-left: 20px; margin-bottom: 24px; color: #475569;">
            <li style="margin-bottom: 6px;">Publicar tus servicios con precio y disponibilidad.</li>
            <li style="margin-bottom: 6px;">Recibir consultas de dueños en tu comuna.</li>
            <li style="margin-bottom: 6px;">Gestionar tus reservas desde el mismo panel.</li>
        </ul>

        <p style="font-size: 14px; line-height: 1.55; color: #64748b; margin-top: 24px;">
            Si tienes dudas o el proceso te resulta confuso, responde este correo y te acompañamos.
        </p>
        <p style="font-size: 12px; color: #94A3B8; margin-top: 18px;">
            El equipo de Pawnecta.
        </p>
    </div>
`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await emailLimiter(req, res))) return;

    // Validate via internal secret to prevent external abuse
    const internalSecret = req.headers['x-internal-secret'];
    if (!process.env.INTERNAL_API_SECRET || internalSecret !== process.env.INTERNAL_API_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const parsed = welcomeSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        }
        const { userId, email, nombre, rol, confirmationUrl } = parsed.data;

        let subject = '';
        let htmlComponent = '';

        if (rol === 'usuario') {
            subject = confirmationUrl
                ? `Confirma tu correo — Bienvenido a Pawnecta, ${nombre}`
                : `Bienvenido a Pawnecta, ${nombre}`;
            htmlComponent = UserWelcomeEmail({ nombre, confirmationUrl });
        } else if (rol === 'proveedor') {
            subject = confirmationUrl
                ? `Confirma tu correo — Recibimos tu solicitud, ${nombre}`
                : `Recibimos tu solicitud, ${nombre}`;
            htmlComponent = ProviderWelcomeEmail({ nombre, confirmationUrl });
        } else {
            return res.status(400).json({ error: 'Invalid rol. Must be usuario or proveedor.' });
        }

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject: subject,
            html: htmlComponent,
        });

        return res.status(200).json({ success: true, response });
    } catch (error) {
        // Sweep #1 finding [70]: sin `details` en el response.
        console.error('Welcome API Error:', error);
        return res.status(500).json({
            error: 'Failed to send welcome email',
        });
    }
}
