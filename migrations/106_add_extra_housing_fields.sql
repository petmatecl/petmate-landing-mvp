ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS dimensiones_vivienda text,
ADD COLUMN IF NOT EXISTS fotos_vivienda text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tiene_patio boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_malla boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tiene_ninos boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fumador boolean DEFAULT false;

-- Force update schema cache
NOTIFY pgrst, 'reload schema';
