-- Comprehensive repair for missing columns to prevent schema cache errors

ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS tipo_vivienda TEXT DEFAULT 'casa',
ADD COLUMN IF NOT EXISTS tarifa_servicio_en_casa INTEGER,
ADD COLUMN IF NOT EXISTS tarifa_servicio_a_domicilio INTEGER,
ADD COLUMN IF NOT EXISTS cuida_perros BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cuida_gatos BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS servicio_a_domicilio BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS servicio_en_casa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- Force schema reload for PostgREST
NOTIFY pgrst, 'reload schema';
