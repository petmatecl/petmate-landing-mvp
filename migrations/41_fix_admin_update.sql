-- Permitir a los administradores ACTUALIZAR la tabla registro_petmate (para aprobar/rechazar)
-- Reemplaza la lista con los emails de admin autorizados

create policy "Admins can UPDATE profiles"
  on public.registro_petmate
  for update
  using (
    auth.jwt() ->> 'email' in (
        'admin@petmate.cl', 
        'aldo@petmate.cl', 
        'canocortes@gmail.com', 
        'eduardo.a.cordova.d@gmail.com',
        'acanocts@gmail.com' -- Agregado basado en screenshot del usuario
    )
  );

-- También asegurarnos que la política de SELECT incluya a todos estos (por si acaso la anterior estaba incompleta)
DROP POLICY IF EXISTS "Admins can view ALL profiles" ON public.registro_petmate;

create policy "Admins can view ALL profiles"
  on public.registro_petmate
  for select
  using (
    auth.jwt() ->> 'email' in (
        'admin@petmate.cl', 
        'aldo@petmate.cl', 
        'canocortes@gmail.com', 
        'eduardo.a.cordova.d@gmail.com',
        'acanocts@gmail.com'
    )
  );
