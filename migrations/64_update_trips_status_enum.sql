-- Modificar el check constraint de la tabla viajes para permitir nuevos estados
ALTER TABLE public.viajes DROP CONSTRAINT IF EXISTS viajes_estado_check;

ALTER TABLE public.viajes ADD CONSTRAINT viajes_estado_check 
CHECK (estado IN ('borrador', 'publicado', 'reservado', 'completado', 'cancelado', 'pendiente', 'solicitado', 'confirmado', 'rechazado'));
