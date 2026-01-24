import { supabase } from './supabaseClient';
import { toast } from 'sonner';

export type NotificationType = 'opportunity' | 'application' | 'request' | 'acceptance' | 'message';

type CreateNotificationParams = {
    userId: string; // The recipient
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
};

/**
 * Creates a notification in the database.
 * Uses the client-side supabase instance, so RLS policies must allow INSERT.
 */
export const createNotification = async ({
    userId,
    type,
    title,
    message,
    link,
    metadata
}: CreateNotificationParams) => {
    try {
        // Use Secure API Route instead of direct RPC/Insert
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
            console.warn('Cannot send notification: No session token');
            return;
        }

        const response = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId,
                type,
                title,
                message,
                link,
                metadata
            })
        });

        if (!response.ok) {
            console.error('Error creating notification (API):', response.statusText);
        }
    } catch (err) {
        console.error('Unexpected error creating notification:', err);
    }
};

/**
 * Marks a notification as read.
 */
export const markNotificationAsRead = async (notificationId: string) => {
    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (err) {
        console.error('Error marking notification as read:', err);
    }
};
