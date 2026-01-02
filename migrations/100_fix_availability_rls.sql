-- Fix RLS policies for sitter_availability table
-- The table uses sitter_id as a FK to registro_petmate(id), not auth.users(id).
-- The previous policies compared auth.uid() directly to sitter_id, which fails.

-- Drop existing policies
DROP POLICY IF EXISTS "Sitters can delete availability" ON public.sitter_availability;
DROP POLICY IF EXISTS "Sitters can insert availability" ON public.sitter_availability;
DROP POLICY IF EXISTS "Sitters can select own availability" ON public.sitter_availability;

-- Create corrected policies

-- DELETE: Allow if the sitter_id belongs to the current user's profile
CREATE POLICY "Sitters can delete availability"
ON public.sitter_availability
FOR DELETE
TO authenticated
USING (
  sitter_id IN (
    SELECT id FROM public.registro_petmate WHERE auth_user_id = auth.uid()
  )
);

-- INSERT: Allow if the sitter_id belongs to the current user's profile
CREATE POLICY "Sitters can insert availability"
ON public.sitter_availability
FOR INSERT
TO authenticated
WITH CHECK (
  sitter_id IN (
    SELECT id FROM public.registro_petmate WHERE auth_user_id = auth.uid()
  )
);

-- SELECT: Allow if the sitter_id belongs to the current user's profile (redundant with public view but good for completeness)
CREATE POLICY "Sitters can select own availability"
ON public.sitter_availability
FOR SELECT
TO authenticated
USING (
  sitter_id IN (
    SELECT id FROM public.registro_petmate WHERE auth_user_id = auth.uid()
  )
);
