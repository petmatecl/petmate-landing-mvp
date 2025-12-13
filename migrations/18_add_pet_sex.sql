ALTER TABLE mascotas
ADD COLUMN IF NOT EXISTS sexo text CHECK (sexo IN ('macho', 'hembra'));
