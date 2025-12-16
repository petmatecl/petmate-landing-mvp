-- Recuperación de esquema: Asegurar que existan las columnas críticas para el buscador y el admin
-- Esto es necesario porque algunas migraciones anteriores (03, 11) parecen no haberse ejecutado en tu BD.

ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS auth_user_id uuid,
ADD COLUMN IF NOT EXISTS modalidad TEXT DEFAULT 'ambos', -- 'en_casa_petmate', 'a_domicilio', 'ambos'
ADD COLUMN IF NOT EXISTS acepta_perros BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS acepta_gatos BOOLEAN DEFAULT TRUE;

-- Asegurar indices si no existen (opcional pero bueno para performance)
CREATE INDEX IF NOT EXISTS idx_registro_petmate_auth_user_id ON public.registro_petmate(auth_user_id);
