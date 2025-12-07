-- Add company_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- Add comment
COMMENT ON COLUMN profiles.company_id IS 'Reference to the company this user belongs to';

