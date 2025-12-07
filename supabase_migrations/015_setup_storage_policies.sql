-- Setup Storage Policies for rate-confirmations bucket
-- This allows authenticated users to upload, read, and delete PDF files

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can upload rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Users can read rate confirmations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete rate confirmations" ON storage.objects;

-- Allow authenticated users to upload files to rate-confirmations bucket
CREATE POLICY "Users can upload rate confirmations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rate-confirmations');

-- Allow authenticated users to read files from rate-confirmations bucket
CREATE POLICY "Users can read rate confirmations"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'rate-confirmations');

-- Allow authenticated users to delete files from rate-confirmations bucket
CREATE POLICY "Users can delete rate confirmations"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rate-confirmations');

-- Note: If you want to allow users to update/replace files, you can add:
-- CREATE POLICY "Users can update rate confirmations"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (bucket_id = 'rate-confirmations')
-- WITH CHECK (bucket_id = 'rate-confirmations');

