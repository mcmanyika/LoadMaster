-- Fix contact_us RLS to explicitly allow unauthenticated users
-- Ensure anonymous/unauthenticated users can submit the contact form

-- Drop existing insert policies
DROP POLICY IF EXISTS "contact_us_anon_insert" ON contact_us;
DROP POLICY IF EXISTS "contact_us_auth_insert" ON contact_us;
DROP POLICY IF EXISTS "Allow public to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow anonymous users to insert contact submissions" ON contact_us;
DROP POLICY IF EXISTS "Allow authenticated users to insert contact submissions" ON contact_us;

-- Create a single policy that allows BOTH authenticated and unauthenticated users
-- Using 'public' role which includes both 'anon' and 'authenticated'
CREATE POLICY "contact_us_public_insert"
  ON contact_us
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Also explicitly create for anon role (unauthenticated users)
-- This ensures unauthenticated visitors can submit
CREATE POLICY "contact_us_anon_insert"
  ON contact_us
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verify the policies
DO $$
DECLARE
  anon_policy_count INTEGER;
  public_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO anon_policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us'
  AND policyname = 'contact_us_anon_insert'
  AND 'anon' = ANY(roles::text[]);
  
  SELECT COUNT(*) INTO public_policy_count
  FROM pg_policies
  WHERE tablename = 'contact_us'
  AND policyname = 'contact_us_public_insert'
  AND 'public' = ANY(roles::text[]);
  
  RAISE NOTICE 'Anonymous insert policy count: %', anon_policy_count;
  RAISE NOTICE 'Public insert policy count: %', public_policy_count;
  
  IF anon_policy_count = 0 THEN
    RAISE WARNING 'Anonymous insert policy not found!';
  END IF;
  
  IF public_policy_count = 0 THEN
    RAISE WARNING 'Public insert policy not found!';
  END IF;
END $$;

