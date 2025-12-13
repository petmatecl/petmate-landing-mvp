-- 1. DATA FIX: Link existing profiles to auth users if missing
-- This handles cases where the user was created but auth_user_id wasn't set on the profile
UPDATE public.registro_petmate
SET auth_user_id = u.id
FROM auth.users u
WHERE public.registro_petmate.email = u.email
AND public.registro_petmate.auth_user_id IS NULL;

-- 2. SECURITY FIX: Reset and strengthen Update Policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.registro_petmate;

CREATE POLICY "Users can update own profile"
ON public.registro_petmate
FOR UPDATE
TO authenticated
USING (
    -- Allow if auth_user_id matches
    auth_user_id = auth.uid()
    -- OR if email matches the logged in user's email (fallback)
    OR email = (select email from auth.users where id = auth.uid())
)
WITH CHECK (
    auth_user_id = auth.uid()
    OR email = (select email from auth.users where id = auth.uid())
);
