-- Fix RLS policy for loads table to handle cases where profile.company_id is NULL
-- but a company exists for the user (by owner_id)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;

-- Create updated SELECT policy
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- Check if company_id matches the user's profile company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    -- Fallback: Check if company_id matches a company where user is the owner
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Also allow if user's profile has the same company_id (for dispatchers)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create updated INSERT policy
CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if company_id matches the user's profile company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    -- Fallback: Check if company_id matches a company where user is the owner
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Also allow if user's profile has the same company_id (for dispatchers)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create updated UPDATE policy
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create updated DELETE policy
CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Verify the policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loads' 
    AND policyname = 'Users can insert loads for their company'
  ) THEN
    RAISE NOTICE 'RLS policies for loads table updated successfully';
  ELSE
    RAISE WARNING 'RLS policies for loads table may not have been created';
  END IF;
END $$;

