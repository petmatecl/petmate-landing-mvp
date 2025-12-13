ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS redes_sociales jsonb DEFAULT '{}';
