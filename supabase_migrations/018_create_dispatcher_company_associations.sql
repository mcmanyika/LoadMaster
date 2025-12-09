-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Create dispatcher_company_associations table for many-to-many relationship
-- Allows dispatchers to work for multiple companies
--
-- SAFETY: This migration only:
-- - Creates a new table (no data deletion)
-- - Creates indexes (no data deletion)
-- - Migrates existing data (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- STEP 1: Create Junction Table
-- =====================================================
CREATE TABLE IF NOT EXISTS dispatcher_company_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatcher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fee_percentage NUMERIC(5,2) DEFAULT 12.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dispatcher_id, company_id) -- Prevent duplicate associations
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dca_dispatcher_id ON dispatcher_company_associations(dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_dca_company_id ON dispatcher_company_associations(company_id);
CREATE INDEX IF NOT EXISTS idx_dca_status ON dispatcher_company_associations(status);
CREATE INDEX IF NOT EXISTS idx_dca_dispatcher_status ON dispatcher_company_associations(dispatcher_id, status);

-- Add comments
COMMENT ON TABLE dispatcher_company_associations IS 'Junction table for many-to-many relationship between dispatchers and companies';
COMMENT ON COLUMN dispatcher_company_associations.dispatcher_id IS 'Reference to dispatcher profile';
COMMENT ON COLUMN dispatcher_company_associations.company_id IS 'Reference to company';
COMMENT ON COLUMN dispatcher_company_associations.fee_percentage IS 'Fee percentage for this dispatcher at this company (e.g., 12.00 for 12%)';
COMMENT ON COLUMN dispatcher_company_associations.status IS 'Association status: active, inactive, pending, or suspended';
COMMENT ON COLUMN dispatcher_company_associations.invited_by IS 'Profile ID of the person who invited this dispatcher';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dispatcher_company_associations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_dispatcher_company_associations_updated_at ON dispatcher_company_associations;
CREATE TRIGGER update_dispatcher_company_associations_updated_at
  BEFORE UPDATE ON dispatcher_company_associations
  FOR EACH ROW
  EXECUTE FUNCTION update_dispatcher_company_associations_updated_at();

-- =====================================================
-- STEP 2: Migrate Existing Data
-- =====================================================
-- Migrate existing dispatcher-company relationships from profiles table
DO $$
DECLARE
  profile_record RECORD;
  dispatcher_record RECORD;
BEGIN
  -- Migrate from profiles table: dispatchers with company_id
  FOR profile_record IN 
    SELECT id, company_id, fee_percentage
    FROM profiles
    WHERE role = 'dispatcher' 
    AND company_id IS NOT NULL
    AND company_id IN (SELECT id FROM companies)
  LOOP
    -- Check if association already exists
    IF NOT EXISTS (
      SELECT 1 FROM dispatcher_company_associations
      WHERE dispatcher_id = profile_record.id
      AND company_id = profile_record.company_id
    ) THEN
      INSERT INTO dispatcher_company_associations (
        dispatcher_id,
        company_id,
        fee_percentage,
        status,
        joined_at
      )
      VALUES (
        profile_record.id,
        profile_record.company_id,
        COALESCE(profile_record.fee_percentage, 12.00),
        'active',
        NOW()
      )
      ON CONFLICT (dispatcher_id, company_id) DO NOTHING;
      
      RAISE NOTICE 'Migrated dispatcher % to company % from profiles table', 
        profile_record.id, 
        profile_record.company_id;
    END IF;
  END LOOP;

  -- Migrate from dispatchers table (if it exists and has records)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispatchers') THEN
    FOR dispatcher_record IN 
      SELECT d.id, d.company_id, d.fee_percentage, p.id as profile_id
      FROM dispatchers d
      LEFT JOIN profiles p ON p.email = d.email AND p.role = 'dispatcher'
      WHERE d.company_id IS NOT NULL
      AND d.company_id IN (SELECT id FROM companies)
      AND p.id IS NOT NULL
    LOOP
      -- Check if association already exists
      IF NOT EXISTS (
        SELECT 1 FROM dispatcher_company_associations
        WHERE dispatcher_id = dispatcher_record.profile_id
        AND company_id = dispatcher_record.company_id
      ) THEN
        INSERT INTO dispatcher_company_associations (
          dispatcher_id,
          company_id,
          fee_percentage,
          status,
          joined_at
        )
        VALUES (
          dispatcher_record.profile_id,
          dispatcher_record.company_id,
          COALESCE(dispatcher_record.fee_percentage, 12.00),
          'active',
          NOW()
        )
        ON CONFLICT (dispatcher_id, company_id) DO NOTHING;
        
        RAISE NOTICE 'Migrated dispatcher % to company % from dispatchers table', 
          dispatcher_record.profile_id, 
          dispatcher_record.company_id;
      END IF;
    END LOOP;
  END IF;

  RAISE NOTICE 'Data migration complete';
END $$;

-- Verify the table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'dispatcher_company_associations'
  ) THEN
    RAISE NOTICE 'Dispatcher company associations table created successfully';
  ELSE
    RAISE WARNING 'Dispatcher company associations table may not have been created';
  END IF;
END $$;

