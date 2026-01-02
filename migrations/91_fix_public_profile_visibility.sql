-- 91_fix_public_profile_visibility.sql
-- Fix "Perfil no disponible" by allowing public read access to registered profiles
-- This is necessary for Client Dashboard > Postulantes modal and Public Profile pages

-- Drop existing restrictive policies if necessary (be careful not to remove Admin one unless replaced)
-- We want to ADD a policy for public access.

-- Policy: Anyone can read basic profile info
-- Note: schema cache might need reload after this.

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.registro_petmate;

CREATE POLICY "Anyone can view profiles"
  ON public.registro_petmate
  FOR SELECT
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.registro_petmate ENABLE ROW LEVEL SECURITY;
