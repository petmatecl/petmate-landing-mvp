-- Migration: Enable Dual Roles (Client + Sitter)
-- Description: 
-- 1. Add 'roles' column (text[]) to store multiple roles.
-- 2. Migrate existing 'rol' data to 'roles'.
-- 3. Update uniqueness constraints to be global (User-based) instead of Role-based.

-- 1. Add roles column
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['cliente'];

-- 2. Migrate existing data
-- If rol is 'petmate', set roles to ['petmate'] (or ['cliente', 'petmate']? 
-- Usually if they were just petmate, they might want to be client too, but let's stick to what they had).
-- Actually, let's just migrate the current string to an array.
UPDATE public.registro_petmate
SET roles = ARRAY[rol]
WHERE roles = ARRAY['cliente'] AND rol IS NOT NULL;

-- 3. Drop old role-based unique indexes
DROP INDEX IF EXISTS idx_unique_rut_rol;
DROP INDEX IF EXISTS idx_unique_email_rol;

-- 4. Create new GLOBAL unique indexes
-- This ensures one RUT/Email per PERSON, regardless of how many roles they have.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_rut_global
ON public.registro_petmate (rut)
WHERE rut IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email_global
ON public.registro_petmate (email);

-- 5. (Optional) Comment on column
COMMENT ON COLUMN public.registro_petmate.roles IS 'Array of active roles for the user (e.g. ["cliente", "petmate"])';
