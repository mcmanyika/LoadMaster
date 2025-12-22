-- =====================================================
-- ADD DISPATCH COMPANY SUPPORT TO LOADS RLS POLICIES
-- Updates loads table RLS policies to allow dispatch companies
-- to insert/update/delete loads for owner companies they've joined
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;

-- Users can view loads from their company
-- Owners: Can view all loads from their companies
-- Dispatch Companies: Can view all loads from their own company AND from owner companies they've joined
-- Dispatchers: Can view loads from companies they're associated with AND where dispatcher field matches their name
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- Owners and dispatch companies can view loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatch companies and dispatchers can view loads from companies they're associated with
    -- For dispatchers: also check that dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      (
        -- Dispatch companies can view all loads (no dispatcher name check)
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (select auth.uid()) 
          AND role = 'dispatch_company'
        )
        OR
        -- Dispatchers can only view loads assigned to them
        dispatcher = (
          SELECT name FROM profiles WHERE id = (select auth.uid())
        )
      )
    )
    OR
    -- Backward compatibility: Check profiles.company_id (for users with direct company_id)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can insert loads for their company
-- Owners: Can insert loads for their companies
-- Dispatch Companies: Can insert loads for their own company AND for owner companies they've joined
-- Dispatchers: Can insert loads for companies they're associated with
CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners and dispatch companies can insert loads for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatch companies and dispatchers can insert loads for companies they're associated with
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

-- Users can update loads from their company
-- Owners: Can update loads from their companies
-- Dispatch Companies: Can update loads from their own company AND from owner companies they've joined
-- Dispatchers: Can update loads from companies they're associated with AND where dispatcher field matches their name
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    -- Owners and dispatch companies can update loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatch companies and dispatchers can update loads from companies they're associated with
    -- For dispatchers: also check that dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      (
        -- Dispatch companies can update all loads (no dispatcher name check)
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (select auth.uid()) 
          AND role = 'dispatch_company'
        )
        OR
        -- Dispatchers can only update loads assigned to them
        dispatcher = (
          SELECT name FROM profiles WHERE id = (select auth.uid())
        )
      )
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Owners and dispatch companies can update loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatch companies and dispatchers can update loads for companies they're associated with
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

-- Users can delete loads from their company
-- Owners: Can delete loads from their companies
-- Dispatch Companies: Can delete loads from their own company AND from owner companies they've joined
-- Dispatchers: Can delete loads from companies they're associated with AND where dispatcher field matches their name
CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    -- Owners and dispatch companies can delete loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatch companies and dispatchers can delete loads from companies they're associated with
    -- For dispatchers: also check that dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      (
        -- Dispatch companies can delete all loads (no dispatcher name check)
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = (select auth.uid()) 
          AND role = 'dispatch_company'
        )
        OR
        -- Dispatchers can only delete loads assigned to them
        dispatcher = (
          SELECT name FROM profiles WHERE id = (select auth.uid())
        )
      )
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
    AND tablename = 'loads' 
    AND policyname = 'Users can view loads from their company'
  ) THEN
    RAISE NOTICE 'RLS policies for loads table updated successfully with dispatch_company support';
  ELSE
    RAISE WARNING 'RLS policies for loads table may not have been created';
  END IF;
END $$;

