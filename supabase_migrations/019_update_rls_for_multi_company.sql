-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Update RLS policies to support multi-company dispatcher associations
-- Uses the dispatcher_company_associations junction table
--
-- SAFETY: This migration only:
-- - Updates RLS policies (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- STEP 1: Enable RLS on dispatcher_company_associations
-- =====================================================
ALTER TABLE dispatcher_company_associations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: RLS Policies for dispatcher_company_associations
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Dispatchers can view their own associations" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Owners can view associations for their companies" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Owners can create associations for their companies" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Owners can update associations for their companies" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Dispatchers can update their own association status" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Owners can delete associations for their companies" ON dispatcher_company_associations;

-- Dispatchers can view their own associations
CREATE POLICY "Dispatchers can view their own associations"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    dispatcher_id = auth.uid()
    OR
    -- Owners can view associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Owners can create associations for their companies
CREATE POLICY "Owners can create associations for their companies"
  ON dispatcher_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Owners can update associations for their companies
CREATE POLICY "Owners can update associations for their companies"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Dispatchers can update their own association status (to accept/reject invitations)
-- Note: Field-level restrictions should be enforced at the application level
-- RLS policies cannot restrict which fields can be updated, only who can update
CREATE POLICY "Dispatchers can update their own association status"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (dispatcher_id = auth.uid())
  WITH CHECK (dispatcher_id = auth.uid());

-- Owners can delete associations for their companies
CREATE POLICY "Owners can delete associations for their companies"
  ON dispatcher_company_associations FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 3: Update Companies Table RLS
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Create SECURITY DEFINER function to check dispatcher associations
-- This bypasses RLS to avoid infinite recursion
CREATE OR REPLACE FUNCTION can_view_company_by_association(company_id_param UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create updated SELECT policy that allows:
-- 1. Owners to view their own company (by owner_id)
-- 2. Dispatchers to view companies where they have active associations (via function)
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Owners can view their own company
    (auth.uid() = owner_id)
    OR
    -- Dispatchers can view companies where they have active associations (uses function to avoid recursion)
    can_view_company_by_association(id)
  );

-- =====================================================
-- STEP 4: Update Dispatchers Table RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view dispatchers from their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can insert dispatchers for their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can update dispatchers from their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can delete dispatchers from their company" ON dispatchers;

-- Users can view dispatchers associated with their company
CREATE POLICY "Users can view dispatchers from their company"
  ON dispatchers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view dispatchers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can view other dispatchers from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Owners can insert dispatchers for their companies
CREATE POLICY "Users can insert dispatchers for their company"
  ON dispatchers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Owners can update dispatchers from their companies
CREATE POLICY "Users can update dispatchers from their company"
  ON dispatchers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Owners can delete dispatchers from their companies
CREATE POLICY "Users can delete dispatchers from their company"
  ON dispatchers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 5: Update Loads Table RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;

-- Users can view loads from their company
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- Owners can view loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can view loads from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Users can insert loads for their company
CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can insert loads for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can insert loads for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Users can update loads from their company
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Users can delete loads from their company
CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- =====================================================
-- STEP 6: Add Load Dispatcher Validation Function
-- =====================================================

-- Create a function to validate dispatcher-company association for loads
-- This will be used in application logic, not as a constraint
CREATE OR REPLACE FUNCTION validate_dispatcher_company_association(
  p_dispatcher_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if dispatcher is associated with the company
  RETURN EXISTS (
    SELECT 1 
    FROM dispatcher_company_associations
    WHERE dispatcher_id = p_dispatcher_id
    AND company_id = p_company_id
    AND status = 'active'
  )
  OR
  -- Backward compatibility: Check profiles table
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_dispatcher_id
    AND company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatchers can view their own associations'
  ) THEN
    RAISE NOTICE 'RLS policies for dispatcher_company_associations table created successfully';
  ELSE
    RAISE WARNING 'RLS policies for dispatcher_company_associations table may not have been created';
  END IF;
END $$;

