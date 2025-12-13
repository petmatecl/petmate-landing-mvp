-- Agrega columnas para filtrado de servicios
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'ambos', -- 'en_casa_petmate', 'a_domicilio', 'ambos'
ADD COLUMN IF NOT EXISTS acepta_perros BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS acepta_gatos BOOLEAN DEFAULT TRUE;

-- (Opcional) Actualizar registros existentes para tener datos de prueba
-- UPDATE public.registro_petmate SET modalidad = 'ambos', acepta_perros = true, acepta_gatos = true WHERE modalidad IS NULL;
