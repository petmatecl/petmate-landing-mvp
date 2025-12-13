-- Agrega columnas para el perfil extendido de PetMates
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS descripcion TEXT,
ADD COLUMN IF NOT EXISTS ocupacion TEXT,
ADD COLUMN IF NOT EXISTS edad INTEGER,
ADD COLUMN IF NOT EXISTS tiene_mascotas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sexo TEXT; -- 'Masculino', 'Femenino', 'Otro'
