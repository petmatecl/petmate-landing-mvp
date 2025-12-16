-- Permitir a admins ver todas las mascotas
CREATE POLICY "Admins pueden ver todas las mascotas"
ON public.mascotas
FOR SELECT
USING (
  auth.email() IN (
    'acanocts@gmail.com',
    'admin@petmate.cl'
  )
);
