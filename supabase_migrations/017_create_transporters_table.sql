-- =====================================================
-- CREATE TRANSPORTERS TABLE (Vehicles/Carriers)
-- This table stores vehicle/carrier information
-- =====================================================

-- Create transporters table if it doesn't exist
CREATE TABLE IF NOT EXISTS transporters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mc_number TEXT,
  registration_number TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add registration_number column if table exists but column doesn't (for existing tables)
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Ensure updated_at column exists (for existing tables)
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Make mc_number optional if it was required before (for existing tables)
DO $$
BEGIN
  -- Check if mc_number has NOT NULL constraint and remove it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transporters' 
    AND column_name = 'mc_number' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE transporters ALTER COLUMN mc_number DROP NOT NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transporters_company_id ON transporters(company_id);
CREATE INDEX IF NOT EXISTS idx_transporters_mc_number ON transporters(mc_number);
CREATE INDEX IF NOT EXISTS idx_transporters_registration_number ON transporters(registration_number);

-- Add comments
COMMENT ON TABLE transporters IS 'Transporters/Carriers/Vehicles - represents trucking companies or individual vehicles';
COMMENT ON COLUMN transporters.mc_number IS 'Motor Carrier (MC) Number (for carriers)';
COMMENT ON COLUMN transporters.registration_number IS 'Vehicle registration number (for vehicles)';
COMMENT ON COLUMN transporters.company_id IS 'Reference to the company that owns this transporter/vehicle';

-- Enable Row Level Security
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can view transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can insert transporters for their company" ON transporters;
DROP POLICY IF EXISTS "Users can update transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can delete transporters from their company" ON transporters;

-- Create RLS policies
CREATE POLICY "Users can view transporters from their company"
  ON transporters FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transporters for their company"
  ON transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transporters from their company"
  ON transporters FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transporters from their company"
  ON transporters FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_transporters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transporters_updated_at ON transporters;
CREATE TRIGGER update_transporters_updated_at
  BEFORE UPDATE ON transporters
  FOR EACH ROW
  EXECUTE FUNCTION update_transporters_updated_at();

