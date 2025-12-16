-- Tabla para almacenar los viajes de los clientes
create table if not exists public.viajes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  fecha_inicio date,
  fecha_fin date,
  servicio text check (servicio in ('domicilio', 'hospedaje')),
  perros integer default 0,
  gatos integer default 0,
  mascotas_ids text[], -- Array de IDs de mascotas seleccionadas
  direccion_id uuid, -- Referencia futura a la tabla de direcciones
  sitter_id uuid references auth.users(id), -- Sitter asignado (opcional)
  estado text default 'borrador' check (estado in ('borrador', 'publicado', 'reservado', 'completado', 'cancelado')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de seguridad (RLS)
alter table public.viajes enable row level security;

-- Política: El cliente puede ver, crear, actualizar y borrar sus propios viajes
create policy "Clientes pueden gestionar sus propios viajes"
  on public.viajes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Política: Sitters pueden ver viajes publicados (para el futuro marketplace)
-- Por ahora restringido a solo el dueño o si está asignado
create policy "Sitters asignados pueden ver el viaje"
  on public.viajes for select
  using (auth.uid() = sitter_id);
