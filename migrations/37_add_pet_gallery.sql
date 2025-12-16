-- Add gallery photos column to pets table
ALTER TABLE public.mascotas
ADD COLUMN IF NOT EXISTS fotos_galeria text[];

COMMENT ON COLUMN public.mascotas.fotos_galeria IS 'Array of URLs for pet gallery photos (max 3)';
