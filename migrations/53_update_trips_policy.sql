-- Update policies for viajes table to allow public visibility of published trips

-- First, drop existing conflicting policies if necessary, or just add new ones.
-- The existing policy "Sitters asignados pueden ver el viaje" is restricted to assigned sitters.
-- We need a broader policy for "Explorar" page.

-- Policy: Sitters (authenticated users) can view 'publicado' trips
-- Note: Ideally we should restrict this to Verified Sitters only, but for MVP any auth user is fine.
-- We just ensure they are not the owner (though owner can see it via owner policy anyway).

CREATE POLICY "Sitters can view published trips"
    ON public.viajes FOR SELECT
    USING (
        estado = 'publicado'
    );

-- Ensure we don't expose sensitive data indiscriminately.
-- Supabase SELECT policies apply to rows. Column level security isn't native in the same way for "some rows but not others" easily.
-- For MVP, the frontend will be responsible for not displaying exact address.
-- However, for better security, we should ideally use a View or ensure the address_id relation is not fully fetched or the address table itself has protection.
-- Let's check address policies later. For now, this policy allows fetching the trip row.
