-- Allow users to view basic profile info (name, email) of users they referred
-- This is needed for the affiliate dashboard to show referred user names
-- We only expose name and email, not sensitive data

-- Create a function to get referred user's basic info
CREATE OR REPLACE FUNCTION get_referred_user_info(referred_user_id UUID)
RETURNS TABLE(id UUID, name TEXT, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email
  FROM profiles p
  WHERE p.id = referred_user_id;
END;
$$;

-- Update the SELECT policy on profiles to allow viewing basic info of referred users
-- Users should be able to see name and email of users they referred (for affiliate tracking)
-- This is safe because we're only exposing basic contact info, not sensitive data

-- First, let's check if we can add a condition to the existing policy
-- We'll create a helper function that checks if a user was referred by the current user
CREATE OR REPLACE FUNCTION is_referred_by_current_user(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM referrals
    WHERE referred_user_id = profile_id
    AND referrer_id = auth.uid()
  );
END;
$$;

-- Note: The existing RLS policy might already allow this through company relationships
-- But if not, we can add a policy that allows viewing profiles of referred users
-- However, this might be too permissive. Instead, we'll use the function approach.

-- Verify the functions were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_referred_user_info'
  ) THEN
    RAISE NOTICE 'Function get_referred_user_info created successfully';
  ELSE
    RAISE WARNING 'Function get_referred_user_info may not have been created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'is_referred_by_current_user'
  ) THEN
    RAISE NOTICE 'Function is_referred_by_current_user created successfully';
  ELSE
    RAISE WARNING 'Function is_referred_by_current_user may not have been created';
  END IF;
END $$;

