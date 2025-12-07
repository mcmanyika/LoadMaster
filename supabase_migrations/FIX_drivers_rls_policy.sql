-- Fix RLS policy for drivers table to handle cases where profile.company_id is NULL
-- but a company exists for the user (by owner_id)

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;

-- Create updated INSERT policy that checks both profile.company_id and companies.owner_id
CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
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
  );

-- Also update SELECT policy for consistency
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;

CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
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

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;

CREATE POLICY "Users can update drivers from their company"
  ON drivers FOR UPDATE
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

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;

CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
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

