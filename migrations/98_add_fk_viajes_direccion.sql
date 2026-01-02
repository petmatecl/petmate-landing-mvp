-- Add foreign key reference from viajes.direccion_id to direcciones.id
-- This allows PostgREST joins to work correctly
ALTER TABLE public.viajes
ADD CONSTRAINT fk_viajes_direccion
FOREIGN KEY (direccion_id)
REFERENCES public.direcciones(id)
ON DELETE SET NULL;
