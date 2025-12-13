-- Agregar preferencias de cuidado a la tabla registro_petmate

ALTER TABLE public.registro_petmate 
ADD COLUMN IF NOT EXISTS cuida_perros BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cuida_gatos BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS servicio_en_casa BOOLEAN DEFAULT FALSE, -- Cuidado en casa del PetMate
ADD COLUMN IF NOT EXISTS servicio_a_domicilio BOOLEAN DEFAULT FALSE; -- Cuidado en casa del Cliente

-- Actualizar comentarios para documentación
COMMENT ON COLUMN public.registro_petmate.servicio_en_casa IS 'Hospedaje: El PetMate recibe a la mascota en su casa';
COMMENT ON COLUMN public.registro_petmate.servicio_a_domicilio IS 'A domicilio: El PetMate va a la casa del dueño';
