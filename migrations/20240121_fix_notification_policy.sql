-- Fix RLS policy to allow users to insert notifications for other users
-- Previous policy only allowed inserting if auth.uid() == user_id (self-notification only)

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
