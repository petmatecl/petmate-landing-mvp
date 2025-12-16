-- Agregar estado 'solicitado' a la tabla de viajes
-- Esto permite que un viaje pase de 'borrador' o 'publicado' a 'solicitado' cuando se asigna un Sitter.

ALTER TABLE public.viajes
DROP CONSTRAINT IF EXISTS viajes_estado_check;

ALTER TABLE public.viajes
ADD CONSTRAINT viajes_estado_check 
CHECK (estado IN ('borrador', 'publicado', 'solicitado', 'reservado', 'completado', 'cancelado'));
