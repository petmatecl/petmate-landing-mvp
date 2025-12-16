-- Asegurar acceso de lectura para administradores en registro_petmate
-- Esto permite que el dashboard de admin vea todos los usuarios (clientes y sitters)

-- 1. Política para Administradores (lectura total)
-- Reemplaza la lista de correos con los que uses realmente como admin
create policy "Admins can view ALL profiles"
  on public.registro_petmate
  for select
  using (
    auth.jwt() ->> 'email' in ('admin@petmate.cl', 'aldo@petmate.cl', 'canocortes@gmail.com')
  );

-- 2. Política para Lectura Pública (Opcional, si quieres que SEA público)
-- Si ya ejecutaste la migración 02, esto podría ser redundante, pero asegura el acceso.
-- create policy "Public profiles" on public.registro_petmate for select using (true);
