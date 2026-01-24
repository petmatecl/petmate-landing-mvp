-- Security Fix P0.4: Secure Notifications Policy
-- Drop permissive INSERT policy that allowed any authenticated user to create notifications.
-- Internal notifications should be created via Triggers (Security Definer) or Admin API only.

DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

-- Ensure users can still VIEW their own notifications
-- (Assuming "Users can view own notifications" exists or needs creating.
-- Let's check if it exists in previous migrations or just create it safely)

-- Check/Create Read Policy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
    ) THEN
        CREATE POLICY "Users can view own notifications"
        ON public.notifications FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Drop INSERT policy explicitly again to be sure (redundant but safe)
-- DROP POLICY "Users can insert notifications" ON public.notifications; -- Already done above

-- We DO NOT create a new INSERT policy. 
-- Inserts will now fail for normal users, preventing spam.
-- System triggers (SECURITY DEFINER) will still work as they bypass RLS.
