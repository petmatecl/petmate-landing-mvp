import type { NextApiRequest, NextApiResponse } from 'next';
import { resend } from '../../lib/resend';
import WelcomeEmail from '../../components/Emails/WelcomeEmail';
import NewRequestEmail from '../../components/Emails/NewRequestEmail';
import RequestStatusEmail from '../../components/Emails/RequestStatusEmail';
import NewMessageEmail from '../../components/Emails/NewMessageEmail';
import TripCancellationEmail from '../../components/Emails/TripCancellationEmail';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type, to, data } = req.body;

    if (!to || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine which template to use
    let emailComponent: React.ReactElement;
    let subject = '';

    try {
        switch (type) {
            case 'welcome':
                subject = '¡Bienvenido a Pawnecta!';
                emailComponent = <WelcomeEmail firstName={data.firstName} />;
                break;
            case 'new_request':
                subject = 'Nueva solicitud de servicio 🐾';
                emailComponent = <NewRequestEmail {...data} />;
                break;
            case 'request_status':
                subject = `Actualización de solicitud: ${data.status}`;
                emailComponent = <RequestStatusEmail {...data} />;
                break;
            case 'new_message':
                subject = `Nuevo mensaje de ${data.senderName}`;
                emailComponent = <NewMessageEmail {...data} />;
                break;
            case 'trip_cancellation':
                subject = `Cancelación de servicio #${data.tripId.slice(0, 8).toUpperCase()}`;
                emailComponent = <TripCancellationEmail recipientName={data.recipientName} tripId={data.tripId} cancelledBy={data.cancelledBy} serviceType={data.serviceType} startDate={data.startDate} endDate={data.endDate} />;
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
