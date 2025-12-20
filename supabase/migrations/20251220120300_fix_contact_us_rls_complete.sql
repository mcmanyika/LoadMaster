-- Complete fix for contact_us RLS policies
-- This ensures anonymous users can insert contact form submissions

-- First, ensure RLS is enabled
ALTER TABLE contact_us ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow anonymous users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to view contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to update contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to delete contact submissions" ON contact_us;

-- Create policy for anonymous users (most important - for landing page visitors)
-- This MUST allow inserts without any authentication
CREATE POLICY "anon_insert_contact_us"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy for authenticated users (for dashboard/admin access)
CREATE POLICY "authenticated_insert_contact_us"
  ON contact_us
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to view all submissions
CREATE POLICY "authenticated_select_contact_us"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to update submissions
CREATE POLICY "authenticated_update_contact_us"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create policy for authenticated users to delete submissions
CREATE POLICY "authenticated_delete_contact_us"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us';
  
  IF policy_count >= 1 THEN
    RAISE NOTICE 'Contact_us RLS policies created successfully. Total policies: %', policy_count;
  ELSE
    RAISE WARNING 'No policies found for contact_us table';
  END IF;
END $$;

