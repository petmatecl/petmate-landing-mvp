-- Habilitar lectura pública para perfiles PetMate
-- Esto corrige el error 404/Perfil no encontrado al ver detalles

-- Habilitar RLS en la tabla (si no estaba ya)
ALTER TABLE public.registro_petmate ENABLE ROW LEVEL SECURITY;

-- Crear política de lectura pública (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'registro_petmate' 
        AND policyname = 'Permitir lectura publica de petmates'
    ) THEN
        CREATE POLICY "Permitir lectura publica de petmates" 
        ON public.registro_petmate 
        FOR SELECT 
        USING (true);
    END IF;
END
$$;
