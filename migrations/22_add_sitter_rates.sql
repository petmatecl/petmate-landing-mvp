ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS tarifa_servicio_en_casa integer,
ADD COLUMN IF NOT EXISTS tarifa_servicio_a_domicilio integer;
