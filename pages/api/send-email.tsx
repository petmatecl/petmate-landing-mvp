import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../lib/resend';
import WelcomeEmail from '../../components/Emails/WelcomeEmail';
import NewMessageEmail from '../../components/Emails/NewMessageEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, to, data } = req.body;

    // 1. Validate 'to' email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!to || typeof to !== 'string' || !emailRegex.test(to)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // 2. Validate 'type' whitelist
    const VALID_TYPES = ['welcome', 'new_message'];
    if (!type || typeof type !== 'string' || !VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid email type' });
    }

    // 3. Validate 'data' object
    if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data payload' });
    }

    // [Optional] Rate Limiting Placeholder
    // In a real scenario, check Redis/KV for frequency by IP or UserID here.
    // For MVP serverless, we trust the caller triggers (protected by auth usually) or Vercel firewall.

    // Determine which template to use
    let emailComponent: React.ReactElement;
    let subject = '';

    try {
        switch (type) {
            case 'welcome':
                subject = '¡Bienvenido a Pawnecta!';
                emailComponent = <WelcomeEmail firstName={data.firstName} />;
                break;

            case 'new_message':
                subject = `Nuevo mensaje de ${data.senderName}`;
                emailComponent = <NewMessageEmail {...data} />;
                break;

            default:
                return res.status(400).json({ error: 'Invalid email type' });
        }

        const response = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: to,
            subject: subject,
            react: emailComponent,
        });

        res.status(200).json({ success: true, response });
    } catch (error) {
        console.error('Email API Error:', error);
        res.status(500).json({
            error: 'Failed to send email',
            details: error instanceof Error ? error.message : error
        });
    }
}
