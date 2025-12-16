-- Agregar columnas para videos y consentimiento RRSS en la tabla de perfil general
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS consentimiento_rrss boolean DEFAULT false;

-- Agregar latitud y longitud para mostrar mapa aproximado del Sitter
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS latitud double precision,
ADD COLUMN IF NOT EXISTS longitud double precision;
