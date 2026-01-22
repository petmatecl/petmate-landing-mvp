-- Enable RLS (just in case)
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON viajes;
DROP POLICY IF EXISTS "Permitir ver viajes publicados y propios" ON viajes;

-- Create comprehensive read policy
CREATE POLICY "Permitir lectura publica de viajes"
ON viajes FOR SELECT
USING (
  estado IN ('pendiente', 'pendiente_pago', 'publicado') -- Publicly visible
  OR
  auth.uid() = user_id -- Own trips
  OR
  auth.uid() = sitter_id -- Assigned trips
);

-- Ensure Sitters can see trips they are not assigned to (for applying)
-- The above 'publicado' check covers unassigned trips.
-- But if a trip is assigned to someone else, it might be hidden?
-- We want Sitters to see 'available' trips.
-- Availalbe trips usually have sitter_id IS NULL.
-- But my previous query filtered by `status`.

-- Let's add a broader policy for authenticated users if needed, 
-- or stick to the logic:
-- "Anyone can see trips that are 'publicado', 'pendiente', etc."

-- Also allow update/insert for relevant users?
-- Keeping it to SELECT for fixing visibility first.
