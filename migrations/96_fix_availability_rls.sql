-- Fix RLS and Schema for sitter_availability

-- 1. Ensure sitter_id is NOT NULL
ALTER TABLE public.sitter_availability 
ALTER COLUMN sitter_id SET NOT NULL;

-- 2. Drop ambiguous policy
DROP POLICY IF EXISTS "Sitters can manage own availability" ON public.sitter_availability;

-- 3. Create explicit policies
CREATE POLICY "Sitters can insert availability"
ON public.sitter_availability
FOR INSERT
WITH CHECK (auth.uid() = sitter_id);

CREATE POLICY "Sitters can delete availability"
ON public.sitter_availability
FOR DELETE
USING (auth.uid() = sitter_id);

CREATE POLICY "Sitters can select own availability"
ON public.sitter_availability
FOR SELECT
USING (auth.uid() = sitter_id);

-- (Public select policy already exists, keep it)
-- "Public can view availability"
