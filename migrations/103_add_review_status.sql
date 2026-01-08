-- Add estado column to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado'));

-- Update existing reviews to approved (assuming existing ones are valid for now)
UPDATE reviews SET estado = 'aprobado' WHERE estado IS NULL;
