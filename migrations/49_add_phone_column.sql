-- Agregar columna telefono a la tabla registro_petmate
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS telefono text;
