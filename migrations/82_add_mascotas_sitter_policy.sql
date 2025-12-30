-- Allow anyone to view pets that are part of a published trip
-- This is necessary for sitters to see pet details (size, type) in the 'Explorar' page
-- Casting UUID id to text to match text[] array in viajes

create policy "Ver mascotas de viajes publicados"
on "public"."mascotas"
as permissive
for select
to public
using (
  exists (
    select 1
    from viajes
    where mascotas.id::text = ANY(viajes.mascotas_ids)
    and viajes.estado = 'publicado'
  )
);
