-- Add fotos_galeria column to mascotas table
ALTER TABLE public.mascotas
ADD COLUMN IF NOT EXISTS fotos_galeria text[] DEFAULT '{}';

COMMENT ON COLUMN public.mascotas.fotos_galeria IS 'Array de URLs de la galería de fotos de la mascota';
