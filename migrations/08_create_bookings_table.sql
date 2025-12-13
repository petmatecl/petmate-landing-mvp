-- Tabla para almacenar reservas (bookings)
create table if not exists public.reservas (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references auth.users(id) not null,
  sitter_id uuid references auth.users(id) not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'rechazada', 'completada', 'cancelada')),
  total integer not null default 0,
  mensaje_inicial text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de seguridad (RLS)
alter table public.reservas enable row level security;

-- Política: El cliente puede ver sus propias reservas
create policy "Clientes pueden ver sus propias reservas"
  on public.reservas for select
  using (auth.uid() = cliente_id);

-- Política: El sitter puede ver las reservas asignadas a él
create policy "Sitters pueden ver sus propias reservas asignadas"
  on public.reservas for select
  using (auth.uid() = sitter_id);

-- Política: Clientes pueden crear reservas
create policy "Clientes pueden crear reservas"
  on public.reservas for insert
  with check (auth.uid() = cliente_id);

-- Política: Sitters pueden actualizar estado de sus reservas
create policy "Sitters pueden actualizar estado de sus reservas"
  on public.reservas for update
  using (auth.uid() = sitter_id);
