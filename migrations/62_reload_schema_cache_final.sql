-- Ensure telefono column exists just in case
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS telefono text;

-- Force schema cache reload for PostgREST to pick up the new column
NOTIFY pgrst, 'reload schema';
