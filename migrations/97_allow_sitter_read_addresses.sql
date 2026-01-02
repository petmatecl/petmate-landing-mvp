-- Permitir a los sitters ver las direcciones asociadas a sus viajes asignados
-- Esto es necesario para que puedan ver dónde realizar el servicio (hospedaje/domicilio)

create policy "Sitters pueden ver direcciones de sus viajes"
  on public.direcciones for select
  using (
    exists (
      select 1 from public.viajes v
      where v.direccion_id = direcciones.id
      and v.sitter_id = auth.uid()
    )
  );
