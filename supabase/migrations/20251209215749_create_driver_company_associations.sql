-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Create driver_company_associations table for many-to-many relationship
-- Allows drivers to work for multiple companies
--
-- SAFETY: This migration only:
-- - Creates a new table (no data deletion)
-- - Creates indexes (no data deletion)
-- - Creates triggers (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- STEP 1: Create Junction Table
-- =====================================================
CREATE TABLE IF NOT EXISTS driver_company_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dca_driver_id ON driver_company_associations(driver_id);
CREATE INDEX IF NOT EXISTS idx_dca_company_id ON driver_company_associations(company_id);
CREATE INDEX IF NOT EXISTS idx_dca_invite_code ON driver_company_associations(invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dca_status ON driver_company_associations(status);

-- Add unique constraint on invite_code (codes must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dca_invite_code_unique 
ON driver_company_associations(invite_code) 
WHERE invite_code IS NOT NULL;

-- Add partial unique constraint: driver can only be associated with company once
-- But only when driver_id is set (not for pending codes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dca_driver_company_unique 
ON driver_company_associations(driver_id, company_id) 
WHERE driver_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE driver_company_associations IS 'Junction table for many-to-many relationship between drivers and companies';
COMMENT ON COLUMN driver_company_associations.driver_id IS 'Reference to driver profile (NULL for unused invite codes)';
COMMENT ON COLUMN driver_company_associations.company_id IS 'Reference to company';
COMMENT ON COLUMN driver_company_associations.invite_code IS 'Unique invite code for drivers to join this company';
COMMENT ON COLUMN driver_company_associations.expires_at IS 'Expiration date for the invite code (NULL = never expires)';
COMMENT ON COLUMN driver_company_associations.status IS 'Association status: active, inactive, pending, or suspended';
COMMENT ON COLUMN driver_company_associations.invited_by IS 'Profile ID of the person who invited this driver';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_company_associations_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_driver_company_associations_updated_at ON driver_company_associations;
CREATE TRIGGER update_driver_company_associations_updated_at
  BEFORE UPDATE ON driver_company_associations
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_company_associations_updated_at();

-- =====================================================
-- STEP 2: Enable RLS
-- =====================================================
ALTER TABLE driver_company_associations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: RLS Policies
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Drivers can view their own associations" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can view associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can create associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can update associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Drivers can update their own association status" ON driver_company_associations;
DROP POLICY IF EXISTS "Owners can delete associations for their companies" ON driver_company_associations;
DROP POLICY IF EXISTS "Drivers can view pending invite codes" ON driver_company_associations;
DROP POLICY IF EXISTS "Drivers can use invite codes" ON driver_company_associations;

-- Drivers can view their own associations
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
  );

-- Owners can create associations for their companies
CREATE POLICY "Owners can create associations for their companies"
  ON driver_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Owners can update associations for their companies
CREATE POLICY "Owners can update associations for their companies"
  ON driver_company_associations FOR UPDATE
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

-- Drivers can update their own association status (to accept/reject invitations)
-- Note: Field-level restrictions should be enforced at the application level
-- RLS policies cannot restrict which fields can be updated, only who can update
CREATE POLICY "Drivers can update their own association status"
  ON driver_company_associations FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

-- Owners can delete associations for their companies
CREATE POLICY "Owners can delete associations for their companies"
  ON driver_company_associations FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Drivers can view pending invite codes (for code lookup)
CREATE POLICY "Drivers can view pending invite codes"
  ON driver_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing associations with invite codes that haven't been used yet
    (invite_code IS NOT NULL 
     AND driver_id IS NULL 
     AND status = 'pending')
  );

-- Drivers can use invite codes (update when joining)
CREATE POLICY "Drivers can use invite codes"
  ON driver_company_associations FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's a pending invite code (not yet used)
    (invite_code IS NOT NULL 
     AND driver_id IS NULL 
     AND status = 'pending')
  )
  WITH CHECK (
    -- After update, driver_id should be set to current user
    (driver_id = auth.uid() 
     AND status = 'active')
  );

-- Verify the table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'driver_company_associations'
  ) THEN
    RAISE NOTICE 'Driver company associations table created successfully';
  ELSE
    RAISE WARNING 'Driver company associations table may not have been created';
  END IF;
END $$;

