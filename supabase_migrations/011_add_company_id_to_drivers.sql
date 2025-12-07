-- Add company_id column to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);

-- Add comment
COMMENT ON COLUMN drivers.company_id IS 'Reference to the company that owns this driver';

-- Enable Row Level Security on drivers table if not already enabled
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;
DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;

-- Create RLS policies
-- Users can only SELECT drivers from their company
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can only INSERT drivers for their company
CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can only UPDATE drivers from their company
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

-- Users can only DELETE drivers from their company
CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

