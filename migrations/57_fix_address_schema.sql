-- Add address columns if they don't exist
ALTER TABLE registro_petmate 
ADD COLUMN IF NOT EXISTS direccion_completa text,
ADD COLUMN IF NOT EXISTS latitud double precision,
ADD COLUMN IF NOT EXISTS longitud double precision,
ADD COLUMN IF NOT EXISTS calle text,
ADD COLUMN IF NOT EXISTS numero text;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
