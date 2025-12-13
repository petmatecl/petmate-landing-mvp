-- 1. DATA FIX: Ensure auth linkage exists (runs as admin in SQL Editor)
UPDATE public.registro_petmate
SET auth_user_id = u.id
FROM auth.users u
WHERE public.registro_petmate.email = u.email
AND public.registro_petmate.auth_user_id IS NULL;

-- 2. SECURITY FIX: Simplified Policy (No access to auth.users table)
DROP POLICY IF EXISTS "Users can update own profile" ON public.registro_petmate;

CREATE POLICY "Users can update own profile"
ON public.registro_petmate
FOR UPDATE
TO authenticated
USING ( auth_user_id = auth.uid() )
WITH CHECK ( auth_user_id = auth.uid() );
