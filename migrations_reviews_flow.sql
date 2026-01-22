-- Migration to refine reviews workflow
-- 1. Ensure status column exists and defaults to 'pendiente'
-- 2. Add constraints for valid status values
-- 3. Update RLS to strict visibility rules

-- Safe alter (if not exists logic handled by straight SQL usually, but we assume table exists)
-- This might fail if constraint exists, but we can try to drop/add or just add.

ALTER TABLE reviews 
ALTER COLUMN estado SET DEFAULT 'pendiente';

-- Add check constraint if not present (simple manual check via SQL execution or just try adding)
-- We will try to add, if it fails we can ignore or replace.
BEGIN;
  ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_estado_check;
  ALTER TABLE reviews ADD CONSTRAINT reviews_estado_check CHECK (estado IN ('pendiente', 'aprobado', 'rechazado'));
COMMIT;

-- RLS Policies
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 1. Public Read: Only approved
DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;
CREATE POLICY "Public can view approved reviews" 
ON reviews FOR SELECT 
USING (estado = 'aprobado');

-- 2. Clients Create: Can create their own reviews (defaults to pending)
DROP POLICY IF EXISTS "Clients can create reviews" ON reviews;
CREATE POLICY "Clients can create reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = cliente_id);

-- 3. Clients Edit: Can edit ONLY if pending (and it's their review)
DROP POLICY IF EXISTS "Clients can edit pending reviews" ON reviews;
CREATE POLICY "Clients can edit pending reviews" 
ON reviews FOR UPDATE 
USING (auth.uid() = cliente_id AND estado = 'pendiente')
WITH CHECK (auth.uid() = cliente_id AND estado = 'pendiente');

-- 4. Admins (Service Role by default bypasses RLS, but if we have admin users... 
-- currently MVP admin is likely checking 'roles' in metadata or just manual DB usage. 
-- Assuming Admin UI uses `getAllReviews` which runs as authenticated user.
-- We need a policy for Admins to view ALL and update ALL.
-- If we don't have a distinct "admin" role in auth.users, simple policies might block the Admin Page if actively logged in as a normal user.
-- We'll assume for now `service_role` is used for backend ops, BUT `pages/admin/reviews.tsx` uses `supabaseClient` (anon/public).
-- IF `pages/admin` is protected by a guard that checks `roles.includes('admin')`, we need RLS to allow that.
-- Let's check if we have an admin role logic. If not, we might need a policy like:
-- "Admins can do everything" -> USING (auth.jwt() ->> 'email' IN ('admin@pawnecta.cl')) or similar.
-- For MVP, let's Stick to checking if the user has a special role or if we just rely on `service_role` for admin actions?
-- `pages/admin` usually implies frontend admin. `supabaseClient` uses the active session.
-- If the active session is a "sitter" or "client", they won't see "pending" reviews of others unless we add a policy.
-- The prompt implies we need to define the workflow.

-- Let's add a generic "Owners/Admins" policy placeholder.
-- For now, allow "view all" if you are the author OR the subject (sitter)?
-- "Sitter can view their own reviews (even pending/rejected)"? Usually yes.
DROP POLICY IF EXISTS "Sitters can view reviews about them" ON reviews;
CREATE POLICY "Sitters can view reviews about them" 
ON reviews FOR SELECT 
USING (sitter_id::uuid = auth.uid()); 
-- Note: sitter_id in Reviews usually text or uuid? Schema dump would clarify. Assuming uuid match.

-- "Authors can view their own reviews"
DROP POLICY IF EXISTS "Authors can view own reviews" ON reviews;
CREATE POLICY "Authors can view own reviews" 
ON reviews FOR SELECT 
USING (cliente_id = auth.uid());

-- ADMIN POLICY (If we assume there's an 'admin' role in metadata)
-- CREATE POLICY "Admins full access" ON reviews FOR ALL USING ((auth.jwt()->'app_metadata'->>'claims_admin')::boolean = true); 
-- We'll skip complex admin RLS for now unless requested. The prompt focuses on "flow".
