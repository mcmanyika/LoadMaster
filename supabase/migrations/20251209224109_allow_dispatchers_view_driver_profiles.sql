-- Allow dispatchers to view driver profiles for companies they're associated with
-- This is needed for dispatchers to see driver names in the LoadForm dropdown

-- Update can_view_profile function to include dispatcher association check for drivers
CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
  profile_role TEXT;
  target_profile_role TEXT;
  has_active_dispatcher_association BOOLEAN;
  has_active_driver_association BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  -- Users can always view their own profile (no recursion needed)
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id and role from profiles (safe because function bypasses RLS)
  SELECT company_id, role INTO user_company_id, profile_role
  FROM profiles
  WHERE id = current_user_id;
  
  -- Get the target profile's role
  SELECT role INTO target_profile_role
  FROM profiles
  WHERE id = profile_id;
  
  -- If same company, allow
  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is owner of the company (query companies table directly)
  SELECT EXISTS(
    SELECT 1 FROM companies 
    WHERE id = profile_company_id AND owner_id = current_user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Allow owners to view dispatcher profiles for invitation purposes
  -- This allows owners to search for dispatchers to invite them
  IF profile_role = 'owner' AND target_profile_role = 'dispatcher' THEN
    RETURN TRUE;
  END IF;
  
  -- Allow dispatchers to view driver profiles for companies they're associated with
  IF profile_role = 'dispatcher' AND target_profile_role = 'driver' THEN
    -- Check if dispatcher is actively associated with the company
    SELECT EXISTS(
      SELECT 1
      FROM dispatcher_company_associations
      WHERE dispatcher_id = current_user_id
      AND company_id = profile_company_id
      AND status = 'active'
    ) INTO has_active_dispatcher_association;
    
    IF has_active_dispatcher_association THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Allow drivers to view dispatcher profiles for companies they're associated with
  IF profile_role = 'driver' AND target_profile_role = 'dispatcher' THEN
    -- Check if driver is actively associated with the company
    SELECT EXISTS(
      SELECT 1
      FROM driver_company_associations
      WHERE driver_id = current_user_id
      AND company_id = profile_company_id
      AND status = 'active'
    ) INTO has_active_driver_association;
    
    IF has_active_driver_association THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Verify the function was updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'can_view_profile'
  ) THEN
    RAISE NOTICE 'can_view_profile function updated successfully to allow dispatchers to view driver profiles';
  ELSE
    RAISE WARNING 'can_view_profile function may not have been updated';
  END IF;
END $$;

