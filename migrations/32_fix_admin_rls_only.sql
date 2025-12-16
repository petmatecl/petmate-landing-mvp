-- FIX CORREGIDO PARA VISIBILIDAD DE ADMIN
-- (La columna 'tipo_usuario' no existe, así que usaremos 'rol' en el código y solo aplicaremos RLS aquí)

-- 1. RLS Robusta para Admins (ignorando mayúsculas)
-- Eliminamos política anterior si existe
DROP POLICY IF EXISTS "Admins can view ALL profiles" ON public.registro_petmate;

-- Creamos la política de acceso total para los admins
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
