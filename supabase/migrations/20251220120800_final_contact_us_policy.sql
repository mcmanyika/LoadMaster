-- Final fix: Use public role to allow ALL users (authenticated and unauthenticated)
-- This is the most permissive approach that should definitely work

-- Drop all existing policies
DROP POLICY IF EXISTS "anon_can_insert_contact_us" ON contact_us;
DROP POLICY IF EXISTS "authenticated_can_insert_contact_us" ON contact_us;
DROP POLICY IF EXISTS "contact_us_anon_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_public_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_select" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_update" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_delete" ON contact_us;

-- Create a single policy using 'public' role which includes both 'anon' and 'authenticated'
-- This is the simplest and most permissive approach
CREATE POLICY "contact_us_allow_all_inserts"
  ON contact_us
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Keep other policies for authenticated users
CREATE POLICY "contact_us_authenticated_select"
  ON contact_us
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "contact_us_authenticated_update"
  ON contact_us
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "contact_us_authenticated_delete"
  ON contact_us
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify
DO $$
DECLARE
  insert_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO insert_policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us'
  AND cmd = 'INSERT';
  
  RAISE NOTICE 'Insert policies found: %', insert_policy_count;
  
  IF insert_policy_count = 0 THEN
    RAISE EXCEPTION 'No INSERT policy found! Contact form will not work.';
  END IF;
END $$;

