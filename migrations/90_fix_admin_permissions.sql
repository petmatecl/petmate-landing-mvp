-- Admins defined in React code:
-- "admin@petmate.cl", "aldo@petmate.cl", "canocortes@gmail.com", "eduardo.a.cordova.d@gmail.com", "acanocts@gmail.com"

-- 1. registro_petmate
DROP POLICY IF EXISTS "Admins can view ALL profiles" ON public.registro_petmate;
CREATE POLICY "Admins can view ALL profiles"
  ON public.registro_petmate
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@petmate.cl', 
      'aldo@petmate.cl', 
      'canocortes@gmail.com', 
      'eduardo.a.cordova.d@gmail.com', 
      'acanocts@gmail.com'
    )
  );

-- 2. viajes
DROP POLICY IF EXISTS "Admins can view ALL trips" ON public.viajes;
CREATE POLICY "Admins can view ALL trips"
  ON public.viajes
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@petmate.cl', 
      'aldo@petmate.cl', 
      'canocortes@gmail.com', 
      'eduardo.a.cordova.d@gmail.com', 
      'acanocts@gmail.com'
    )
  );

-- 3. mascotas
DROP POLICY IF EXISTS "Admins can view ALL pets" ON public.mascotas;
CREATE POLICY "Admins can view ALL pets"
  ON public.mascotas
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@petmate.cl', 
      'aldo@petmate.cl', 
      'canocortes@gmail.com', 
      'eduardo.a.cordova.d@gmail.com', 
      'acanocts@gmail.com'
    )
  );

-- 4. postulaciones
DROP POLICY IF EXISTS "Admins can view ALL applications" ON public.postulaciones;
CREATE POLICY "Admins can view ALL applications"
  ON public.postulaciones
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' IN (
      'admin@petmate.cl', 
      'aldo@petmate.cl', 
      'canocortes@gmail.com', 
      'eduardo.a.cordova.d@gmail.com', 
      'acanocts@gmail.com'
    )
  );
