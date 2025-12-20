-- Ultra-permissive RLS policy for contact_us
-- This ensures ANY user (authenticated or not) can insert

-- First, let's check current RLS status
DO $$
DECLARE
  rls_status BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_status
  FROM pg_class
  WHERE relname = 'contact_us';
  
  RAISE NOTICE 'Current RLS status: %', rls_status;
END $$;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "contact_us_allow_all_inserts" ON contact_us;
DROP POLICY IF EXISTS "contact_us_authenticated_select" ON contact_us;
DROP POLICY IF EXISTS "contact_us_authenticated_update" ON contact_us;
DROP POLICY IF EXISTS "contact_us_authenticated_delete" ON contact_us;
DROP POLICY IF EXISTS "anon_can_insert_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_can_insert_contact_us" ON contact_us;

-- Ensure RLS is enabled
ALTER TABLE contact_us ENABLE ROW LEVEL SECURITY;

-- Create the most permissive policy possible
-- Using 'public' role and WITH CHECK (true) - this should allow everything
CREATE POLICY "allow_all_contact_inserts"
  ON contact_us
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Also explicitly create for anon (just to be sure)
CREATE POLICY "allow_anon_contact_inserts"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- And for authenticated
CREATE POLICY "allow_auth_contact_inserts"
  ON contact_us
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for authenticated users to manage submissions
CREATE POLICY "allow_auth_contact_select"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_auth_contact_update"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_auth_contact_delete"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

-- Final verification - list all policies
DO $$
DECLARE
  policy_rec RECORD;
  insert_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== All policies on contact_us table ===';
  FOR policy_rec IN 
    SELECT policyname, roles, cmd, with_check
    FROM pg_policies
    WHERE tablename = 'contact_us'
    ORDER BY cmd, policyname
  LOOP
    RAISE NOTICE 'Policy: %, Roles: %, Command: %, With Check: %', 
      policy_rec.policyname, 
      policy_rec.roles, 
      policy_rec.cmd,
      policy_rec.with_check;
    
    IF policy_rec.cmd = 'INSERT' THEN
      insert_count := insert_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total INSERT policies: %', insert_count;
  
  IF insert_count = 0 THEN
    RAISE EXCEPTION 'No INSERT policies found! This will block all inserts.';
  END IF;
END $$;

