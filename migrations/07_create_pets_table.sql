-- Tabla para almacenar mascotas de usuarios (clientes)
create table if not exists public.mascotas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  nombre text not null,
  tipo text not null check (tipo in ('perro', 'gato')),
  edad int,
  raza text,
  descripcion text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de seguridad (RLS)
alter table public.mascotas enable row level security;

-- Política: El usuario puede ver sus propias mascotas
create policy "Usuarios pueden ver sus propias mascotas"
  on public.mascotas for select
  using (auth.uid() = user_id);

-- Política: El usuario puede insertar sus propias mascotas
create policy "Usuarios pueden crear sus propias mascotas"
  on public.mascotas for insert
  with check (auth.uid() = user_id);

-- Política: El usuario puede actualizar sus propias mascotas
create policy "Usuarios pueden actualizar sus propias mascotas"
  on public.mascotas for update
  using (auth.uid() = user_id);

-- Política: El usuario puede eliminar sus propias mascotas
create policy "Usuarios pueden eliminar sus propias mascotas"
  on public.mascotas for delete
  using (auth.uid() = user_id);
