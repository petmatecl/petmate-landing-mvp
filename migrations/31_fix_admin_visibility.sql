-- FIX COMPLETO PARA VISIBILIDAD DE ADMIN
-- Este script soluciona 3 problemas potenciales:
-- 1. Diferencia de nombres de columna (rol vs tipo_usuario)
-- 2. Permisos de RLS para el admin (case sensitive)
-- 3. Datos antiguos con columnas nulas

-- PASO 1: Asegurar que la columna 'tipo_usuario' existe y tiene datos correctos
-- Si usaste 'rol' en el registro pero 'tipo_usuario' en el admin, hay que sincronizarlos.
DO $$ 
BEGIN
    -- Si existe la columna 'rol' pero 'tipo_usuario' está vacía o nula, copiamos los datos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registro_petmate' AND column_name = 'rol') THEN
        UPDATE public.registro_petmate
        SET tipo_usuario = rol
        WHERE tipo_usuario IS NULL AND rol IS NOT NULL;
    END IF;
END $$;

-- PASO 2: RLS (Políticas de Seguridad) Robusta para Admins
-- Primero eliminamos la política anterior para evitar conflictos o duplicados
DROP POLICY IF EXISTS "Admins can view ALL profiles" ON public.registro_petmate;

-- Creamos una política que ignora mayúsculas/minúsculas en el email del admin
CREATE POLICY "Admins can view ALL profiles"
ON public.registro_petmate
FOR SELECT
USING (
  lower(auth.jwt() ->> 'email') IN (
    'admin@petmate.cl', 
    'aldo@petmate.cl', 
    'canocortes@gmail.com'
  )
);

-- PASO 3: (Opcional pero recomendado) Actualizar usuarios antiguos sin tipo
-- Si hay usuarios sin 'tipo_usuario' ni 'rol', asumimos que son 'cliente' por defecto para que aparezcan
UPDATE public.registro_petmate
SET tipo_usuario = 'cliente'
WHERE tipo_usuario IS NULL;
