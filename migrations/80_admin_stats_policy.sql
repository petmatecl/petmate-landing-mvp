-- Allow admins to see all profiles in registro_petmate for stats counting
CREATE POLICY "Admins can view all profiles"
ON public.registro_petmate
FOR SELECT
USING (
  auth.email() IN ('admin@petmate.cl', 'aldo@petmate.cl', 'canocortes@gmail.com', 'eduardo.a.cordova.d@gmail.com', 'acanocts@gmail.com')
);
