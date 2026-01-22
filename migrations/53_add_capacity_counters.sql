-- Add capacity columns for dogs and cats
ALTER TABLE registro_petmate
ADD COLUMN IF NOT EXISTS capacidad_perros INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacidad_gatos INTEGER DEFAULT 0;

-- Optional: initialize them based on current capacity if needed, but default 0 is safer.
-- We could potentially migrate old 'capacidad_maxima' to 'capacidad_perros' if we assume most are dogs, 
-- but let's leave them as 0 to force sitters to set them explicitly for clarity.
