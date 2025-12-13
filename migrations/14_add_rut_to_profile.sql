-- Add RUT column to registro_petmate table
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS rut TEXT;
