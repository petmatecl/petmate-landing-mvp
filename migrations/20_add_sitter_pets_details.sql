ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS detalles_mascotas jsonb DEFAULT '[]';
