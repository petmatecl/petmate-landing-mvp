-- Asegurar que los administradores pueden ver todos los perfiles en registro_petmate
CREATE POLICY "Admins pueden ver todos los perfiles"
ON public.registro_petmate
FOR SELECT
USING (
  auth.email() IN (
    'acanocts@gmail.com',
    'admin@petmate.cl',
    'aldo@petmate.cl'
  )
);
