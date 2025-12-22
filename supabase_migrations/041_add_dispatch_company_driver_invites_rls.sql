-- =====================================================
-- ADD DISPATCH COMPANY SUPPORT TO DRIVER_INVITE_CODES RLS POLICIES
-- Updates driver_company_associations table RLS policies to allow dispatch companies
-- to create driver invite codes for owner companies they've joined
-- =====================================================

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Owners can create associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can update associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can delete associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Drivers can view their own associations" ON driver_company_associations;

-- Owners and dispatch companies can view associations for their companies
-- Owners: Can view associations for companies they own
-- Dispatch Companies: Can view associations for their own company AND for owner companies they've joined
CREATE POLICY "Drivers can view their own associations"
  ON driver_company_associations FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR
    -- Owners can view associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatch companies can view associations for owner companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
  );

-- Owners and dispatch companies can create associations for their companies
-- Owners: Can create associations for companies they own
-- Dispatch Companies: Can create associations (invite codes) for owner companies they've joined
CREATE POLICY "Owners can create associations for their companies"
  ON driver_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can create associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatch companies can create associations for owner companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
  );

-- Owners and dispatch companies can update associations for their companies
-- Owners: Can update associations for companies they own
-- Dispatch Companies: Can update associations for owner companies they've joined
CREATE POLICY "Owners can update associations for their companies"
  ON driver_company_associations FOR UPDATE
  TO authenticated
  USING (
    -- Owners can update associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatch companies can update associations for owner companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
  )
  WITH CHECK (
    -- Owners can update associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatch companies can update associations for owner companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
  );

-- Owners and dispatch companies can delete associations for their companies
-- Owners: Can delete associations for companies they own
-- Dispatch Companies: Can delete associations for owner companies they've joined
CREATE POLICY "Owners can delete associations for their companies"
  ON driver_company_associations FOR DELETE
  TO authenticated
  USING (
    -- Owners can delete associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatch companies can delete associations for owner companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = auth.uid() 
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
  );

-- Verify the policies were updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'driver_company_associations' 
    AND policyname = 'Owners can create associations for their companies'
  ) THEN
    RAISE NOTICE 'RLS policies for driver_company_associations table updated successfully with dispatch_company support';
  ELSE
    RAISE WARNING 'RLS policies for driver_company_associations table may not have been updated';
  END IF;
END $$;

