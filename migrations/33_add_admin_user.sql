-- ACTUALIZAR PERMISOS ADMIN PARA NUEVO USUARIO
-- Se agrega: eduardo.a.cordova.d@gmail.com

-- 1. Eliminar política vieja
DROP POLICY IF EXISTS "Admins can view ALL profiles" ON public.registro_petmate;

-- 2. Crear nueva política con la lista actualizada
CREATE POLICY "Admins can view ALL profiles"
ON public.registro_petmate
FOR SELECT
USING (
  lower(auth.jwt() ->> 'email') IN (
    'admin@petmate.cl', 
    'aldo@petmate.cl', 
    'canocortes@gmail.com',
    'eduardo.a.cordova.d@gmail.com'
  )
);
