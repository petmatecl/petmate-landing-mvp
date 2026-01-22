-- Migration to add Sitter Policy and Home Characteristic fields
-- Based on user request for "Características del hogar" and "Políticas de mascotas"

ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS acepta_cachorros BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS acepta_sin_esterilizar BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS permite_cama BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS permite_sofa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mascotas_no_encerradas BOOLEAN DEFAULT true, -- Default true as it's a positive trait
ADD COLUMN IF NOT EXISTS capacidad_maxima INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS supervision_24_7 BOOLEAN DEFAULT false;

-- Comment on columns for clarity
COMMENT ON COLUMN public.registro_petmate.acepta_cachorros IS 'Se aceptan cachorros (menores de 12 meses)';
COMMENT ON COLUMN public.registro_petmate.acepta_sin_esterilizar IS 'Se aceptan perros no esterilizados';
COMMENT ON COLUMN public.registro_petmate.permite_cama IS 'Se permite subir a la cama';
COMMENT ON COLUMN public.registro_petmate.permite_sofa IS 'Se permite uso de sofás';
COMMENT ON COLUMN public.registro_petmate.capacidad_maxima IS 'Capacidad máxima de mascotas';
