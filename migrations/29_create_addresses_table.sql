-- Tabla para almacenar direcciones de los clientes
create table if not exists public.direcciones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  nombre text not null default 'Casa', -- Ej: "Casa", "Depto Playa", etc.
  direccion_completa text not null, -- El string completo de la dirección
  calle text,
  numero text,
  comuna text,
  region text,
  codigo_postal text,
  latitud double precision,
  longitud double precision,
  notas text, -- Instrucciones adicionales (ej: "tocar timbre 202")
  es_principal boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Políticas de seguridad (RLS)
alter table public.direcciones enable row level security;

-- Política: El cliente puede gestionar sus propias direcciones
create policy "Clientes pueden gestionar sus propias direcciones"
  on public.direcciones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
