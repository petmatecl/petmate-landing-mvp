-- Security Fix P0.3: Secure Reviews Policies
-- Previous policy "Public can view reviews" was too permissive (USING true).
-- We now drop it and enforce stricter visibility rules.

-- 1. Drop old permissive policy if it exists (by name)
DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Clients can create reviews" ON public.reviews; -- Re-creating for completeness/clarity

-- 2. Define new policies

-- A. Public/Everyone: Can ONLY view APPROVED reviews (or all if we don't have approval flag, but assuming we want to hide unapproved if we add moderation later).
-- Note: 'reviews' table currently lacks 'approved' column in the schema seen in 99_audit_fixes, but 103_add_review_status.sql might have added it.  
-- Let's check 103_add_review_status.sql content first? No, I should be safe and check if column exists or just assume.
-- Actually, the user request said "dejar solo aprobadas, autor ve las propias".
-- I need to verify if 'status' or 'approved' column exists on reviews table.

-- Let's assume standard flow. If I don't see the column, I'll add it or just limit to 'true' for now if I can't filter.
-- WAIT. I should check `103_add_review_status.sql` before writing this file to be sure about column names.
-- Aborting write to check file first.
