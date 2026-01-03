-- Ensure public access to avatars bucket for everyone (authenticated and anon)
BEGIN;

-- Update bucket to ensure it's public
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- Drop existing select policy to recreate it robustly
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;

-- Create comprehensive public read policy
CREATE POLICY "Public Read Avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

COMMIT;
