-- Add company_id column to transporters table
ALTER TABLE transporters 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_transporters_company_id ON transporters(company_id);

-- Add comment
COMMENT ON COLUMN transporters.company_id IS 'Reference to the company that owns this transporter';

-- Enable Row Level Security on transporters table if not already enabled
ALTER TABLE transporters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can insert transporters for their company" ON transporters;
DROP POLICY IF EXISTS "Users can update transporters from their company" ON transporters;
DROP POLICY IF EXISTS "Users can delete transporters from their company" ON transporters;

-- Create RLS policies
-- Users can only SELECT transporters from their company
CREATE POLICY "Users can view transporters from their company"
  ON transporters FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can only INSERT transporters for their company
CREATE POLICY "Users can insert transporters for their company"
  ON transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can only UPDATE transporters from their company
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

-- Users can only DELETE transporters from their company
CREATE POLICY "Users can delete transporters from their company"
  ON transporters FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

