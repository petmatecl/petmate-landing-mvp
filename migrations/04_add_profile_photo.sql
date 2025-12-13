-- Agregar columna para la foto de perfil del PetMate

ALTER TABLE public.registro_petmate 
ADD COLUMN IF NOT EXISTS foto_perfil TEXT;

COMMENT ON COLUMN public.registro_petmate.foto_perfil IS 'URL de la foto de perfil almacenada en Supabase Storage';
