-- PERMITIR QUE ADMINS VEAN TODOS LOS VIAJES
-- Tabla: 'viajes'

-- Política para que los admins puedan hacer SELECT en viajes
CREATE POLICY "Admins can view ALL trips"
ON public.viajes
FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') IN (
    'admin@petmate.cl', 
    'aldo@petmate.cl', 
    'canocortes@gmail.com',
    'eduardo.a.cordova.d@gmail.com'
  )
);
