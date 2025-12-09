-- Fix RLS policies for transporters and drivers tables to support dispatchers viewing data from associated companies
-- This migration adds dispatcher association checks similar to what was done for loads

-- =====================================================
-- Update Transporters Table RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can insert transporters for their company" ON transporters;
DROP POLICY IF EXISTS "Users can update transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can delete transporters from their company" ON transporters;

-- Users can view transporters from their company
-- Owners: Can view all transporters from their companies
-- Dispatchers: Can view transporters from companies they're associated with
CREATE POLICY "Users can view transporters from their company"
  ON transporters FOR SELECT
  TO authenticated
  USING (
    -- Owners can view transporters from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view transporters from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id (for users with direct company_id)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can insert transporters for their company
CREATE POLICY "Users can insert transporters for their company"
  ON transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can insert transporters for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can insert transporters for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can update transporters from their company
CREATE POLICY "Users can update transporters from their company"
  ON transporters FOR UPDATE
  TO authenticated
  USING (
    -- Owners can update transporters from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update transporters from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Owners can update transporters from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update transporters for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can delete transporters from their company
CREATE POLICY "Users can delete transporters from their company"
  ON transporters FOR DELETE
  TO authenticated
  USING (
    -- Owners can delete transporters from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can delete transporters from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- =====================================================
-- Update Drivers Table RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;
DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;

-- Users can view drivers from their company
-- Owners: Can view all drivers from their companies
-- Dispatchers: Can view drivers from companies they're associated with
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view drivers from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id (for users with direct company_id)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can insert drivers for their company
CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can insert drivers for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can insert drivers for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can update drivers from their company
CREATE POLICY "Users can update drivers from their company"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    -- Owners can update drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update drivers from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Owners can update drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update drivers for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can delete drivers from their company
CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    -- Owners can delete drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can delete drivers from companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Verify the policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'transporters' 
    AND policyname = 'Users can view transporters from their company'
  ) AND EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'drivers' 
    AND policyname = 'Users can view drivers from their company'
  ) THEN
    RAISE NOTICE 'RLS policies for transporters and drivers tables updated successfully';
  ELSE
    RAISE WARNING 'RLS policies for transporters and drivers tables may not have been created';
  END IF;
END $$;

