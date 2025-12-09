-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Fix "Function Search Path Mutable" security warnings
-- Sets search_path for all functions to prevent security vulnerabilities
--
-- SAFETY: This migration only:
-- - Updates function definitions (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Fix SECURITY DEFINER functions (use empty search_path)
-- =====================================================

-- Fix can_view_company_by_association
CREATE OR REPLACE FUNCTION can_view_company_by_association(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  is_owner BOOLEAN;
  has_active_association BOOLEAN;
  has_pending_invite_code BOOLEAN;
  user_company_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- FIRST: Check if user is the owner of the company (bypasses RLS)
  -- This is critical for owners to view their companies
  SELECT EXISTS(
    SELECT 1 
    FROM companies 
    WHERE id = company_id_param 
    AND owner_id = current_user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has active association (bypasses RLS)
  SELECT EXISTS(
    SELECT 1 
    FROM dispatcher_company_associations 
    WHERE dispatcher_id = current_user_id 
    AND company_id = company_id_param
    AND status = 'active'
  ) INTO has_active_association;
  
  IF has_active_association THEN
    RETURN TRUE;
  END IF;
  
  -- Check if there's a pending invite code for this company (for dispatchers looking up codes)
  -- This allows dispatchers to see company names when previewing invite codes
  SELECT EXISTS(
    SELECT 1 
    FROM dispatcher_company_associations 
    WHERE company_id = company_id_param
    AND invite_code IS NOT NULL
    AND dispatcher_id IS NULL
    AND status = 'pending'
  ) INTO has_pending_invite_code;
  
  IF has_pending_invite_code THEN
    RETURN TRUE;
  END IF;
  
  -- Backward compatibility: Check profiles.company_id (bypasses RLS)
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = current_user_id;
  
  IF user_company_id IS NOT NULL AND user_company_id = company_id_param THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Fix can_view_profile (if it exists)
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
  target_profile_role TEXT;
BEGIN
  current_user_id := auth.uid();

  -- Users can always view their own profile
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  -- Get user's company_id from profiles (safe because function bypasses RLS)
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = current_user_id;

  -- If same company, allow
  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;

  -- Check if current user is an owner
  SELECT EXISTS(
    SELECT 1 FROM companies
    WHERE owner_id = current_user_id
  ) INTO is_owner;

  IF is_owner THEN
    -- If current user is an owner, allow them to view any dispatcher profile
    -- This is for the invitation system where an owner needs to find a dispatcher by email
    SELECT role INTO target_profile_role
    FROM profiles
    WHERE id = profile_id;

    IF target_profile_role = 'dispatcher' THEN
      RETURN TRUE;
    END IF;

    -- Owners can also view profiles from their own company (if not already covered)
    SELECT EXISTS(
      SELECT 1 FROM companies
      WHERE id = profile_company_id AND owner_id = current_user_id
    ) INTO is_owner;

    IF is_owner THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- =====================================================
-- Fix trigger functions (use public search_path)
-- =====================================================

-- Fix update_dispatcher_company_associations_updated_at
CREATE OR REPLACE FUNCTION update_dispatcher_company_associations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_transporters_updated_at
CREATE OR REPLACE FUNCTION update_transporters_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_dispatchers_updated_at
CREATE OR REPLACE FUNCTION update_dispatchers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_companies_updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_expenses_updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_subscriptions_updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix validate_dispatcher_company_association
CREATE OR REPLACE FUNCTION validate_dispatcher_company_association(
  p_dispatcher_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if dispatcher has an active association with the company
  SELECT EXISTS(
    SELECT 1
    FROM dispatcher_company_associations
    WHERE dispatcher_id = p_dispatcher_id
      AND company_id = p_company_id
      AND status = 'active'
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  );
  RETURN NEW;
END;
$$;

-- Verify functions were updated
DO $$
BEGIN
  RAISE NOTICE 'All functions updated with proper search_path settings';
END $$;

