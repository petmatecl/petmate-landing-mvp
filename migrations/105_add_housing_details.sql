ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS dimensiones_vivienda text,
ADD COLUMN IF NOT EXISTS fotos_vivienda text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tiene_patio boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_malla boolean DEFAULT false;
