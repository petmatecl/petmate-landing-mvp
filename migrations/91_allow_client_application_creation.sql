create policy "Clients can create applications for their own trips"
on "public"."postulaciones"
as permissive
for insert
to public
with check (
  exists (
    select 1
    from viajes
    where viajes.id = postulaciones.viaje_id
    and viajes.user_id = auth.uid()
  )
);
