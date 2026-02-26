import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../../lib/resend';

// Email templates inline as HTML strings
const UserWelcomeEmail = ({ nombre }: { nombre: string }) => `
    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px;">
            ¡Bienvenido a Pawnecta, ${nombre}!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            Estamos muy felices de que te unas a nuestra comunidad. Ya puedes buscar proveedores verificados en tu comuna para cuidar, pasear, o atender a tu mascota.
        </p>
        <a 
            href="https://pawnecta.com/explorar" 
            style="display: inline-block; background-color: #047857; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;"
        >
            Explorar servicios
        </a>
        <p style="font-size: 14px; color: #64748b;">
            Saludos cordiales,<br/>El equipo de Pawnecta
        </p>
    </div>
`;

const ProviderWelcomeEmail = ({ nombre }: { nombre: string }) => `
    <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #047857; font-size: 24px; margin-bottom: 16px;">
            ¡Recibimos tu solicitud, ${nombre}!
        </h1>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
            Gracias por registrarte como proveedor en Pawnecta. Estamos emocionados por conocerte.
        </p>
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
            <strong>Revisaremos tu información en las próximas 24 a 48 horas.</strong> Te avisaremos por este correo cuando tu perfil esté activo y listo para operar.
        </p>
        
        <h3 style="font-size: 18px; margin-top: 24px; margin-bottom: 12px;">¿Qué viene después?</h3>
        <ul style="font-size: 16px; line-height: 1.5; padding-left: 20px; margin-bottom: 24px;">
            <li style="margin-bottom: 8px;">Completar tu perfil con fotos atractivas de tu hogar o servicios.</li>
            <li style="margin-bottom: 8px;">Publicar tus primeros servicios con descripciones claras.</li>
            <li style="margin-bottom: 8px;">Estar atento para recibir consultas de dueños en tu comuna.</li>
        </ul>

        <p style="font-size: 14px; color: #64748b;">
            Saludos cordiales,<br/>El equipo de Pawnecta
        </p>
    </div>
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId, email, nombre, rol } = req.body;

        if (!email || !nombre || !rol) {
            return res.status(400).json({ error: 'Missing required fields: email, nombre, or rol' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        let subject = '';
        let htmlComponent = '';

        if (rol === 'usuario') {
            subject = `Bienvenido a Pawnecta, ${nombre}`;
            htmlComponent = UserWelcomeEmail({ nombre });
        } else if (rol === 'proveedor') {
            subject = `Recibimos tu solicitud, ${nombre}`;
            htmlComponent = ProviderWelcomeEmail({ nombre });
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
        console.error('Welcome API Error:', error);
        return res.status(500).json({
            error: 'Failed to send welcome email',
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
