-- Agregar columnas para limitar cantidad de mascotas
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS max_mascotas_en_casa INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS max_mascotas_domicilio INTEGER DEFAULT 2;
