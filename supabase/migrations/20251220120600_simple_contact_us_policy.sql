-- Simple, direct RLS policy for contact_us table
-- This ensures anonymous users can definitely insert

-- Disable RLS temporarily to drop all policies cleanly
ALTER TABLE contact_us DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "contact_us_anon_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_public_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_select" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_update" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_delete" ON contact_us;
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow anonymous users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to view contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to update contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to delete contact submissions" ON contact_us;

-- Re-enable RLS
ALTER TABLE contact_us ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policy for anonymous inserts
-- This is the most permissive policy - allows ANY insert from anonymous users
CREATE POLICY "anon_can_insert_contact_us"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert too (in case they want to submit from dashboard)
CREATE POLICY "authenticated_can_insert_contact_us"
  ON contact_us
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to view all submissions
CREATE POLICY "authenticated_can_select_contact_us"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update submissions
CREATE POLICY "authenticated_can_update_contact_us"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete submissions
CREATE POLICY "authenticated_can_delete_contact_us"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

-- Final verification
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'contact_us';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us';
  
  RAISE NOTICE 'RLS enabled: %', rls_enabled;
  RAISE NOTICE 'Total policies: %', policy_count;
  
  IF NOT rls_enabled THEN
    RAISE WARNING 'RLS is NOT enabled on contact_us table!';
  END IF;
  
  IF policy_count < 1 THEN
    RAISE WARNING 'No policies found on contact_us table!';
  END IF;
END $$;

