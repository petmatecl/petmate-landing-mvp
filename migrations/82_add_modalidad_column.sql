-- Add modalidad column
ALTER TABLE public.registro_petmate 
ADD COLUMN IF NOT EXISTS modalidad text;

-- Backfill modalidad based on booleans
UPDATE public.registro_petmate
SET modalidad = CASE
    WHEN servicio_en_casa = true AND servicio_a_domicilio = true THEN 'ambos'
    WHEN servicio_en_casa = true THEN 'en_casa_petmate'
    WHEN servicio_a_domicilio = true THEN 'a_domicilio'
    ELSE null
END
WHERE rol = 'petmate';
