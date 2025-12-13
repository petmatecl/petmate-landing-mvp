-- Enable authenticated users to update their own profile
-- This requires checking 'auth_user_id' matches the current user's UID

CREATE POLICY "Users can update own profile"
ON public.registro_petmate
FOR UPDATE
TO authenticated
USING ( auth_user_id = auth.uid() )
WITH CHECK ( auth_user_id = auth.uid() );
