-- Create dispatchers table (similar to drivers table)
-- This simplifies dispatcher management by removing auth complexity

CREATE TABLE IF NOT EXISTS dispatchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  fee_percentage NUMERIC(5,2) DEFAULT 12.00,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_dispatchers_company_id ON dispatchers(company_id);

-- Create index on email for lookups
CREATE INDEX IF NOT EXISTS idx_dispatchers_email ON dispatchers(email);

-- Add comments
COMMENT ON TABLE dispatchers IS 'Dispatchers table - simple records without auth accounts';
COMMENT ON COLUMN dispatchers.company_id IS 'Reference to the company that owns this dispatcher';
COMMENT ON COLUMN dispatchers.fee_percentage IS 'Fee percentage for this dispatcher (e.g., 12.00 for 12%)';

-- Enable Row Level Security
ALTER TABLE dispatchers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view dispatchers from their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can insert dispatchers for their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can update dispatchers from their company" ON dispatchers;
DROP POLICY IF EXISTS "Users can delete dispatchers from their company" ON dispatchers;

-- Create RLS policies (same pattern as drivers)
-- Users can only SELECT dispatchers from their company
CREATE POLICY "Users can view dispatchers from their company"
  ON dispatchers FOR SELECT
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

-- Users can only INSERT dispatchers for their company
CREATE POLICY "Users can insert dispatchers for their company"
  ON dispatchers FOR INSERT
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

-- Users can only UPDATE dispatchers from their company
CREATE POLICY "Users can update dispatchers from their company"
  ON dispatchers FOR UPDATE
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
  )
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

-- Users can only DELETE dispatchers from their company
CREATE POLICY "Users can delete dispatchers from their company"
  ON dispatchers FOR DELETE
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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dispatchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_dispatchers_updated_at ON dispatchers;
CREATE TRIGGER update_dispatchers_updated_at
  BEFORE UPDATE ON dispatchers
  FOR EACH ROW
  EXECUTE FUNCTION update_dispatchers_updated_at();

-- Verify the table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'dispatchers'
  ) THEN
    RAISE NOTICE 'Dispatchers table created successfully';
  ELSE
    RAISE WARNING 'Dispatchers table may not have been created';
  END IF;
END $$;

