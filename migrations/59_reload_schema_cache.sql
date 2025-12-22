-- Migration: Reload Schema Cache
-- Description: Forces PostgREST to reload its schema cache.
-- This is necessary when the API returns "Could not find column ... in the schema cache" errors after migrations.

NOTIFY pgrst, 'reload schema';
