-- Add new fields to the existing pets table
ALTER TABLE public.mascotas
ADD COLUMN IF NOT EXISTS tiene_chip boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS chip_id text,
ADD COLUMN IF NOT EXISTS vacunas_al_dia boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
ADD COLUMN IF NOT EXISTS enfermedades text,
ADD COLUMN IF NOT EXISTS trato_especial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trato_especial_desc text,
ADD COLUMN IF NOT EXISTS foto_mascota text;

-- Add comment to document columns
COMMENT ON COLUMN public.mascotas.fecha_nacimiento IS 'Fecha de nacimiento de la mascota';
COMMENT ON COLUMN public.mascotas.trato_especial_desc IS 'Detalles sobre el trato especial requerido';
