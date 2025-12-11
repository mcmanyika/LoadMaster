-- Add additional company information fields
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS number_of_trucks INTEGER,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT;

-- Add comments
COMMENT ON COLUMN companies.address IS 'Company physical address';
COMMENT ON COLUMN companies.website IS 'Company website URL';
COMMENT ON COLUMN companies.phone IS 'Company phone number';
COMMENT ON COLUMN companies.number_of_trucks IS 'Number of trucks in the fleet';
COMMENT ON COLUMN companies.email IS 'Company email address';
COMMENT ON COLUMN companies.contact_person IS 'Primary contact person name';

