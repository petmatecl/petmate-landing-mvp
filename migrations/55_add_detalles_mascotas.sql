-- Add detalles_mascotas column to registro_petmate
ALTER TABLE registro_petmate 
ADD COLUMN IF NOT EXISTS detalles_mascotas jsonb DEFAULT '[]'::jsonb;
