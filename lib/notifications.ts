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
        // Use RPC function to bypass RLS restrictions on INSERT
        const { error } = await supabase.rpc('send_notification', {
            p_user_id: userId,
            p_type: type,
            p_title: title,
            p_message: message,
            p_link: link,
            p_metadata: metadata
        });

        if (error) {
            console.error('Error creating notification (RPC):', error);
            // We don't want to block the main flow if notification fails
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
