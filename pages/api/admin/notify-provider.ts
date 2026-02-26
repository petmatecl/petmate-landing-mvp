import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../../lib/resend';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, nombre, estado, motivo } = req.body;

        if (!email || !nombre || !estado) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        let subject = '';
        let htmlBody = '';

        if (estado === 'aprobado') {
            subject = 'Pawnecta: ¡Tu cuenta ha sido aprobada!';
            htmlBody = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #059669; font-size: 24px; margin-bottom: 16px;">
                        ¡Felicitaciones, ${nombre}!
                    </h1>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Tu perfil de proveedor en Pawnecta ha sido <strong>aprobado</strong> por nuestro equipo de confianza. Ya estás oficialmente activo en la plataforma y listo para ofrecer tus servicios.
                    </p>
                    <a href="https://pawnecta.com/proveedor" style="display: inline-block; background-color: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;">
                        Ir a mi Panel de Proveedor
                    </a>
                    <p style="font-size: 14px; color: #64748b;">
                        Saludos cordiales,<br/>El equipo de Pawnecta
                    </p>
                </div>
            `;
        } else if (estado === 'rechazado') {
            subject = 'Pawnecta: Actualización sobre tu solicitud';
            htmlBody = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #ea580c; font-size: 24px; margin-bottom: 16px;">
                        Hola, ${nombre}
                    </h1>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
                        Hemos revisado tu solicitud para ser proveedor en Pawnecta con mucha atención. Lamentablemente, en esta ocasión no podemos aprobar tu perfil.
                    </p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #94a3b8; padding: 16px; margin-bottom: 24px;">
                        <strong style="color: #475569;">Motivo del rechazo:</strong><br/>
                        <span style="color: #1e293b; font-size: 15px;">${motivo || 'No cumple con las directrices de calidad y seguridad de la plataforma.'}</span>
                    </div>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                        Si crees que esto es un error o tienes nueva información para subsanar el motivo, por favor responde a este correo.
                    </p>
                    <p style="font-size: 14px; color: #64748b;">
                        Saludos cordiales,<br/>El equipo de Pawnecta
                    </p>
                </div>
            `;
        } else {
            return res.status(400).json({ error: 'Estado inválido para notificaciones' });
        }

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: email,
            subject,
            html: htmlBody,
        });

        return res.status(200).json({ success: true, response });
    } catch (error) {
        console.error('Notify Provider API Error:', error);
        return res.status(500).json({ error: 'No se pudo enviar el correo de notificación' });
    }
}
