-- 1. Drop the incorrect Foreign Key pointing to auth.users
ALTER TABLE public.sitter_availability 
DROP CONSTRAINT IF EXISTS sitter_availability_sitter_id_fkey;

-- 2. Clean up data that would violate the new constraint
-- (Delete rows where sitter_id is NOT a valid registro_petmate id)
DELETE FROM public.sitter_availability
WHERE sitter_id NOT IN (SELECT id FROM public.registro_petmate);

-- 3. Add the correct Foreign Key pointing to registro_petmate
ALTER TABLE public.sitter_availability
ADD CONSTRAINT sitter_availability_sitter_id_fkey
FOREIGN KEY (sitter_id)
REFERENCES public.registro_petmate(id)
ON DELETE CASCADE;
