-- Agregar columnas para verificación de seguridad

ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS certificado_antecedentes TEXT,
ADD COLUMN IF NOT EXISTS aprobado BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.registro_petmate.certificado_antecedentes IS 'URL del documento PDF/Imagen en Storage';
COMMENT ON COLUMN public.registro_petmate.aprobado IS 'Si es FALSE, el perfil no es público. Requiere revisión de admin.';

-- Actualizar política RLS (si existe) para que solo perfiles aprobados sean públicos
-- (Esto se maneja a nivel de aplicación en explorar.tsx por ahora, pero idealmente en RLS)
