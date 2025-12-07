-- Complete fix for companies RLS policies
-- This ensures owners can view, update, and insert their companies
-- And dispatchers can view their company

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;

-- SELECT policy: Owners can view by owner_id, dispatchers can view by company_id
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Owners can view their own company (by owner_id)
    (auth.uid() = owner_id)
    OR
    -- Dispatchers can view the company they belong to (by company_id in profiles)
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- UPDATE policy: Only owners can update their own company
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- INSERT policy: Only owners can insert their own company
CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'companies' 
    AND policyname = 'Users can view their company'
  ) THEN
    RAISE NOTICE 'SELECT policy for companies table created successfully';
  ELSE
    RAISE WARNING 'SELECT policy for companies table may not have been created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'companies' 
    AND policyname = 'Users can update their own company'
  ) THEN
    RAISE NOTICE 'UPDATE policy for companies table created successfully';
  ELSE
    RAISE WARNING 'UPDATE policy for companies table may not have been created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'companies' 
    AND policyname = 'Users can insert their own company'
  ) THEN
    RAISE NOTICE 'INSERT policy for companies table created successfully';
  ELSE
    RAISE WARNING 'INSERT policy for companies table may not have been created';
  END IF;
END $$;

