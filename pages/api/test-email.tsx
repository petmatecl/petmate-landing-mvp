import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../lib/resend';
import { WelcomeEmail } from '../../components/Emails/WelcomeEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { to } = req.query;

    if (!to || typeof to !== 'string') {
        return res.status(400).json({ error: 'Missing "to" query parameter' });
    }

    try {
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev', // Use default test domain for now
            to: to,
            subject: 'Prueba de Validación Pawnecta',
            react: <WelcomeEmail firstName="Tester" />,
        });

        res.status(200).json({ message: 'Email sent successfully', data });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({
            error: 'Error sending email',
            details: error instanceof Error ? error.message : error
        });
    }
}
