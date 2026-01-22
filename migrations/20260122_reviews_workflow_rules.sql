-- Migration: Enforce Review Workflow Rules
-- Date: 2026-01-22

-- 1. Ensure Defaults and Constraints
ALTER TABLE reviews 
ALTER COLUMN estado SET DEFAULT 'pendiente';

-- Safe constraint add
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_estado_check') THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_estado_check CHECK (estado IN ('pendiente', 'aprobado', 'rechazado'));
    END IF;
END $$;

-- 2. Update RLS Policies for Workflow

-- Public/Anon Visibility: ONLY Approved
DROP POLICY IF EXISTS "Public can view approved reviews" ON reviews;
CREATE POLICY "Public can view approved reviews" 
ON reviews FOR SELECT 
USING (estado = 'aprobado');

-- Authors (Clients): Can View Own (Any Status)
DROP POLICY IF EXISTS "Authors can view own reviews" ON reviews;
CREATE POLICY "Authors can view own reviews" 
ON reviews FOR SELECT 
USING (cliente_id = auth.uid());

-- Authors (Clients): Can Insert Own (Default to Pending via Column Default)
DROP POLICY IF EXISTS "Clients can create reviews" ON reviews;
CREATE POLICY "Clients can create reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.uid() = cliente_id);

-- Authors (Clients): Can Update Own ONLY if Pending (Restricted Editing)
DROP POLICY IF EXISTS "Clients can edit pending reviews" ON reviews;
CREATE POLICY "Clients can edit pending reviews" 
ON reviews FOR UPDATE 
USING (auth.uid() = cliente_id AND estado = 'pendiente')
WITH CHECK (auth.uid() = cliente_id AND estado = 'pendiente');

-- Sitters: Can View Reviews About Them (Only Approved?)
-- Decision: Sitters should probably see "Approved" reviews about them.
-- They might care about "Pending" reviews? Usually strict marketplaces hide pending reviews from the provider to avoid pressure/conflict before moderation.
-- Let's stick to "Sitter sees Approved" for safety/moderation flow, OR "Sitter sees all" if they need to report? 
-- Prudent approach: Sitter sees ONLY Approved.
DROP POLICY IF EXISTS "Sitters can view reviews about them" ON reviews;
CREATE POLICY "Sitters can view reviews about them" 
ON reviews FOR SELECT 
USING (sitter_id::uuid = auth.uid() AND estado = 'aprobado');

-- Admin Policy (Implicit via Service Role usually, but ensuring Admin Table Access if using client)
-- Assuming Admin Users are handled via separate role system or simply service_role in backend functions.
-- If Frontend Admin uses standard client, strictly speaking, they need a policy.
-- Keeping it simple: If using Supabase Dashboard or Service Key scripts (admin pages often use separate connection or admin flag?), it works.
-- If `pages/admin/reviews.tsx` uses `supabaseClient` (anon key), it will FAIL to see pending reviews unless we add an Admin policy!
-- Fix: We definitely need an admin policy if the Admin Page is client-side.
-- We'll add a policy that checks for a claim or specific email (MVP hack).
-- Or rely on the code using `supabase.auth.getUser()` and fetching a role that permits it.
-- But RLS runs in DB.
-- Let's open up "Pending" reviews for inspection? No, that leaks to everyone.
-- Check if `auth.jwt() ->> 'role' = 'service_role'`? No, client uses anon.
-- Let's check `registro_petmate` for an 'admin' role in the roles array?
-- This causes a recursive query performance hit sometimes, but okay for MVP.
-- Policy: "Users with 'admin' role can view/update all"

CREATE POLICY "Admins can view all reviews"
ON reviews FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM registro_petmate
    WHERE auth_user_id = auth.uid() 
    AND roles @> '{"admin"}'
  )
);

CREATE POLICY "Admins can update all reviews"
ON reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM registro_petmate
    WHERE auth_user_id = auth.uid() 
    AND roles @> '{"admin"}'
  )
);
