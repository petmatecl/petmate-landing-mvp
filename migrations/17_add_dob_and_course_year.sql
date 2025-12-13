ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS ano_curso TEXT;
