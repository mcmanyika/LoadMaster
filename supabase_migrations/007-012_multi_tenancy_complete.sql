-- =====================================================
-- MULTI-TENANCY MIGRATION - COMPLETE
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Create Companies Table
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
COMMENT ON TABLE companies IS 'Companies table for multi-tenancy - one company per owner';

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;

CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- =====================================================
-- STEP 2: Add Company ID to Profiles
-- =====================================================
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
COMMENT ON COLUMN profiles.company_id IS 'Reference to the company this user belongs to';

-- =====================================================
-- STEP 3: Add Company ID to Loads Table
-- =====================================================
ALTER TABLE loads 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_loads_company_id ON loads(company_id);
COMMENT ON COLUMN loads.company_id IS 'Reference to the company that owns this load';

ALTER TABLE loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;

CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- STEP 4: Add Company ID to Transporters Table
-- =====================================================
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_transporters_company_id ON transporters(company_id);
COMMENT ON COLUMN transporters.company_id IS 'Reference to the company that owns this transporter';

ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can insert transporters for their company" ON transporters;
DROP POLICY IF EXISTS "Users can update transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can delete transporters from their company" ON transporters;

CREATE POLICY "Users can view transporters from their company"
  ON transporters FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transporters for their company"
  ON transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update transporters from their company"
  ON transporters FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transporters from their company"
  ON transporters FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- STEP 5: Add Company ID to Drivers Table
-- =====================================================
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
COMMENT ON COLUMN drivers.company_id IS 'Reference to the company that owns this driver';

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;
DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;

CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update drivers from their company"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- STEP 6: Migrate Existing Data
-- =====================================================
DO $$
DECLARE
  first_owner_id UUID;
  owner_record RECORD;
  owner_company_id UUID;
  default_company_id UUID;
BEGIN
  -- Get the first owner (by created_at in auth.users)
  SELECT id INTO first_owner_id
  FROM auth.users
  WHERE id IN (SELECT id FROM profiles WHERE role = 'owner')
  ORDER BY created_at ASC
  LIMIT 1;

  -- Create companies for all owners
  FOR owner_record IN 
    SELECT p.id, p.name, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'owner'
    ORDER BY u.created_at ASC
  LOOP
    -- Create company for this owner
    INSERT INTO companies (name, owner_id)
    VALUES (
      COALESCE(owner_record.name || '''s Company', 'Company ' || owner_record.email),
      owner_record.id
    )
    ON CONFLICT (owner_id) DO NOTHING
    RETURNING id INTO owner_company_id;

    -- Update profile to link to company
    UPDATE profiles
    SET company_id = (
      SELECT id FROM companies WHERE owner_id = owner_record.id
    )
    WHERE id = owner_record.id;
  END LOOP;

  -- Get the default company_id (first company created)
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no company exists, we can't proceed
  IF default_company_id IS NULL THEN
    RAISE EXCEPTION 'No companies found. Please ensure at least one owner exists.';
  END IF;

  -- Step 2: Assign all existing loads, transporters, and drivers to the first owner's company
  -- Update all loads to belong to first owner's company (ensure no NULLs)
  UPDATE loads
  SET company_id = default_company_id
  WHERE company_id IS NULL;

  -- Update all transporters to belong to first owner's company
  UPDATE transporters
  SET company_id = default_company_id
  WHERE company_id IS NULL;

  -- Update all drivers to belong to first owner's company
  UPDATE drivers
  SET company_id = default_company_id
  WHERE company_id IS NULL;

  -- Update all dispatchers (non-owners) to belong to first owner's company
  UPDATE profiles
  SET company_id = default_company_id
  WHERE role IN ('dispatcher', 'driver')
  AND company_id IS NULL;

  -- Verify no NULLs remain before making columns NOT NULL
  IF EXISTS (SELECT 1 FROM loads WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'loads table still has NULL company_id values';
  END IF;
  IF EXISTS (SELECT 1 FROM transporters WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'transporters table still has NULL company_id values';
  END IF;
  IF EXISTS (SELECT 1 FROM drivers WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'drivers table still has NULL company_id values';
  END IF;
END $$;

-- Step 3: Make company_id NOT NULL for loads, transporters, and drivers
-- Double-check and set any remaining NULLs to default company
UPDATE loads 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) 
WHERE company_id IS NULL;

UPDATE transporters 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) 
WHERE company_id IS NULL;

UPDATE drivers 
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) 
WHERE company_id IS NULL;

-- Verify no NULLs exist before making NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM loads WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot make company_id NOT NULL: loads table has NULL values';
  END IF;
  IF EXISTS (SELECT 1 FROM transporters WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot make company_id NOT NULL: transporters table has NULL values';
  END IF;
  IF EXISTS (SELECT 1 FROM drivers WHERE company_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot make company_id NOT NULL: drivers table has NULL values';
  END IF;
END $$;

-- Now make the columns NOT NULL
ALTER TABLE loads ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE transporters ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN company_id SET NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

