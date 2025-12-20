-- Verify and fix contact_us table setup
-- This migration ensures everything is configured correctly

-- Verify table exists and has correct structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'contact_us'
  ) THEN
    RAISE EXCEPTION 'contact_us table does not exist';
  END IF;
  
  RAISE NOTICE 'contact_us table exists';
END $$;

-- Ensure RLS is enabled
ALTER TABLE contact_us ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start completely fresh
DROP POLICY IF EXISTS "anon_insert_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_insert_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_select_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_update_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_delete_contact_us" ON contact_us;
DROP POLICY IF EXISTS "Allow anonymous users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to view contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to update contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to delete contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;

-- Create the simplest possible policy for anonymous inserts
-- This should work for unauthenticated users
CREATE POLICY "contact_us_anon_insert"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy for authenticated users
CREATE POLICY "contact_us_auth_insert"
  ON contact_us
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy for authenticated users to view
CREATE POLICY "contact_us_auth_select"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for authenticated users to update
CREATE POLICY "contact_us_auth_update"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create policy for authenticated users to delete
CREATE POLICY "contact_us_auth_delete"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
  anon_policy_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_us'
    AND policyname = 'contact_us_anon_insert'
    AND 'anon' = ANY(roles::text[])
  ) INTO anon_policy_exists;
  
  RAISE NOTICE 'Total policies for contact_us: %', policy_count;
  RAISE NOTICE 'Anonymous insert policy exists: %', anon_policy_exists;
  
  IF NOT anon_policy_exists THEN
    RAISE WARNING 'Anonymous insert policy was not created correctly!';
  END IF;
END $$;

