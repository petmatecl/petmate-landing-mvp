-- Add fotos column to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}';

-- Create storage bucket for reviews if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images to review-images bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'review-images');

-- Policy to allow public to view review images
CREATE POLICY "Allow public viewing"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-images');
