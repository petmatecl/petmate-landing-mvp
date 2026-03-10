-- SEC-01: Replace hardcoded admin emails in RLS policies with role-based check
-- This migration creates a helper function and updates all policies that use hardcoded emails.
--
-- PREREQUISITE: Ensure all current admin users have roles = ['admin'] in proveedores table.
-- Run this BEFORE applying:
--   UPDATE proveedores SET roles = array_append(COALESCE(roles, '{}'), 'admin')
--   WHERE auth_user_id IN (
--     SELECT id FROM auth.users WHERE email IN ('admin@pawnecta.com', 'cano.caldera@gmail.com')
--   ) AND NOT ('admin' = ANY(COALESCE(roles, '{}')));

-- 1. Create a reusable function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proveedores
    WHERE auth_user_id = auth.uid()
      AND estado = 'aprobado'
      AND 'admin' = ANY(roles)
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. NOTE: Each existing RLS policy that references hardcoded admin emails
-- must be dropped and recreated using public.is_admin().
-- The exact policy names depend on your current DB state.
-- Below are templates for the known policies found in migrations.
--
-- IMPORTANT: Run these in your Supabase SQL editor after verifying
-- the exact policy names with:
--   SELECT policyname, tablename FROM pg_policies WHERE policyname ILIKE '%admin%';
--
-- Example pattern to replace:
--   OLD: auth.jwt() ->> 'email' in ('admin@petmate.cl', 'aldo@petmate.cl', ...)
--   NEW: public.is_admin()
--
-- Template:
-- DROP POLICY IF EXISTS "policy_name" ON table_name;
-- CREATE POLICY "policy_name" ON table_name
--   FOR SELECT USING (public.is_admin());
