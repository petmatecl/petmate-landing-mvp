-- Force PostgREST schema cache reload
-- Run this in the Supabase SQL Editor to fix "Could not find column ... in schema cache" errors
NOTIFY pgrst, 'reload schema';
