-- Fix Client Visibility Policy
-- Ensuring clients can SELECT/ALL their own trips explicitly.

-- Drop existing policy if it exists to avoid conflicts or duplicates if named differently previously
DROP POLICY IF EXISTS "Clientes pueden gestionar sus propios viajes" ON public.viajes;

-- Re-create policy covering ALL operations
CREATE POLICY "Clientes pueden gestionar sus propios viajes"
ON public.viajes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
