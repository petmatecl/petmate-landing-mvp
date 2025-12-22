-- Migration: Fix Social Links Schema
-- Description: Ensures 'redes_sociales' column exists and forces schema reload.

-- 1. Ensure column exists (idempotent)
ALTER TABLE public.registro_petmate
ADD COLUMN IF NOT EXISTS redes_sociales jsonb DEFAULT '{}';

-- 2. Force Schema Cache Reload
-- We do this again because sometimes one notification isn't enough or it was missed.
NOTIFY pgrst, 'reload schema';
