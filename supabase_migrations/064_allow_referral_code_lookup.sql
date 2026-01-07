-- Allow users to look up profiles by referral_code for affiliate program
-- This is necessary because referral codes should be publicly searchable
-- Users need to be able to find referrers by their referral code

-- Create a function that allows looking up profiles by referral code
-- This function bypasses RLS to check if a referral code exists
CREATE OR REPLACE FUNCTION get_profile_by_referral_code(code TEXT)
RETURNS TABLE(id UUID, name TEXT, referral_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.referral_code
  FROM profiles p
  WHERE p.referral_code = UPPER(TRIM(code));
END;
$$;

-- Update the SELECT policy on profiles to allow looking up by referral_code
-- We need to allow users to view profiles when searching by referral_code
-- This is safe because we're only exposing id, name, and referral_code (not sensitive data)

-- First, check if we need to modify the existing policy or create a new one
-- The existing policy uses can_view_profile function, which we'll extend

-- Create a new policy that allows viewing profiles by referral_code
-- This policy allows any authenticated user to view basic info (id, name, referral_code) 
-- of any profile when looking up by referral_code
CREATE POLICY "Users can view profiles by referral code"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is looking up by referral_code
    -- This allows the affiliate program to work
    TRUE  -- For now, allow all authenticated users to view profiles by referral_code
    -- In a more restrictive setup, you could add:
    -- referral_code IS NOT NULL AND referral_code IN (
    --   SELECT referral_code FROM profiles WHERE referral_code IS NOT NULL
    -- )
  );

-- However, the above might be too permissive. Let's use a better approach:
-- Drop the overly permissive policy and use the function instead
DROP POLICY IF EXISTS "Users can view profiles by referral code" ON profiles;

-- Instead, we'll use the SECURITY DEFINER function which bypasses RLS
-- The function get_profile_by_referral_code can be called from the application
-- and will return the profile info without RLS restrictions

-- Verify the function was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_profile_by_referral_code'
  ) THEN
    RAISE NOTICE 'Function get_profile_by_referral_code created successfully';
  ELSE
    RAISE WARNING 'Function get_profile_by_referral_code may not have been created';
  END IF;
END $$;

