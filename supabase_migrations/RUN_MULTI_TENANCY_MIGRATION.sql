-- =====================================================
-- MULTI-TENANCY MIGRATION - SAFE VERSION
-- This script can be run multiple times safely
-- It checks what exists and only creates what's missing
-- =====================================================

-- =====================================================
-- STEP 1: Create Companies Table (if not exists)
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
-- STEP 2: Add Company ID to Profiles (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
    COMMENT ON COLUMN profiles.company_id IS 'Reference to the company this user belongs to';
  END IF;
END $$;

-- =====================================================
-- STEP 3: Add Company ID to Loads (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loads' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE loads ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_loads_company_id ON loads(company_id);
    COMMENT ON COLUMN loads.company_id IS 'Reference to the company that owns this load';
  END IF;
END $$;

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
-- STEP 4: Add Company ID to Transporters (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transporters' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE transporters ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_transporters_company_id ON transporters(company_id);
    COMMENT ON COLUMN transporters.company_id IS 'Reference to the company that owns this transporter';
  END IF;
END $$;

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
-- STEP 5: Add Company ID to Drivers (if not exists)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drivers' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE drivers ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
    COMMENT ON COLUMN drivers.company_id IS 'Reference to the company that owns this driver';
  END IF;
END $$;

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
  default_company_id UUID;
BEGIN
  -- Create companies for all owners that don't have one
  FOR owner_record IN 
    SELECT p.id, p.name, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'owner'
    AND NOT EXISTS (
      SELECT 1 FROM companies WHERE owner_id = p.id
    )
    ORDER BY u.created_at ASC
  LOOP
    -- Create company for this owner
    INSERT INTO companies (name, owner_id)
    VALUES (
      COALESCE(owner_record.name || '''s Company', 'Company ' || owner_record.email),
      owner_record.id
    )
    ON CONFLICT (owner_id) DO NOTHING;

    -- Update profile to link to company
    UPDATE profiles
    SET company_id = (
      SELECT id FROM companies WHERE owner_id = owner_record.id
    )
    WHERE id = owner_record.id;
  END LOOP;

  -- Get the default company_id (first company)
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no companies exist yet (no owners), we'll skip the data migration
  -- The company will be created when the first owner signs up
  IF default_company_id IS NULL THEN
    RAISE NOTICE 'No companies found. This is normal if no owners exist yet. Companies will be created automatically when owners sign up.';
    -- Don't raise an exception, just skip the data migration
    RETURN;
  END IF;

  -- Only proceed with data migration if we have a company
  IF default_company_id IS NOT NULL THEN
    -- Update all NULL company_ids in loads (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'company_id') THEN
      UPDATE loads
      SET company_id = default_company_id
      WHERE company_id IS NULL;
    END IF;

    -- Update all NULL company_ids in transporters (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporters' AND column_name = 'company_id') THEN
      UPDATE transporters
      SET company_id = default_company_id
      WHERE company_id IS NULL;
    END IF;

    -- Update all NULL company_ids in drivers (if column exists)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'company_id') THEN
      UPDATE drivers
      SET company_id = default_company_id
      WHERE company_id IS NULL;
    END IF;

    -- Update profiles that don't have company_id
    UPDATE profiles
    SET company_id = default_company_id
    WHERE company_id IS NULL
    AND role IN ('dispatcher', 'driver');

    RAISE NOTICE 'Data migration completed';
  END IF;
END $$;

-- =====================================================
-- STEP 7: Make company_id NOT NULL (safely)
-- Only if we have companies and no NULL values exist
-- =====================================================
DO $$
DECLARE
  has_companies BOOLEAN;
BEGIN
  -- Check if we have any companies
  SELECT EXISTS(SELECT 1 FROM companies LIMIT 1) INTO has_companies;

  -- Only make NOT NULL if we have companies and no NULLs
  IF has_companies THEN
    -- Only make NOT NULL if column exists and has no NULLs
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'loads' AND column_name = 'company_id' AND is_nullable = 'YES'
    ) THEN
      -- Verify no NULLs before making NOT NULL
      IF NOT EXISTS (SELECT 1 FROM loads WHERE company_id IS NULL) THEN
        ALTER TABLE loads ALTER COLUMN company_id SET NOT NULL;
        RAISE NOTICE 'Made loads.company_id NOT NULL';
      ELSE
        RAISE NOTICE 'Skipping loads.company_id NOT NULL: NULL values still exist';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'transporters' AND column_name = 'company_id' AND is_nullable = 'YES'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM transporters WHERE company_id IS NULL) THEN
        ALTER TABLE transporters ALTER COLUMN company_id SET NOT NULL;
        RAISE NOTICE 'Made transporters.company_id NOT NULL';
      ELSE
        RAISE NOTICE 'Skipping transporters.company_id NOT NULL: NULL values still exist';
      END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'drivers' AND column_name = 'company_id' AND is_nullable = 'YES'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM drivers WHERE company_id IS NULL) THEN
        ALTER TABLE drivers ALTER COLUMN company_id SET NOT NULL;
        RAISE NOTICE 'Made drivers.company_id NOT NULL';
      ELSE
        RAISE NOTICE 'Skipping drivers.company_id NOT NULL: NULL values still exist';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping NOT NULL constraints: No companies exist yet. They will be created when owners sign up.';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

