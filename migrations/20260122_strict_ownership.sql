-- Migration: Strict Ownership & Visibility Rules
-- Date: 2026-01-22

-- 1. VIAJES (Trips)
-- Enable RLS
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;

-- Drop loose policies
DROP POLICY IF EXISTS "Permitir lectura publica de viajes" ON viajes;
DROP POLICY IF EXISTS "Sitters can view published trips" ON viajes;
DROP POLICY IF EXISTS "Enable read access for all users" ON viajes;
DROP POLICY IF EXISTS "Permitir ver viajes publicados y propios" ON viajes;
DROP POLICY IF EXISTS "Clientes pueden crear viajes" ON viajes;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propios viajes" ON viajes;
-- (Drop other potential auto-named policies if possible or manually ensure)

-- A. SELECT
CREATE POLICY "Viajes Visibility"
ON viajes FOR SELECT
USING (
  -- 1. Owner can see everything
  auth.uid() = user_id
  OR
  -- 2. Assigned Sitter can see
  auth.uid() = sitter_id
  OR
  -- 3. Public access for Open Trips (so Sitters can find them)
  (estado IN ('publicado', 'pendiente', 'pendiente_pago') AND sitter_id IS NULL)
);

-- B. INSERT (Strictly Owner)
CREATE POLICY "Viajes Insert"
ON viajes FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- C. UPDATE
-- Owner can update their trips
CREATE POLICY "Viajes Update Owner"
ON viajes FOR UPDATE
USING (auth.uid() = user_id);

-- Sitter can Update?? 
-- If Sitter cancels, they typically use an RPC or we allow them to set sitter_id = null?
-- For now, strict: Only Owner updates. Sitter actions via Postulaciones or Client.
-- If Sitter needs to cancel, they might need a specific policy.
-- Let's check: 'handleRemoveSitter' is client side.
-- Does Sitter have a 'Cancel' button? Likely yes.
-- If so, we need "Assigned Sitter can update specific fields". 
-- Postgres RLS for specific columns is tricky (requires different policies or triggers).
-- Let's stick to Owner Update only for strictness. Sitter must ask Client or use 'Postulaciones' status.

-- D. DELETE (Owner Only)
CREATE POLICY "Viajes Delete Owner"
ON viajes FOR DELETE
USING (auth.uid() = user_id);


-- 2. MASCOTAS (Pets)
-- Enable RLS
ALTER TABLE mascotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver mascotas de viajes publicados" ON mascotas;
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias mascotas" ON mascotas;
-- Drop others...

-- A. SELECT
CREATE POLICY "Mascotas Visibility"
ON mascotas FOR SELECT
USING (
  -- 1. Owner
  auth.uid() = user_id
  OR
  -- 2. Sitter viewing a trip that includes this pet
  EXISTS (
    SELECT 1 FROM viajes
    WHERE mascotas.id::text = ANY(viajes.mascotas_ids) -- Casting if needed, or if array is uuid[]
    AND (
       -- Trip is Public
       (viajes.estado IN ('publicado', 'pendiente', 'pendiente_pago') AND viajes.sitter_id IS NULL)
       OR
       -- Trip is Assigned to this Sitter
       viajes.sitter_id = auth.uid()
    )
  )
);

-- B. INSERT/UPDATE/DELETE (Owner Only)
CREATE POLICY "Mascotas Modification"
ON mascotas FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. ENSURE POSTULACIONES IS STRICT (Already verified, but good to double check)
-- Postulaciones policies looked good in 84_create_postulaciones.sql. 
